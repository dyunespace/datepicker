/*
 * Datepicker Widget for SAP Analytics Cloud  (GLP)
 * id  : com.sap.sac.datepicker.glp
 * tag : com-sap-sac-datepicker-glp-main
 *
 * 구조 참고 : dyunespace/widget (Hierarchy Tree Widget)
 * 디자인 참고: SAC-Custom-Widgets/datepicker
 *
 * [모드]
 *   day   : 일반 날짜 캘린더            → yyyy.MM.dd
 *   week  : 일반 날짜 캘린더 + 주 스냅  → YYYY.ww   (그 주 첫날로 자동 정렬)
 *   month : 12개월 버튼 그리드 + 월 스냅 → yyyy.MM   (그 달 1일로 자동 정렬)
 *
 * [주차 규칙]
 *   키는 UI5 공식 열거형 sap/base/i18n/date/CalendarWeekNumbering 을 따른다.
 *
 * [기간 선택]
 *   지원하지 않는다. 컨트롤을 sap.m.DatePicker 하나로 고정해
 *   프로퍼티 변경 시 컨트롤을 갈아끼우는 경로 자체를 없앴다.
 */
(function () {
	'use strict';

	var TAG   = 'com-sap-sac-datepicker-glp-main';
	var BUILD = '2026-08-24 21:36 KST';   // 배포할 때마다 갱신. 콘솔에서 반영 여부를 확인한다.
	console.log('%c[datepicker] main build ' + BUILD, 'color:#346187;font-weight:bold');

	// ────────────────────────────────────────────────────────────
	// <1> 상수
	// ────────────────────────────────────────────────────────────

	// Font Style → CSS 선언 매핑.
	var FONT_STYLES = {
		'Regular':     { weight: '',     style: ''       },
		'Italic':      { weight: '',     style: 'italic' },
		'Bold':        { weight: 'bold', style: ''       },
		'Bold Italic': { weight: 'bold', style: 'italic' }
	};

	// 주차 규칙 → DateFormat 옵션 매핑.
	// 키는 UI5 공식 열거형 CalendarWeekNumbering 을 그대로 쓴다.
	// 그 열거형에 없는 '월요일 시작 + 1월 1일 포함 주' 조합만 MondayJan1 로 따로 둔다.
	// cwn 은 팝업 캘린더(sap.ui.unified.Calendar)에 넘길 값.
	var WEEK_RULES = {
		ISO_8601:           { firstDayOfWeek: 1, minimalDaysInFirstWeek: 4, cwn: 'ISO_8601' },
		WesternTraditional: { firstDayOfWeek: 0, minimalDaysInFirstWeek: 1, cwn: 'WesternTraditional' },
		MiddleEastern:      { firstDayOfWeek: 6, minimalDaysInFirstWeek: 1, cwn: 'MiddleEastern' },
		MondayJan1:         { firstDayOfWeek: 1, minimalDaysInFirstWeek: 1, cwn: null }
	};

	// 이전 버전에서 쓰던 짧은 키를 공식 키로 옮겨준다.
	// 스토리에 저장돼 있던 값이 그대로 들어와도 깨지지 않게 한다.
	var WEEK_RULE_ALIAS = { ISO: 'ISO_8601', US: 'WesternTraditional', JAN1: 'MondayJan1' };

	function normRule (v) {
		var k = WEEK_RULE_ALIAS[v] || v;
		return WEEK_RULES[k] ? k : 'ISO_8601';
	}

	// UI5 Compact 밀도의 입력 필드 높이(1.625rem). 이보다 작게 그리지 않는다.
	// SAC 기본 위젯은 리사이즈 핸들 자체가 막히지만 커스텀 위젯은 그 장치를 못 쓴다.
	var MIN_HEIGHT = 26;

	var MODES = { day: 1, week: 1, month: 1 };

	function normMode (v) {
		return MODES[v] ? v : 'day';
	}

	// 모드별 기본 표시 형식. day 의 '' 는 로케일 자동(Automatic).
	var DEFAULT_FORMAT = { day: '', week: 'YYYY.ww', month: 'yyyy.MM' };

	// ────────────────────────────────────────────────────────────
	// <2> 주차 계산 (로케일에 의존하지 않는 자체 구현)
	//     파이썬 datetime.isocalendar() 와 15년치 대조 검증 완료.
	// ────────────────────────────────────────────────────────────

	function weekStartOf (t, firstDay) {
		var dow = new Date(t).getUTCDay();               // 0=일 … 6=토
		return t - ((dow - firstDay + 7) % 7) * 864e5;
	}

	// 주 기준 연도(week-year)와 주차를 함께 반환.
	// 2027-01-01(금) 은 ISO 기준 { year: 2026, week: 53 } 이 된다.
	function calcWeek (d, rule) {
		var r  = WEEK_RULES[normRule(rule)];
		var t  = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
		var ws = weekStartOf(t, r.firstDayOfWeek);
		// 앵커 = 주 시작 + (7 - minimalDays)일. ISO 라면 목요일.
		var y  = new Date(ws + (7 - r.minimalDaysInFirstWeek) * 864e5).getUTCFullYear();
		var w1 = weekStartOf(Date.UTC(y, 0, r.minimalDaysInFirstWeek), r.firstDayOfWeek);
		return { year: y, week: Math.round((ws - w1) / 6048e5) + 1 };
	}

	// 해당 날짜가 속한 주의 첫날(로컬 Date).
	function weekStartDate (d, rule) {
		var r  = WEEK_RULES[normRule(rule)];
		var t  = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
		var ws = new Date(weekStartOf(t, r.firstDayOfWeek));
		return new Date(ws.getUTCFullYear(), ws.getUTCMonth(), ws.getUTCDate());
	}

	// 주 기준 연도 + 주차 → 그 주의 첫날.
	function weekToDate (y, w, rule) {
		var r  = WEEK_RULES[normRule(rule)];
		var w1 = weekStartOf(Date.UTC(y, 0, r.minimalDaysInFirstWeek), r.firstDayOfWeek);
		var d  = new Date(w1 + (w - 1) * 6048e5);
		return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
	}

	// #rgb / #rrggbb 를 rgba() 로. 강조색을 옅게 깔 때 쓴다.
	function withAlpha (hex, alpha) {
		var h = String(hex).trim().replace('#', '');
		if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
		if (!/^[0-9a-fA-F]{6}$/.test(h)) return hex;   // 알 수 없는 형식이면 그대로
		var n = parseInt(h, 16);
		return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
	}

	function isValidDate (d) {
		return d instanceof Date && !isNaN(d.getTime());
	}

	// 모드에 맞게 날짜를 정렬한다.
	//   week  → 그 주 첫날
	//   month → 그 달 1일
	//   day   → 그대로
	// 이 한 곳만 거치게 해서 값이 어디로 들어오든 결과가 같도록 한다.
	function snapToMode (d, mode, rule) {
		if (!isValidDate(d)) return null;
		if (mode === 'week')  return weekStartDate(d, rule);
		if (mode === 'month') return new Date(d.getFullYear(), d.getMonth(), 1);
		return d;
	}

	// 문자열에서 숫자 덩어리를 뽑는다.
	// "2026.34" "2026-W34" "202634" 를 모두 같은 결과로 받아들인다.
	function numGroups (s, want) {
		var g = String(s).match(/\d+/g);
		if (!g) return null;
		if (g.length >= want) return g.slice(0, want).map(Number);
		// 구분자 없이 붙어 있는 경우 고정 폭으로 자른다.
		if (g.length === 1) {
			var t = g[0];
			if (want === 2 && t.length === 6) return [+t.slice(0, 4), +t.slice(4)];
			if (want === 3 && t.length === 8) return [+t.slice(0, 4), +t.slice(4, 6), +t.slice(6)];
		}
		return null;
	}

	// 모드와 무관한 파서. 실패하면 null.
	function parseDayStr (str) {
		var g = numGroups(str, 3);
		if (!g || g[1] < 1 || g[1] > 12 || g[2] < 1 || g[2] > 31) return null;
		var d = new Date(g[0], g[1] - 1, g[2]);
		// 2월 30일 같은 값이 다음 달로 넘어가는 것을 막는다.
		if (d.getMonth() !== g[1] - 1 || d.getDate() !== g[2]) return null;
		return d;
	}

	function parseMonthStr (str) {
		var g = numGroups(str, 2);
		if (!g || g[1] < 1 || g[1] > 12) return null;
		return new Date(g[0], g[1] - 1, 1);
	}

	function parseWeekStr (str, rule) {
		var g = numGroups(str, 2);
		if (!g || g[1] < 1 || g[1] > 53) return null;
		var d = weekToDate(g[0], g[1], rule);
		// 52주뿐인 해에 53주를 넣는 경우를 걸러낸다.
		var back = calcWeek(d, rule);
		if (back.year !== g[0] || back.week !== g[1]) return null;
		return d;
	}

	// 패턴이 어떤 종류의 값을 표현하는지 심볼로 판단한다.
	function patternFits (pat, kind) {
		var p = String(pat).replace(/'[^']*'/g, '');   // 따옴표 리터럴 제외
		var hasDay = /d/.test(p), hasWeek = /w/.test(p), hasMonth = /M/.test(p);
		if (kind === 'week')  return hasWeek;
		if (kind === 'month') return hasMonth && !hasDay && !hasWeek;
		return hasDay;
	}

	// ────────────────────────────────────────────────────────────
	// <3> UI5 컨트롤 생성
	// ────────────────────────────────────────────────────────────

	function buildUI5 (host) {
		// 컨테이너가 아직 없으면(프로퍼티 갱신이 connectedCallback 보다 먼저 온 경우)
		// 여기서 만들지 않는다. connectedCallback 이 곧 다시 호출한다.
		if (!host._container) return;

		// 요청마다 토큰을 발급한다. sap.ui.require 는 비동기라
		// 스토리를 열고 닫는 사이에 콜백이 뒤늦게 도착할 수 있다.
		// 그 사이 재생성/파기가 있었다면 이 콜백의 결과는 버린다.
		var token = ++host._buildToken;

		// MODULES 배열 순서 = 콜백 인자 순서. 어긋나면 조용히 오동작한다.
		sap.ui.require([
			'sap/m/DatePicker',
			'sap/ui/core/format/DateFormat'
		], function (DatePicker, DateFormat) {

			// 늦게 도착한 콜백이면 아무것도 하지 않는다.
			if (token !== host._buildToken || !host._container || !host.isConnected) return;

			host._DateFormat = DateFormat;

			var dp = new DatePicker({
				width: '100%',
				displayFormat: host._resolveDisplayFormat(),
				change: function () { host._onChange(); },
				// 팝업은 SAC 화면 최상단에 따로 그려져 컨테이너 밖에 있다.
				// 열린 뒤에 우리 uid 클래스를 직접 붙여 CSS 가 닿게 한다.
				// id 를 조합해 겨냥하는 방식은 내부 구조에 의존해 깨지기 쉽다.
				// (ResponsivePopover 는 껍데기이고 실제 DOM 은 그 안의 Popover 다)
				afterValueHelpOpen: function () { host._tagPopup(); }
			});

			dp.addStyleClass('datePicker').addStyleClass(host._widgetUid);

			// ── 핵심 ──
			// DatePicker 는 포매터를 만들 때 주차 규칙 옵션을 넘기지 않는다.
			// 그래서 표시되는 주차가 브라우저 로케일을 따라가 ISO 와 어긋난다.
			// _getFormatInstance 가 DateFormat.getInstance(oArgs) 한 줄뿐이라
			// 인스턴스 단위로 옵션만 얹어 준다. (UI5 1.120.2 확인)
			// 실패하더라도 표시만 로케일 기준으로 돌아갈 뿐,
			// getFormattedVal() 이 돌려주는 값은 <2>의 자체 계산이라 영향이 없다.
			if (typeof dp._getFormatInstance === 'function') {
				dp._getFormatInstance = function (oArgs) {
					var r = WEEK_RULES[normRule(host._weekRule)];
					oArgs.firstDayOfWeek         = r.firstDayOfWeek;
					oArgs.minimalDaysInFirstWeek = r.minimalDaysInFirstWeek;
					return DateFormat.getInstance(oArgs);
				};
			}

			host._applyPlaceholder(dp);
			host._applyWeekNumbering(dp);
			host._applyMinMax(dp);
			host._applyValue(dp);

			if (token !== host._buildToken) { try { dp.destroy(); } catch (e) {} return; }

			// 남아 있을 수 있는 이전 컨트롤과 마운트를 먼저 걷어낸다.
			host._destroyControl();

			// UI5 전용 마운트를 매번 새로 만든다.
			// placeAt 은 기본이 "맨 뒤에 추가"라 같은 노드에 반복하면 컨트롤이 쌓인다.
			// setVisible 을 껐다 켤 때 아래로 복제되던 원인.
			// 또한 placeAt 대상 노드는 UIArea 가 내용을 관리하므로
			// <style> 태그와 섞이지 않도록 분리한다.
			host._mount = document.createElement('div');
			host._mount.style.cssText = 'width:100%;flex:1 1 auto;';
			host._container.appendChild(host._mount);

			dp.placeAt(host._mount);
			host._dp = dp;

			host._applyBaseStyle();
		});
	}

	// ────────────────────────────────────────────────────────────
	// <4> 웹컴포넌트
	// ────────────────────────────────────────────────────────────

	class Main extends HTMLElement {

		constructor () {
			super();
			this._widgetUid  = 'dp-' + Math.random().toString(36).slice(2, 9);
			this._built      = false;
			this._dp         = null;
			this._mount      = null;
			this._buildToken = 0;

			this._dateMode   = 'day';
			this._weekRule   = 'ISO_8601';
			// 모드마다 형식을 따로 둔다.
			// 하나로 두면 모드를 오갈 때 형식이 초기화되고,
			// 변환 함수도 '이 패턴이 어느 종류인지' 추론해야 해서 애매해진다.
			this._formatDay   = 'yyyy.MM.dd';
			this._formatWeek  = 'YYYY.ww';
			this._formatMonth = 'yyyy.MM';
			this._fontFamily = '';
			this._fontSize   = 0;
			this._fontStyle  = 'Regular';
			this._fontColor  = '';
			this._controlHeight = 0;
			this._accentColor = '';
			this._dateVal    = null;
			this._minDateVal = null;
			this._maxDateVal = null;
		}

		// <4-1> 화면에 배치될 때
		connectedCallback () {
			if (!this._container) {
				this._container = document.createElement('div');
				// sapUiSizeCompact 를 붙이면 입력 필드 높이가 1.625rem(26px)로 고정된다.
				// SAC 가 어떤 밀도로 렌더링하든 결과가 같아진다.
				this._container.className = this._widgetUid + ' sapUiSizeCompact';
				this._container.style.cssText =
					'width:100%;height:100%;min-height:' + MIN_HEIGHT + 'px;' +
					'display:flex;align-items:center;';
				this.appendChild(this._container);

				this._styleEl = document.createElement('style');
				this._container.appendChild(this._styleEl);

				// SAC 편집 모드에서 UI5 가 클릭을 삼켜 위젯 선택이 안 되는 문제.
				// 사람이 실제로 누른 이벤트만 복제해 껍데기로 올려보낸다.
				var forward = function (e) {
					if (!e.isTrusted) return;
					this.dispatchEvent(new MouseEvent(e.type, {
						bubbles: true, composed: true, cancelable: true, view: window,
						clientX: e.clientX, clientY: e.clientY
					}));
				}.bind(this);
				this._container.addEventListener('mousedown',   forward, true);
				this._container.addEventListener('pointerdown', forward, true);
				this._container.addEventListener('click',       forward, true);
			}

			// 이미 살아 있는 컨트롤이 있으면 다시 만들지 않는다.
			if (this._built && this._dp) return;
			this._destroyControl();          // 반쯤 남은 상태를 정리하고 새로 시작
			this._built = true;

			if (window.sap && window.sap.ui && window.sap.ui.require) {
				buildUI5(this);
			} else {
				this._container.textContent = 'SAP UI5를 찾을 수 없습니다.';
			}
		}

		disconnectedCallback () {
			this._destroyControl();
			this._built = false;
		}

		onCustomWidgetDestroy () {
			this._destroyControl();
		}

		onCustomWidgetResize (width, height) {
			if (!this._container) return;
			this._container.style.width  = width + 'px';
			// 26 아래로는 줄이지 않는다. 더 끌어도 입력 필드는 온전히 보인다.
			this._container.style.height = Math.max(MIN_HEIGHT, height) + 'px';
		}

		// <4-2> SAC 프로퍼티 변경 수신
		onCustomWidgetAfterUpdate (changed) {
			if (!changed) return;
			var needFormat = false;

			if ('dateMode' in changed) { this._dateMode = normMode(changed.dateMode); needFormat = true; }
			if ('formatDay'   in changed) { this._formatDay   = changed.formatDay === undefined ? 'yyyy.MM.dd' : changed.formatDay; needFormat = true; }
			if ('formatWeek'  in changed) { this._formatWeek  = changed.formatWeek  || 'YYYY.ww';  needFormat = true; }
			if ('formatMonth' in changed) { this._formatMonth = changed.formatMonth || 'yyyy.MM';  needFormat = true; }
			if ('weekRule' in changed) { this._weekRule = normRule(changed.weekRule); needFormat = true; }

			if ('dateVal'    in changed) { this._dateVal    = this._toDate(changed.dateVal); }
			if ('minDateVal' in changed) { this._minDateVal = this._toDate(changed.minDateVal); }
			if ('maxDateVal' in changed) { this._maxDateVal = this._toDate(changed.maxDateVal); }

			if ('fontFamily' in changed) { this._fontFamily = changed.fontFamily || ''; }
			if ('fontSize'   in changed) { this._fontSize   = Number(changed.fontSize) || 0; }
			if ('fontStyle'  in changed) { this._fontStyle  = changed.fontStyle || 'Regular'; }
			if ('fontColor'  in changed) { this._fontColor  = changed.fontColor || ''; }
			if ('accentColor' in changed) { this._accentColor = changed.accentColor || ''; }
			if ('controlHeight' in changed) { this._controlHeight = Number(changed.controlHeight) || 0; }

			if (!this._dp) return;

			if (needFormat) {
				this._dp.setDisplayFormat(this._resolveDisplayFormat());
				this._applyPlaceholder(this._dp);
				this._applyWeekNumbering(this._dp);
			}
			this._applyMinMax(this._dp);
			this._applyValue(this._dp);
			this._applyBaseStyle();
		}

		// ── 내부 헬퍼 ──────────────────────────────────────────

		_destroyControl () {
			this._buildToken++;
			if (this._dp) {
				try { this._dp.destroy(); } catch (e) { /* 이미 파기됨 */ }
				this._dp = null;
			}
			// 마운트 노드도 반드시 함께 제거한다. 남겨두면 다음 빌드에서 누적된다.
			if (this._mount) {
				if (this._mount.parentNode) this._mount.parentNode.removeChild(this._mount);
				this._mount = null;
			}
			// 파기 후에도 컨테이너에 UI5 잔해가 남아 있으면 정리한다.
			if (this._container) {
				var kids = Array.prototype.slice.call(this._container.children);
				for (var i = 0; i < kids.length; i++) {
					if (kids[i] !== this._styleEl) this._container.removeChild(kids[i]);
				}
			}
		}

		_toDate (v) {
			if (v === null || v === undefined || v === '') return null;
			var d = (v instanceof Date) ? v : new Date(v);
			return isValidDate(d) ? d : null;
		}

		// 표시 형식. 모드별 프로퍼티를 그대로 쓴다.
		// day 의 빈 값은 Automatic(로케일 자동)을 뜻한다.
		_resolveDisplayFormat () {
			if (this._dateMode === 'week')  return this._formatWeek  || 'YYYY.ww';
			if (this._dateMode === 'month') return this._formatMonth || 'yyyy.MM';
			return this._formatDay === undefined ? 'yyyy.MM.dd' : this._formatDay;
		}

		// 비어 있을 때 보이는 예시 문자열.
		// UI5 기본값은 언어 리소스의 "date.placeholder"(= "e.g. {0}") 라서
		// 앞에 'e.g. ' 가 붙는다. 예시 날짜만 남기고 접두사는 뺀다.
		// placeholder 를 빈 문자열로 두면 UI5 가 다시 기본값을 만들어 넣으므로
		// 우리가 만든 문자열을 명시적으로 넣어야 한다.
		_applyPlaceholder (dp) {
			if (!dp || typeof dp.setPlaceholder !== 'function') return;

			var sample = new Date(2026, 11, 31);   // 12/31 - 자릿수가 모두 두 자리라 예시로 적합
			var text;
			if (this._dateMode === 'week') {
				text = this._fmtWeek(sample);
			} else {
				var pat = this._resolveDisplayFormat();
				if (!pat) {
					// Automatic 이면 UI5 가 만든 문자열에서 접두사만 떼어낸다.
					try {
						var auto = dp._getPlaceholder ? dp._getPlaceholder() : '';
						text = String(auto).replace(/^[^0-9]*/, '');
					} catch (e) { text = ''; }
				} else if (this._DateFormat) {
					try { text = this._DateFormat.getInstance({ pattern: pat }).format(sample); }
					catch (e) { text = ''; }
				}
			}
			// 빈 문자열을 넣으면 UI5 가 기본 예시를 되살리므로 공백 한 칸으로 막는다.
			dp.setPlaceholder(text || ' ');
		}

		// 팝업 캘린더의 주차 표기 기준을 입력창과 맞춘다.
		_applyWeekNumbering (dp) {
			if (!dp || typeof dp.setCalendarWeekNumbering !== 'function') return;
			var r = WEEK_RULES[normRule(this._weekRule)];
			try { dp.setCalendarWeekNumbering(r.cwn || 'Default'); } catch (e) { /* 미지원 버전 */ }
		}

		_applyMinMax (dp) {
			if (!dp) return;
			if (typeof dp.setMinDate === 'function') dp.setMinDate(this._minDateVal || null);
			if (typeof dp.setMaxDate === 'function') dp.setMaxDate(this._maxDateVal || null);
		}

		// 값은 항상 현재 모드에 맞춰 정렬한 뒤 컨트롤에 넣는다.
		_applyValue (dp) {
			if (!dp) return;
			var snapped = snapToMode(this._dateVal, this._dateMode, this._weekRule);
			this._dateVal = snapped;
			dp.setDateValue(snapped || null);
		}

		_applyBaseStyle () {
			if (!this._styleEl) return;
			var u = '.' + this._widgetUid;

			// UI5 입력 필드가 그리는 선을 걷어낸다. SAC 위젯 테두리만 남긴다.
			//  - 본체 테두리는 물론 hover / active 상태까지 함께 지운다.
			//    테마의 hover 규칙이 선택자 4개짜리라 우리 것보다 우선순위가 높아
			//    !important 없이는 되살아난다.
			//  - 포커스 표시는 테두리가 아니라 ::before 가상 요소로 덧그려진다.
			//    입력창에는 깜빡이는 커서가 있어 없어도 위치를 알 수 있으므로 숨긴다.
			//    다만 캘린더 아이콘은 커서가 없어서, 아이콘에 포커스가 갔을 때만 되살린다.
			//    :has() 를 모르는 브라우저에서는 이 줄이 무시되어 '항상 숨김'이 된다.
			var css =
				u + ' { margin: 0; }\n' +
				u + ' .sapMInputBaseContentWrapper,\n' +
				u + ' .sapMInputBaseContentWrapper:hover,\n' +
				u + ' .sapMInputBaseContentWrapper:active {\n' +
				'\tborder-color: transparent !important;\n' +
				'\tbox-shadow: none !important;\n' +
				// 배경을 비워 SAC 위젯의 배경색과 모서리 곡선이 그대로 드러나게 한다.
				// 이 배경은 위젯 바깥 요소(__panel91)가 그리므로 우리는 가리지만 않으면 된다.
				'\tbackground-color: transparent !important;\n' +
				'}\n' +
				u + ' .sapMInputBaseInner { background-color: transparent !important; }\n' +
				u + ' .sapMInputBaseContentWrapper::before { display: none !important; }\n' +
				u + ' .sapMInputBaseContentWrapper:has(.sapMInputBaseIcon:focus)::before { display: block !important; }\n';

			// 글꼴은 입력 필드 글자에만 적용한다.
			// 팝업 캘린더는 SAC 화면 최상단에 따로 그려져 이 스코프 밖이며,
			// 억지로 건드리면 다른 위젯의 팝업까지 영향을 받는다.
			var decl = [];
			if (this._fontFamily) decl.push('font-family: ' + this._fontFamily + ';');
			if (this._fontSize)   decl.push('font-size: ' + this._fontSize + 'px;');
			if (this._fontColor)  decl.push('color: ' + this._fontColor + ';');

			var fs = FONT_STYLES[this._fontStyle] || FONT_STYLES.Regular;
			if (fs.weight) decl.push('font-weight: ' + fs.weight + ';');
			if (fs.style)  decl.push('font-style: ' + fs.style + ';');

			if (decl.length) {
				// 래퍼까지 포함해 선택자 우선순위를 올린다.
				css += u + ' .sapMInputBaseContentWrapper .sapMInputBaseInner { ' + decl.join(' ') + ' }\n';
			}

			// 팝업 캘린더 가운데 정렬.
			// .sapUiCal 은 display:inline-block 이라 자체 폭이 내용에 맞춰 정해지는데,
			// 팝오버 내용 영역은 21rem 으로 고정돼 있어 남는 폭이 전부 오른쪽에 몰린다.
			// 캘린더 내부는 건드리지 않고 부모에서 가운데로 밀어 준다.
			var pop = '.' + this._widgetUid + '-pop';
			css += pop + ' .sapMPopoverCont,\n' +
			       pop + ' .sapMPopoverScroll { text-align: center; }\n';

			css += this._controlHeightCss(u);
			css += this._accentCss(u);
			this._styleEl.textContent = css;
		}

		// 입력 컨트롤 높이.
		//
		// SAC 는 커스텀 위젯에 32px 하한을 걸어서 위젯 상자를 그보다 얇게 만들 수 없다.
		// SAC 기본 드롭다운도 마찬가지인데, 상자는 32 로 두고 Margin 으로 안쪽 여백을
		// 만들어 컨트롤만 얇게 그린다. 여기서도 같은 방식을 쓴다.
		//
		// UI5 는 sapMInputBaseHeightMargin 으로 위아래 0.1875rem(3px) 여백을 자동으로 준다.
		// Compact 입력창 26 + 3 + 3 = 32 라서 기본 상태가 딱 맞아떨어진다.
		// 높이를 직접 지정할 때는 그 자동 여백을 걷어내고 우리 값으로 그린다.
		_controlHeightCss (u) {
			var h = this._controlHeight;
			if (!h || h < 8) return '';

			return u + '.sapMInputBaseHeightMargin { margin: 0 !important; }\n' +
			       u + ',\n' +
			       u + ' .sapMInputBaseContentWrapper {\n' +
			       '\theight: ' + h + 'px !important;\n' +
			       '\tmin-height: ' + h + 'px !important;\n' +
			       '}\n' +
			       u + ' .sapMInputBaseInner {\n' +
			       '\theight: ' + h + 'px !important;\n' +
			       '\tline-height: ' + h + 'px !important;\n' +
			       '}\n' +
			       // 아이콘도 함께 줄이지 않으면 세로 중심이 어긋나거나 밖으로 삐져나온다.
			       u + ' .sapMInputBaseIconContainer,\n' +
			       u + ' .sapMInputBaseIcon {\n' +
			       '\theight: ' + h + 'px !important;\n' +
			       '\tline-height: ' + h + 'px !important;\n' +
			       '}\n';
		}

		// 팝업 컨트롤을 찾아 uid 클래스를 붙인다.
		// ResponsivePopover 안의 실제 Popover(또는 좁은 화면에서는 Dialog)까지 내려간다.
		_tagPopup () {
			if (!this._dp) return;
			var rp = this._dp.getAggregation && this._dp.getAggregation('_popup');
			if (!rp) return;

			var targets = [rp];
			if (typeof rp._getPopup === 'function') {
				try {
					var inner = rp._getPopup();
					if (inner && inner.getContent) targets.push(inner);
				} catch (e) { /* 내부 구조 변경 대비 */ }
			}
			if (rp._oControl) targets.push(rp._oControl);

			var cls = this._widgetUid + '-pop';
			for (var i = 0; i < targets.length; i++) {
				var t = targets[i];
				if (t && typeof t.addStyleClass === 'function' && !t.hasStyleClass(cls)) {
					t.addStyleClass(cls);
				}
			}

			// DOM 에도 직접 붙여 둔다. 컨트롤 계층에서 못 잡는 경우의 안전장치.
			var dom = rp.getDomRef && rp.getDomRef();
			if (dom && !dom.classList.contains(cls)) dom.classList.add(cls);
		}

		// 강조색.
		// 테마에서 이 색은 한 뿌리(@sapUiHighlight 계열)에서 파생돼
		// 아이콘 · 헤더 · 화살표 · 선택 배경에 함께 쓰인다.
		// 우리는 파라미터를 바꾸는 게 아니라 결과를 개별로 칠하므로
		// 그 자리들을 직접 나열해 준다.
		//
		// 팝업 캘린더는 SAC 화면 최상단에 따로 그려져 컨테이너 밖에 있다.
		// 다만 DatePicker 가 팝업을 '<컨트롤 id>-RP' 라는 고정 id 로 만들기 때문에
		// (UI5 1.120.2 DatePicker._createPopup 확인) id 로 정확히 겨냥할 수 있다.
		// 자동 생성된 id 를 그대로 읽어 쓰므로 중복 id 위험이 없다.
		_accentCss (u) {
			var a = this._accentColor;
			if (!a) return '';

			var css =
				u + ' .sapMInputBaseIcon { color: ' + a + ' !important; }\n' +
				// hover 는 테마 기본(회색)을 그대로 둔다. 여기까지 물들이면 과하다.
				// 누르는 중에는 강조색이 살짝 옅어진 톤,
				// 팝업이 열린 동안에는 강조색 원색. 테마 기본 동작과 같은 흐름이다.
				u + ' .sapMInputBaseIcon:active {\n' +
				'\tbackground-color: ' + withAlpha(a, 0.82) + ' !important;\n' +
				'\tcolor: #ffffff !important;\n' +
				'}\n' +
				u + '.sapMInputBaseIconPressed .sapMInputBaseIcon {\n' +
				'\tbackground-color: ' + a + ' !important;\n' +
				'\tcolor: #ffffff !important;\n' +
				'}\n';

			var rp = '.' + this._widgetUid + '-pop';

			css +=
				rp + ' .sapUiCalHead > button { color: ' + a + ' !important; }\n' +
				rp + ' .sapUiCalHead > button:hover {\n' +
				'\tbackground-color: ' + a + ' !important;\n' +
				'\tcolor: #ffffff !important;\n' +
				'}\n' +
				rp + ' .sapUiCalItemSel .sapUiCalItemText,\n' +
				rp + ' .sapUiCalItemSel {\n' +
				'\tbackground-color: ' + a + ' !important;\n' +
				'\tcolor: #ffffff !important;\n' +
				'}\n';
			return css;
		}

		// <4-3> 사용자가 값을 바꿨을 때
		_onChange () {
			if (!this._dp) return;

			// 사용자가 주중/월중 아무 날이나 골라도 모드에 맞게 정렬한다.
			var picked = snapToMode(this._dp.getDateValue(), this._dateMode, this._weekRule);
			this._dateVal = picked;
			this._dp.setDateValue(picked || null);

			this._fire({ dateVal: this._dateVal });
			this.dispatchEvent(new CustomEvent('onChange'));
		}

		_fire (props) {
			this.dispatchEvent(new CustomEvent('propertiesChanged', {
				detail: { properties: props }
			}));
		}

		// 값 → 문자열. 현재 모드 기준.
		_formatOne (d) {
			if (!isValidDate(d)) return '';
			if (this._dateMode === 'week') return this._fmtWeek(d);

			var pat = this._resolveDisplayFormat();
			if (!pat) return this._dp ? this._dp.getValue() : '';
			if (!this._DateFormat) return '';
			try {
				return this._DateFormat.getInstance({ pattern: pat }).format(d);
			} catch (e) {
				return '';
			}
		}

		// 성공하면 Date(또는 비우기면 null), 실패하면 undefined 를 돌려준다.
		_parseByMode (str) {
			if (str === null || str === undefined || String(str).trim() === '') return null;
			var d;
			if (this._dateMode === 'month')     d = parseMonthStr(str);
			else if (this._dateMode === 'week') d = parseWeekStr(str, this._weekRule);
			else                                d = parseDayStr(str);
			return d || this._reject(str);
		}

		_reject (str) {
			console.warn('[datepicker] "' + str + '" 은(는) 현재 모드(' + this._dateMode + ')의 형식과 맞지 않습니다.');
			return undefined;
		}

		// ── SAC 스크립트 API (manifest 의 body 없는 메서드들) ──

		clear () {
			this._dateVal = null;
			if (this._dp) this._dp.setDateValue(null);
			this._fire({ dateVal: null });
		}

		getDateVal () {
			var d = this._dp ? this._dp.getDateValue() : this._dateVal;
			return isValidDate(d) ? d : undefined;
		}

		getFormattedVal () {
			return this._formatOne(this.getDateVal());
		}

		// ── 오늘 / 이동 ──
		//
		// SAC 스크립트에는 Date 객체를 만들 수단이 사실상 없다.
		// Date.now() 와 Date.parse() 는 정수를 돌려주어 Date 파라미터에 넣을 수 없다.
		// 그래서 오늘 날짜가 필요한 일은 위젯 안에서 처리한다.

		_todayDate () {
			var n = new Date();
			return new Date(n.getFullYear(), n.getMonth(), n.getDate());
		}

		// 오늘로 설정. 현재 모드에 맞게 정렬된다.
		setToday () {
			this._dateVal = snapToMode(this._todayDate(), this._dateMode, this._weekRule);
			this._applyValue(this._dp);
			this._fire({ dateVal: this._dateVal });
		}

		// 오늘을 현재 모드 형식으로. 위젯 값은 바뀌지 않는다.
		getToday () {
			return this._formatOne(snapToMode(this._todayDate(), this._dateMode, this._weekRule));
		}

		// 오늘을 항상 날짜 형식으로. 모드와 무관하다.
		// 변환 함수에 넘길 값을 얻는 용도.
		getTodayDate () {
			return this._fmtDay(this._todayDate());
		}

		// 현재 모드 단위로 n 칸 이동한다.
		// 값이 없으면 오늘을 기준으로 삼는다. shift(0) 은 setToday() 와 같다.
		shift (n) {
			var step = parseInt(n, 10);
			if (isNaN(step)) step = 0;

			var base = isValidDate(this._dateVal) ? this._dateVal : this._todayDate();
			var d;
			if (this._dateMode === 'week')       d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + step * 7);
			else if (this._dateMode === 'month') d = new Date(base.getFullYear(), base.getMonth() + step, 1);
			else                                 d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + step);

			this._dateVal = snapToMode(d, this._dateMode, this._weekRule);
			this._applyValue(this._dp);
			this._fire({ dateVal: this._dateVal });
		}

		// ── 변환 전용 (위젯 값에 영향 없음) ──
		//
		// SAC 스크립트에서 ISO 주차를 직접 계산하려면 목요일 보정과
		// 연말 경계까지 다뤄야 해서 만만치 않다. 그 계산을 그대로 빌려준다.
		//
		// 출력 형식은 '출력 종류에 맞는 형식이 설정돼 있으면 그것, 아니면 기본값'.
		//   주차 → format 이 주차 패턴이면 그것, 아니면 YYYY.ww
		//   날짜 → format 이 날짜 패턴이면 그것, 아니면 yyyy.MM.dd
		// 입력 문자열은 구분자를 가리지 않는다. 2025.12.01 / 2025-12-01 / 20251201 모두 같다.

		convertDateToWeek (dv) {
			var d = this._toDate(dv);
			if (!isValidDate(d)) return this._rejectConv(dv, '날짜');
			return this._fmtWeek(d);
		}

		convertStrDateToWeek (s) {
			var d = parseDayStr(s);
			if (!d) return this._rejectConv(s, '날짜');
			return this._fmtWeek(d);
		}

		convertWeekToFirstDate (s) {
			var d = parseWeekStr(s, this._weekRule);
			if (!d) return this._rejectConv(s, '주차');
			return this._fmtDay(d);
		}

		convertWeekToEndDate (s) {
			var d = parseWeekStr(s, this._weekRule);
			if (!d) return this._rejectConv(s, '주차');
			return this._fmtDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 6));
		}

		convertMonthToEndDate (s) {
			var d = parseMonthStr(s);
			if (!d) return this._rejectConv(s, '월');
			// 다음 달 0일 = 이번 달 마지막 날. 윤년도 자동으로 처리된다.
			return this._fmtDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
		}

		_rejectConv (v, kind) {
			console.warn('[datepicker] "' + v + '" 은(는) ' + kind + ' 형식으로 읽을 수 없습니다.');
			return '';
		}

		// 주차 문자열. 자체 계산이라 로케일과 무관하다.
		_fmtWeek (d) {
			var pat = this._formatWeek || 'YYYY.ww';
			var w   = calcWeek(d, this._weekRule);
			var yy  = String(w.year);
			var ww  = (w.week < 10 ? '0' : '') + w.week;
			return pat.replace(/'([^']*)'/g, '$1')
			          .replace(/Y+/g, yy)
			          .replace(/w+/g, ww);
		}

		// 날짜 문자열.
		_fmtDay (d) {
			// Automatic(빈 값)은 로케일에 따라 달라져 변환 결과로 쓸 수 없다.
			// 변환 함수는 결과가 고정돼야 하므로 구체적인 기본 패턴으로 떨어뜨린다.
			var pat = this._formatDay || 'yyyy.MM.dd';
			if (this._DateFormat) {
				try { return this._DateFormat.getInstance({ pattern: pat }).format(d); }
				catch (e) { /* 아래 수동 처리로 */ }
			}
			// UI5 포매터를 아직 못 쓰는 경우의 대비책.
			var p = function (n) { return (n < 10 ? '0' : '') + n; };
			return pat.replace(/yyyy/g, d.getFullYear())
			          .replace(/MM/g, p(d.getMonth() + 1))
			          .replace(/dd/g, p(d.getDate()));
		}

		// getFormattedVal() 이 돌려준 문자열을 그대로 다시 넣을 수 있다.
		// 현재 dateMode 를 기준으로 해석하며, 모드 자체를 바꾸지는 않는다.
		setFormattedVal (s) {
			var d = this._parseByMode(s);
			if (d === undefined) return;              // 형식이 어긋나면 아무것도 하지 않는다

			this._dateVal = snapToMode(d, this._dateMode, this._weekRule);
			this._applyValue(this._dp);
			this._fire({ dateVal: this._dateVal });
		}
	}

	customElements.define(TAG, Main);
})();
