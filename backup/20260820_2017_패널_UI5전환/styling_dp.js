/*
 * Datepicker Widget - Styling Panel  (GLP)
 * tag : com-sap-sac-datepicker-glp-styling
 *
 * 디자인은 SAC-Custom-Widgets/datepicker 의 APS 패널을 따른다.
 * ( <p> 섹션 라벨 + fpa-icons 를 쓴 커스텀 체크박스 + ::after 화살표 셀렉트 )
 *
 * Date Mode 를 바꾸면 Date Format 의 선택지가 그 모드에 맞는 것으로 교체된다.
 * Week Rule 은 week 모드일 때만 노출된다.
 */
(function () {
	'use strict';

	var TAG   = 'com-sap-sac-datepicker-glp-styling';
	var BUILD = '2026-08-20 15:39 KST';   // 배포할 때마다 갱신. 콘솔에서 반영 여부를 확인한다.
	console.log('%c[datepicker] styling build ' + BUILD, 'color:#346187;font-weight:bold');

	// 모드별 형식 선택지. value 가 실제 displayFormat 패턴.
	var FORMATS = {
		day: [
			{ v: '',           t: 'Automatic'  },
			{ v: 'yyyy.MM.dd', t: 'YYYY.MM.DD' },
			{ v: 'yyyy-MM-dd', t: 'YYYY-MM-DD' },
			{ v: 'MM/dd/yyyy', t: 'MM/DD/YYYY' },
			{ v: 'dd.MM.yyyy', t: 'DD.MM.YYYY' }
		],
		week: [
			{ v: 'YYYY.ww',     t: 'YYYY.WW'  },
			{ v: 'YYYY-ww',     t: 'YYYY-WW'  },
			{ v: 'YYYY/ww',     t: 'YYYY/WW'  },
			{ v: "YYYY-'W'ww",  t: 'YYYY-Wnn' }
		],
		month: [
			{ v: 'yyyy.MM', t: 'YYYY.MM' },
			{ v: 'yyyy-MM', t: 'YYYY-MM' },
			{ v: 'MM/yyyy', t: 'MM/YYYY' },
			{ v: 'MMM yyyy', t: 'Mon YYYY' }
		]
	};

	// SAC 기본 패널의 폰트 목록을 그대로 따른다.
	// key 는 CSS font-family 값. '' 는 SAC 테마 상속(Default).
	var FONTS = [
		{ v: '',                                      t: 'Default' },
		{ v: "'72', '72full', Arial, sans-serif",      t: '72-Web' },
		{ v: 'Arial, sans-serif',                      t: 'Arial' },
		{ v: "'Courier New', Courier, monospace",      t: 'Courier' },
		{ v: 'Georgia, serif',                         t: 'Georgia' },
		{ v: 'Lato, sans-serif',                       t: 'Lato' },
		{ v: "'SAP-icons'",                            t: 'SAP-icons' },
		{ v: "'Times New Roman', Times, serif",        t: 'Times New Roman' },
		{ v: "'Trebuchet MS', sans-serif",             t: 'Trebuchet MS' },
		{ v: 'Verdana, sans-serif',                    t: 'Verdana' }
	];

	var FONT_SIZES  = [10, 12, 14, 16, 18, 20, 22, 24, 32, 48];
	var FONT_STYLES = ['Regular', 'Italic', 'Bold', 'Bold Italic'];

	var tmpl = document.createElement('template');
	tmpl.innerHTML = `
		<style>
		${TAG} * { box-sizing: border-box; }
		${TAG} > p {
			margin: 16px 0 4px 0;
			line-height: 22px;
			font-size: 0.875rem;
			color: #999999;
		}
		${TAG} > p:first-of-type { margin-top: 0; }
		${TAG} > label { color: #333333 !important; font-size: 0.875rem; }
		${TAG} select,
		${TAG} input[type="date"] {
			border: 1px solid rgb(191, 191, 191);
			padding: 3px 5px;
			width: 100%;
			font-size: 0.875rem;
			line-height: 22px;
			background: #ffffff;
			color: #333333;
		}
		${TAG} select:hover,
		${TAG} select:focus,
		${TAG} input[type="date"]:hover,
		${TAG} input[type="date"]:focus {
			border: 1px solid #346187;
			cursor: pointer;
		}
		/* 원본과 동일한 방식.
		   셀렉트를 20px 넓혀 브라우저 기본 화살표를 감싸는 div 밖으로 밀어내고,
		   div.select 의 overflow:hidden 으로 잘라낸다.
		   결과적으로 ::after 로 그린 fpa-icons 화살표 하나만 보인다. */
		${TAG} > div.select > select { width: calc(100% + 20px); }
		${TAG} > div.select { position: relative; overflow: hidden; }
		${TAG} > div.select::after {
			content: "\\e7ac";
			font-family: "fpa-icons";
			color: #346187;
			position: absolute;
			right: 0;
			top: 0;
			height: 100%;
			width: 34px;
			line-height: 22px;
			text-align: center;
			border: 1px solid transparent;
			border-right: 1px solid rgb(191, 191, 191);
			pointer-events: none;
		}
		${TAG} > div.select:focus-within::after,
		${TAG} > div.select:hover::after {
			background-color: rgba(179, 179, 179, 0.5);
			border: 1px solid #346187;
			border-left-color: transparent;
		}
		${TAG} .checkbox {
			position: relative;
			display: flex;
			align-items: center;
			height: 22px;
		}
		${TAG} .checkbox input {
			position: absolute;
			opacity: 0;
			cursor: pointer;
			height: 0;
			width: 0;
		}
		${TAG} .checkbox div.checkmark {
			position: relative;
			height: 16px;
			width: 16px;
			background-color: #fff;
			border: 0.125rem solid #bfbfbf;
			margin-right: 0.5rem;
			flex: none;
		}
		${TAG} .checkbox div.checkmark:hover { cursor: pointer; border-color: #427cac; }
		${TAG} .checkbox input:checked ~ div.checkmark:after {
			content: "\\e614";
			font-family: "fpa-icons";
			color: #427cac;
			position: absolute;
			width: 100%;
			height: 100%;
			font-size: 0.625rem;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		${TAG} .checkbox input:focus ~ div.checkmark { outline: 1px dotted #333; }
		${TAG} input[type="color"] {
			width: 100%;
			height: 26px;
			padding: 2px;
			border: 1px solid rgb(191, 191, 191);
			background: #ffffff;
			cursor: pointer;
		}
		${TAG} input[type="color"]:disabled { opacity: .45; cursor: default; }
		${TAG} .hidden { display: none !important; }
		${TAG} p.hint {
			color: #666666;
			font-size: 0.75rem;
			margin: 4px 0 0 0;
			white-space: normal;
			line-height: 1.4;
		}
		</style>

		<p>Date Mode</p>
		<div class="select">
			<select id="dateMode">
				<option value="day">Day</option>
				<option value="week">Week</option>
				<option value="month">Month</option>
			</select>
		</div>

		<p>Date Format</p>
		<div class="select">
			<select id="format"></select>
		</div>

		<p id="weekRuleLabel">Week Numbering Rule</p>
		<div class="select" id="weekRuleWrap">
			<select id="weekRule">
				<option value="ISO">ISO 8601 (Mon, 1st Thursday)</option>
				<option value="JAN1">Mon start, week of Jan 1</option>
				<option value="US">Sun start, week of Jan 1</option>
			</select>
		</div>
		<p class="hint" id="weekRuleHint"></p>

		<p>Miscellaneous</p>
		<label class="checkbox"><input type="checkbox" id="range" /><div class="checkmark"></div>Enable date range selection</label>

		<p>Font</p>
		<div class="select">
			<select id="fontFamily"></select>
		</div>

		<p>Font Size</p>
		<input id="fontSize" list="dpFontSizes" inputmode="numeric" placeholder="Default" />
		<datalist id="dpFontSizes"></datalist>

		<p>Font Style</p>
		<div class="select">
			<select id="fontStyle"></select>
		</div>

		<p>Font Color</p>
		<label class="checkbox"><input type="checkbox" id="fontColorDefault" /><div class="checkmark"></div>Use default</label>
		<input type="color" id="fontColor" value="#000000" />

		<p>Minimum Date Value</p>
		<input type="date" id="minDate" />

		<p>Maximum Date Value</p>
		<input type="date" id="maxDate" />
	`;

	// yyyy-MM-dd ↔ Date
	function toInputValue (d) {
		if (!(d instanceof Date) || isNaN(d.getTime())) return '';
		var m = d.getMonth() + 1, day = d.getDate();
		return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
	}
	function fromInputValue (s) {
		if (!s) return null;
		var p = s.split('-');
		if (p.length !== 3) return null;
		var d = new Date(+p[0], +p[1] - 1, +p[2]);
		return isNaN(d.getTime()) ? null : d;
	}

	class Styling extends HTMLElement {

		constructor () {
			super();
			this.appendChild(tmpl.content.cloneNode(true));

			this._dateMode    = 'day';
			this._format      = '';
			this._weekRule    = 'ISO';
			this._enablerange = false;
			this._fontFamily  = '';
			this._fontSize    = 0;
			this._fontStyle   = 'Regular';
			this._fontColor   = '';
			this._minDateVal  = null;
			this._maxDateVal  = null;

			this.$ = {
				dateMode:      this.querySelector('#dateMode'),
				format:        this.querySelector('#format'),
				weekRule:      this.querySelector('#weekRule'),
				weekRuleWrap:  this.querySelector('#weekRuleWrap'),
				weekRuleLabel: this.querySelector('#weekRuleLabel'),
				weekRuleHint:  this.querySelector('#weekRuleHint'),
				range:         this.querySelector('#range'),
				fontFamily:    this.querySelector('#fontFamily'),
				fontSize:      this.querySelector('#fontSize'),
				fontSizes:     this.querySelector('#dpFontSizes'),
				fontStyle:     this.querySelector('#fontStyle'),
				fontColor:     this.querySelector('#fontColor'),
				fontColorDef:  this.querySelector('#fontColorDefault'),
				minDate:       this.querySelector('#minDate'),
				maxDate:       this.querySelector('#maxDate')
			};

			// Date Mode 를 바꾸면 형식 목록을 갈아끼우고 첫 항목으로 초기화한다.
			// 이전 모드의 패턴이 남아 있으면 캘린더 종류가 엉뚱하게 잡힌다.
			this.$.dateMode.addEventListener('change', function () {
				this._dateMode = this.$.dateMode.value;
				this._fillFormats(null);
				this._format = this.$.format.value;
				this._syncVisibility();
				this._send('dateMode', this._dateMode);
				this._send('format', this._format);
			}.bind(this));

			this.$.format.addEventListener('change', function () {
				this._format = this.$.format.value;
				this._send('format', this._format)
			}.bind(this));

			this.$.weekRule.addEventListener('change', function () {
				this._weekRule = this.$.weekRule.value;
				this._updateHint();
				this._send('weekRule', this._weekRule)
			}.bind(this));

			this.$.range.addEventListener('change', function () {
				this._enablerange = this.$.range.checked;
				this._send('enablerange', this._enablerange)
			}.bind(this));

			this.$.fontFamily.addEventListener('change', function () {
				this._fontFamily = this.$.fontFamily.value;
				this._send('fontFamily', this._fontFamily);
			}.bind(this));

			// 목록에서 고르거나 직접 입력하거나 둘 다 허용한다.
			this.$.fontSize.addEventListener('change', function () {
				var raw = String(this.$.fontSize.value).replace(/[^0-9]/g, '');
				var n   = raw === '' ? 0 : Math.min(96, Math.max(6, parseInt(raw, 10)));
				this._fontSize = isNaN(n) ? 0 : n;
				this.$.fontSize.value = this._fontSize ? String(this._fontSize) : '';
				this._send('fontSize', this._fontSize);
			}.bind(this));

			this.$.fontStyle.addEventListener('change', function () {
				this._fontStyle = this.$.fontStyle.value;
				this._send('fontStyle', this._fontStyle);
			}.bind(this));

			this.$.fontColor.addEventListener('change', function () {
				this._fontColor = this.$.fontColor.value;
				this.$.fontColorDef.checked = false;
				this.$.fontColor.disabled = false;
				this._send('fontColor', this._fontColor);
			}.bind(this));

			// 체크하면 SAC 테마 색을 그대로 쓴다(빈 값).
			this.$.fontColorDef.addEventListener('change', function () {
				var useDefault = this.$.fontColorDef.checked;
				this.$.fontColor.disabled = useDefault;
				this._fontColor = useDefault ? '' : (this.$.fontColor.value || '#000000');
				this._send('fontColor', this._fontColor);
			}.bind(this));

			this.$.minDate.addEventListener('change', function () {
				this._minDateVal = fromInputValue(this.$.minDate.value);
				this._send('minDateVal', this._minDateVal)
			}.bind(this));

			this.$.maxDate.addEventListener('change', function () {
				this._maxDateVal = fromInputValue(this.$.maxDate.value);
				this._send('maxDateVal', this._maxDateVal)
			}.bind(this));

			this._fillStatic();
			this._fillFormats(this._format);
			this._syncVisibility();
			this._updateHint();
		}

		connectedCallback () {
			this._render();
		}

		// SAC 가 값을 밀어 넣는 지점.
		// 트리 위젯은 onCustomWidgetAfterUpdate 를, nkappler 는 개별 setter 를 쓴다.
		// 어느 쪽이 호출되든 동작하도록 둘 다 둔다.
		onCustomWidgetAfterUpdate (changed) {
			if (!changed) return;
			if ('dateMode'    in changed) this._dateMode    = changed.dateMode || 'day';
			if ('format'      in changed) this._format      = changed.format || '';
			if ('weekRule'    in changed) this._weekRule    = changed.weekRule || 'ISO';
			if ('enablerange' in changed) this._enablerange = !!changed.enablerange;
			if ('fontFamily'  in changed) this._fontFamily  = changed.fontFamily || '';
			if ('fontSize'    in changed) this._fontSize    = Number(changed.fontSize) || 0;
			if ('fontStyle'   in changed) this._fontStyle   = changed.fontStyle || 'Regular';
			if ('fontColor'   in changed) this._fontColor   = changed.fontColor || '';
			if ('minDateVal'  in changed) this._minDateVal  = changed.minDateVal ? new Date(changed.minDateVal) : null;
			if ('maxDateVal'  in changed) this._maxDateVal  = changed.maxDateVal ? new Date(changed.maxDateVal) : null;
			this._render();
		}

		set dateMode    (v) { this._dateMode    = v || 'day';  this._render(); }
		set format      (v) { this._format      = v || '';     this._render(); }
		set weekRule    (v) { this._weekRule    = v || 'ISO';  this._render(); }
		set enablerange (v) { this._enablerange = !!v;         this._render(); }
		set fontFamily  (v) { this._fontFamily  = v || '';        this._render(); }
		set fontSize    (v) { this._fontSize    = Number(v) || 0; this._render(); }
		set fontStyle   (v) { this._fontStyle   = v || 'Regular'; this._render(); }
		set fontColor   (v) { this._fontColor   = v || '';        this._render(); }
		set minDateVal  (v) { this._minDateVal  = v ? new Date(v) : null; this._render(); }
		set maxDateVal  (v) { this._maxDateVal  = v ? new Date(v) : null; this._render(); }

		get dateMode    () { return this._dateMode; }
		get format      () { return this._format; }
		get weekRule    () { return this._weekRule; }
		get enablerange () { return this._enablerange; }
		get fontFamily  () { return this._fontFamily; }
		get fontSize    () { return this._fontSize; }
		get fontStyle   () { return this._fontStyle; }
		get fontColor   () { return this._fontColor; }
		get minDateVal  () { return this._minDateVal; }
		get maxDateVal  () { return this._maxDateVal; }

		// 폰트/사이즈/스타일 목록은 고정이라 한 번만 채운다.
		_fillStatic () {
			var add = function (parent, value, text) {
				var o = document.createElement('option');
				o.value = value;
				if (text !== undefined) o.textContent = text;
				parent.appendChild(o);
			};
			FONTS.forEach(function (f) { add(this.$.fontFamily, f.v, f.t); }.bind(this));
			FONT_STYLES.forEach(function (v) { add(this.$.fontStyle, v, v); }.bind(this));
			FONT_SIZES.forEach(function (n) { add(this.$.fontSizes, String(n)); }.bind(this));
		}

		_fillFormats (keep) {
			var list = FORMATS[this._dateMode] || FORMATS.day;
			this.$.format.innerHTML = '';
			list.forEach(function (o) {
				var opt = document.createElement('option');
				opt.value = o.v;
				opt.textContent = o.t;
				this.$.format.appendChild(opt);
			}.bind(this));

			// 저장된 값이 현재 모드의 선택지에 있으면 유지, 없으면 첫 항목.
			var found = list.some(function (o) { return o.v === keep; });
			this.$.format.value = found ? keep : list[0].v;
		}

		_syncVisibility () {
			var isWeek = (this._dateMode === 'week');
			this.$.weekRuleWrap.classList.toggle('hidden', !isWeek);
			this.$.weekRuleLabel.classList.toggle('hidden', !isWeek);
			this.$.weekRuleHint.classList.toggle('hidden', !isWeek);
		}

		// 규칙이 실제로 어떻게 다른지 경계 날짜로 보여준다.
		_updateHint () {
			var map = {
				ISO:  '2027-01-01 → 2026.53',
				JAN1: '2027-01-01 → 2027.01',
				US:   '2027-01-01 → 2027.01'
			};
			this.$.weekRuleHint.textContent = 'Example: ' + (map[this._weekRule] || map.ISO);
		}

		_render () {
			if (!this.$) return;
			this.$.dateMode.value = this._dateMode;
			this._fillFormats(this._format);
			this.$.weekRule.value = this._weekRule;
			this.$.range.checked  = this._enablerange;
			this.$.fontFamily.value = this._fontFamily;
			this.$.fontStyle.value  = this._fontStyle;
			this.$.fontSize.value   = this._fontSize ? String(this._fontSize) : '';
			var useDefault = !this._fontColor;
			this.$.fontColorDef.checked = useDefault;
			this.$.fontColor.disabled   = useDefault;
			if (this._fontColor) this.$.fontColor.value = this._fontColor;
			this.$.minDate.value  = toInputValue(this._minDateVal);
			this.$.maxDate.value  = toInputValue(this._maxDateVal);
			this._syncVisibility();
			this._updateHint();
		}

		// 트리 위젯과 동일하게 "바뀐 것 하나만" 보낸다.
		// 전체를 매번 보내면 아직 수신하지 못한 값들이 초기값으로 덮어써진다.
		_send (name, value) {
			this.dispatchEvent(new CustomEvent('propertiesChanged', {
				detail: { properties: { [name]: value } },
				bubbles: true,
				composed: true
			}));
		}
	}

	customElements.define(TAG, Styling);
})();
