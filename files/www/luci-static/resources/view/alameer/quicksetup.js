'use strict';
'require view';
'require rpc';
'require uci';
'require ui';

var callWifiStatus = rpc.declare({ object: 'network.wireless', method: 'status', expect: { '': {} } });
var callCaps = rpc.declare({ object: 'alameer', method: 'capabilities' });

function ip2int(s) {
	var m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s || ''); if (!m) return null;
	var o = m.slice(1).map(Number); if (o.some(function(x) { return x > 255; })) return null;
	return ((o[0] * 16777216) + (o[1] << 16) + (o[2] << 8) + o[3]) >>> 0;
}
function validMask(s) { var n = ip2int(s); if (n === null || n === 0) return false; var inv = (~n) >>> 0; return (inv & (inv + 1)) === 0; }
function utf8len(s) { return unescape(encodeURIComponent(s || '')).length; }

var MODES = [
	{ id: 'pppoe', t: 'PPPoE Dial-up', c: 'mode-pppoe', icon: '🌐' },
	{ id: 'ap', t: 'Access Point', c: 'mode-ap', icon: '📡' },
	{ id: 'wds', t: 'WDS Bridge', c: 'mode-wds', icon: '🔗' },
	{ id: 'mesh', t: 'MESH System', c: 'mode-mesh', icon: '🕸️' }
];

return view.extend({
	load: function() { return Promise.all([ uci.load([ 'network', 'wireless', 'dhcp' ]), callWifiStatus().catch(function() { return {}; }), callCaps().catch(function() { return {}; }) ]); },

	render: function(d) {
		var self = this, st = d[1], caps = d[2] || {};
		this.caps = caps; this.mode = 'ap';
		var radios = uci.sections('wireless', 'wifi-device').map(function(s) {
			var ifs = (st[s['.name']] || {}).interfaces || [];
			return { name: s['.name'], band: s.band || (parseInt(s.channel, 10) > 14 ? '5g' : '2g'), ifname: ifs.length ? ifs[0].ifname : null };
		});
		this.radios = radios;
		var g = function(c, s, o, def) { var v = uci.get(c, s, o); return v == null ? def : v; };
		var inp = function(type, val, ph) { return E('input', { type: type, value: val == null ? '' : val, placeholder: ph || '', style: 'width:100%' }); };
		var F = this.f = {};
		
		// LAN Settings
		F.ip = inp('text', g('network', 'lan', 'ipaddr', '192.168.1.20')); 
		F.mask = inp('text', g('network', 'lan', 'netmask', '255.255.255.0'));
		
		// PPPoE Settings
		F.pppoe_user = inp('text', g('network', 'wan', 'username', ''), 'اسم المستخدم');
		F.pppoe_pass = inp('password', g('network', 'wan', 'password', ''), 'كلمة المرور');

		// Wireless Settings (AP)
		F.ssid2 = inp('text', g('wireless', 'alameer_2g', 'ssid', 'AbduRaheem_2G')); 
		F.ssid5 = inp('text', g('wireless', 'alameer_5g', 'ssid', 'AbduRaheem_5G'));
		F.key = inp('password', g('wireless', 'alameer_2g', 'key', ''), 'فارغ = شبكة مفتوحة (8–63 حرفاً)');
		
		// WDS Settings
		F.wds_ssid = inp('text', '', 'اسم شبكة الهدف (SSID)');
		F.wds_key = inp('password', '', 'كلمة مرور الشبكة الهدف');

		// Mesh Settings
		F.meshid = inp('text', g('wireless', 'alameer_mesh', 'mesh_id', 'AlMakhdhi-Mesh')); 
		F.meshkey = inp('password', '', 'فارغ = مفتوح؛ وإلا SAE');

		this.out = E('div'); this.btns = E('div', { 'class': 'am-row' });

		this.sections = {
			pppoe: E('div', { 'class': 'am-hide' }, [ E('h3', 'إعدادات PPPoE'),
				E('div', { 'class': 'am-row' }, [ E('label', 'اسم المستخدم (Username)'), F.pppoe_user ]), 
				E('div', { 'class': 'am-row' }, [ E('label', 'كلمة المرور (Password)'), F.pppoe_pass ]) ]),
			
			ap: E('div', {}, [ E('h3', 'إعدادات Access Point'),
				E('div', { 'class': 'am-row' }, [ E('label', 'اسم شبكة 2.4GHz'), F.ssid2 ]), 
				E('div', { 'class': 'am-row' }, [ E('label', 'اسم شبكة 5GHz'), F.ssid5 ]),
				E('div', { 'class': 'am-row' }, [ E('label', 'كلمة مرور الواي فاي'), F.key ]) ]),
			
			wds: E('div', { 'class': 'am-hide' }, [ E('h3', 'إعدادات WDS Bridge'),
				E('div', { 'class': 'am-row' }, [ E('label', 'SSID الشبكة الهدف'), F.wds_ssid ]), 
				E('div', { 'class': 'am-row' }, [ E('label', 'كلمة مرور الشبكة الهدف'), F.wds_key ]) ]),
			
			mesh: E('div', { 'class': 'am-hide' }, [ E('h3', 'إعدادات MESH'),
				E('div', { 'class': 'am-row' }, [ E('label', 'Mesh ID'), F.meshid ]),
				E('div', { 'class': 'am-row' }, [ E('label', 'كلمة المرور (SAE)'), F.meshkey ]) ])
		};

		var cards = MODES.map(function(m) {
			var card = E('div', { 'class': 'mode-card ' + m.c + (m.id === 'ap' ? ' selected' : ''), 'click': function() {
				self.mode = m.id; 
				document.querySelectorAll('.mode-card').forEach(function(c) { c.classList.remove('selected'); }); 
				card.classList.add('selected');
				Object.keys(self.sections).forEach(function(k) { self.sections[k].classList.toggle('am-hide', k !== m.id); });
				self.out.textContent = ''; self.plan = null; self.updateBtns();
			} }, [ E('i', {}, m.icon), E('span', {}, m.t) ]);
			return card;
		});

		this.updateBtns = function() {
			self.btns.textContent = '';
			self.btns.appendChild(E('button', { 'class': 'btn cbi-button', 'click': function() { self.review(); } }, 'مراجعة وتحقق'));
			if (self.plan && !self.plan.errors.length) self.btns.appendChild(E('button', { 'class': 'btn cbi-button-save', 'click': function() { self.apply(); } }, 'حفظ وتطبيق'));
		};
		this.updateBtns();

		return E('div', { 'class': 'am-page' }, [ 
			E('h2', 'Quick Setup'),
			E('div', { 'class': 'am-card' }, [ 
				E('h3', 'Select Operation Mode', {style: 'text-align:center;'}),
				E('p', 'Choose the wireless operation mode for your device:', {style: 'text-align:center; font-size:12px; color:#888;'}),
				E('div', { 'class': 'mode-grid' }, cards) 
			]),
			E('div', { 'class': 'am-card' }, [ this.sections.pppoe, this.sections.ap, this.sections.wds, this.sections.mesh ]),
			E('div', { 'class': 'am-card' }, [ E('h3', 'إعدادات الشبكة (LAN/IPv4)'),
				E('div', { 'class': 'am-row' }, [ E('label', 'IPv4 Address'), F.ip ]), 
				E('div', { 'class': 'am-row' }, [ E('label', 'IPv4 Netmask'), F.mask ]) ]),
			E('div', { 'class': 'am-card' }, [ this.btns, this.out ])
		]);
	},

	/* ---------- validation layer ---------- */
	plan_: function() {
		var F = this.f, caps = this.caps, radios = this.radios, mode = this.mode, errors = [], warnings = [], ops = [];
		var v = function(k) { return (F[k].value || '').trim(); };
		var set = function(c, s, o, val) { ops.push({ t: 'set', c: c, s: s, o: o, v: val }); };
		var unset = function(c, s, o) { ops.push({ t: 'unset', c: c, s: s, o: o }); };
		var sec = function(c, s, type) { ops.push({ t: 'sec', c: c, s: s, type: type }); };
		var del = function(c, s) { ops.push({ t: 'del', c: c, s: s }); };

		if (ip2int(v('ip')) === null) errors.push('عنوان IPv4 غير صالح.');
		if (!validMask(v('mask'))) errors.push('قناع الشبكة غير صالح.');

		var cleanup = function(keep) {
			[ 'alameer_sta', 'alameer_mesh' ].forEach(function(s) { if (keep.indexOf(s) < 0 && uci.get('wireless', s)) del('wireless', s); });
			if (keep.indexOf('wds') < 0) [ 'wwan', 'repeater_bridge' ].forEach(function(s) { if (uci.get('network', s)) del('network', s); });
			if (keep.indexOf('mesh') < 0) { [ 'bat0', 'bat0_hardif' ].forEach(function(s) { if (uci.get('network', s)) del('network', s); }); }
		};
		var ssidCheck = function(name, s) { if (!s || utf8len(s) > 32) errors.push(name + ': SSID يجب أن يكون 1–32 بايت.'); };
		var keyCheck = function(name, k) { if (k && (k.length < 8 || k.length > 63)) errors.push(name + ': كلمة المرور يجب أن تكون 8–63 حرفاً.'); };

		set('network', 'lan', 'proto', 'static'); set('network', 'lan', 'ipaddr', v('ip')); set('network', 'lan', 'netmask', v('mask'));

		if (mode === 'pppoe') {
			cleanup([]);
			if (!v('pppoe_user')) errors.push('اسم مستخدم PPPoE مطلوب.');
			if (!v('pppoe_pass')) errors.push('كلمة مرور PPPoE مطلوبة.');
			sec('network', 'wan', 'interface'); 
			set('network', 'wan', 'proto', 'pppoe'); 
			set('network', 'wan', 'username', v('pppoe_user')); 
			set('network', 'wan', 'password', v('pppoe_pass'));
			set('dhcp', 'lan', 'ignore', '0');
		} else if (mode === 'wds') {
			cleanup(['wds']);
			ssidCheck('WDS', v('wds_ssid')); keyCheck('WDS', F.wds_key.value);
			sec('wireless', 'alameer_sta', 'wifi-iface'); 
			set('wireless', 'alameer_sta', 'device', radios[0] ? radios[0].name : 'radio0'); 
			set('wireless', 'alameer_sta', 'mode', 'wds');
			set('wireless', 'alameer_sta', 'network', 'wwan'); 
			set('wireless', 'alameer_sta', 'ssid', v('wds_ssid'));
			set('wireless', 'alameer_sta', 'encryption', F.wds_key.value ? 'psk2' : 'none');
			if (F.wds_key.value) set('wireless', 'alameer_sta', 'key', F.wds_key.value);
			sec('network', 'wwan', 'interface'); set('network', 'wwan', 'proto', 'dhcp');
			set('dhcp', 'lan', 'ignore', '1');
		} else if (mode === 'ap') {
			cleanup([]);
			ssidCheck('2.4GHz', v('ssid2')); ssidCheck('5GHz', v('ssid5')); keyCheck('الواي فاي', F.key.value);
			var enc = F.key.value ? 'psk2' : 'none';
			
			[ [ 'alameer_2g', 'ssid2', '2g' ], [ 'alameer_5g', 'ssid5', '5g' ] ].forEach(function(x) {
				var r = radios.filter(function(q) { return q.band === x[2]; })[0]; if (!r) return;
				if (!uci.get('wireless', x[0])) { sec('wireless', x[0], 'wifi-iface'); set('wireless', x[0], 'device', r.name); set('wireless', x[0], 'mode', 'ap'); set('wireless', x[0], 'network', 'lan'); }
				set('wireless', x[0], 'ssid', v(x[1])); set('wireless', x[0], 'encryption', enc);
				if (F.key.value) set('wireless', x[0], 'key', F.key.value); else unset('wireless', x[0], 'key');
			});
			set('dhcp', 'lan', 'ignore', '0');
		} else {
			if (!caps.batman) errors.push('batman-adv غير موجود. أعد البناء مع حزم Mesh.');
			cleanup(['mesh']);
			if (!v('meshid') || utf8len(v('meshid')) > 32) errors.push('Mesh ID يجب أن يكون 1–32 بايت.');
			keyCheck('Mesh', F.meshkey.value);
			sec('wireless', 'alameer_mesh', 'wifi-iface'); set('wireless', 'alameer_mesh', 'device', radios[0] ? radios[0].name : 'radio0'); set('wireless', 'alameer_mesh', 'mode', 'mesh');
			set('wireless', 'alameer_mesh', 'mesh_id', v('meshid')); set('wireless', 'alameer_mesh', 'mesh_fwding', '0'); set('wireless', 'alameer_mesh', 'network', 'bat0_hardif');
			set('wireless', 'alameer_mesh', 'encryption', F.meshkey.value ? 'sae' : 'none');
			if (F.meshkey.value) set('wireless', 'alameer_mesh', 'key', F.meshkey.value); else unset('wireless', 'alameer_mesh', 'key');
			sec('network', 'bat0', 'interface'); set('network', 'bat0', 'proto', 'batadv'); set('network', 'bat0', 'routing_algo', 'BATMAN_IV');
			sec('network', 'bat0_hardif', 'interface'); set('network', 'bat0_hardif', 'proto', 'batadv_hardif'); set('network', 'bat0_hardif', 'master', 'bat0'); set('network', 'bat0_hardif', 'mtu', '1536');
			set('dhcp', 'lan', 'ignore', '1');
		}
		return { errors: errors, warnings: warnings, ops: ops };
	},

	review: function() {
		var out = this.out; out.textContent = ''; this.plan = this.plan_();
		var p = this.plan;
		p.errors.forEach(function(e) { out.appendChild(E('div', { 'class': 'am-msg am-err' }, '✖ ' + e)); });
		p.warnings.forEach(function(e) { out.appendChild(E('div', { 'class': 'am-msg am-warn' }, '⚠ ' + e)); });
		var rows = [];
		p.ops.forEach(function(o) {
			var path = o.c + '.' + o.s + (o.o ? '.' + o.o : '');
			if (o.t === 'set') { var old = uci.get(o.c, o.s, o.o); if (old !== o.v) rows.push([ path, old == null ? '—' : (/key|pass/.test(o.o) ? '***' : old), /key|pass/.test(o.o) ? '***' : o.v ]); }
			else if (o.t === 'unset') { if (uci.get(o.c, o.s, o.o) != null) rows.push([ path, '(قيمة)', 'محذوف' ]); }
			else if (o.t === 'sec') { if (!uci.get(o.c, o.s)) rows.push([ o.c + '.' + o.s, '—', 'قسم جديد (' + o.type + ')' ]); }
			else if (o.t === 'del') { if (uci.get(o.c, o.s)) rows.push([ o.c + '.' + o.s, 'موجود', 'يُحذف' ]); }
		});
		out.appendChild(E('h3', 'التغييرات المقترحة (' + rows.length + ')'));
		out.appendChild(E('div', { 'class': 'am-tablewrap' }, E('table', { 'class': 'am-tbl' }, [ E('tr', [ E('th', 'الإعداد'), E('th', 'قبل'), E('th', 'بعد') ]) ].concat(rows.map(function(r) { return E('tr', r.map(function(c) { return E('td', c); })); })))));
		if (!p.errors.length) out.appendChild(E('div', { 'class': 'am-msg am-ok' }, 'اجتاز التحقق. اضغط على تطبيق للحفظ.'));
		this.updateBtns();
	},

	apply: function() {
		var p = this.plan; if (!p || p.errors.length) return;
		p.ops.forEach(function(o) {
			if (o.t === 'sec') { if (!uci.get(o.c, o.s)) uci.add(o.c, o.type, o.s); }
			else if (o.t === 'del') { if (uci.get(o.c, o.s)) uci.remove(o.c, o.s); }
			else if (o.t === 'set') { if (uci.get(o.c, o.s)) uci.set(o.c, o.s, o.o, o.v); }
			else if (o.t === 'unset') { if (uci.get(o.c, o.s)) uci.unset(o.c, o.s, o.o); }
			else if (o.t === 'list') { if (uci.get(o.c, o.s)) { if (o.v.length) uci.set(o.c, o.s, o.o, o.v); else uci.unset(o.c, o.s, o.o); } }
		});
		return uci.save().then(function() { return ui.changes.apply(); });
	},
	handleSaveApply: null, handleSave: null, handleReset: null
});
