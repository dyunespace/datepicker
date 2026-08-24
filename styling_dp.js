/*
 * Datepicker Widget - Styling Panel  (GLP)
 * tag : com-sap-sac-datepicker-glp-styling
 *
 * SAC 기본 서식 패널과 동일한 UI5 컨트롤로 구성한다.
 *
 * 컨트롤 선택 근거 (UI5 1.120.2 소스 확인)
 *   - Font / Font Style / Date Mode 등 목록 선택  -> sap.m.Select
 *       Control 을 직접 상속해 <div> 로 렌더링된다. 입력 요소가 없어 타이핑이 불가능하다.
 *   - Size 처럼 임의 값도 받아야 하는 것         -> sap.m.ComboBox
 *       ComboBoxBase -> ComboBoxTextField -> InputBase 계보라 실제 <input> 을 그린다.
 *       InputBase.onChange 가 DOM 값을 검증 없이 그대로 넘기므로
 *       목록에 없는 숫자를 입력해도 그대로 반영된다.
 *
 * 배치도 SAC 원본을 따라 라벨을 컨트롤 위에 두고,
 * Font / Size / Color 를 한 행에, Font Style 을 그 아래 행에 놓는다.
 *
 * 값 전달은 트리 위젯과 같이 "바뀐 것 하나만" 보낸다.
 * 전체를 매번 보내면 아직 수신하지 못한 값이 초기값으로 덮어써진다.
 */
(function () {
	'use strict';

	var TAG   = 'com-sap-sac-datepicker-glp-styling';
	var BUILD = '2026-08-24 22:29 KST';   // 배포할 때마다 갱신. 콘솔에서 반영 여부를 확인한다.
	console.log('%c[datepicker] styling build ' + BUILD + ' (UI5)', 'color:#346187;font-weight:bold');

	// 모드별 형식 선택지. key 가 실제 displayFormat 패턴.
	// 모드별 형식 선택지. k 가 실제 displayFormat 패턴.
	// 구분자 없는 형태(yyyyMMdd, YYYYww, yyyyMM)는 BW 로 값을 넘길 때 쓰인다.
	var FORMATS = {
		day: [
			{ k: 'yyyy.MM.dd', t: 'YYYY.MM.DD' },
			{ k: 'yyyyMMdd',   t: 'YYYYMMDD' },
			{ k: 'yyyy-MM-dd', t: 'YYYY-MM-DD' },
			{ k: 'MM/dd/yyyy', t: 'MM/DD/YYYY' },
			{ k: 'dd.MM.yyyy', t: 'DD.MM.YYYY' },
			{ k: '',           t: 'Automatic' }
		],
		week: [
			{ k: 'YYYY.ww',    t: 'YYYY.WW' },
			{ k: 'YYYYww',     t: 'YYYYWW' },
			{ k: 'YYYY-ww',    t: 'YYYY-WW' },
			{ k: "YYYY-'W'ww", t: 'YYYY-Wnn' }
		],
		month: [
			{ k: 'yyyy.MM', t: 'YYYY.MM' },
			{ k: 'yyyyMM',  t: 'YYYYMM' },
			{ k: 'yyyy-MM', t: 'YYYY-MM' },
			{ k: 'MM/yyyy', t: 'MM/YYYY' }
		]
	};

	// 모드 → 형식 프로퍼티 이름
	var FORMAT_PROP = { day: 'formatDay', week: 'formatWeek', month: 'formatMonth' };

	// SAC 기본 패널의 폰트 목록. key 는 CSS font-family 값, '' 는 테마 상속.
	var FONTS = [
		{ k: '',                                  t: 'Default' },
		{ k: "'72', '72full', Arial, sans-serif", t: '72-Web' },
		{ k: 'Arial, sans-serif',                 t: 'Arial' },
		{ k: "'Courier New', Courier, monospace", t: 'Courier' },
		{ k: 'Georgia, serif',                    t: 'Georgia' },
		{ k: 'Lato, sans-serif',                  t: 'Lato' },
		{ k: "'SAP-icons'",                       t: 'SAP-icons' },
		{ k: "'Times New Roman', Times, serif",   t: 'Times New Roman' },
		{ k: "'Trebuchet MS', sans-serif",        t: 'Trebuchet MS' },
		{ k: 'Verdana, sans-serif',               t: 'Verdana' }
	];

	var FONT_SIZES  = [10, 12, 14, 16, 18, 20, 22, 24, 32, 48];
	var FONT_STYLES = ['Regular', 'Italic', 'Bold', 'Bold Italic'];

	// 키는 UI5 공식 열거형 CalendarWeekNumbering 을 따른다.
	// MondayJan1 만 그 열거형에 없는 조합이라 자체 키를 쓴다.
	var WEEK_RULES = [
		{ k: 'ISO_8601',           t: 'ISO 8601 (Mon, 1st Thu)',   hint: '2027-01-01 \u2192 2026.53' },
		{ k: 'MondayJan1',         t: 'Monday, week of Jan 1',     hint: '2027-01-01 \u2192 2027.01' },
		{ k: 'WesternTraditional', t: 'Western (Sun, week of Jan 1)', hint: '2027-01-01 \u2192 2027.01' },
		{ k: 'MiddleEastern',      t: 'Middle Eastern (Sat)',      hint: '2027-01-01 \u2192 2027.01' }
	];

	var WEEK_RULE_ALIAS = { ISO: 'ISO_8601', US: 'WesternTraditional', JAN1: 'MondayJan1' };

	function normRule (v) {
		var k = WEEK_RULE_ALIAS[v] || v;
		return WEEK_RULES.some(function (r) { return r.k === k; }) ? k : 'ISO_8601';
	}

	var DEFAULT_COLOR = '#333333';

	function toInputValue (d) {
		if (!(d instanceof Date) || isNaN(d.getTime())) return '';
		var m = d.getMonth() + 1, day = d.getDate();
		return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
	}

	// ────────────────────────────────────────────────────────────
	// UI5 패널 구성
	// ────────────────────────────────────────────────────────────

	function buildUI5Panel (host) {
		if (!host._container) return;
		var token = ++host._buildToken;

		// MODULES 배열 순서 = 콜백 인자 순서. 어긋나면 조용히 오동작한다.
		sap.ui.require([
			'sap/m/VBox',
			'sap/m/HBox',
			'sap/m/FlexItemData',
			'sap/m/Label',
			'sap/m/Select',
			'sap/ui/core/Item',
			'sap/m/ComboBox',
			'sap/m/CheckBox',
			'sap/m/DatePicker',
			'sap/ui/core/HTML',
			'sap/m/Text'
		], function (VBox, HBox, FlexItemData, Label, Select, Item, ComboBox, CheckBox, DatePicker, HTML, Text) {

			if (token !== host._buildToken || !host._container || !host.isConnected) return;

			var P = host._props;
			var C = {};   // 컨트롤 참조

			function items (list) {
				return list.map(function (o) {
					return new Item({ key: o.k, text: o.t });
				});
			}

			// 라벨을 컨트롤 위에 올린 한 칸.
			function field (labelText, control, grow) {
				var box = new VBox({
					items: [ new Label({ text: labelText }), control ]
				});
				if (grow) {
					box.setLayoutData(new FlexItemData({ growFactor: grow, baseSize: '0%' }));
				}
				box.addStyleClass('sapUiTinyMarginTop');
				return box;
			}

			// ── Date Mode ──
			C.dateMode = new Select({
				width: '100%',
				selectedKey: P.dateMode || 'day',
				items: items([
					{ k: 'day', t: 'Day' }, { k: 'week', t: 'Week' }, { k: 'month', t: 'Month' }
				]),
				change: function (e) {
					var mode = e.getParameter('selectedItem').getKey();
					host.updateProp('dateMode', mode);

					// 형식 목록을 그 모드의 것으로 갈아끼우고,
					// 이전에 그 모드에서 골라둔 값을 되살린다.
					// 모드를 오갈 때 형식이 초기화되지 않는다.
					host._fillFormatItems(C, mode);

					host._syncWeekVisibility(C);
				}
			});

			// ── Date Format ──
			var mode0 = P.dateMode || 'day';
			C.format = new Select({
				width: '100%',
				selectedKey: P[FORMAT_PROP[mode0]],
				items: items(FORMATS[mode0] || FORMATS.day),
				change: function (e) {
					// 현재 모드에 해당하는 프로퍼티에만 쓴다.
					var prop = FORMAT_PROP[host._props.dateMode] || 'formatDay';
					host.updateProp(prop, e.getParameter('selectedItem').getKey());
				}
			});

			// ── Week Numbering Rule (week 모드에서만) ──
			C.weekRule = new Select({
				width: '100%',
				selectedKey: normRule(P.weekRule),
				items: items(WEEK_RULES),
				change: function (e) {
					var k = e.getParameter('selectedItem').getKey();
					host.updateProp('weekRule', k);
					C.weekHint.setText(host._hintOf(k));
				}
			});
			C.weekHint = new Text({ text: host._hintOf(normRule(P.weekRule)) });
			C.weekHint.addStyleClass('sapUiTinyMarginBottom');

			// ── Font ──
			C.fontFamily = new Select({
				width: '100%',
				selectedKey: P.fontFamily || '',
				items: items(FONTS),
				change: function (e) {
					host.updateProp('fontFamily', e.getParameter('selectedItem').getKey());
				}
			});

			// ── Size ──
			// SAC 원본과 같은 ComboBox. 목록에서 고르거나 직접 입력할 수 있다.
			C.fontSize = new ComboBox({
				width: '100%',
				value: P.fontSize ? String(P.fontSize) : '',
				placeholder: 'Default',
				items: FONT_SIZES.map(function (n) {
					return new Item({ key: String(n), text: String(n) });
				}),
				change: function (e) {
					var raw = String(e.getSource().getValue()).replace(/[^0-9]/g, '');
					var n   = raw === '' ? 0 : Math.min(96, Math.max(6, parseInt(raw, 10)));
					if (isNaN(n)) n = 0;
					e.getSource().setValue(n ? String(n) : '');
					host.updateProp('fontSize', n);
				}
			});

			// ── Color ──
			// 트리 위젯과 동일하게 네이티브 색상 입력을 HTML 로 감싼다.
			// 비활성화하지 않는다. 색을 고르면 'Use default' 가 자동으로 풀리므로
			// 스와치를 누르는 것만으로 바로 적용된다.
			C.fontColor = new HTML({
				content: "<div style='line-height:0'><input type='color' value='" +
					(P.fontColor || DEFAULT_COLOR) +
					"' style='width:100%;height:2.25rem;padding:2px;border:1px solid #bfbfbf;cursor:pointer;'></div>",
				afterRendering: function () {
					var dom   = this.getDomRef();
					var input = dom && (dom.tagName === 'INPUT' ? dom : dom.querySelector('input'));
					if (!input || input._dpBound) return;
					input._dpBound = true;      // 재렌더링 시 중복 부착 방지
					input.addEventListener('change', function (ev) {
						if (C.colorDefault) C.colorDefault.setSelected(false);
						host.updateProp('fontColor', ev.target.value);
					});
				}
			});

			C.colorDefault = new CheckBox({
				text: 'Use default',
				selected: !P.fontColor,
				select: function (e) {
					var on = e.getParameter('selected');
					if (on) {
						host.updateProp('fontColor', '');
					} else {
						var input = host._colorInput();
						host.updateProp('fontColor', input ? input.value : DEFAULT_COLOR);
					}
				}
			});

			// ── Accent Color ──
			// 아이콘 · 팝업 헤더 · 선택 배경을 한꺼번에 바꾸는 색.
			C.accentColor = new HTML({
				content: "<div style='line-height:0'><input type='color' value='" +
					(P.accentColor || DEFAULT_COLOR) +
					"' style='width:100%;height:2.25rem;padding:2px;border:1px solid #bfbfbf;cursor:pointer;'></div>",
				afterRendering: function () {
					var dom   = this.getDomRef();
					var input = dom && (dom.tagName === 'INPUT' ? dom : dom.querySelector('input'));
					if (!input || input._dpBound) return;
					input._dpBound = true;
					input.addEventListener('change', function (ev) {
						if (C.accentDefault) C.accentDefault.setSelected(false);
						host.updateProp('accentColor', ev.target.value);
					});
				}
			});

			C.accentDefault = new CheckBox({
				text: 'Use default',
				selected: !P.accentColor,
				select: function (e) {
					var on = e.getParameter('selected');
					if (on) {
						host.updateProp('accentColor', '');
					} else {
						var input = host._accentInput();
						host.updateProp('accentColor', input ? input.value : DEFAULT_COLOR);
					}
				}
			});

			// ── Font Style ──
			C.fontStyle = new Select({
				width: '100%',
				selectedKey: P.fontStyle || 'Regular',
				items: items(FONT_STYLES.map(function (v) { return { k: v, t: v }; })),
				change: function (e) {
					host.updateProp('fontStyle', e.getParameter('selectedItem').getKey());
				}
			});

			// ── Control Height ──
			// SAC 위젯 상자는 32 아래로 못 내려가므로, 상자 안에서 컨트롤만 얇게 그린다.
			C.controlHeight = new ComboBox({
				width: '100%',
				value: P.controlHeight ? String(P.controlHeight) : '',
				placeholder: 'Default',
				items: [16, 18, 20, 21, 22, 24, 26, 28, 32].map(function (n) {
					return new Item({ key: String(n), text: String(n) });
				}),
				change: function (e) {
					var raw = String(e.getSource().getValue()).replace(/[^0-9]/g, '');
					var n   = raw === '' ? 0 : Math.min(200, Math.max(8, parseInt(raw, 10)));
					if (isNaN(n)) n = 0;
					e.getSource().setValue(n ? String(n) : '');
					host.updateProp('controlHeight', n);
				}
			});

			// ── Control Border / Background ──
			function colorField (propName, initial) {
				var html = new HTML({
					content: "<div style='line-height:0'><input type='color' value='" + (initial || '#ffffff') +
						"' style='width:100%;height:2.25rem;padding:2px;border:1px solid #bfbfbf;cursor:pointer;'></div>",
					afterRendering: function () {
						var dom   = this.getDomRef();
						var input = dom && (dom.tagName === 'INPUT' ? dom : dom.querySelector('input'));
						if (!input || input._dpBound) return;
						input._dpBound = true;
						input.addEventListener('change', function (ev) {
							host.updateProp(propName, ev.target.value);
						});
					}
				});
				return html;
			}
			C.controlBackground  = colorField('controlBackground',  P.controlBackground);
			C.controlBorderColor = colorField('controlBorderColor', P.controlBorderColor);

			// ── Min / Max ──
			function makeDate (propName) {
				return new DatePicker({
					width: '100%',
					valueFormat: 'yyyy-MM-dd',
					displayFormat: 'yyyy-MM-dd',
					value: toInputValue(host._toDate(P[propName])),
					change: function (e) {
						var d = e.getSource().getDateValue();
						host.updateProp(propName, (d && !isNaN(d.getTime())) ? d : null);
					}
				});
			}
			C.minDate = makeDate('minDateVal');
			C.maxDate = makeDate('maxDateVal');

			// ── 조립 ──
			C.weekRuleField = field('Week Numbering Rule:', C.weekRule);

			var fontRow = new HBox({
				width: '100%',
				items: [
					field('Font:',  C.fontFamily, 12),
					field('Size:',  C.fontSize,   10),
					field('Color:', C.fontColor,   8)
				]
			});
			// 'Use default' 는 Color 스와치 바로 아래에 오도록 열을 맞춘다.
			// 떨어뜨려 놓으면 둘이 한 쌍이라는 게 보이지 않는다.
			var styleRow = new HBox({
				width: '100%',
				items: [
					field('Font Style:', C.fontStyle, 12),
					new VBox({ items: [], layoutData: new FlexItemData({ growFactor: 10, baseSize: '0%' }) }),
					field(' ', C.colorDefault, 8)
				]
			});
			// HBox 자식 사이 간격
			fontRow.getItems().forEach(function (it, i) {
				if (i < 2) it.addStyleClass('sapUiTinyMarginEnd');
			});
			styleRow.getItems().forEach(function (it, i) {
				if (i < 2) it.addStyleClass('sapUiTinyMarginEnd');
			});

			var accentRow = new HBox({
				width: '100%',
				items: [
					field('Accent Color:', C.accentColor,   10),
					field(' ',             C.accentDefault, 18)
				]
			});
			accentRow.getItems().forEach(function (it, i) {
				if (i < 1) it.addStyleClass('sapUiTinyMarginEnd');
			});

			// 섹션 사이 구분선. SAC 기본 스타일 패널과 같은 결.
			function sep () {
				return new HTML({ content: "<div style='border-top:1px solid #d9d9d9;margin:12px 0 4px 0'></div>" });
			}
			function head (t) {
				var lb = new Label({ text: t });
				lb.addStyleClass('sapUiTinyMarginTop');
				return lb;
			}

			var controlRow = new HBox({
				width: '100%',
				items: [
					field('Height:',     C.controlHeight,      10),
					field('Border:',     C.controlBorderColor,  8),
					field('Background:', C.controlBackground,   8)
				]
			});
			controlRow.getItems().forEach(function (it, i) {
				if (i < 2) it.addStyleClass('sapUiTinyMarginEnd');
			});

			var root = new VBox({
				width: '100%',
				items: [
					field('Date Mode:',   C.dateMode),
					field('Date Format:', C.format),
					C.weekRuleField,
					C.weekHint,

					sep(), head('Control Style'),
					controlRow,
					accentRow,

					sep(), head('Font'),
					fontRow,
					styleRow,

					sep(), head('Date Range'),
					field('Minimum Date Value:', C.minDate),
					field('Maximum Date Value:', C.maxDate)
				]
			});

			if (token !== host._buildToken) { try { root.destroy(); } catch (e) {} return; }

			host._destroyPanel();

			// UIArea 가 관리할 전용 마운트를 매번 새로 만든다.
			// 같은 노드에 반복해서 placeAt 하면 컨트롤이 아래로 쌓인다.
			host._mount = document.createElement('div');
			host._container.appendChild(host._mount);

			root.placeAt(host._mount);
			host._root    = root;
			host._C       = C;
			host._ItemCtor = Item;   // _syncControls 에서 형식 목록을 다시 만들 때 쓴다

			host._syncWeekVisibility(C);
		});
	}

	// ────────────────────────────────────────────────────────────
	// 웹컴포넌트
	// ────────────────────────────────────────────────────────────

	class Styling extends HTMLElement {

		constructor () {
			super();
			this._props = {
				dateMode:    'day',
				formatDay:   'yyyy.MM.dd',
				formatWeek:  'YYYY.ww',
				formatMonth: 'yyyy.MM',
				weekRule:    'ISO_8601',
				fontFamily:  '',
				fontSize:    0,
				fontStyle:   'Regular',
				fontColor:   '',
				accentColor: '',
				controlHeight: 0,
				controlBackground: '',
				controlBorderColor: '',
				minDateVal:  null,
				maxDateVal:  null
			};
			this._root       = null;
			this._mount      = null;
			this._C          = null;
			this._ItemCtor   = null;
			this._buildToken = 0;
			this._selfUpdate = false;
		}

		connectedCallback () {
			if (!this._container) {
				this._container = document.createElement('div');
				this._container.style.cssText = 'width:100%;';
				this.appendChild(this._container);
			}
			if (this._root) return;

			if (window.sap && window.sap.ui && window.sap.ui.require) {
				buildUI5Panel(this);
			} else {
				this._container.textContent = 'SAP UI5를 찾을 수 없습니다.';
			}
		}

		disconnectedCallback () {
			this._destroyPanel();
		}

		_destroyPanel () {
			this._buildToken++;
			if (this._root) {
				try { this._root.destroy(); } catch (e) { /* 이미 파기됨 */ }
				this._root = null;
			}
			if (this._mount) {
				if (this._mount.parentNode) this._mount.parentNode.removeChild(this._mount);
				this._mount = null;
			}
			this._C        = null;
			this._ItemCtor = null;
		}

		// SAC 가 값을 밀어 넣는 지점.
		// 트리 위젯은 onCustomWidgetAfterUpdate 를, nkappler 는 개별 setter 를 쓴다.
		// 어느 쪽이 호출되든 동작하도록 둘 다 둔다.
		onCustomWidgetAfterUpdate (changed) {
			if (!changed) return;
			Object.keys(changed).forEach(function (k) {
				if (k in this._props) this._props[k] = changed[k];
			}.bind(this));

			// 우리가 방금 보낸 값이 되돌아온 것이면 컨트롤을 건드리지 않는다.
			// 입력 중인 ComboBox 의 포커스가 튀는 것을 막는다.
			if (this._selfUpdate) { this._selfUpdate = false; return; }
			this._syncControls();
		}

		_prop (name, v) { this._props[name] = v; this._syncControls(); }

		set dateMode    (v) { this._prop('dateMode',    v || 'day'); }
		set formatDay   (v) { this._prop('formatDay',   v === undefined ? 'yyyy.MM.dd' : v); }
		set formatWeek  (v) { this._prop('formatWeek',  v || 'YYYY.ww'); }
		set formatMonth (v) { this._prop('formatMonth', v || 'yyyy.MM'); }
		set weekRule    (v) { this._prop('weekRule',    normRule(v)); }
		set fontFamily  (v) { this._prop('fontFamily',  v || ''); }
		set fontSize    (v) { this._prop('fontSize',    Number(v) || 0); }
		set fontStyle   (v) { this._prop('fontStyle',   v || 'Regular'); }
		set fontColor   (v) { this._prop('fontColor',   v || ''); }
		set accentColor (v) { this._prop('accentColor', v || ''); }
		set controlHeight (v) { this._prop('controlHeight', Number(v) || 0); }
		set controlBackground  (v) { this._prop('controlBackground',  v || ''); }
		set controlBorderColor (v) { this._prop('controlBorderColor', v || ''); }
		set minDateVal  (v) { this._prop('minDateVal',  v || null); }
		set maxDateVal  (v) { this._prop('maxDateVal',  v || null); }

		get dateMode    () { return this._props.dateMode; }
		get formatDay   () { return this._props.formatDay; }
		get formatWeek  () { return this._props.formatWeek; }
		get formatMonth () { return this._props.formatMonth; }
		get weekRule    () { return this._props.weekRule; }
		get fontFamily  () { return this._props.fontFamily; }
		get fontSize    () { return this._props.fontSize; }
		get fontStyle   () { return this._props.fontStyle; }
		get fontColor   () { return this._props.fontColor; }
		get accentColor () { return this._props.accentColor; }
		get controlHeight () { return this._props.controlHeight; }
		get controlBackground  () { return this._props.controlBackground; }
		get controlBorderColor () { return this._props.controlBorderColor; }
		get minDateVal  () { return this._props.minDateVal; }
		get maxDateVal  () { return this._props.maxDateVal; }

		// 바뀐 프로퍼티 하나만 SAC 로 올린다.
		updateProp (name, value) {
			this._props[name] = value;
			this._selfUpdate  = true;
			var props = {};
			props[name] = value;
			this.dispatchEvent(new CustomEvent('propertiesChanged', {
				detail: { properties: props },
				bubbles: true,
				composed: true
			}));
		}

		_toDate (v) {
			if (v === null || v === undefined || v === '') return null;
			var d = (v instanceof Date) ? v : new Date(v);
			return isNaN(d.getTime()) ? null : d;
		}

		// 색상 입력 DOM 을 안전하게 찾는다.
		_colorInput () {
			if (!this._C || !this._C.fontColor) return null;
			var dom = this._C.fontColor.getDomRef();
			if (!dom) return null;
			return dom.tagName === 'INPUT' ? dom : dom.querySelector('input');
		}

		// 형식 셀렉트를 지정 모드의 목록으로 채우고, 저장된 값을 선택한다.
		_fillFormatItems (C, mode) {
			if (!C || !C.format || !this._ItemCtor) return;
			var Item = this._ItemCtor;
			var list = FORMATS[mode] || FORMATS.day;
			C.format.destroyItems();
			list.forEach(function (o) { C.format.addItem(new Item({ key: o.k, text: o.t })); });
			C.format.setSelectedKey(this._props[FORMAT_PROP[mode]]);
		}

		_accentInput () {
			if (!this._C || !this._C.accentColor) return null;
			var dom = this._C.accentColor.getDomRef();
			if (!dom) return null;
			return dom.tagName === 'INPUT' ? dom : dom.querySelector('input');
		}

		_hintOf (key) {
			for (var i = 0; i < WEEK_RULES.length; i++) {
				if (WEEK_RULES[i].k === key) return 'Example: ' + WEEK_RULES[i].hint;
			}
			return 'Example: ' + WEEK_RULES[0].hint;
		}

		_syncWeekVisibility (C) {
			var isWeek = (this._props.dateMode === 'week');
			if (C.weekRuleField) C.weekRuleField.setVisible(isWeek);
			if (C.weekHint)      C.weekHint.setVisible(isWeek);
		}

		// 외부에서 값이 바뀌었을 때 컨트롤만 갱신한다.
		// 패널을 통째로 다시 만들면 입력 중 포커스를 잃는다.
		_syncControls () {
			var C = this._C, P = this._props;
			if (!C) return;

			C.dateMode.setSelectedKey(P.dateMode || 'day');

			this._fillFormatItems(C, P.dateMode || 'day');

			C.weekRule.setSelectedKey(normRule(P.weekRule));
			C.weekHint.setText(this._hintOf(normRule(P.weekRule)));

			C.fontFamily.setSelectedKey(P.fontFamily || '');
			C.fontStyle.setSelectedKey(P.fontStyle || 'Regular');
			C.fontSize.setValue(P.fontSize ? String(P.fontSize) : '');

			C.colorDefault.setSelected(!P.fontColor);
			var input = this._colorInput();
			if (input) input.value = P.fontColor || DEFAULT_COLOR;

			C.accentDefault.setSelected(!P.accentColor);
			var ai = this._accentInput();
			if (ai) ai.value = P.accentColor || DEFAULT_COLOR;

			C.controlHeight.setValue(P.controlHeight ? String(P.controlHeight) : '');
			['controlBackground', 'controlBorderColor'].forEach(function (k) {
				var dom = C[k] && C[k].getDomRef();
				var inp = dom && (dom.tagName === 'INPUT' ? dom : dom.querySelector('input'));
				if (inp && P[k]) inp.value = P[k];
			});

			C.minDate.setValue(toInputValue(this._toDate(P.minDateVal)));
			C.maxDate.setValue(toInputValue(this._toDate(P.maxDateVal)));

			this._syncWeekVisibility(C);
		}
	}

	customElements.define(TAG, Styling);
})();
