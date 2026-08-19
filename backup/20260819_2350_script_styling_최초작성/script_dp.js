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

	var TAG = 'com-sap-sac-datepicker-glp-main';

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

	// ────────────────────────────────────────────────────────────
	// <3> UI5 컨트롤 생성
	// ────────────────────────────────────────────────────────────

	function buildUI5 (host) {
		sap.ui.require([
			'sap/m/DatePicker',
			'sap/m/DateRangeSelection',
			'sap/ui/core/format/DateFormat'
		], function (DatePicker, DateRangeSelection, DateFormat) {

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

			dp.placeAt(host._container);
			host._dp = dp;

			host._applyTheme();
		});
	}

	// ────────────────────────────────────────────────────────────
	// <4> 웹컴포넌트
	// ────────────────────────────────────────────────────────────

	class Main extends HTMLElement {

		constructor () {
			super();
			this._widgetUid = 'dp-' + Math.random().toString(36).slice(2, 9);
			this._built     = false;
			this._dp        = null;

			this._dateMode    = 'day';
			this._weekRule    = 'ISO';
			this._format      = '';
			this._darktheme   = false;
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

			if (this._built) return;
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
				this._enablerange = !!changed.enablerange;
				needRebuild = true;                       // 컨트롤 클래스가 바뀐다
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
			if ('darktheme'     in changed) { this._darktheme     = !!changed.darktheme; }

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
			this._applyTheme();
		}

		// ── 내부 헬퍼 ──────────────────────────────────────────

		_destroyControl () {
			if (this._dp) {
				try { this._dp.destroy(); } catch (e) { /* 이미 파기됨 */ }
				this._dp = null;
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

		// 다크 테마는 파일을 늘리지 않도록 uid 로 스코프한 인라인 스타일로 처리.
		_applyTheme () {
			if (!this._styleEl) return;
			var u = '.' + this._widgetUid;
			var css = u + ' { margin: 0; }\n' +
			          u + ' .sapMInputBaseContentWrapper { border-color: transparent; }\n';
			if (this._darktheme) {
				css += u + ' .sapMInputBaseContentWrapper { background: transparent; }\n' +
				       u + ' .sapMInputBaseContentWrapper:hover,\n' +
				       u + ' .sapMInputBaseIcon:hover { background: rgba(42,73,100,.3) !important; }\n' +
				       u + ' .sapMInputBaseInner,\n' +
				       u + ' .sapMInputBaseIcon { color: #ffffff; }\n';
			}
			this._styleEl.textContent = css;
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
	}

	customElements.define(TAG, Main);
})();
