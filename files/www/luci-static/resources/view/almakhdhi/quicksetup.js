"use strict";
'require view';
'require ui';

return view.extend({
    render() {
        const cards = [
            { title: _('Wireless Settings'), desc: _('Configure 2.4 GHz and 5 GHz Wi-Fi networks.'), url: 'admin/network/wireless' },
            { title: _('LAN Network'), desc: _('Configure the router LAN address and network interface.'), url: 'admin/network/network' },
            { title: _('Administrator Password'), desc: _('Set or change the root password.'), url: 'admin/system/admin' },
            { title: _('System'), desc: _('View system status and perform maintenance.'), url: 'admin/system' }
        ];

        return E('div', { 'class': 'amk-quick-page' }, [
            E('h2', {}, [_('Quick Setup')]),
            E('p', { 'class': 'cbi-section-descr' }, [_('Choose a section to configure your router. These shortcuts open the original LuCI configuration pages.')]),
            E('div', { 'class': 'amk-quick-grid' }, cards.map(card =>
                E('a', { 'class': 'amk-quick-card', 'href': L.url(card.url) }, [
                    E('strong', {}, [card.title]),
                    E('span', {}, [card.desc]),
                    E('span', { 'class': 'amk-quick-arrow' }, ['›'])
                ])
            ))
        ]);
    }
});
