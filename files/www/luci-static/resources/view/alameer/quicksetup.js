'use strict';
'require view';
'require rpc';
'require uci';
'require ui';

var callWifiStatus = rpc.declare({ object: 'network.wireless', method: 'status', expect: { '': {} } });
var callScan = rpc.declare({ object: 'iwinfo', method: 'scan', params: [ 'device' ], expect: { results: [] } });
var callCaps = rpc.declare({ object: 'alameer', method: 'capabilities' });

function ip2int(s) {
	var m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s || ''); if (!m) return null;
	var o = m.slice(1).map(Number); if (o.some(function(x) { return x > 255; })) return null;
	return ((o[0] * 16777216) + (o[1] << 16) + (o[2] << 8) + o[3]) >>> 0;
}
function validMask(s) { var n = ip2int(s); if (n === null || n === 0) return false; var inv = (~n) >>> 0; return (inv & (inv + 1)) === 0; }
function sameNet(a, b, m) { var x = ip2int(a), y = ip2int(b), k = ip2int(m); return x !== null && y !== null && k !== null && ((x & k) >>> 0) === ((y & k) >>> 0); }
function utf8len(s) { return unescape(encodeURIComponent(s || '')).length; }

var MODES = [
	{ id: 'ap', t: 'Access Point', d: 'نقطة وصول متصلة بالراوتر الرئيسي عبر كابل.' },
	{ id: 'extender', t: 'Extender (Relay)', d: 'يقوّي شبكة واي فاي موجودة عبر relayd (يتصل لاسلكياً بالراوتر الرئيسي).' },
	{ id: 'mesh', t: 'Mesh (batman-adv)', d: 'شبكة شبكية 802.11s مع batman-adv. تحتاج حزماً إضافية.' }
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
		var inp = function(type, val, ph) { return E('input', { type: type, value: val == null ? '' : val, placeholder: ph || '' }); };
		var F = this.f = {};
		F.ip = inp('text', g('network', 'lan', 'ipaddr', '192.168.1.20')); F.mask = inp('text', g('network', 'lan', 'netmask', '255.255.255.0'));
		F.gw = inp('text', g('network', 'lan', 'gateway', ''), 'مثال: 192.168.1.1'); F.dns = inp('text', (uci.get('network', 'lan', 'dns') || []).toString().replace(/,/g, ' '), 'اختياري');
		F.dhcp = E('input', { type: 'checkbox' }); F.dhcp.checked = g('dhcp', 'lan', 'ignore', '1') !== '1';
		F.ssid2 = inp('text', g('wireless', 'alameer_2g', 'ssid', 'AbduRaheem_2G')); F.ssid5 = inp('text', g('wireless', 'alameer_5g', 'ssid', 'AbduRaheem_5G'));
		F.key = inp('password', '', 'فارغ = شبكة مفتوحة (8–63 حرفاً للتشفير)');
		F.up = E('select', {}, radios.map(function(r) { return E('option', { value: r.name }, r.name + ' (' + (r.band === '5g' ? '5GHz' : '2.4GHz') + ')'); }));
		F.upssid = inp('text', g('wireless', 'alameer_sta', 'ssid', ''), 'اسم شبكة الراوتر الرئيسي'); F.upkey = inp('password', '', 'كلمة المرور (فارغ = مفتوحة)');
		F.upip = inp('text', '', 'عنوان الراوتر الرئيسي (للتحقق)');
		F.meshr = E('select', {}, radios.map(function(r) { return E('option', { value: r.name }, r.name + ' (' + (r.band === '5g' ? '5GHz' : '2.4GHz') + ')'); }));
		F.meshid = inp('text', g('wireless', 'alameer_mesh', 'mesh_id', 'AlMakhdhi-Mesh')); F.meshkey = inp('password', '', 'فارغ = مفتوح؛ وإلا SAE (يتطلب wpad-mesh)');
		F.meshch = inp('number', '', 'رقم القناة المشتركة بين العقد');
		F.bla = E('input', { type: 'checkbox' }); F.bla.checked = true;

		this.scanOut = E('div'); this.out = E('div'); this.btns = E('div', { 'class': 'am-row' });
		var scanBtn = E('button', { 'class': 'btn cbi-button', 'click': function() {
			var r = radios.filter(function(x) { return x.name === F.up.value; })[0];
			if (!r || !r.ifname) { ui.addNotification(null, E('p', 'الراديو غير فعّال.'), 'danger'); return; }
			self.scanOut.textContent = 'جارٍ المسح...';
			return callScan(r.ifname).then(function(res) {
				self.scanOut.textContent = '';
				(res || []).filter(function(n) { return n.ssid; }).sort(function(a, b) { return b.signal - a.signal; }).forEach(function(n) {
					self.scanOut.appendChild(E('div', {}, E('a', { href: '#', click: function(ev) { ev.preventDefault(); F.upssid.value = n.ssid; } }, n.ssid + '  (' + n.signal + ' dBm, ch ' + n.channel + ')')));
				});
			}).catch(function(e) { self.scanOut.textContent = 'فشل: ' + (e && e.message); });
		} }, 'مسح الشبكات');

		this.sections = {
			ap: E('div', {}, [ E('h3', 'إعدادات AP'),
				E('div', { 'class': 'am-row' }, [ E('label', 'اسم شبكة 2.4GHz'), F.ssid2 ]), E('div', { 'class': 'am-row' }, [ E('label', 'اسم شبكة 5GHz'), F.ssid5 ]),
				E('div', { 'class': 'am-row' }, [ E('label', 'كلمة مرور الواي فاي'), F.key ]) ]),
			extender: E('div', { 'class': 'am-hide' }, [ E('h3', 'إعدادات Extender'),
				E('div', { 'class': 'am-row' }, [ E('label', 'راديو الاتصال بالراوتر'), F.up, scanBtn ]), this.scanOut,
				E('div', { 'class': 'am-row' }, [ E('label', 'SSID الراوتر الرئيسي'), F.upssid ]), E('div', { 'class': 'am-row' }, [ E('label', 'كلمة المرور'), F.upkey ]),
				E('div', { 'class': 'am-row' }, [ E('label', 'IP الراوتر الرئيسي'), F.upip ]),
				E('div', { 'class': 'am-msg' }, 'سيحافظ الجهاز على نقاط الوصول الحالية. يجب أن يكون عنوان LAN أدناه في نفس شبكة الراوتر الرئيسي، وDHCP يبقى معطلاً.') ]),
			mesh: E('div', { 'class': 'am-hide' }, [ E('h3', 'إعدادات Mesh'),
				E('div', { 'class': 'am-row' }, [ E('label', 'راديو الـ Mesh'), F.meshr ]), E('div', { 'class': 'am-row' }, [ E('label', 'Mesh ID'), F.meshid ]),
				E('div', { 'class': 'am-row' }, [ E('label', 'كلمة المرور (SAE)'), F.meshkey ]), E('div', { 'class': 'am-row' }, [ E('label', 'القناة'), F.meshch ]),
				E('div', { 'class': 'am-row' }, [ E('label', 'منع اللوب (BLA)'), F.bla ]) ])
		};

		var cards = MODES.map(function(m) {
			var card = E('div', { 'class': 'am-mode' + (m.id === 'ap' ? ' sel' : ''), 'click': function() {
				self.mode = m.id; cards.forEach(function(c) { c.classList.remove('sel'); }); card.classList.add('sel');
				Object.keys(self.sections).forEach(function(k) { self.sections[k].classList.toggle('am-hide', k !== m.id); });
				self.out.textContent = ''; self.plan = null; self.updateBtns();
			} }, [ E('b', m.t), E('small', m.d) ]);
			return card;
		});

		this.updateBtns = function() {
			self.btns.textContent = '';
			self.btns.appendChild(E('button', { 'class': 'btn cbi-button', 'click': function() { self.review(); } }, '1) مراجعة وتحقق'));
			if (self.plan && !self.plan.errors.length) self.btns.appendChild(E('button', { 'class': 'btn cbi-button-save', 'click': function() { self.apply(); } }, '2) تطبيق (مع تراجع تلقائي)'));
		};
		this.updateBtns();

		return E('div', { 'class': 'am-page' }, [ E('h2', 'الإعداد السريع (Quick Setup)'),
			E('div', { 'class': 'am-card' }, [ E('h3', 'اختر وضع التشغيل'), E('div', { 'class': 'am-modes' }, cards) ]),
			E('div', { 'class': 'am-card' }, [ this.sections.ap, this.sections.extender, this.sections.mesh ]),
			E('div', { 'class': 'am-card' }, [ E('h3', 'إعدادات الشبكة (LAN)'),
				E('div', { 'class': 'am-row' }, [ E('label', 'عنوان IP'), F.ip ]), E('div', { 'class': 'am-row' }, [ E('label', 'قناع الشبكة'), F.mask ]),
				E('div', { 'class': 'am-row' }, [ E('label', 'البوابة'), F.gw ]), E('div', { 'class': 'am-row' }, [ E('label', 'DNS'), F.dns ]),
				E('div', { 'class': 'am-row' }, [ E('label', 'تفعيل خادم DHCP (وضع AP فقط)'), F.dhcp ]) ]),
			E('div', { 'class': 'am-card' }, [ this.btns, this.out ])
		]);
	},

	/* ---------- validation layer: nothing is written until this passes ---------- */
	plan_: function() {
		var F = this.f, caps = this.caps, radios = this.radios, mode = this.mode, errors = [], warnings = [], ops = [];
		var v = function(k) { return (F[k].value || '').trim(); };
		var set = function(c, s, o, val) { ops.push({ t: 'set', c: c, s: s, o: o, v: val }); };
		var unset = function(c, s, o) { ops.push({ t: 'unset', c: c, s: s, o: o }); };
		var sec = function(c, s, type) { ops.push({ t: 'sec', c: c, s: s, type: type }); };
		var del = function(c, s) { ops.push({ t: 'del', c: c, s: s }); };

		if (ip2int(v('ip')) === null) errors.push('عنوان IP غير صالح.');
		if (!validMask(v('mask'))) errors.push('قناع الشبكة غير صالح.');
		if (v('gw')) {
			if (ip2int(v('gw')) === null) errors.push('عنوان البوابة غير صالح.');
			else if (!sameNet(v('ip'), v('gw'), v('mask'))) errors.push('البوابة خارج شبكة الـ LAN.');
			else if (v('gw') === v('ip')) errors.push('البوابة لا يمكن أن تساوي عنوان الجهاز.');
		} else warnings.push('لا توجد بوابة: لن يصل الجهاز نفسه إلى الإنترنت (لن تعمل التحديثات/الوقت).');
		var dnsl = v('dns') ? v('dns').split(/[\s,]+/) : [];
		dnsl.forEach(function(x) { if (ip2int(x) === null) errors.push('DNS غير صالح: ' + x); });
		var lanIface = uci.get('network', 'lan') ? 'lan' : null;
		if (!lanIface) errors.push('واجهة lan غير موجودة في /etc/config/network.');
		var brDev = null; uci.sections('network', 'device').forEach(function(s) { if (s.name === 'br-lan') brDev = s['.name']; });

		var cleanup = function(keep) {
			[ 'alameer_sta', 'alameer_mesh' ].forEach(function(s) { if (keep.indexOf(s) < 0 && uci.get('wireless', s)) del('wireless', s); });
			if (keep.indexOf('extender') < 0) [ 'wwan', 'repeater_bridge' ].forEach(function(s) { if (uci.get('network', s)) del('network', s); });
			if (keep.indexOf('mesh') < 0) { [ 'bat0', 'bat0_hardif' ].forEach(function(s) { if (uci.get('network', s)) del('network', s); });
				if (brDev) { var p = (uci.get('network', brDev, 'ports') || []).filter(function(x) { return x !== 'bat0'; }); ops.push({ t: 'list', c: 'network', s: brDev, o: 'ports', v: p }); } }
		};
		var ssidCheck = function(name, s) { if (!s || utf8len(s) > 32) errors.push(name + ': SSID يجب أن يكون 1–32 بايت.'); };
		var keyCheck = function(name, k) { if (k && (k.length < 8 || k.length > 63)) errors.push(name + ': كلمة المرور يجب أن تكون 8–63 حرفاً.'); };

		set('network', 'lan', 'proto', 'static'); set('network', 'lan', 'ipaddr', v('ip')); set('network', 'lan', 'netmask', v('mask'));
		if (v('gw')) set('network', 'lan', 'gateway', v('gw')); else unset('network', 'lan', 'gateway');
		ops.push({ t: 'list', c: 'network', s: 'lan', o: 'dns', v: dnsl });

		if (mode === 'ap') {
			cleanup([]);
			ssidCheck('2.4GHz', v('ssid2')); ssidCheck('5GHz', v('ssid5')); keyCheck('الواي فاي', F.key.value);
			var enc = F.key.value ? 'psk2' : 'none';
			if (!F.key.value) warnings.push('الشبكة ستكون مفتوحة بدون كلمة مرور.');
			[ [ 'alameer_2g', 'ssid2', '2g' ], [ 'alameer_5g', 'ssid5', '5g' ] ].forEach(function(x) {
				var r = radios.filter(function(q) { return q.band === x[2]; })[0]; if (!r) return;
				if (!uci.get('wireless', x[0])) { sec('wireless', x[0], 'wifi-iface'); set('wireless', x[0], 'device', r.name); set('wireless', x[0], 'mode', 'ap'); set('wireless', x[0], 'network', 'lan'); }
				set('wireless', x[0], 'ssid', v(x[1])); set('wireless', x[0], 'encryption', enc);
				if (F.key.value) set('wireless', x[0], 'key', F.key.value); else unset('wireless', x[0], 'key');
			});
			set('dhcp', 'lan', 'ignore', F.dhcp.checked ? '0' : '1');
			if (F.dhcp.checked) warnings.push('تفعيل DHCP قد يتعارض مع DHCP الراوتر الرئيسي.');
		} else if (mode === 'extender') {
			if (!caps.relayd) errors.push('الحزمة relayd غير مثبّتة في هذا الفيرموير.');
			cleanup([ 'alameer_sta', 'extender' ]);
			ssidCheck('الراوتر الرئيسي', v('upssid')); keyCheck('الراوتر الرئيسي', F.upkey.value);
			if (v('upip')) { if (ip2int(v('upip')) === null) errors.push('IP الراوتر الرئيسي غير صالح.'); else if (!sameNet(v('ip'), v('upip'), v('mask'))) errors.push('عنوان LAN يجب أن يكون في نفس شبكة الراوتر الرئيسي.'); else if (v('upip') === v('ip')) errors.push('عنوان الجهاز يساوي عنوان الراوتر الرئيسي.'); }
			else warnings.push('لم تُدخل IP الراوتر الرئيسي: لا يمكن التحقق من تطابق الشبكة.');
			var up = F.up.value, ap = radios.filter(function(q) { return q.name === up; })[0];
			if (!ap) errors.push('راديو غير صالح.');
			sec('wireless', 'alameer_sta', 'wifi-iface'); set('wireless', 'alameer_sta', 'device', up); set('wireless', 'alameer_sta', 'mode', 'sta');
			set('wireless', 'alameer_sta', 'network', 'wwan'); set('wireless', 'alameer_sta', 'ssid', v('upssid'));
			set('wireless', 'alameer_sta', 'encryption', F.upkey.value ? 'psk2' : 'none');
			if (F.upkey.value) set('wireless', 'alameer_sta', 'key', F.upkey.value); else unset('wireless', 'alameer_sta', 'key');
			sec('network', 'wwan', 'interface'); set('network', 'wwan', 'proto', 'dhcp');
			sec('network', 'repeater_bridge', 'interface'); set('network', 'repeater_bridge', 'proto', 'relay'); set('network', 'repeater_bridge', 'ipaddr', v('ip'));
			ops.push({ t: 'list', c: 'network', s: 'repeater_bridge', o: 'network', v: [ 'lan', 'wwan' ] });
			set('dhcp', 'lan', 'ignore', '1');
			warnings.push('قناة الراديو المختار ستتبع قناة الراوتر الرئيسي. سيُقطع الاتصال لحظياً أثناء التطبيق.');
		} else {
			if (!caps.batman) errors.push('batman-adv غير موجود في هذا الفيرموير (تم بناء نسخة خفيفة). أعد البناء مع حزم Mesh.');
			if (!brDev) errors.push('لم يُعثر على جسر br-lan.');
			cleanup([ 'alameer_mesh', 'mesh' ]);
			if (!v('meshid') || utf8len(v('meshid')) > 32) errors.push('Mesh ID يجب أن يكون 1–32 بايت.');
			keyCheck('Mesh', F.meshkey.value);
			if (F.meshkey.value && !caps.mesh_wpad) errors.push('تشفير SAE يحتاج wpad-mesh؛ اترك كلمة المرور فارغة أو أعد البناء.');
			if (!F.meshkey.value) warnings.push('شبكة Mesh مفتوحة بدون تشفير.');
			var ch = parseInt(F.meshch.value, 10), mr = radios.filter(function(q) { return q.name === F.meshr.value; })[0];
			if (isNaN(ch) || ch < 1 || ch > 165) errors.push('أدخل رقم قناة صالحاً للـ Mesh (مطلوب لأن كل العقد تحتاج نفس القناة).');
			else if (mr && ((mr.band === '2g' && ch > 14) || (mr.band === '5g' && ch < 36))) errors.push('القناة لا تناسب نطاق الراديو.');
			sec('wireless', 'alameer_mesh', 'wifi-iface'); set('wireless', 'alameer_mesh', 'device', F.meshr.value); set('wireless', 'alameer_mesh', 'mode', 'mesh');
			set('wireless', 'alameer_mesh', 'mesh_id', v('meshid')); set('wireless', 'alameer_mesh', 'mesh_fwding', '0'); set('wireless', 'alameer_mesh', 'network', 'bat0_hardif');
			set('wireless', 'alameer_mesh', 'encryption', F.meshkey.value ? 'sae' : 'none');
			if (F.meshkey.value) set('wireless', 'alameer_mesh', 'key', F.meshkey.value); else unset('wireless', 'alameer_mesh', 'key');
			if (!isNaN(ch)) set('wireless', F.meshr.value, 'channel', '' + ch);
			sec('network', 'bat0', 'interface'); set('network', 'bat0', 'proto', 'batadv'); set('network', 'bat0', 'routing_algo', 'BATMAN_IV');
			set('network', 'bat0', 'bridge_loop_avoidance', F.bla.checked ? '1' : '0'); set('network', 'bat0', 'gw_mode', 'off');
			sec('network', 'bat0_hardif', 'interface'); set('network', 'bat0_hardif', 'proto', 'batadv_hardif'); set('network', 'bat0_hardif', 'master', 'bat0'); set('network', 'bat0_hardif', 'mtu', '1536');
			if (brDev) { var ports = (uci.get('network', brDev, 'ports') || []).slice(); if (ports.indexOf('bat0') < 0) ports.push('bat0'); ops.push({ t: 'list', c: 'network', s: brDev, o: 'ports', v: ports }); }
			set('dhcp', 'lan', 'ignore', '1');
			warnings.push('نفس Mesh ID والقناة وكلمة المرور يجب أن تُستخدم على كل العقد.');
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
			if (o.t === 'set') { var old = uci.get(o.c, o.s, o.o); if (old !== o.v) rows.push([ path, old == null ? '—' : (/key/.test(o.o) ? '***' : old), /key/.test(o.o) ? '***' : o.v ]); }
			else if (o.t === 'unset') { if (uci.get(o.c, o.s, o.o) != null) rows.push([ path, '(قيمة)', 'محذوف' ]); }
			else if (o.t === 'list') { var ol = [].concat(uci.get(o.c, o.s, o.o) || []).join(' '); if (ol !== o.v.join(' ')) rows.push([ path, ol || '—', o.v.join(' ') || '—' ]); }
			else if (o.t === 'sec') { if (!uci.get(o.c, o.s)) rows.push([ o.c + '.' + o.s, '—', 'قسم جديد (' + o.type + ')' ]); }
			else if (o.t === 'del') { if (uci.get(o.c, o.s)) rows.push([ o.c + '.' + o.s, 'موجود', 'يُحذف' ]); }
		});
		out.appendChild(E('h3', 'التغييرات المقترحة (' + rows.length + ')'));
		out.appendChild(E('div', { 'class': 'am-tablewrap' }, E('table', { 'class': 'am-tbl' }, [ E('tr', [ E('th', 'الإعداد'), E('th', 'قبل'), E('th', 'بعد') ]) ].concat(rows.map(function(r) { return E('tr', r.map(function(c) { return E('td', c); })); })))));
		if (!p.errors.length) out.appendChild(E('div', { 'class': 'am-msg am-ok' }, 'اجتاز التحقق. بعد التطبيق لديك مهلة للتأكيد وإلا يُعاد الوضع السابق تلقائياً.'));
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
