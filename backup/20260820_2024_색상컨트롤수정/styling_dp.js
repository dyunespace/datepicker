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
	var BUILD = '2026-08-20 20:17 KST';   // 배포할 때마다 갱신. 콘솔에서 반영 여부를 확인한다.
	console.log('%c[datepicker] styling build ' + BUILD + ' (UI5)', 'color:#346187;font-weight:bold');

	// 모드별 형식 선택지. key 가 실제 displayFormat 패턴.
	var FORMATS = {
		day: [
			{ k: '',           t: 'Automatic'  },
			{ k: 'yyyy.MM.dd', t: 'YYYY.MM.DD' },
			{ k: 'yyyy-MM-dd', t: 'YYYY-MM-DD' },
			{ k: 'MM/dd/yyyy', t: 'MM/DD/YYYY' },
			{ k: 'dd.MM.yyyy', t: 'DD.MM.YYYY' }
		],
		week: [
			{ k: 'YYYY.ww',    t: 'YYYY.WW'  },
			{ k: 'YYYY-ww',    t: 'YYYY-WW'  },
			{ k: 'YYYY/ww',    t: 'YYYY/WW'  },
			{ k: "YYYY-'W'ww", t: 'YYYY-Wnn' }
		],
		month: [
			{ k: 'yyyy.MM',  t: 'YYYY.MM'  },
			{ k: 'yyyy-MM',  t: 'YYYY-MM'  },
			{ k: 'MM/yyyy',  t: 'MM/YYYY'  },
			{ k: 'MMM yyyy', t: 'Mon YYYY' }
		]
	};

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

	var WEEK_RULES = [
		{ k: 'ISO',  t: 'ISO 8601 (Mon, 1st Thu)', hint: '2027-01-01 \u2192 2026.53' },
		{ k: 'JAN1', t: 'Mon start, week of Jan 1', hint: '2027-01-01 \u2192 2027.01' },
		{ k: 'US',   t: 'Sun start, week of Jan 1', hint: '2027-01-01 \u2192 2027.01' }
	];

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

					// 이전 모드의 패턴이 남아 있으면 캘린더 종류가 엉뚱하게 잡힌다.
					// 목록을 갈아끼우고 첫 항목으로 초기화한다.
					var list = FORMATS[mode] || FORMATS.day;
					C.format.destroyItems();
					items(list).forEach(function (it) { C.format.addItem(it); });
					C.format.setSelectedKey(list[0].k);
					host.updateProp('format', list[0].k);

					host._syncWeekVisibility(C);
				}
			});

			// ── Date Format ──
			var fmtList = FORMATS[P.dateMode || 'day'] || FORMATS.day;
			var keep = fmtList.some(function (o) { return o.k === P.format; }) ? P.format : fmtList[0].k;
			C.format = new Select({
				width: '100%',
				selectedKey: keep,
				items: items(fmtList),
				change: function (e) {
					host.updateProp('format', e.getParameter('selectedItem').getKey());
				}
			});

			// ── Week Numbering Rule (week 모드에서만) ──
			C.weekRule = new Select({
				width: '100%',
				selectedKey: P.weekRule || 'ISO',
				items: items(WEEK_RULES),
				change: function (e) {
					var k = e.getParameter('selectedItem').getKey();
					host.updateProp('weekRule', k);
					C.weekHint.setText(host._hintOf(k));
				}
			});
			C.weekHint = new Text({ text: host._hintOf(P.weekRule || 'ISO') });
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
			var isDefaultColor = !P.fontColor;
			C.fontColor = new HTML({
				content: "<div><input type='color' value='" + (P.fontColor || DEFAULT_COLOR) +
					"' style='width:100%;height:2.25rem;padding:2px;border:1px solid #bfbfbf;cursor:pointer;'" +
					(isDefaultColor ? ' disabled' : '') + '></div>',
				afterRendering: function () {
					var dom = this.getDomRef();
					var input = dom && dom.querySelector('input');
					if (!input) return;
					input.addEventListener('change', function (ev) {
						C.colorDefault.setSelected(false);
						host.updateProp('fontColor', ev.target.value);
					});
				}
			});

			C.colorDefault = new CheckBox({
				text: 'Use default',
				selected: isDefaultColor,
				select: function (e) {
					var on  = e.getParameter('selected');
					var dom = C.fontColor.getDomRef();
					var input = dom && dom.querySelector('input');
					if (input) input.disabled = on;
					host.updateProp('fontColor', on ? '' : (input ? input.value : DEFAULT_COLOR));
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

			// ── Miscellaneous ──
			C.range = new CheckBox({
				text: 'Enable date range selection',
				selected: !!P.enablerange,
				select: function (e) {
					host.updateProp('enablerange', e.getParameter('selected'));
				}
			});

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
			var styleRow = new HBox({
				width: '100%',
				items: [
					field('Font Style:',   C.fontStyle,     12),
					field('Color Option:', C.colorDefault,  18)
				]
			});
			// HBox 자식 사이 간격
			fontRow.getItems().forEach(function (it, i) {
				if (i < 2) it.addStyleClass('sapUiTinyMarginEnd');
			});
			styleRow.getItems().forEach(function (it, i) {
				if (i < 1) it.addStyleClass('sapUiTinyMarginEnd');
			});

			var root = new VBox({
				width: '100%',
				items: [
					field('Date Mode:',   C.dateMode),
					field('Date Format:', C.format),
					C.weekRuleField,
					C.weekHint,
					fontRow,
					styleRow,
					field('Miscellaneous:',      C.range),
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
				format:      '',
				weekRule:    'ISO',
				enablerange: false,
				fontFamily:  '',
				fontSize:    0,
				fontStyle:   'Regular',
				fontColor:   '',
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
		set format      (v) { this._prop('format',      v || ''); }
		set weekRule    (v) { this._prop('weekRule',    v || 'ISO'); }
		set enablerange (v) { this._prop('enablerange', !!v); }
		set fontFamily  (v) { this._prop('fontFamily',  v || ''); }
		set fontSize    (v) { this._prop('fontSize',    Number(v) || 0); }
		set fontStyle   (v) { this._prop('fontStyle',   v || 'Regular'); }
		set fontColor   (v) { this._prop('fontColor',   v || ''); }
		set minDateVal  (v) { this._prop('minDateVal',  v || null); }
		set maxDateVal  (v) { this._prop('maxDateVal',  v || null); }

		get dateMode    () { return this._props.dateMode; }
		get format      () { return this._props.format; }
		get weekRule    () { return this._props.weekRule; }
		get enablerange () { return this._props.enablerange; }
		get fontFamily  () { return this._props.fontFamily; }
		get fontSize    () { return this._props.fontSize; }
		get fontStyle   () { return this._props.fontStyle; }
		get fontColor   () { return this._props.fontColor; }
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

			var list = FORMATS[P.dateMode || 'day'] || FORMATS.day;
			var keys = C.format.getItems().map(function (i) { return i.getKey(); });
			var same = keys.length === list.length && list.every(function (o, i) { return keys[i] === o.k; });
			if (!same && this._ItemCtor) {
				var Item = this._ItemCtor;
				C.format.destroyItems();
				list.forEach(function (o) { C.format.addItem(new Item({ key: o.k, text: o.t })); });
			}
			var found = list.some(function (o) { return o.k === P.format; });
			C.format.setSelectedKey(found ? P.format : list[0].k);

			C.weekRule.setSelectedKey(P.weekRule || 'ISO');
			C.weekHint.setText(this._hintOf(P.weekRule || 'ISO'));

			C.fontFamily.setSelectedKey(P.fontFamily || '');
			C.fontStyle.setSelectedKey(P.fontStyle || 'Regular');
			C.fontSize.setValue(P.fontSize ? String(P.fontSize) : '');
			C.range.setSelected(!!P.enablerange);

			var useDefault = !P.fontColor;
			C.colorDefault.setSelected(useDefault);
			var dom = C.fontColor.getDomRef();
			var input = dom && dom.querySelector('input');
			if (input) {
				input.disabled = useDefault;
				if (P.fontColor) input.value = P.fontColor;
			}

			C.minDate.setValue(toInputValue(this._toDate(P.minDateVal)));
			C.maxDate.setValue(toInputValue(this._toDate(P.maxDateVal)));

			this._syncWeekVisibility(C);
		}
	}

	customElements.define(TAG, Styling);
})();
