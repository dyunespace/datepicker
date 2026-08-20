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
 *   week  : 일반 날짜 캘린더 + 주 스냅  → YYYY.ww   (주 첫날로 자동 선택)
 *   month : 12개월 버튼 그리드          → yyyy.MM
 *
 * [주차 규칙]
 *   ISO  = 월요일 시작 / 첫 목요일이 포함된 주가 1주차   (firstDayOfWeek 1, minimalDays 4)
 *   JAN1 = 월요일 시작 / 1월 1일이 포함된 주가 1주차      (1, 1)
 *   US   = 일요일 시작 / 1월 1일이 포함된 주가 1주차      (0, 1)
 */
(function () {
	'use strict';

	var TAG   = 'com-sap-sac-datepicker-glp-main';
	var BUILD = '2026-08-20 13:55 KST';   // 배포할 때마다 갱신. 콘솔에서 반영 여부를 확인한다.
	console.log('%c[datepicker] main build ' + BUILD, 'color:#346187;font-weight:bold');

	// ────────────────────────────────────────────────────────────
	// <1> 상수
	// ────────────────────────────────────────────────────────────

	// 주차 규칙 → DateFormat 옵션 매핑.
	// cwn 은 팝업 캘린더(sap.ui.unified.Calendar)에 넘길 열거형.
	// JAN1 은 대응하는 열거형이 없어 null → 캘린더 팝업은 로케일 기본값을 쓴다.
	var WEEK_RULES = {
		ISO:  { firstDayOfWeek: 1, minimalDaysInFirstWeek: 4, cwn: 'ISO_8601' },
		JAN1: { firstDayOfWeek: 1, minimalDaysInFirstWeek: 1, cwn: null },
		US:   { firstDayOfWeek: 0, minimalDaysInFirstWeek: 1, cwn: 'WesternTraditional' }
	};

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
		var r  = WEEK_RULES[rule] || WEEK_RULES.ISO;
		var t  = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
		var ws = weekStartOf(t, r.firstDayOfWeek);
		// 앵커 = 주 시작 + (7 - minimalDays)일. ISO 라면 목요일.
		var y  = new Date(ws + (7 - r.minimalDaysInFirstWeek) * 864e5).getUTCFullYear();
		var w1 = weekStartOf(Date.UTC(y, 0, r.minimalDaysInFirstWeek), r.firstDayOfWeek);
		return { year: y, week: Math.round((ws - w1) / 6048e5) + 1 };
	}

	// 해당 날짜가 속한 주의 첫날(로컬 Date).
	function weekStartDate (d, rule) {
		var r  = WEEK_RULES[rule] || WEEK_RULES.ISO;
		var t  = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
		var ws = new Date(weekStartOf(t, r.firstDayOfWeek));
		return new Date(ws.getUTCFullYear(), ws.getUTCMonth(), ws.getUTCDate());
	}

	function isValidDate (d) {
		return d instanceof Date && !isNaN(d.getTime());
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

	// 주 기준 연도 + 주차 → 그 주의 첫날.
	function weekToDate (y, w, rule) {
		var r  = WEEK_RULES[rule] || WEEK_RULES.ISO;
		var w1 = weekStartOf(Date.UTC(y, 0, r.minimalDaysInFirstWeek), r.firstDayOfWeek);
		var d  = new Date(w1 + (w - 1) * 6048e5);
		return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
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

		sap.ui.require([
			'sap/m/DatePicker',
			'sap/m/DateRangeSelection',
			'sap/ui/core/format/DateFormat'
		], function (DatePicker, DateRangeSelection, DateFormat) {

			// 늦게 도착한 콜백이면 아무것도 하지 않는다.
			if (token !== host._buildToken || !host._container || !host.isConnected) return;

			// MODULES 배열 순서 = 콜백 인자 순서. 어긋나면 조용히 오동작한다.
			host._DateFormat = DateFormat;

			var Ctor = host._enablerange ? DateRangeSelection : DatePicker;
			var dp = new Ctor({
				width: '100%',
				displayFormat: host._resolveDisplayFormat(),
				change: function (oEvent) { host._onChange(oEvent); }
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
					var r = WEEK_RULES[host._weekRule] || WEEK_RULES.ISO;
					oArgs.firstDayOfWeek           = r.firstDayOfWeek;
					oArgs.minimalDaysInFirstWeek   = r.minimalDaysInFirstWeek;
					return DateFormat.getInstance(oArgs);
				};
			}

			host._applyWeekNumbering(dp);
			host._applyMinMax(dp);
			host._applyValues(dp);

			if (token !== host._buildToken) { try { dp.destroy(); } catch (e) {} return; }

			// 남아 있을 수 있는 이전 컨트롤과 마운트를 먼저 걷어낸다.
			host._destroyControl();

			// UI5 전용 마운트를 매번 새로 만든다.
			// placeAt 은 기본이 "맨 뒤에 추가"라 같은 노드에 반복하면 컨트롤이 쌓인다.
			// setVisible 을 껐다 켤 때 아래로 복제되던 원인.
			// 또한 placeAt 대상 노드는 UIArea 가 내용을 관리하므로
			// <style> 태그와 섞이지 않도록 분리한다.
			host._mount = document.createElement('div');
			host._mount.style.cssText = 'width:100%;';
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
			this._widgetUid = 'dp-' + Math.random().toString(36).slice(2, 9);
			this._built      = false;
			this._dp         = null;
			this._mount      = null;
			this._buildToken = 0;

			this._dateMode    = 'day';
			this._weekRule    = 'ISO';
			this._format      = '';
			this._enablerange = false;
			this._dateVal       = null;
			this._secondDateVal = null;
			this._minDateVal    = null;
			this._maxDateVal    = null;
		}

		// <4-1> 화면에 배치될 때
		connectedCallback () {
			if (!this._container) {
				this._container = document.createElement('div');
				this._container.className = this._widgetUid;
				this._container.style.cssText = 'width:100%;height:100%;';
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
			if (this._container) {
				this._container.style.width  = width  + 'px';
				this._container.style.height = height + 'px';
			}
		}

		// <4-2> SAC 프로퍼티 변경 수신
		onCustomWidgetAfterUpdate (changed) {
			var needRebuild = false;
			var needFormat  = false;

			if ('enablerange' in changed) {
				var er = !!changed.enablerange;
				// 값이 실제로 달라졌을 때만 재생성한다.
				// SAC 가 변경 없는 프로퍼티까지 함께 보내는 경우가 있어,
				// 무조건 재생성하면 선택값이 사라지고 화면이 깜빡인다.
				if (er !== this._enablerange) {
					this._enablerange = er;
					needRebuild = true;                   // 컨트롤 클래스가 바뀐다
				}
			}
			if ('dateMode' in changed) {
				this._dateMode = changed.dateMode || 'day';
				needFormat = true;
			}
			if ('format' in changed) {
				this._format = changed.format || '';
				needFormat = true;
			}
			if ('weekRule' in changed) {
				this._weekRule = changed.weekRule || 'ISO';
				needFormat = true;
			}
			if ('dateVal'       in changed) { this._dateVal       = this._toDate(changed.dateVal); }
			if ('secondDateVal' in changed) { this._secondDateVal = this._toDate(changed.secondDateVal); }
			if ('minDateVal'    in changed) { this._minDateVal    = this._toDate(changed.minDateVal); }
			if ('maxDateVal'    in changed) { this._maxDateVal    = this._toDate(changed.maxDateVal); }

			if (needRebuild) {
				this._destroyControl();
				if (window.sap && window.sap.ui && window.sap.ui.require) buildUI5(this);
				return;
			}

			if (!this._dp) return;

			if (needFormat) {
				this._dp.setDisplayFormat(this._resolveDisplayFormat());
				this._applyWeekNumbering(this._dp);
			}
			this._applyMinMax(this._dp);
			this._applyValues(this._dp);
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

		// 표시 형식 결정. 사용자가 고른 format 이 우선, 없으면 모드 기본값.
		_resolveDisplayFormat () {
			if (this._format) return this._format;
			return DEFAULT_FORMAT[this._dateMode] !== undefined
				? DEFAULT_FORMAT[this._dateMode]
				: '';
		}

		// 팝업 캘린더의 주차 표기 기준을 입력창과 맞춘다.
		_applyWeekNumbering (dp) {
			if (!dp || typeof dp.setCalendarWeekNumbering !== 'function') return;
			var r = WEEK_RULES[this._weekRule] || WEEK_RULES.ISO;
			try { dp.setCalendarWeekNumbering(r.cwn || 'Default'); } catch (e) { /* 미지원 버전 */ }
		}

		_applyMinMax (dp) {
			if (!dp) return;
			if (typeof dp.setMinDate === 'function') dp.setMinDate(this._minDateVal || null);
			if (typeof dp.setMaxDate === 'function') dp.setMaxDate(this._maxDateVal || null);
		}

		_applyValues (dp) {
			if (!dp) return;
			var start = this._dateVal;

			// 주 모드에서는 항상 주의 첫날을 가리키게 정렬한다.
			if (this._dateMode === 'week' && isValidDate(start)) {
				start = weekStartDate(start, this._weekRule);
			}

			dp.setDateValue(start || null);

			if (this._enablerange && typeof dp.setSecondDateValue === 'function') {
				var end = this._secondDateVal;
				if (this._dateMode === 'week' && isValidDate(end)) {
					end = weekStartDate(end, this._weekRule);
				}
				dp.setSecondDateValue(end || null);
			}
		}

		// UI5 입력 필드의 기본 테두리를 지워 SAC 배경에 자연스럽게 얹는다.
		// uid 로 스코프해 같은 스토리의 다른 위젯에 영향을 주지 않는다.
		_applyBaseStyle () {
			if (!this._styleEl) return;
			var u = '.' + this._widgetUid;
			this._styleEl.textContent =
				u + ' { margin: 0; }\n' +
				u + ' .sapMInputBaseContentWrapper { border-color: transparent; }\n';
		}

		// <4-3> 값 변경 시 SAC 로 통보
		_onChange (oEvent) {
			if (!this._dp) return;

			var start = this._dp.getDateValue();
			var end   = (this._enablerange && typeof this._dp.getSecondDateValue === 'function')
				? this._dp.getSecondDateValue() : null;

			// 주 모드: 사용자가 주중 아무 날이나 골라도 그 주의 첫날로 스냅.
			if (this._dateMode === 'week') {
				if (isValidDate(start)) {
					start = weekStartDate(start, this._weekRule);
					this._dp.setDateValue(start);
				}
				if (isValidDate(end)) {
					end = weekStartDate(end, this._weekRule);
					if (typeof this._dp.setSecondDateValue === 'function') {
						this._dp.setSecondDateValue(end);
					}
				}
			}

			this._dateVal       = start || null;
			this._secondDateVal = end   || null;

			this.dispatchEvent(new CustomEvent('propertiesChanged', {
				detail: {
					properties: {
						dateVal:       this._dateVal,
						secondDateVal: this._secondDateVal
					}
				}
			}));
			this.dispatchEvent(new CustomEvent('onChange'));
		}

		// 값 → 문자열. 자체 계산이라 로케일과 무관하게 결과가 고정된다.
		_format1 (d) {
			if (!isValidDate(d)) return '';
			var pat = this._resolveDisplayFormat();

			if (this._dateMode === 'week') {
				var w = calcWeek(d, this._weekRule);
				var yy = String(w.year);
				var ww = (w.week < 10 ? '0' : '') + w.week;
				// 패턴에 주차 심볼이 없으면 기본 표기로.
				if (!/w/.test(pat)) return yy + '.' + ww;
				return pat.replace(/'([^']*)'/g, '$1')
				          .replace(/Y+/g, yy)
				          .replace(/w+/g, ww);
			}

			// day / month 는 UI5 공개 API 로 포맷.
			if (!pat) return this._dp ? this._dp.getValue() : '';
			if (!this._DateFormat) return '';
			try {
				return this._DateFormat.getInstance({ pattern: pat }).format(d);
			} catch (e) {
				return '';
			}
		}

		// ── SAC 스크립트 API (manifest 의 body 없는 메서드들) ──

		clear () {
			this._dateVal = null;
			this._secondDateVal = null;
			if (this._dp) {
				this._dp.setDateValue(null);
				if (typeof this._dp.setSecondDateValue === 'function') {
					this._dp.setSecondDateValue(null);
				}
			}
			this.dispatchEvent(new CustomEvent('propertiesChanged', {
				detail: { properties: { dateVal: null, secondDateVal: null } }
			}));
		}

		getDateVal () {
			var d = this._dp ? this._dp.getDateValue() : this._dateVal;
			return isValidDate(d) ? d : undefined;
		}

		getSecondDateVal () {
			if (!this._enablerange) return undefined;
			var d = (this._dp && typeof this._dp.getSecondDateValue === 'function')
				? this._dp.getSecondDateValue() : this._secondDateVal;
			return isValidDate(d) ? d : undefined;
		}

		getFormattedVal () {
			return this._format1(this.getDateVal());
		}

		getSecondFormattedVal () {
			if (!this._enablerange) return '';
			return this._format1(this.getSecondDateVal());
		}

		// getFormattedVal() 이 돌려준 문자열을 그대로 다시 넣을 수 있다.
		// 현재 dateMode 를 기준으로 해석하며, 모드 자체를 바꾸지는 않는다.
		setFormattedVal (s) {
			this._setFormatted(s, false);
		}

		setSecondFormattedVal (s) {
			if (!this._enablerange) return;
			this._setFormatted(s, true);
		}

		_setFormatted (str, isSecond) {
			var d = this._parseByMode(str);
			if (d === undefined) return;              // 형식이 어긋나면 아무것도 하지 않는다

			if (isSecond) this._secondDateVal = d;
			else          this._dateVal       = d;

			this._applyValues(this._dp);
			this.dispatchEvent(new CustomEvent('propertiesChanged', {
				detail: {
					properties: {
						dateVal:       this._dateVal,
						secondDateVal: this._secondDateVal
					}
				}
			}));
		}

		// 성공하면 Date(또는 비우기면 null), 실패하면 undefined 를 돌려준다.
		_parseByMode (str) {
			if (str === null || str === undefined || String(str).trim() === '') return null;

			var g, d;
			if (this._dateMode === 'month') {
				g = numGroups(str, 2);
				if (!g || g[1] < 1 || g[1] > 12) return this._reject(str);
				return new Date(g[0], g[1] - 1, 1);
			}

			if (this._dateMode === 'week') {
				g = numGroups(str, 2);
				if (!g || g[1] < 1 || g[1] > 53) return this._reject(str);
				d = weekToDate(g[0], g[1], this._weekRule);
				// 52주뿐인 해에 53주를 넣는 경우를 걸러낸다.
				var back = calcWeek(d, this._weekRule);
				if (back.year !== g[0] || back.week !== g[1]) return this._reject(str);
				return d;
			}

			g = numGroups(str, 3);
			if (!g || g[1] < 1 || g[1] > 12 || g[2] < 1 || g[2] > 31) return this._reject(str);
			d = new Date(g[0], g[1] - 1, g[2]);
			// 2월 30일 같은 값이 다음 달로 넘어가는 것을 막는다.
			if (d.getMonth() !== g[1] - 1 || d.getDate() !== g[2]) return this._reject(str);
			return d;
		}

		_reject (str) {
			console.warn('[datepicker] "' + str + '" 은(는) 현재 모드(' + this._dateMode + ')의 형식과 맞지 않습니다.');
			return undefined;
		}
	}

	customElements.define(TAG, Main);
})();
