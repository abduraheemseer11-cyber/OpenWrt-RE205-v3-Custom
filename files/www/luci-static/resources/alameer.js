/* AlMakhdhi SoftWare — LuCI navigation shell */
(()=>{
  'use strict';
  const start=()=>{
    if(document.getElementById('alameer-shell')) return;
    const shell=document.createElement('div'); shell.id='alameer-shell';
    const bar=document.createElement('header'); bar.className='alameer-topbar';
    const toggle=document.createElement('button'); toggle.className='alameer-toggle'; toggle.type='button'; toggle.setAttribute('aria-label','فتح القائمة الجانبية'); toggle.setAttribute('aria-expanded','false');
    for(let i=0;i<3;i++){const s=document.createElement('span');toggle.appendChild(s)}
    const brand=document.createElement('div'); brand.className='alameer-brand';
    const logo=document.createElement('img'); logo.src='/luci-static/resources/logo.png'; logo.alt='Alameer Software'; logo.width=42; logo.height=42;
    const name=document.createElement('strong'); name.textContent='AlMakhdhi SoftWare';
    brand.append(logo,name); bar.append(toggle,brand);

    const shade=document.createElement('button'); shade.className='alameer-shade'; shade.type='button'; shade.setAttribute('aria-label','إغلاق القائمة');
    const drawer=document.createElement('aside'); drawer.className='alameer-drawer'; drawer.id='alameer-drawer'; drawer.setAttribute('aria-label','قائمة إعدادات الراوتر');
    const drawerHead=document.createElement('div'); drawerHead.className='alameer-drawer-head';
    const drawerTitle=document.createElement('strong'); drawerTitle.textContent='لوحة التحكم';
    const close=document.createElement('button'); close.className='alameer-close'; close.type='button'; close.textContent='×'; close.setAttribute('aria-label','إغلاق القائمة');
    drawerHead.append(drawerTitle,close);
    const nav=document.createElement('nav'); nav.className='alameer-nav'; nav.setAttribute('aria-label','إعدادات OpenWrt');
    const menu=document.querySelector('#mainmenu');
    const lists=Array.from(document.querySelectorAll('.navbar ul.navbar-nav'));
    if(menu && !lists.includes(menu) && menu.matches('ul')) lists.unshift(menu);
    if(!lists.length && menu) lists.push(menu);
    const unique=lists.filter((node,index)=>lists.indexOf(node)===index && !lists.some(other=>other!==node && other.contains(node)));
    unique.forEach(list=>{list.classList.add('alameer-menu-list');nav.appendChild(list)});
    if(!nav.children.length){const note=document.createElement('p');note.className='alameer-menu-note';note.textContent='تعذر العثور على روابط القائمة الأصلية. أعد تحميل الصفحة.';nav.appendChild(note)}
    drawer.append(drawerHead,nav);
    shell.append(bar,shade,drawer);
    document.body.insertBefore(shell,document.body.firstChild);
    document.body.classList.add('alameer-ui');
    document.querySelectorAll('.navbar').forEach(el=>el.classList.add('alameer-native-navbar'));

    const setOpen=open=>{document.body.classList.toggle('alameer-drawer-open',open);toggle.setAttribute('aria-expanded',open?'true':'false');drawer.setAttribute('aria-hidden',open?'false':'true');shade.setAttribute('aria-hidden',open?'false':'true')};
    toggle.addEventListener('click',()=>setOpen(!document.body.classList.contains('alameer-drawer-open')));
    close.addEventListener('click',()=>setOpen(false)); shade.addEventListener('click',()=>setOpen(false));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false)});
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{if(!a.parentElement.querySelector('.dropdown-menu'))setOpen(false)}));
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
