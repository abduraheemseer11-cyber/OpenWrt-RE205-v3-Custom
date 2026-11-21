/* Runs in <head>: applies direction + colour mode before first paint (no flash). */
(function () {
	var d = document.documentElement, t = 'light';
	try { t = window.localStorage.getItem('amk-theme') || 'light'; } catch (e) {}
	d.setAttribute('data-amk-theme', t);
	d.setAttribute('data-darkmode', t === 'dark' ? 'true' : 'false');
	var l = String(d.getAttribute('lang') || '').slice(0, 2).toLowerCase();
	if (['ar', 'he', 'fa', 'ur'].indexOf(l) > -1) d.setAttribute('dir', 'rtl');
})();
