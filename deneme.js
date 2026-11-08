/* TEKNİK PANEL — Aşama 0 deneme betiği
   Amaç: Minerva sayfasının
   1) dışarıdan (GitHub Pages) betik yüklemeye,
   2) Google Apps Script'e GET ve POST isteği atmaya
   izin verip vermediğini görmek. Minerva'ya hiçbir şey yazmaz. */
(function () {
  "use strict";
  var SURUM = "deneme-1";
  var ANAHTAR = "__teknikPanelDenemeUrl";
  var KUTU_ID = "__teknikPanelDeneme";

  // Güvenlik politikası (CSP) ihlallerini yakala: neyin engellendiğini kutuda gösterelim.
  var engellenenler = [];
  try {
    document.addEventListener("securitypolicyviolation", function (e) {
      engellenenler.push((e.violatedDirective || e.effectiveDirective || "?") + " → " + (e.blockedURI || "?"));
      if (kutu) ciz();
    });
  } catch (e) {}

  // Sayfa çerçeveli (frameset) ise kutuyu gösterebileceğimiz bir belge bul.
  function hedefBelge() {
    var d = document;
    if (d.body && d.body.tagName !== "FRAMESET") return d;
    var enIyi = null, enBuyuk = 0;
    for (var i = 0; i < window.frames.length; i++) {
      try {
        var fd = window.frames[i].document;
        if (fd && fd.body && fd.body.tagName !== "FRAMESET") {
          var alan = (window.frames[i].innerWidth || 0) * (window.frames[i].innerHeight || 0);
          if (alan >= enBuyuk) { enBuyuk = alan; enIyi = fd; }
        }
      } catch (e) {}
    }
    return enIyi;
  }

  var belge = hedefBelge();
  if (!belge) {
    alert("Panel yüklendi (" + SURUM + ") ama kutuyu gösterecek yer bulunamadı. Bu mesajı Claude'a söyle.");
    return;
  }

  var eski = belge.getElementById(KUTU_ID);
  if (eski) eski.remove();

  var kutu = belge.createElement("div");
  kutu.id = KUTU_ID;
  kutu.style.cssText =
    "position:fixed;top:12px;right:12px;z-index:2147483647;background:#fff;color:#222;" +
    "border:3px solid #2E7D32;border-radius:10px;padding:14px;font:15px/1.45 Arial,sans-serif;" +
    "width:min(460px, calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;" +
    "box-sizing:border-box;box-shadow:0 6px 24px rgba(0,0,0,.25)";
  belge.body.appendChild(kutu);

  var kayitliUrl = "";
  try { kayitliUrl = localStorage.getItem(ANAHTAR) || ""; } catch (e) {}

  var sonuc = { get: "Henüz denenmedi.", post: "Henüz denenmedi." };

  function kacir(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function ciz() {
    var cerceveli = document.body && document.body.tagName === "FRAMESET";
    kutu.innerHTML =
      '<div style="font-weight:bold;font-size:18px;color:#2E7D32;margin-bottom:6px">✅ Panel yüklendi</div>' +
      '<div style="font-size:12px;color:#666;margin-bottom:10px">Sürüm: ' + SURUM +
      " · Sayfa: " + kacir(location.host) + (cerceveli ? " · çerçeveli sayfa" : "") + "</div>" +
      '<div style="margin-bottom:4px"><b>Apps Script adresi</b> (bir kez yapıştır, hatırlanır):</div>' +
      '<input id="__tpUrl" type="url" placeholder="https://script.google.com/macros/s/.../exec" value="' + kacir(kayitliUrl) +
      '" style="width:100%;box-sizing:border-box;padding:8px;font-size:14px;border:1px solid #999;border-radius:6px">' +
      '<div style="margin:10px 0;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button id="__tpGet" style="padding:10px 14px;font-size:15px;border-radius:6px;border:0;background:#1F4E78;color:#fff">GET dene</button>' +
      '<button id="__tpPost" style="padding:10px 14px;font-size:15px;border-radius:6px;border:0;background:#1F4E78;color:#fff">POST dene</button>' +
      '<button id="__tpKapat" style="padding:10px 14px;font-size:15px;border-radius:6px;border:1px solid #999;background:#fff;color:#222">Kapat</button>' +
      "</div>" +
      "<div><b>GET sonucu:</b><br>" + sonuc.get + "</div>" +
      '<div style="margin-top:8px"><b>POST sonucu:</b><br>' + sonuc.post + "</div>" +
      (engellenenler.length
        ? '<div style="margin-top:10px;color:#B00020"><b>⚠️ Sayfanın güvenlik ayarı şunları engelledi:</b><br>' +
          engellenenler.map(kacir).join("<br>") + "</div>"
        : "");

    belge.getElementById("__tpKapat").onclick = function () { kutu.remove(); };
    belge.getElementById("__tpGet").onclick = function () { dene("GET"); };
    belge.getElementById("__tpPost").onclick = function () { dene("POST"); };
  }

  function urlAl() {
    var u = (belge.getElementById("__tpUrl").value || "").trim();
    if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(u)) {
      alert("Önce Apps Script adresini yapıştır (https://script.google.com/macros/s/.../exec).");
      return "";
    }
    kayitliUrl = u;
    try { localStorage.setItem(ANAHTAR, u); } catch (e) {}
    return u;
  }

  function dene(tur) {
    var u = urlAl();
    if (!u) return;
    var alan = tur === "GET" ? "get" : "post";
    sonuc[alan] = "⏳ Deneniyor…";
    ciz();
    var bas = Date.now();
    var istek;
    if (tur === "GET") {
      istek = fetch(u + (u.indexOf("?") < 0 ? "?" : "&") + "islem=deneme&t=" + bas);
    } else {
      // text/plain gönderiyoruz: böylece tarayıcı ön-kontrol (preflight) isteği yapmaz,
      // Apps Script bunu sorunsuz kabul eder.
      istek = fetch(u, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ islem: "deneme", kaynak: location.host, cihaz: navigator.userAgent, zaman: new Date().toISOString(), turkce: "ĞÜŞİÖÇ ğüşıöç" })
      });
    }
    istek
      .then(function (r) { return r.text().then(function (t) { return { durum: r.status, metin: t }; }); })
      .then(function (c) {
        var sure = Date.now() - bas;
        var veri = null;
        try { veri = JSON.parse(c.metin); } catch (e) {}
        if (veri && veri.tamam) {
          sonuc[alan] = '<span style="color:#2E7D32">✅ Başarılı (' + sure + " ms)</span><br>" +
            '<span style="font-size:12px;color:#555">' + kacir(veri.mesaj || "") + "</span>";
        } else {
          sonuc[alan] = '<span style="color:#B00020">❌ Cevap geldi ama beklenen biçimde değil (durum ' + c.durum + ")</span><br>" +
            '<span style="font-size:12px;color:#555">' + kacir(c.metin.slice(0, 300)) + "</span>";
        }
        ciz();
      })
      .catch(function (h) {
        sonuc[alan] = '<span style="color:#B00020">❌ İstek gitmedi: ' + kacir(h && h.message ? h.message : h) + "</span>" +
          '<br><span style="font-size:12px;color:#555">Aşağıda kırmızı bir "güvenlik ayarı" uyarısı varsa sebep Minerva\'dır; yoksa ağ/güvenlik duvarı olabilir.</span>';
        ciz();
      });
  }

  ciz();
})();
