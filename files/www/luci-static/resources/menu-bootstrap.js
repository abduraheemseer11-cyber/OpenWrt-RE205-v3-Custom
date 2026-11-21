"use strict";
'require baseclass';
'require ui';

return baseclass.extend({
    __init__() {
        ui.menu.load().then(L.bind(this.render, this));
        this.bindToggle();
    },

    bindToggle() {
        const button = document.querySelector('#amk-sidebar-toggle');
        if (!button) return;
        button.addEventListener('click', () => {
            const collapsed = document.body.classList.toggle('amk-sidebar-collapsed');
            button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        });
    },

    makeLink(title, href, active) {
        return E('a', {
            'href': href,
            'class': active ? 'amk-menu-link active' : 'amk-menu-link'
        }, [_(title)]);
    },

    renderChildren(parent, url, depth) {
        const children = ui.menu.getChildren(parent);
        if (!children || !children.length || depth > 5)
            return null;

        const list = E('ul', { 'class': depth === 0 ? 'amk-menu-level-0' : 'amk-menu-sublist' });
        children.forEach(child => {
            if (child.name === 'almakhdhi') return; // Quick Setup is pinned at the top of the sidebar.
            const childUrl = url ? url + '/' + child.name : child.name;
            const href = L.url(childUrl);
            const current = (L.env.requestpath || []).join('/') === childUrl;
            const item = E('li', { 'class': 'amk-menu-item' + (current ? ' active' : '') });
            item.appendChild(this.makeLink(child.title, href, current));

            const nested = this.renderChildren(child, childUrl, depth + 1);
            if (nested) item.appendChild(nested);
            list.appendChild(item);
        });
        return list;
    },

    render(tree) {
        const sidebar = document.querySelector('#amk-side-menu');
        if (!sidebar) return;

        sidebar.innerHTML = '';
        const quick = E('li', { 'class': 'amk-menu-item amk-quick-setup' }, [
            E('a', { 'href': L.url('admin/almakhdhi/quicksetup'), 'class': 'amk-menu-link' }, [
                E('span', { 'class': 'amk-menu-symbol' }, ['⚙']),
                E('span', {}, [_('Quick Setup')])
            ])
        ]);
        sidebar.appendChild(quick);

        const children = ui.menu.getChildren(tree);
        children.forEach(child => {
            const item = E('li', { 'class': 'amk-menu-section' });
            item.appendChild(E('div', { 'class': 'amk-menu-section-title' }, [_(child.title)]));
            const nested = this.renderChildren(child, child.name, 0);
            if (nested) item.appendChild(nested);
            sidebar.appendChild(item);
        });

        const path = (L.env.requestpath || []).join('/');
        sidebar.querySelectorAll('a').forEach(link => {
            if (link.getAttribute('href') && link.getAttribute('href').indexOf(path) >= 0 && path)
                link.classList.add('active');
        });
    }
});
