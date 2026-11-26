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

var MODES = [
	{ id: 'pppoe', t: 'PPPoE Dial-up', c: 'mode-pppoe', icon: '🌐' },
	{ id: 'ap', t: 'Access Point', c: 'mode-ap', icon: '📡' },
	{ id: 'wds', t: 'WDS Bridge', c: 'mode-wds', icon: '🔗' },
	{ id: 'mesh', t: 'MESH System', c: 'mode-mesh', icon: '🕸️' }
];

return view.extend({
	load: function() { 
		return Promise.all([ uci.load([ 'network', 'wireless', 'dhcp' ]), callWifiStatus().catch(function() { return {}; }), callCaps().catch(function() { return {}; }) ]); 
	},

	render: function(d) {
		var self = this, st = d[1], caps = d[2] || {};
		this.caps = caps; this.mode = 'ap';
		var radios = uci.sections('wireless', 'wifi-device').map(function(s) {
			var ifs = (st[s['.name']] || {}).interfaces || [];
			return { name: s['.name'], band: s.band || (parseInt(s.channel, 10) > 14 ? '5g' : '2g'), ifname: ifs.length ? ifs[0].ifname : null };
		});
		this.radios = radios;
		var g = function(c, s, o, def) { var v = uci.get(c, s, o); return v == null ? def : v; };
		var inp = function(type, val, ph) { return E('input', { type: type, value: val == null ? '' : val, placeholder: ph || '', style: 'width:100%; max-width:300px;' }); };
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
		F.key = inp('password', g('wireless', 'alameer_2g', 'key', ''), 'فارغ = شبكة مفتوحة');
		
		// VLAN
		F.vlan = E('input', { type: 'checkbox' });
		F.vlan_id = inp('number', '', 'VLAN ID (مثال: 1)');

		// WDS Settings
		F.wds_ssid = inp('text', '', 'اسم شبكة الهدف (SSID)');
		F.wds_key = inp('password', '', 'كلمة مرور الشبكة الهدف');

		// Mesh Settings
		F.meshid = inp('text', g('wireless', 'alameer_mesh', 'mesh_id', 'AlMakhdhi-Mesh')); 
		F.meshkey = inp('password', '', 'فارغ = مفتوح؛ وإلا SAE');

		this.out = E('div'); 

		this.sections = {
			pppoe: E('div', { 'class': 'am-hide' }, [ E('h3', 'إعدادات PPPoE'),
				E('div', { 'class': 'am-row' }, [ E('label', 'اسم المستخدم'), F.pppoe_user ]), 
				E('div', { 'class': 'am-row' }, [ E('label', 'كلمة المرور'), F.pppoe_pass ]) ]),
			
			ap: E('div', {}, [ E('h3', 'إعدادات Access Point'),
				E('div', { 'class': 'am-row' }, [ E('label', 'اسم شبكة 2.4GHz'), F.ssid2 ]), 
				E('div', { 'class': 'am-row' }, [ E('label', 'اسم شبكة 5GHz'), F.ssid5 ]),
				E('div', { 'class': 'am-row' }, [ E('label', 'كلمة مرور الواي فاي'), F.key ]) ]),
			
			wds: E('div', { 'class': 'am-hide' }, [ E('h3', 'إعدادات WDS Bridge'),
				E('div', { 'class': 'am-row' }, [ E('label', 'SSID الشبكة الهدف'), F.wds_ssid ]), 
				E('div', { 'class': 'am-row' }, [ E('label', 'كلمة المرور'), F.wds_key ]) ]),
			
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
				self.out.textContent = '';
			} }, [ E('i', {}, m.icon), E('span', {}, m.t) ]);
			return card;
		});

		// Action Buttons
		var btnApply = E('button', { 'class': 'btn cbi-button-save', 'click': function() { self.applyAll(true); } }, 'Save & Apply');
		var btnSave = E('button', { 'class': 'btn cbi-button', 'click': function() { self.applyAll(false); } }, 'Save');
		var btnReset = E('button', { 'class': 'btn cbi-button-reset', 'click': function() { window.location.reload(); } }, 'Reset');

		return E('div', { 'class': 'am-page' }, [ 
			E('h2', 'Quick Setup'),
			E('div', { 'class': 'am-card' }, [ 
				E('h3', 'Select Operation Mode', {style: 'text-align:center;'}),
				E('div', { 'class': 'mode-grid' }, cards) 
			]),
			E('div', { 'class': 'am-card' }, [ 
				this.sections.pppoe, this.sections.ap, this.sections.wds, this.sections.mesh,
				E('hr'),
				E('div', { 'class': 'am-row' }, [ E('label', 'Add VLAN'), F.vlan, F.vlan_id ])
			]),
			E('div', { 'class': 'am-card' }, [ E('h3', 'إعدادات الشبكة (LAN/IPv4)'),
				E('div', { 'class': 'am-row' }, [ E('label', 'IPv4 Address'), F.ip ]), 
				E('div', { 'class': 'am-row' }, [ E('label', 'IPv4 Netmask'), F.mask ]) 
			]),
			this.out,
			E('div', { 'class': 'cbi-page-actions' }, [ btnApply, btnSave, btnReset ])
		]);
	},

	applyAll: function(apply) {
		var self = this, F = this.f, mode = this.mode;
		var v = function(k) { return (F[k].value || '').trim(); };
		var ops = [];
		var set = function(c, s, o, val) { ops.push({ t: 'set', c: c, s: s, o: o, v: val }); };
		var unset = function(c, s, o) { ops.push({ t: 'unset', c: c, s: s, o: o }); };
		var del = function(c, s) { ops.push({ t: 'del', c: c, s: s }); };

		// LAN Settings
		set('network', 'lan', 'proto', 'static'); 
		set('network', 'lan', 'ipaddr', v('ip')); 
		set('network', 'lan', 'netmask', v('mask'));
		
		if (F.vlan.checked && F.vlan_id.value) {
			set('network', 'lan', 'ifname', 'eth0.' + v('vlan_id'));
		} else {
			unset('network', 'lan', 'ifname');
		}

		// Cleanup old interfaces
		['alameer_sta', 'alameer_mesh', 'wwan', 'bat0'].forEach(function(s) { del('network', s); del('wireless', s); });

		if (mode === 'pppoe') {
			set('network', 'wan', 'proto', 'pppoe'); 
			set('network', 'wan', 'username', v('pppoe_user')); 
			set('network', 'wan', 'password', v('pppoe_pass'));
			set('dhcp', 'lan', 'ignore', '0');
		} else if (mode === 'wds') {
			set('wireless', 'alameer_sta', 'device', 'radio0'); 
			set('wireless', 'alameer_sta', 'mode', 'sta');
			set('wireless', 'alameer_sta', 'network', 'wwan'); 
			set('wireless', 'alameer_sta', 'ssid', v('wds_ssid'));
			set('wireless', 'alameer_sta', 'encryption', F.wds_key.value ? 'psk2' : 'none');
			if (F.wds_key.value) set('wireless', 'alameer_sta', 'key', v('wds_key'));
			set('network', 'wwan', 'proto', 'dhcp');
			set('dhcp', 'lan', 'ignore', '1');
		} else if (mode === 'ap') {
			var enc = F.key.value ? 'psk2' : 'none';
			
			set('wireless', 'alameer_2g', 'device', 'radio0'); 
			set('wireless', 'alameer_2g', 'mode', 'ap'); 
			set('wireless', 'alameer_2g', 'network', 'lan');
			set('wireless', 'alameer_2g', 'ssid', v('ssid2')); 
			set('wireless', 'alameer_2g', 'encryption', enc);
			if (F.key.value) set('wireless', 'alameer_2g', 'key', v('key'));

			// 5GHz AC Mode & Tx-Power 20
			set('wireless', 'alameer_5g', 'device', 'radio1'); 
			set('wireless', 'alameer_5g', 'mode', 'ap'); 
			set('wireless', 'alameer_5g', 'network', 'lan');
			set('wireless', 'alameer_5g', 'ssid', v('ssid5')); 
			set('wireless', 'alameer_5g', 'encryption', enc);
			if (F.key.value) set('wireless', 'alameer_5g', 'key', v('key'));
			
			// Force AC (VHT) mode and 20dBm
			set('wireless', 'radio1', 'htmode', 'VHT40');
			set('wireless', 'radio1', 'txpower', '20');
			
			set('dhcp', 'lan', 'ignore', '0');
		} else if (mode === 'mesh') {
			set('wireless', 'alameer_mesh', 'device', 'radio0'); 
			set('wireless', 'alameer_mesh', 'mode', 'mesh');
			set('wireless', 'alameer_mesh', 'mesh_id', v('meshid')); 
			set('wireless', 'alameer_mesh', 'network', 'bat0_hardif');
			set('network', 'bat0', 'proto', 'batadv');
			set('dhcp', 'lan', 'ignore', '1');
		}

		// Execute changes
		ops.forEach(function(o) {
			if (o.t === 'del') { if (uci.get(o.c, o.s)) uci.remove(o.c, o.s); }
			else if (o.t === 'set') { 
				if (!uci.get(o.c, o.s)) uci.add(o.c, 'interface', o.s); // ensure section exists
				uci.set(o.c, o.s, o.o, o.v); 
			}
			else if (o.t === 'unset') { if (uci.get(o.c, o.s)) uci.unset(o.c, o.s, o.o); }
		});

		// Save and apply
		uci.save().then(function() {
			if (apply) {
				return ui.changes.apply().then(function() {
					ui.addNotification(null, E('p', 'تم حفظ وتطبيق الإعدادات بنجاح!'), 'info');
				});
			} else {
				ui.addNotification(null, E('p', 'تم حفظ الإعدادات فقط.'), 'info');
			}
		}).catch(function(e) {
			ui.addNotification(null, E('p', 'حدث خطأ: ' + e), 'danger');
		});
	},

	handleSaveApply: null, handleSave: null, handleReset: null
});
