/* AlMakhdhi SoftWare — LuCI navigation shell */
(()=>{
  'use strict';
  const start=()=>{
    if(document.getElementById('alameer-shell')) return;

    const shell=document.createElement('div');
    shell.id='alameer-shell';

    const bar=document.createElement('header');
    bar.className='alameer-topbar';
    const toggle=document.createElement('button');
    toggle.className='alameer-toggle';
    toggle.type='button';
    toggle.setAttribute('aria-label','Open navigation');
    toggle.setAttribute('aria-expanded','false');
    for(let i=0;i<3;i++){
      const span=document.createElement('span');
      toggle.appendChild(span);
    }

    const brand=document.createElement('div');
    brand.className='alameer-brand';
    const logo=document.createElement('img');
    logo.src='/luci-static/resources/logo.png';
    logo.alt='Alameer Software';
    logo.width=42; logo.height=42;
    const name=document.createElement('strong');
    name.textContent='AlMakhdhi SoftWare';
    brand.append(logo,name);
    bar.append(toggle,brand);

    const shade=document.createElement('button');
    shade.className='alameer-shade';
    shade.type='button';
    shade.setAttribute('aria-label','Close navigation');

    const drawer=document.createElement('aside');
    drawer.className='alameer-drawer';
    drawer.id='alameer-drawer';
    drawer.setAttribute('aria-label','Router settings navigation');

    const head=document.createElement('div');
    head.className='alameer-drawer-head';
    const title=document.createElement('strong');
    title.textContent='لوحة التحكم';
    const close=document.createElement('button');
    close.className='alameer-close';
    close.type='button';
    close.textContent='×';
    close.setAttribute('aria-label','Close navigation');
    head.append(title,close);

    const nav=document.createElement('nav');
    nav.className='alameer-nav';
    nav.setAttribute('aria-label','OpenWrt navigation');

    /*
     * LuCI 24.10 may expose its navigation as #mainmenu or as a
     * Bootstrap navbar list, depending on the exact theme package.
     * Move the original navigation node (not copied links) so LuCI's
     * own click handlers, dropdowns and logout URL remain intact.
     */
    const mainmenu=document.querySelector('#mainmenu');
    if(mainmenu) {
      nav.appendChild(mainmenu);
    } else {
      const candidates=[
        ...document.querySelectorAll('.navbar ul.navbar-nav'),
        ...document.querySelectorAll('.navbar ul.nav'),
        ...document.querySelectorAll('nav[role="navigation"] > ul')
      ];
      const unique=candidates.filter((node,index)=>
        candidates.indexOf(node)===index &&
        !candidates.some(other=>other!==node && other.contains(node))
      );
      unique.forEach(node=>nav.appendChild(node));
    }

    if(!nav.children.length) {
      const note=document.createElement('p');
      note.className='alameer-menu-note';
      note.textContent='تعذر العثور على روابط القائمة الأصلية. أعد تحميل الصفحة.';
      nav.appendChild(note);
    }

    drawer.append(head,nav);
    shell.append(bar,shade,drawer);
    document.body.insertBefore(shell,document.body.firstChild);
    document.body.classList.add('alameer-ui');

    /* Hide the remaining stock navbar; the real menu is now in drawer. */
    document.querySelectorAll('.navbar').forEach(el=>{
      if(!drawer.contains(el)) el.classList.add('alameer-native-navbar');
    });

    const setOpen=open=>{
      document.body.classList.toggle('alameer-drawer-open',open);
      toggle.setAttribute('aria-expanded',open?'true':'false');
      drawer.setAttribute('aria-hidden',open?'false':'true');
      shade.setAttribute('aria-hidden',open?'false':'true');
    };
    toggle.addEventListener('click',()=>setOpen(!document.body.classList.contains('alameer-drawer-open')));
    close.addEventListener('click',()=>setOpen(false));
    shade.addEventListener('click',()=>setOpen(false));
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape') setOpen(false);
    });
    nav.addEventListener('click',event=>{
      if(event.target.closest('a') && !event.target.closest('.dropdown-toggle'))
        setOpen(false);
    });
  };

  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',start,{once:true});
  else
    start();
})();
