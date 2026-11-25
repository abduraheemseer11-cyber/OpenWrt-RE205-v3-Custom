"use strict";

const STRINGS = {
  en: {
    dashboard: "Dashboard", mode: "Quick Mode", analyzer: "Wi-Fi Analyzer", clients: "Clients", settings: "Settings",
    uptime: "Uptime", memory: "Memory used", temp: "Temperature", traffic: "Traffic in / out",
    eth: "Ethernet port", clients24: "Clients 2.4 GHz", clients5: "Clients 5 GHz",
    na: "not available", linked: "Linked", down: "Down",
    modeAp: "Access point (wired)", modeWds: "Range extender (WDS)", modeWisp: "WISP / repeater",
    parentSsid: "Parent network name", parentKey: "Parent password", apply: "Apply",
    scan: "Scan", autochannel: "Auto-select channel", scanning: "Scanning…",
    congestion: "Congestion", channel: "Channel", noScan: "No networks found.",
    name: "Name", mac: "MAC address", ip: "IP", signal: "Signal", rate: "Rate", action: "Action",
    block: "Block", unblock: "Unblock", none: "No clients connected.",
    radio: "Radio", dbm: "dBm (5–20)", save: "Save", changePin: "Change PIN",
    newPin: "New PIN (6–16 letters or digits)", watchdog: "Watchdog", enabled: "Enabled",
    rebootAt: "Daily reboot (HH:MM, empty = off)", maintenance: "Maintenance",
    backup: "Download backup", blockTitle: "Block or unblock a device",
    pin: "PIN", support: "Technical support",
    w_default_pin: "The default PIN is still in use. Change it in Settings.",
    w_open_wifi: "The Wi-Fi networks have no password.",
    enterPin: "Enter the PIN first.", saved: "Saved.", working: "Working…", failed: "Failed:"
  },
  ar: {
    dashboard: "لوحة التحكم", mode: "الوضع السريع", analyzer: "محلل الواي فاي", clients: "الأجهزة", settings: "الإعدادات",
    uptime: "مدة التشغيل", memory: "الذاكرة المستخدمة", temp: "درجة الحرارة", traffic: "الوارد / الصادر",
    eth: "منفذ الإيثرنت", clients24: "أجهزة 2.4 جيجاهيرتز", clients5: "أجهزة 5 جيجاهيرتز",
    na: "غير متوفر", linked: "متصل", down: "غير متصل",
    modeAp: "نقطة وصول (سلكية)", modeWds: "مكرر مدى (WDS)", modeWisp: "WISP / مكرر",
    parentSsid: "اسم الشبكة الأصلية", parentKey: "كلمة مرور الشبكة الأصلية", apply: "تطبيق",
    scan: "فحص", autochannel: "اختيار القناة تلقائيا", scanning: "جاري الفحص…",
    congestion: "الازدحام", channel: "القناة", noScan: "لم يتم العثور على شبكات.",
    name: "الاسم", mac: "عنوان MAC", ip: "عنوان IP", signal: "الإشارة", rate: "السرعة", action: "إجراء",
    block: "حظر", unblock: "رفع الحظر", none: "لا توجد أجهزة متصلة.",
    radio: "الراديو", dbm: "قدرة الإرسال dBm (5–20)", save: "حفظ", changePin: "تغيير الرمز",
    newPin: "رمز جديد (6–16 حرفا أو رقما)", watchdog: "مراقبة الاستقرار", enabled: "مفعّل",
    rebootAt: "إعادة تشغيل يومية (HH:MM، فارغ = إيقاف)", maintenance: "الصيانة",
    backup: "تنزيل نسخة احتياطية", blockTitle: "حظر جهاز أو رفع الحظر",
    pin: "الرمز", support: "الدعم الفني",
    w_default_pin: "الرمز الافتراضي ما زال مستخدما. غيّره من الإعدادات.",
    w_open_wifi: "شبكات الواي فاي بدون كلمة مرور.",
    enterPin: "أدخل الرمز أولا.", saved: "تم الحفظ.", working: "جاري التنفيذ…", failed: "فشل:"
  }
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

let lang = "en";
try {
  lang = localStorage.getItem("wrtmax-lang") === "ar" ? "ar" : "en";
} catch (e) {
  lang = "en";
}

function t(key) {
  return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function applyLang() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $("#lang-toggle").textContent = lang === "ar" ? "English" : "العربية";
  $("#pin").placeholder = t("pin");
}

function notify(message, isError) {
  const box = $("#notice");
  box.textContent = message;
  box.className = isError ? "notice error" : "notice";
  box.hidden = false;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => { box.hidden = true; }, 4000);
}

async function getJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

// POST an action to the PIN-protected endpoint.
// Returns the parsed JSON, or a Blob for "backup".
async function act(action, fields) {
  const pin = $("#pin").value;
  if (!pin) throw new Error(t("enterPin"));
  const body = new URLSearchParams(Object.assign({}, fields, { pin, action }));
  const res = await fetch("/cgi-bin/wrtmax-action", { method: "POST", body });
  if (action === "backup" && res.ok) return res.blob();
  const data = await res.json().catch(() => ({ ok: false, error: "HTTP " + res.status }));
  if (!data.ok) throw new Error(data.error || "HTTP " + res.status);
  return data;
}

// Run an action and show the outcome. Never rejects.
async function run(fn, doneText) {
  try {
    notify(t("working"));
    const result = await fn();
    notify(doneText || (result && result.message) || t("saved"));
    return result;
  } catch (err) {
    notify(t("failed") + " " + err.message, true);
    return undefined;
  }
}

// ---- Dashboard -------------------------------------------------------------

let prevNet = null;

function fmtUptime(sec) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

async function refreshStatus() {
  const s = await getJSON("/cgi-bin/wrtmax-status");
  const now = Date.now();
  let traffic = "–";
  if (prevNet) {
    const sec = (now - prevNet.t) / 1000;
    const inMbps = Math.max(0, ((s.net.rx_bytes - prevNet.rx) * 8) / sec / 1e6);
    const outMbps = Math.max(0, ((s.net.tx_bytes - prevNet.tx) * 8) / sec / 1e6);
    traffic = `${inMbps.toFixed(2)} / ${outMbps.toFixed(2)} Mbit/s`;
  }
  prevNet = { t: now, rx: s.net.rx_bytes, tx: s.net.tx_bytes };

  $("#s-info").textContent = `${s.product} ${s.firmware} · ${s.hostname} · ${s.mode}`;
  $("#s-uptime").textContent = fmtUptime(s.uptime);
  $("#s-mem").textContent = s.mem_used_pct + " %";
  $("#s-temp").textContent = s.temp_c === null ? t("na") : s.temp_c + " °C";
  $("#s-traffic").textContent = traffic;
  $("#s-eth").textContent = s.eth.link === 1 ? `${t("linked")} · ${s.eth.speed} Mbit/s` : t("down");
  $("#s-c2").textContent = s.clients["2g"];
  $("#s-c5").textContent = s.clients["5g"];
  $("#warnings").innerHTML = s.warnings
    .map((w) => `<p class="warn">${esc(t("w_" + w))}</p>`)
    .join("");
  $("#support").textContent = s.support;
}

// ---- Clients ---------------------------------------------------------------

async function refreshClients() {
  const data = await getJSON("/cgi-bin/wrtmax-clients");
  const rows = data.clients.map((c) => `
    <tr>
      <td>${esc(c.name || "–")}</td>
      <td>${esc(c.mac)}</td>
      <td>${esc(c.ip || "–")}</td>
      <td>${c.signal === null ? "–" : c.signal + " dBm"}</td>
      <td>${c.rate_mbit === null ? "–" : c.rate_mbit + " Mbit/s"}</td>
      <td><button type="button" class="small" data-block="${esc(c.mac)}">${t("block")}</button></td>
    </tr>`);
  $("#clients-body").innerHTML = rows.length
    ? rows.join("")
    : `<tr><td colspan="6">${t("none")}</td></tr>`;
}

$("#clients-body").addEventListener("click", (ev) => {
  const btn = ev.target.closest("button[data-block]");
  if (!btn) return;
  run(() => act("block", { mac: btn.dataset.block, op: "block" }))
    .then(() => refreshClients().catch(() => {}));
});

// ---- Wi-Fi analyzer --------------------------------------------------------

function renderScan(channels) {
  const out = $("#scan-out");
  if (!channels.length) {
    out.innerHTML = `<p>${t("noScan")}</p>`;
    return;
  }
  let html = "";
  ["2.4", "5"].forEach((band) => {
    const list = channels
      .filter((c) => c.band === band)
      .sort((a, b) => a.channel - b.channel);
    if (!list.length) return;
    html += `<h4>${band === "2.4" ? "2.4 GHz" : "5 GHz"} · ${t("congestion")}</h4>`;
    list.forEach((c) => {
      html += `<div class="bar-row">
        <span>${t("channel")} ${c.channel}</span>
        <div class="bar"><div style="width:${c.congestion_pct}%"></div></div>
        <span>${c.networks} · ${c.congestion_pct}%</span>
      </div>`;
    });
  });
  out.innerHTML = html;
}

$("#scan-btn").addEventListener("click", async () => {
  $("#scan-out").innerHTML = `<p>${t("scanning")}</p>`;
  try {
    const data = await getJSON("/cgi-bin/wrtmax-analyzer");
    renderScan(data.channels);
  } catch (err) {
    notify(t("failed") + " " + err.message, true);
  }
});

$("#auto-btn").addEventListener("click", () => {
  run(() => act("autochannel"));
});

// ---- Quick Mode ------------------------------------------------------------

$$('input[name="mode"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    $("#parent-fields").hidden = radio.value === "ap";
  });
});

$("#mode-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.currentTarget);
  run(() => act("mode", {
    mode: f.get("mode"),
    ssid: f.get("ssid") || "",
    key: f.get("key") || ""
  }));
});

// ---- Settings --------------------------------------------------------------

$("#tx-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.currentTarget);
  run(() => act("txpower", { radio: f.get("radio"), dbm: f.get("dbm") }));
});

$("#wd-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.currentTarget);
  run(() => act("watchdog", {
    enabled: f.get("enabled") ? "1" : "0",
    reboot_time: f.get("reboot_time") || ""
  }));
});

$("#block-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const op = ev.submitter && ev.submitter.value === "unblock" ? "unblock" : "block";
  const mac = new FormData(ev.currentTarget).get("mac") || "";
  run(() => act("block", { mac, op }));
});

$("#pin-form").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.currentTarget);
  const newpin = f.get("newpin") || "";
  run(() => act("setpin", { newpin }).then((data) => {
    $("#pin").value = newpin;
    return data;
  }));
});

$("#backup-btn").addEventListener("click", () => {
  run(async () => {
    const blob = await act("backup");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wrtmax-backup.tar.gz";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return { message: t("saved") };
  });
});

// ---- Navigation and language -----------------------------------------------

function showTab(name) {
  $$(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  $$(".panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + name));
  if (name === "clients") refreshClients().catch(() => {});
}

$$(".tabs button").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));

$("#lang-toggle").addEventListener("click", () => {
  lang = lang === "en" ? "ar" : "en";
  try {
    localStorage.setItem("wrtmax-lang", lang);
  } catch (e) {
    // storage unavailable; the language still changes for this page view
  }
  applyLang();
});

// ---- Start -----------------------------------------------------------------

applyLang();
refreshStatus().catch(() => notify(t("failed") + " status", true));
setInterval(() => { refreshStatus().catch(() => {}); }, 5000);
setInterval(() => {
  if ($("#tab-clients").classList.contains("active")) refreshClients().catch(() => {});
}, 10000);
