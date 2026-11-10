/* TEKNİK PANEL — masaüstü programı arayüzü
   Veriler sunucu.ps1 üzerinden Belgeler\TeknikPanel\veri\*.json dosyalarında tutulur. */
"use strict";

const V = { personel: [], izinler: [], bakiye: [], tatiller: [], giris: [], tesisler: [], ayarlar: {} };
const GIRIS_LINK = "https://personel.ibb.istanbul/";
async function panoyaKopyala(metin, dugme) {
  if (!metin) { bildir("Kopyalanacak bir şey yok.", true); return; }
  try { await navigator.clipboard.writeText(metin); }
  catch (e) { const t = document.createElement("textarea"); t.value = metin; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch (e2) {} t.remove(); }
  if (dugme) { const e = dugme.textContent; dugme.textContent = "✓"; setTimeout(() => { dugme.textContent = e; }, 1200); }
  bildir("Kopyalandı.");
}
let BILGI = {};
const IZIN_TURLERI = ["YILLIK İZİN", "ÜCRETSİZ İZİN", "FAZLA MESAİ İZNİ", "DİĞER İZİN / İDARİ İZİN", "ÖLÜM İZNİ", "EVLİLİK İZNİ", "BABALIK İZNİ", "MAZERET İZNİ", "SAĞLIK RAPORU"];
// Bu türlerde gün sayısı takvim günüdür (hafta sonu ve tatiller izne eklenmez)
const TAKVIM_GUNU = ["ÖLÜM İZNİ", "EVLİLİK İZNİ", "BABALIK İZNİ", "SAĞLIK RAPORU"];
const RAPOR = "SAĞLIK RAPORU";
const FORM_ISARET = { "YILLIK İZİN": "C18", "ÜCRETSİZ İZİN": "C19", "FAZLA MESAİ İZNİ": "C20", "DİĞER İZİN / İDARİ İZİN": "C21",
  "ÖLÜM İZNİ": "H18", "EVLİLİK İZNİ": "H19", "BABALIK İZNİ": "H20", "MAZERET İZNİ": "H21" };
const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

/* ---------------- yardımcılar ---------------- */
const $ = (s, k) => (k || document).querySelector(s);
const $$ = (s, k) => Array.from((k || document).querySelectorAll(s));
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function iki(n) { return (n < 10 ? "0" : "") + n; }
function tarihNesne(s) { if (!s) return null; const p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
function tarihMetin(d) { return d.getFullYear() + "-" + iki(d.getMonth() + 1) + "-" + iki(d.getDate()); }
function goster(s) { const d = tarihNesne(s); return d ? iki(d.getDate()) + "." + iki(d.getMonth() + 1) + "." + d.getFullYear() : ""; }
function gosterGun(s) { const d = tarihNesne(s); return d ? goster(s) + " " + GUNLER[d.getDay()].slice(0, 3) : ""; }
function bugun() { return tarihMetin(new Date()); }
function gunEkle(s, n) { const d = tarihNesne(s); d.setDate(d.getDate() + n); return tarihMetin(d); }
function sayi(n) { return (Math.round((+n || 0) * 10) / 10).toLocaleString("tr-TR"); }
function trBuyuk(s) { return String(s || "").toLocaleUpperCase("tr-TR"); }
function trKucuk(s) { return String(s || "").toLocaleLowerCase("tr-TR"); }
function dosyaAdi(s) { return String(s).replace(/[\\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim(); }
function yeniId(liste) { return liste.reduce((m, x) => Math.max(m, +x.id || 0), 0) + 1; }
function personelBul(id) { return V.personel.find(p => p.id === +id); }

let SURUM = {};
async function api(yol, govde, ekBaslik) { return DK.api(yol, govde, ekBaslik); }
async function kaydet(ad) {
  try {
    // Her zaman sürüm gönder: ekrandaki bilgi eskiyse sunucu kaydetmeyi reddeder (başkasının/Claude'un değişikliği ezilmesin)
    const c = await api("/api/kaydet/" + ad, JSON.stringify(V[ad], null, 1), { "X-Surum": SURUM[ad] || "yok" });
    SURUM[ad] = c.surum;
    const z = new Date();
    $("#durum").textContent = "Kaydedildi " + iki(z.getHours()) + ":" + iki(z.getMinutes());
    return true;
  } catch (e) { bildir("Kaydedilemedi: " + e.message, true); return false; }
}
let bildirimZaman;
function bildir(m, hata) {
  const b = $("#bildirim");
  b.textContent = m; b.className = hata ? "hata" : ""; b.hidden = false;
  clearTimeout(bildirimZaman); bildirimZaman = setTimeout(() => { b.hidden = true; }, hata ? 7000 : 3000);
}
function pencereAc(html) { $("#pencereKutu").innerHTML = html; $("#pencere").hidden = false; const i = $("#pencereKutu input, #pencereKutu select"); if (i) i.focus(); }
function pencereKapat() { $("#pencere").hidden = true; $("#pencereKutu").innerHTML = ""; }
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#pencere").hidden) pencereKapat(); });

/* ---------------- izin hesapları ---------------- */
let tatilKume = new Set();
function tatilYenile() { tatilKume = new Set(V.tatiller.map(t => t.tarih)); }
function isGunu(s) {
  const g = tarihNesne(s).getDay();
  if (g === 0) return false;
  if (g === 6 && !V.ayarlar.cumartesiIsGunu) return false;
  return !tatilKume.has(s);
}
function isBasiHesapla(bas, gun, tur) {
  if (!bas || !(gun > 0)) return "";
  let x = bas;
  if (TAKVIM_GUNU.includes(tur)) {
    x = gunEkle(bas, Math.ceil(gun));
  } else {
    let kalan = gun;
    for (let i = 0; i < 1000 && kalan > 0; i++) { if (isGunu(x)) kalan -= 1; x = gunEkle(x, 1); }
  }
  // Raporda iş başı = başlangıç + gün (senin rapor takip tablondaki gibi); diğerlerinde ilk iş gününe kaydır
  if (tur !== RAPOR) for (let i = 0; i < 40 && !isGunu(x); i++) x = gunEkle(x, 1);
  return x;
}
function hakTablosu() { const h = V.ayarlar.izinHak || [18, 23, 28]; return [+h[0] || 18, +h[1] || 23, +h[2] || 28]; }
function varsayilanHak(p, yil) {
  const h = hakTablosu();
  if (!p || !p.iseGiris) return h[0];
  const kidem = yil - tarihNesne(p.iseGiris).getFullYear();
  if (kidem < 1) return 0;
  if (kidem < 5) return h[0];
  if (kidem < 15) return h[1];
  return h[2];
}
function kullanilan(pid, yil, haricId, oncesi) {
  return V.izinler.filter(i => i.personelId === pid && i.yil === yil && i.tur === "YILLIK İZİN" && i.id !== haricId &&
    (!oncesi || i.baslangic < oncesi)).reduce((t, i) => t + (+i.gun || 0), 0);
}
function bakiyeOku(pid, yil, derinlik) {
  const b = V.bakiye.find(x => x.personelId === pid && x.yil === yil);
  if (b) return { dev: +b.devreden || 0, hak: +b.hak || 0, onc: +b.onceki || 0, kayitVar: true };
  const p = personelBul(pid);
  let dev = 0;
  if ((derinlik || 0) < 3 && V.bakiye.some(x => x.personelId === pid && x.yil === yil - 1)) dev = Math.max(0, kalanIzin(pid, yil - 1, (derinlik || 0) + 1));
  return { dev, hak: varsayilanHak(p, yil), onc: 0, kayitVar: false };
}
function kalanIzin(pid, yil, derinlik) { const b = bakiyeOku(pid, yil, derinlik); return b.dev + b.hak - b.onc - kullanilan(pid, yil); }
function izinDurumu(iz) {
  const b = bugun();
  if (iz.baslangic > b) return { ad: "Bekliyor", sinif: "r-bekliyor" };
  if (iz.isBasi > b) return { ad: "İzinde", sinif: "r-izinde" };
  return { ad: "Döndü", sinif: "r-dondu" };
}
function suAnIzinde(pid) { const b = bugun(); return V.izinler.find(i => i.personelId === pid && i.baslangic <= b && i.isBasi > b); }

/* ---------------- sayfalar ---------------- */
const SAYFALAR = {};
function git() {
  const ad = (location.hash || "#ana").slice(1).split("/")[0];
  const f = SAYFALAR[ad] || SAYFALAR.ana;
  $$("#menu a").forEach(a => a.classList.toggle("secili", a.dataset.sayfa === ad));
  try { f(); } catch (e) { $("#icerik").innerHTML = '<div class="kutu eksi">Hata: ' + esc(e.message) + "</div>"; console.error(e); }
}
window.addEventListener("hashchange", git);

SAYFALAR.ana = function () {
  const b = bugun(), hafta = gunEkle(b, 7), iki_hafta = gunEkle(b, 14);
  const aktif = V.personel.filter(p => p.aktif);
  const izinde = V.izinler.filter(i => i.baslangic <= b && i.isBasi > b).sort((a, c) => a.isBasi < c.isBasi ? -1 : 1);
  const donecek = izinde.filter(i => i.isBasi <= hafta);
  const yaklasan = V.izinler.filter(i => i.baslangic > b && i.baslangic <= iki_hafta).sort((a, c) => a.baslangic < c.baslangic ? -1 : 1);
  const satir = (i, sutun) => { const p = personelBul(i.personelId) || {}; return '<tr class="tikla" data-izin="' + i.id + '"><td>' + esc(p.ad) + "</td><td>" + esc(i.tur) + "</td><td>" + sutun + "</td></tr>"; };
  $("#icerik").innerHTML =
    '<h1>Ana Sayfa</h1>' +
    '<div class="kartlar">' +
    '<div class="kart"><div class="sayi">' + aktif.length + '</div><div class="etiket">Aktif personel</div></div>' +
    '<div class="kart"><div class="sayi">' + izinde.length + '</div><div class="etiket">Şu an izinde</div></div>' +
    '<div class="kart"><div class="sayi">' + donecek.length + '</div><div class="etiket">7 gün içinde işe dönecek</div></div>' +
    '<div class="kart"><div class="sayi">' + yaklasan.length + '</div><div class="etiket">14 gün içinde izne çıkacak</div></div>' +
    "</div>" +
    '<div class="kutu"><h2>Şu an izinde olanlar</h2>' + (izinde.length
      ? '<table><thead><tr><th>Personel</th><th>İzin türü</th><th>İşe dönüş</th></tr></thead><tbody>' + izinde.map(i => satir(i, gosterGun(i.isBasi))).join("") + "</tbody></table>"
      : '<div class="not">Şu an izinde olan yok.</div>') + "</div>" +
    '<div class="kutu"><h2>Yaklaşan izinler (14 gün)</h2>' + (yaklasan.length
      ? '<table><thead><tr><th>Personel</th><th>İzin türü</th><th>Başlangıç</th></tr></thead><tbody>' + yaklasan.map(i => satir(i, gosterGun(i.baslangic))).join("") + "</tbody></table>"
      : '<div class="not">Yaklaşan izin yok.</div>') + "</div>" +
    '<button class="ana" id="yeniIzin">+ Yeni izin gir</button>';
  $("#yeniIzin").onclick = () => izinPencere(null);
  $$("[data-izin]").forEach(t => t.onclick = () => izinPencere(+t.dataset.izin));
};

let personelArama = "", pasifGoster = false, personelGrup = "";
const GRUPLAR = [["BOĞAZİÇİ", "Boğaziçi Yönetim"], ["İSPER", "İsper"], ["ÇIRAK", "Çıraklar"], ["MEMUR", "Memur"], ["DİĞER", "Diğer"]];
// Telefonu tek biçimde göster: 0 5xx xxx xx xx
function telefonYaz(t) {
  let r = String(t || "").replace(/\D/g, "");
  if (r.length === 10 && r[0] === "5") r = "0" + r;
  return r.length === 11 ? r.replace(/(\d)(\d{3})(\d{3})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5") : String(t || "");
}
SAYFALAR.personel = function () {
  const yil = new Date().getFullYear();
  $("#icerik").innerHTML =
    '<div class="ust"><h1>Personel</h1><input class="ara" id="ara" placeholder="Ara: ad, sicil, branş, telefon…" value="' + esc(personelArama) + '">' +
    '<button class="ana" id="yeni">+ Yeni personel</button></div>' +
    '<div class="ust" style="margin-top:-4px"><div class="sekmeler" id="gruplar"></div>' +
    '<label class="not" style="margin-left:auto"><input type="checkbox" id="pasif"' + (pasifGoster ? " checked" : "") + "> Ayrılanları da göster</label></div>" +
    '<div id="liste"></div>';
  const ciz = () => {
    const a = trKucuk(personelArama);
    const hepsi = V.personel.filter(p => pasifGoster || p.aktif);
    const l = hepsi.filter(p => (!personelGrup || sirketKlasoru(p) === personelGrup) &&
      (!a || trKucuk([p.ad, p.sicil, p.bina, p.telefon, p.gorev, p.kadro, p.sirket, p.statu].join(" ")).includes(a)))
      .sort((x, y) => x.ad.localeCompare(y.ad, "tr"));
    $("#gruplar").innerHTML = '<button data-g=""' + (!personelGrup ? ' class="secili"' : "") + ">Tümü (" + hepsi.length + ")</button>" +
      GRUPLAR.filter(g => hepsi.some(p => sirketKlasoru(p) === g[0])).map(g => '<button data-g="' + g[0] + '"' + (personelGrup === g[0] ? ' class="secili"' : "") + ">" + g[1] +
        " (" + hepsi.filter(p => sirketKlasoru(p) === g[0]).length + ")</button>").join("");
    $$("#gruplar [data-g]").forEach(b => b.onclick = () => { personelGrup = b.dataset.g; ciz(); });
    const satir = p => {
      const b = bakiyeOku(p.id, yil), k = kalanIzin(p.id, yil), iz = suAnIzinde(p.id), bilgi = p.iseGiris || b.kayitVar;
      const renk = !bilgi ? "k-yok" : k <= 0 ? "k-kirmizi" : k < 10 ? "k-turuncu" : "k-yesil";
      const durum = !p.aktif ? '<span class="rozet r-pasif">Ayrıldı</span>' : iz ? '<span class="rozet r-izinde">' + (iz.tur === "SAĞLIK RAPORU" ? "Raporlu" : "İzinde") + " · " + goster(iz.isBasi) + " dönüş</span>" : "";
      return '<tr class="tikla" data-id="' + p.id + '"><td><div class="pad">' + esc(p.ad) + '</div><div class="palt">' + esc([p.gorev, p.statu].filter(Boolean).join(" · ")) + "</div></td>" +
        '<td class="sol-not">' + esc(p.sicil) + '</td><td class="tel">' + esc(telefonYaz(p.telefon)) + "</td>" +
        '<td class="sag"><span class="kalan ' + renk + '">' + (bilgi ? sayi(k) + " gün" : "bilgi yok") + "</span></td><td>" + durum + "</td></tr>";
    };
    const gruplar = GRUPLAR.map(g => [g, l.filter(p => sirketKlasoru(p) === g[0])]).filter(x => x[1].length);
    $("#liste").innerHTML = l.length ? gruplar.map(([g, ks]) =>
      '<div class="kutu pgrup"><div class="pbas"><h2>' + g[1] + '</h2><span class="not">' + ks.length + " kişi</span></div>" +
      '<table class="ptablo"><colgroup><col style="width:38%"><col style="width:12%"><col style="width:18%"><col style="width:12%"><col style="width:20%"></colgroup>' +
      '<thead><tr><th>Ad Soyad</th><th>Sicil</th><th>Telefon</th><th class="sag">Kalan izin</th><th>Durum</th></tr></thead><tbody>' + ks.map(satir).join("") + "</tbody></table></div>").join("")
      : '<div class="kutu bos">Kayıt bulunamadı.</div>';
    $$("#liste [data-id]").forEach(t => t.onclick = () => personelPencere(+t.dataset.id));
  };
  $("#ara").oninput = e => { personelArama = e.target.value; ciz(); };
  $("#pasif").onchange = e => { pasifGoster = e.target.checked; ciz(); };
  $("#yeni").onclick = () => personelPencere(null);
  ciz();
  $("#ara").focus();
};

/* Kişinin klasöründeki evraklar: 4-PERSONEL\<ŞİRKET>\<AD SOYAD>\İZİN · RAPOR · TUTANAK · ÖZLÜK · BORDRO */
const BELGE_GRUPLARI = ["İZİN", "RAPOR", "TUTANAK", "ÖZLÜK", "BORDRO"];
let belgeGrubu = "İZİN";
function belgeSimge(ad) { const u = (ad.split(".").pop() || "").toLowerCase(); return u === "pdf" ? "📕" : /jpe?g|png|jfif|tiff?/.test(u) ? "🖼" : /xlsx?|xls/.test(u) ? "📗" : /docx?/.test(u) ? "📘" : "📄"; }
async function kisiBelgeleri(p) {
  const kutu = $("#pBelge"); if (!kutu) return;
  let c;
  try { c = await api("/api/kisi-belgeler", { ad: p.ad, sirket: sirketKlasoru(p) }); } catch (e) { kutu.innerHTML = '<h2>📁 Belgeler</h2><div class="eksi">' + esc(e.message) + "</div>"; return; }
  const klasor = c.klasor || (BILGI.personelKlasoru + "\\" + sirketKlasoru(p) + "\\" + dosyaAdi(p.ad));
  const l = [].concat(c.belgeler || []);
  const gruplar = BELGE_GRUPLARI.concat(Array.from(new Set(l.map(b => b.grup).filter(g => g && !BELGE_GRUPLARI.includes(g)))));
  if (l.some(b => !b.grup)) gruplar.push("");
  if (!gruplar.includes(belgeGrubu)) belgeGrubu = gruplar[0];
  // RAPOR bölümüne yüklenen dosyanın adı için tarih/gün: son 14 gündeki rapor kaydından, yoksa bugün / 1 gün
  const sonRapor = V.izinler.filter(i => i.personelId === p.id && i.tur === RAPOR && i.baslangic >= gunEkle(bugun(), -14)).sort((a, b) => a.baslangic < b.baslangic ? 1 : -1)[0];
  const rv = { t: sonRapor ? sonRapor.baslangic : bugun(), g: sonRapor ? +sonRapor.gun || 1 : 1 };
  const raporOrnek = () => (rv.t ? dosyaAdi(raporDosyaAdi(rv.t, p.ad, rv.g || 1)) : "—") + ".jpeg / .pdf";
  const ciz = () => {
    const secili = l.filter(b => b.grup === belgeGrubu).sort((a, b) => a.tarih < b.tarih ? 1 : -1);
    kutu.innerHTML =
      '<div class="ust" style="margin-bottom:6px"><h2 style="margin:0;flex:1">📁 Belgeler</h2>' + (c.klasor ? '<button class="kucuk" id="bKlasor">📂 Klasörü aç</button>' : "") + "</div>" +
      '<div class="sekmeler" style="margin-bottom:8px">' + gruplar.map(g => '<button class="kucuk' + (g === belgeGrubu ? " secili" : "") + '" data-bg="' + esc(g) + '">' + (g || "Diğer") +
        " (" + l.filter(b => b.grup === g).length + ")</button>").join("") + "</div>" +
      (secili.length ? '<div style="max-height:240px;overflow:auto;border:1px solid var(--cizgi);border-radius:8px"><table><tbody>' + secili.map((b, n) =>
        '<tr class="tikla" data-b="' + n + '"><td style="width:28px">' + belgeSimge(b.ad) + "</td><td>" + esc(b.ad) +
        (b.alt && b.alt !== b.grup ? '<div class="not">' + esc(b.alt.replace(b.grup + "\\", "")) + "</div>" : "") + '</td><td class="not" style="white-space:nowrap">' + goster(b.tarih) + '</td><td class="sag" style="width:44px"><button class="kucuk tehlike" data-bsl="' + n + '" title="Sil (dosya kalıcı silinir)">🗑</button></td></tr>').join("") + "</tbody></table></div>"
        : '<div class="not" style="padding:8px 0">' + (c.klasor ? "Bu bölümde belge yok." : "Bu kişinin henüz klasörü yok; ilk belgeyi eklediğinde oluşur.") + "</div>") +
      (belgeGrubu === "RAPOR" ? '<div class="form" style="grid-template-columns:1fr 1fr;margin-top:8px"><div><label>Rapor başlangıç tarihi</label><input type="date" id="bRTarih" value="' + esc(rv.t) + '"></div>' +
        '<div><label>Kaç gün</label><input type="number" id="bRGun" min="0.5" step="0.5" value="' + esc(rv.g) + '"></div>' +
        '<div class="tam not">Yüklenen rapor şu adla kaydedilir: <b id="bROrnek">' + esc(raporOrnek()) + "</b></div></div>" : "") +
      '<div id="bBirak" style="margin-top:8px;padding:12px;border:2px dashed #9cb3cc;border-radius:8px;text-align:center;background:#f7fafd" class="not">' +
      "📎 <b>" + (belgeGrubu || "Diğer") + '</b> bölümüne belge eklemek için dosyaları buraya sürükle ya da <label style="color:var(--mavi);text-decoration:underline;cursor:pointer">dosya seç<input type="file" id="bDosya" multiple hidden></label></div>';
    $$("[data-bg]", kutu).forEach(b => b.onclick = () => { belgeGrubu = b.dataset.bg; ciz(); });
    $$("[data-b]", kutu).forEach(t => t.onclick = () => belgeAc(secili[+t.dataset.b].yol));
    $$("[data-bsl]", kutu).forEach(x => x.onclick = async ev => {
      ev.stopPropagation();
      const b = secili[+x.dataset.bsl];
      const bagli = V.izinler.filter(i => (i.belgeler || []).some(y => y.yol && DK.ayniYol(y.yol, b.yol)));
      if (!confirm("Bu belge silinsin mi?\n\n" + b.ad + (bagli.length ? "\n\nBu dosya " + bagli.length + " izin kaydına bağlı; o kayıtlardan çıkarılacak (izin kayıtlarının kendisi silinmez)." : "") +
        "\n\n⚠ Dosya kişinin klasöründen KALICI olarak silinir, geri alınamaz.")) return;
      try {
        if (bagli.length) { bagli.forEach(i => { i.belgeler = i.belgeler.filter(y => !(y.yol && DK.ayniYol(y.yol, b.yol))); }); if (!(await kaydet("izinler"))) return; }
        await DK.dosyaSil(b.yol);
        bildir("Belge silindi.");
      } catch (e) { bildir("Silinemedi: " + e.message, true); }
      kisiBelgeleri(p);
    });
    if (c.klasor) $("#bKlasor").onclick = () => belgeAc(c.klasor);
    if (belgeGrubu === "RAPOR") {
      const guncelle = () => { rv.t = $("#bRTarih").value; rv.g = +$("#bRGun").value || 1; $("#bROrnek").textContent = raporOrnek(); };
      $("#bRTarih").oninput = guncelle; $("#bRGun").oninput = guncelle;
    }
    const yukle = async dosyalar => {
      if (belgeGrubu === "RAPOR" && !rv.t) { bildir("Önce rapor başlangıç tarihini gir.", true); return; }
      let n = 0;
      for (const d of Array.from(dosyalar || [])) {
        const uzanti = (d.name.match(/\.[a-z0-9]+$/i) || [""])[0].toLowerCase();
        const hedef = belgeGrubu === "RAPOR"
          ? klasor + "\\RAPOR\\" + dosyaAdi(raporDosyaAdi(rv.t, p.ad, rv.g || 1)) + uzanti
          : klasor + (belgeGrubu ? "\\" + belgeGrubu : "") + "\\" + dosyaAdi(d.name);
        try {
          const r = await DK.dosyaYazResp(hedef, d);
          const j = await r.json(); if (!r.ok || j.hata) throw new Error(j.hata || r.status); n++;
        } catch (e) { bildir(d.name + " eklenemedi: " + e.message, true); }
      }
      if (n) { bildir(n + " belge eklendi."); kisiBelgeleri(p); }
    };
    $("#bDosya").onchange = e => yukle(e.target.files);
    const z = $("#bBirak");
    z.ondragover = e => { e.preventDefault(); z.style.background = "#e3effb"; };
    z.ondragleave = () => { z.style.background = "#f7fafd"; };
    z.ondrop = e => { e.preventDefault(); z.style.background = "#f7fafd"; yukle(e.dataTransfer.files); };
  };
  ciz();
}

function personelPencere(id) {
  const p = id ? personelBul(id) : { id: 0, ad: "", sicil: "", tc: "", iseGiris: "", kadro: "", gorev: "", sirket: "", statu: "", bina: "", mudurluk: "İŞLETMELER MÜDÜRLÜĞÜ", telefon: "", adres: "", aktif: true, aciklama: "" };
  const secenek = (alanAdi) => Array.from(new Set(V.personel.map(x => x[alanAdi]).filter(Boolean))).sort((a, b) => a.localeCompare(b, "tr")).map(v => '<option value="' + esc(v) + '">').join("");
  const yil = new Date().getFullYear();
  const alan = (ad, etiket, tip, tam) => '<div' + (tam ? ' class="tam"' : "") + '><label>' + etiket + '</label><input name="' + ad + '" type="' + (tip || "text") + '" value="' + esc(p[ad]) + '"></div>';
  const bk = id ? bakiyeOku(id, yil) : null;
  const gecmis = id ? V.izinler.filter(i => i.personelId === id).sort((a, c) => a.baslangic < c.baslangic ? 1 : -1) : [];
  pencereAc(
    "<h2>" + (id ? esc(p.ad) : "Yeni personel") + "</h2>" +
    '<form id="pf" class="form" autocomplete="off">' +
    alan("ad", "Adı soyadı *") + alan("sicil", "Sicil no") + alan("tc", "T.C. kimlik no") + alan("iseGiris", "İşe giriş tarihi", "date") +
    alan("gorev", "Branş / yaptığı iş (ör. ELEKTRİK)") + alan("kadro", "Kadro (ör. USTA YARDIMCISI)") +
    '<div><label>Şirket</label><input name="sirket" list="dlSirket" value="' + esc(p.sirket) + '"><datalist id="dlSirket">' + secenek("sirket") + "</datalist></div>" +
    '<div><label>Statü</label><input name="statu" list="dlStatu" value="' + esc(p.statu) + '"><datalist id="dlStatu">' + secenek("statu") + "</datalist></div>" +
    alan("bina", "Çalıştığı bina") + alan("mudurluk", "Müdürlük") +
    alan("telefon", "Telefon") + '<div><label>Durum</label><select name="aktif"><option value="1"' + (p.aktif ? " selected" : "") + '>Çalışıyor</option><option value="0"' + (!p.aktif ? " selected" : "") + ">Ayrıldı</option></select></div>" +
    alan("babaAdi", "Baba adı") + alan("dogumYeriYili", "Doğum yeri / yılı (ör. Kahramanmaraş / 2006)") + alan("ogrenim", "Öğrenim durumu") + "<div></div>" +
    alan("adres", "Adres", "text", true) + alan("aciklama", "Not", "text", true) +
    (id ? '<div class="tam"><h2 style="margin-top:8px">' + yil + ' yıllık izin bakiyesi</h2><div class="form" style="grid-template-columns:repeat(3,1fr)">' +
      '<div><label>Önceki yıldan devreden</label><input name="b_dev" type="number" step="0.5" value="' + bk.dev + '"></div>' +
      '<div><label>Bu yıl hak edilen</label><input name="b_hak" type="number" step="0.5" value="' + bk.hak + '"></div>' +
      '<div><label>Program dışında kullanılan</label><input name="b_onc" type="number" step="0.5" value="' + bk.onc + '"></div></div>' +
      '<div class="ozet"><span>Bu yıl programda girilen yıllık izin: <b>' + sayi(kullanilan(id, yil)) + '</b> gün</span><span>Kalan: <b id="kalanGoster">' + sayi(kalanIzin(id, yil)) + "</b> gün</span></div>" +
      (bk.kayitVar ? "" : '<div class="not">Bu yıl için bakiye kaydı yok; değerler kıdeme göre hesaplandı. Kaydet\'e basınca kaydedilir.</div>') + "</div>" : "") +
    "</form>" +
    (id ? '<h2 style="margin-top:16px">İzin geçmişi</h2>' + (gecmis.length
      ? '<table><thead><tr><th>Tür</th><th>Başlangıç</th><th class="sag">Gün</th><th>İş başı</th><th>Durum</th></tr></thead><tbody>' +
        gecmis.map(i => { const d = izinDurumu(i); return '<tr class="tikla" data-izin="' + i.id + '"><td>' + esc(i.tur) + "</td><td>" + goster(i.baslangic) + '</td><td class="sag">' + sayi(i.gun) + "</td><td>" + goster(i.isBasi) + '</td><td><span class="rozet ' + d.sinif + '">' + d.ad + "</span>" + (imzaliBelge(i) ? " 📎" : "") + "</td></tr>"; }).join("") + "</tbody></table>"
      : '<div class="not">Kayıtlı izin yok.</div>') : "") +
    (id ? (function () { const gr = V.giris.find(x => x.personelId === id) || {};
      return '<h2 style="margin-top:16px">🔐 İBB sistem girişi (mesai takibi)</h2>' +
        '<div class="form"><div><label>Kullanıcı adı</label><div style="display:flex;gap:6px"><input name="g_kullanici" value="' + esc(gr.kullanici || "") + '" autocomplete="off" style="flex:1"><button type="button" class="kucuk" id="gKopyaK" title="Kullanıcı adını kopyala">📋</button></div></div>' +
        '<div><label>Şifre</label><div style="display:flex;gap:6px"><input name="g_sifre" type="password" value="' + esc(gr.sifre || "") + '" autocomplete="new-password" style="flex:1"><button type="button" class="kucuk" id="gKopyaS" title="Şifreyi kopyala">📋</button><button type="button" class="kucuk" id="gGoster">👁 Göster</button></div></div>' +
        '<div class="tam"><a href="' + GIRIS_LINK + '" target="_blank" rel="noopener" class="ana" style="display:inline-block;text-decoration:none;padding:9px 16px">🔗 Giriş sayfasını aç (personel.ibb.istanbul)</a>' +
        ' <span class="not">Sayfa açılır, bilgileri buradan kopyalayıp girişini kendin yaparsın. Bu bilgiler bu bilgisayarda kalır, internete gitmez.</span></div></div>'; })() : "") +
    (id ? '<div id="pBelge" style="margin-top:16px"><h2>📁 Belgeler</h2><div class="not">Yükleniyor…</div></div>' : "") +
    '<div class="pencere-alt">' + (id ? '<button class="sol" id="pIzin">+ Bu kişiye izin gir</button>' : "") +
    '<button id="pIptal">Vazgeç</button><button class="ana" id="pKaydet">Kaydet</button></div>');
  $("#pIptal").onclick = pencereKapat;
  if (id) {
    $("#pIzin").onclick = () => izinPencere(null, id);
    $$("#pencereKutu [data-izin]").forEach(t => t.onclick = () => izinPencere(+t.dataset.izin));
    const gg = $("#gGoster"); if (gg) gg.onclick = () => { const i = $("[name=g_sifre]"); i.type = i.type === "password" ? "text" : "password"; gg.textContent = i.type === "password" ? "👁 Göster" : "🙈 Gizle"; };
    const gkk = $("#gKopyaK"); if (gkk) gkk.onclick = () => panoyaKopyala($("[name=g_kullanici]").value, gkk);
    const gks = $("#gKopyaS"); if (gks) gks.onclick = () => panoyaKopyala($("[name=g_sifre]").value, gks);
    kisiBelgeleri(p);
  }
  $("#pKaydet").onclick = async () => {
    const f = $("#pf"), g = n => f.elements[n].value.trim();
    if (!g("ad")) { bildir("Adı soyadı boş olamaz.", true); return; }
    const yeni = Object.assign({}, p, {
      ad: trBuyuk(g("ad")), sicil: g("sicil"), tc: g("tc"), iseGiris: g("iseGiris"), kadro: g("kadro"), gorev: g("gorev"), sirket: trBuyuk(g("sirket")), statu: trBuyuk(g("statu")),
      bina: g("bina"), mudurluk: g("mudurluk"), telefon: g("telefon"), adres: g("adres"), aciklama: g("aciklama"), aktif: g("aktif") === "1",
      babaAdi: g("babaAdi"), dogumYeriYili: g("dogumYeriYili"), ogrenim: g("ogrenim")
    });
    if (!id) { yeni.id = yeniId(V.personel); V.personel.push(yeni); }
    else V.personel[V.personel.findIndex(x => x.id === id)] = yeni;
    let bakiyeDegisti = false;
    if (id) {
      const dv = +g("b_dev") || 0, hk = +g("b_hak") || 0, on = +g("b_onc") || 0;
      if (!bk.kayitVar || dv !== bk.dev || hk !== bk.hak || on !== bk.onc) {
        const i = V.bakiye.findIndex(x => x.personelId === id && x.yil === yil);
        const kayit = { personelId: id, yil, devreden: dv, hak: hk, onceki: on, aciklama: i >= 0 ? V.bakiye[i].aciklama : "" };
        if (i >= 0) V.bakiye[i] = kayit; else V.bakiye.push(kayit);
        bakiyeDegisti = true;
      }
    }
    let girisDegisti = false;
    if (id) {
      const gkEl = $("[name=g_kullanici]"), gsEl = $("[name=g_sifre]");
      const gk = gkEl ? gkEl.value.trim() : "", gs = gsEl ? gsEl.value : "", i = V.giris.findIndex(x => x.personelId === id);
      const mevcut = i >= 0 ? V.giris[i] : null;
      if ((mevcut ? mevcut.kullanici : "") !== gk || (mevcut ? mevcut.sifre : "") !== gs) {
        if (gk || gs) { const kayit = { personelId: id, kullanici: gk, sifre: gs }; if (i >= 0) V.giris[i] = kayit; else V.giris.push(kayit); }
        else if (i >= 0) V.giris.splice(i, 1);
        girisDegisti = true;
      }
    }
    if (await kaydet("personel") && (!bakiyeDegisti || await kaydet("bakiye")) && (!girisDegisti || await kaydet("giris"))) { pencereKapat(); bildir("Kaydedildi."); git(); }
  };
}

const AYLAR = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
let tabloYil = new Date().getFullYear();
// Excel'deki "İZİN TAKİP FORMU" gibi: kişi başına devreden, hak, ay ay kullanılan yıllık izin ve kalan
function izinTablosu() {
  const yil = tabloYil;
  const kisiler = V.personel.filter(p => p.aktif).sort((a, c) => (a.sirket || "").localeCompare(c.sirket || "", "tr") || a.ad.localeCompare(c.ad, "tr"));
  const gruplar = {};
  kisiler.forEach(p => { const g = p.sirket || "ŞİRKETİ GİRİLMEMİŞ"; (gruplar[g] = gruplar[g] || []).push(p); });
  const st = "padding:5px 6px;text-align:center;border:1px solid #d5dde6";
  let html = '<div class="ust" style="margin-bottom:8px"><span class="not">Yıl:</span><select id="tyil" style="width:auto">' +
    [yil - 1, yil, yil + 1].map(y => "<option" + (y === yil ? " selected" : "") + ">" + y + "</option>").join("") + "</select>" +
    '<span class="not">Sadece <b>yıllık izinler</b> sayılır; izin hangi ayda başladıysa o aya yazılır. "Ay belirsiz" = programa tarihli kaydı girilmemiş, bakiyeden düşülmüş günler.</span></div>';
  Object.keys(gruplar).forEach(g => {
    let topKalan = 0, topOnceki = 0;
    html += '<div class="kutu" style="padding:10px;overflow:auto"><h2>' + esc(g) + " — " + yil + " izin takip</h2>" +
      '<table style="font-size:12.5px;min-width:1340px"><thead><tr><th style="' + st + '">S.No</th><th style="' + st + ';text-align:left">Adı soyadı</th><th style="' + st + '">İşe giriş</th>' +
      '<th style="' + st + ';background:#fff3d6">' + (yil - 1) + "'den devreden</th><th style=\"" + st + ';background:#fff3d6">' + yil + " hak</th><th style=\"" + st + ';background:#fff3d6">Toplam</th>' +
      AYLAR.map(a => '<th style="' + st + '">' + a.slice(0, 3) + "</th>").join("") +
      '<th style="' + st + '">Ay belirsiz</th><th style="' + st + '">Kullanılan</th><th style="' + st + ';background:#e2f0d9">' + (yil - 1) + "'den kalan</th><th style=\"" + st + ';background:#c62828;color:#fff">KALAN</th></tr></thead><tbody>';
    gruplar[g].forEach((p, n) => {
      const b = bakiyeOku(p.id, yil), aylik = new Array(12).fill(0);
      V.izinler.filter(i => i.personelId === p.id && i.yil === yil && i.tur === "YILLIK İZİN").forEach(i => { aylik[tarihNesne(i.baslangic).getMonth()] += +i.gun || 0; });
      const kul = aylik.reduce((t, x) => t + x, 0) + b.onc, kalan = b.dev + b.hak - kul;
      // Program dışında kullanılan ama hangi ayda olduğu bilinen günler (bakiye.aylik: {"7":7,"9":4}) kendi ayına yazılır
      const br = V.bakiye.find(x => x.personelId === p.id && x.yil === yil), disAy = (br && br.aylik) || {};
      let disTop = 0; Object.keys(disAy).forEach(m => { const g = +disAy[m] || 0; if (+m >= 1 && +m <= 12) { aylik[+m - 1] += g; disTop += g; } });
      const belirsiz = Math.max(0, b.onc - disTop), oncekiKalan = Math.max(0, b.dev - kul);
      const bilgiYok = !p.iseGiris && !b.kayitVar;
      topKalan += bilgiYok ? 0 : kalan; topOnceki += bilgiYok ? 0 : oncekiKalan;
      const renk = bilgiYok ? "#eee" : kalan <= 5 ? "#f08a24" : "#3d8b3d";
      html += '<tr class="tikla" data-id="' + p.id + '"><td style="' + st + '">' + (n + 1) + '</td><td style="' + st + ';text-align:left;white-space:nowrap">' + esc(p.ad) + '</td><td style="' + st + '">' + goster(p.iseGiris) + "</td>" +
        '<td style="' + st + '">' + sayi(b.dev) + '</td><td style="' + st + '">' + sayi(b.hak) + '</td><td style="' + st + ';font-weight:700">' + sayi(b.dev + b.hak) + "</td>" +
        aylik.map(x => '<td style="' + st + (x ? ";background:#dbe9f7;font-weight:700" : "") + '">' + (x ? sayi(x) : "") + "</td>").join("") +
        '<td style="' + st + ';color:#777">' + (belirsiz ? sayi(belirsiz) : "") + '</td><td style="' + st + '">' + sayi(kul) + "</td>" +
        '<td style="' + st + ';background:#e2f0d9;font-weight:700">' + (bilgiYok ? "" : sayi(oncekiKalan)) + "</td>" +
        '<td style="' + st + ";background:" + renk + ";color:" + (bilgiYok ? "#777" : "#fff") + ';font-weight:700">' + (bilgiYok ? "bilgi yok" : sayi(kalan)) + "</td></tr>";
    });
    html += '<tr><td colspan="20" style="' + st + ';text-align:right;font-weight:700">Toplam personel: ' + gruplar[g].length + '</td><td style="' + st + ';font-weight:700">' + sayi(topOnceki) + '</td><td style="' + st + ';font-weight:700;color:#c62828">' + sayi(topKalan) + "</td></tr></tbody></table></div>";
  });
  return html;
}

let izinSekme = "izinde", izinArama = "";
SAYFALAR.izinler = function () {
  const b = bugun(), yil = new Date().getFullYear();
  const sekmeler = [["izinde", "Şu an izinde"], ["yaklasan", "Yaklaşan"], ["yil", yil + " yılı"], ["tumu", "Tümü"], ["tablo", "📊 Ay ay tablo"]];
  if (izinSekme === "tablo") {
    $("#icerik").innerHTML = '<div class="ust"><h1>İzinler</h1><div class="sekmeler">' + sekmeler.map(s => '<button data-s="' + s[0] + '"' + (s[0] === izinSekme ? ' class="secili"' : "") + ">" + s[1] + "</button>").join("") +
      "</div></div>" + izinTablosu();
    $$("[data-s]").forEach(x => x.onclick = () => { izinSekme = x.dataset.s; SAYFALAR.izinler(); });
    $("#tyil").onchange = e => { tabloYil = +e.target.value; SAYFALAR.izinler(); };
    $$("[data-id]").forEach(t => t.onclick = () => personelPencere(+t.dataset.id));
    return;
  }
  $("#icerik").innerHTML =
    '<div class="ust"><h1>İzinler</h1><div class="sekmeler">' + sekmeler.map(s => '<button data-s="' + s[0] + '"' + (s[0] === izinSekme ? ' class="secili"' : "") + ">" + s[1] + "</button>").join("") +
    '</div><input class="ara" id="ara" placeholder="Personel ara…" value="' + esc(izinArama) + '"><button class="ana" id="yeni">+ Yeni izin</button></div>' +
    '<div class="tablo-kap"><table><thead><tr><th>Personel</th><th>İzin türü</th><th>Başlangıç</th><th class="sag">Gün</th><th>İş başı</th><th>Durum</th><th>İmzalı form</th><th></th></tr></thead><tbody id="liste"></tbody></table></div>';
  const ciz = () => {
    const a = trKucuk(izinArama);
    let l = V.izinler.filter(i => {
      if (izinSekme === "izinde") return i.baslangic <= b && i.isBasi > b;
      if (izinSekme === "yaklasan") return i.baslangic > b;
      if (izinSekme === "yil") return i.yil === yil;
      return true;
    }).filter(i => !a || trKucuk((personelBul(i.personelId) || {}).ad).includes(a));
    l.sort((x, y) => izinSekme === "yaklasan" ? (x.baslangic < y.baslangic ? -1 : 1) : (x.baslangic < y.baslangic ? 1 : -1));
    $("#liste").innerHTML = l.length ? l.map(i => {
      const p = personelBul(i.personelId) || { ad: "(silinmiş personel)" }, d = izinDurumu(i);
      return '<tr class="tikla" data-izin="' + i.id + '"><td><b>' + esc(p.ad) + "</b></td><td>" + esc(i.tur) + "</td><td>" + gosterGun(i.baslangic) + '</td><td class="sag">' + sayi(i.gun) +
        "</td><td>" + gosterGun(i.isBasi) + '</td><td><span class="rozet ' + d.sinif + '">' + (i.tur === RAPOR && d.ad === "İzinde" ? "Raporlu" : d.ad) + "</span></td><td>" +
        (imzaliBelge(i) ? '<button class="kucuk" data-imza="' + i.id + '">📎 Aç</button>' : '<span class="not">' + (i.baslangic <= b ? "⚠ yok" : "—") + "</span>") + "</td><td>" +
        (i.tur === RAPOR ? "" : '<button class="kucuk" data-form="' + i.id + '">📄 İzin formu</button>') + "</td></tr>";
    }).join("") : '<tr><td colspan="8" class="bos">Bu listede izin yok.</td></tr>';
    $$("#liste [data-izin]").forEach(t => t.onclick = e => { if (!e.target.dataset.form && !e.target.dataset.imza) izinPencere(+t.dataset.izin); });
    $$("#liste [data-form]").forEach(t => t.onclick = () => izinFormu(+t.dataset.form));
    $$("#liste [data-imza]").forEach(t => t.onclick = () => belgeAc(imzaliBelge(V.izinler.find(x => x.id === +t.dataset.imza)).yol));
  };
  $$("[data-s]").forEach(x => x.onclick = () => { izinSekme = x.dataset.s; SAYFALAR.izinler(); });
  $("#ara").oninput = e => { izinArama = e.target.value; ciz(); };
  $("#yeni").onclick = () => izinPencere(null);
  ciz();
};

function izinPencere(id, pidVarsayilan) {
  const iz = id ? V.izinler.find(i => i.id === id) : { id: 0, personelId: pidVarsayilan || 0, tur: "YILLIK İZİN", yil: new Date().getFullYear(), baslangic: "", gun: "", isBasi: "", adres: "", aciklama: "" };
  const kisiler = V.personel.filter(p => p.aktif || p.id === iz.personelId).sort((a, c) => a.ad.localeCompare(c.ad, "tr"));
  let isBasiElle = !!id;
  pencereAc(
    "<h2>" + (id ? "İzni düzenle" : "Yeni izin") + "</h2>" +
    '<form id="izf" class="form" autocomplete="off">' +
    '<div class="tam"><label>Personel *</label><select name="personelId"><option value="">— Personel seç —</option>' +
    kisiler.map(p => '<option value="' + p.id + '"' + (p.id === iz.personelId ? " selected" : "") + ">" + esc(p.ad) + (p.bina ? " — " + esc(p.bina) : "") + "</option>").join("") + "</select></div>" +
    '<div><label>İzin türü</label><select name="tur">' + IZIN_TURLERI.map(t => "<option" + (t === iz.tur ? " selected" : "") + ">" + t + "</option>").join("") + "</select></div>" +
    '<div><label>İzin yılı</label><input name="yil" type="number" value="' + iz.yil + '"></div>' +
    '<div><label>İzne çıkış tarihi *</label><input name="baslangic" type="date" value="' + esc(iz.baslangic) + '"></div>' +
    '<div><label id="gunEtiket">Kaç gün *</label><input name="gun" type="number" min="0.5" step="0.5" value="' + esc(iz.gun) + '"></div>' +
    '<div><label>İşe başlama tarihi (otomatik hesaplanır, değiştirebilirsin)</label><input name="isBasi" type="date" value="' + esc(iz.isBasi) + '"></div>' +
    '<div><label>&nbsp;</label><div class="not" id="isBasiGun"></div></div>' +
    '<div class="tam"><label>İzinde bulunacağı adres (boşsa personelin adresi yazılır)</label><input name="adres" value="' + esc(iz.adres) + '"></div>' +
    '<div><label>Yerine bakacak personel (çırak kâğıdında yazılır)</label><select name="yerineBakacak"><option value="">—</option>' +
    kisiler.map(p => "<option" + (p.ad === iz.yerineBakacak ? " selected" : "") + ">" + esc(p.ad) + "</option>").join("") + "</select></div>" +
    '<div><label>Not</label><input name="aciklama" value="' + esc(iz.aciklama) + '"></div>' +
    '<div class="tam" id="izOzet"></div></form>' + belgeBolumu(iz) +
    '<div class="pencere-alt">' + (id ? '<button class="sol tehlike" id="izSil">Sil</button>' : "") +
    '<button id="izIptal">Vazgeç</button><button id="izKaydet">Kaydet</button><button class="ana" id="izKaydetForm">Kaydet + İzin formu</button></div>');
  const f = $("#izf"), g = n => f.elements[n].value;
  function guncelle() {
    const tur = g("tur"), gun = +g("gun"), bas = g("baslangic"), pid = +g("personelId");
    $("#gunEtiket").textContent = TAKVIM_GUNU.includes(tur) ? "Kaç gün * (takvim günü)" : "Kaç iş günü *";
    if (!isBasiElle) f.elements.isBasi.value = isBasiHesapla(bas, gun, tur);
    if (bas && !id) f.elements.yil.value = tarihNesne(bas).getFullYear();
    const ib = g("isBasi");
    $("#isBasiGun").textContent = ib ? "İşe başlama günü: " + GUNLER[tarihNesne(ib).getDay()] : "";
    let h = "";
    if (pid) {
      const yil = +g("yil"), b = bakiyeOku(pid, yil);
      const once = b.onc + kullanilan(pid, yil, iz.id);
      const bu = tur === "YILLIK İZİN" ? (gun || 0) : 0, kalan = b.dev + b.hak - once - bu;
      h = '<div class="ozet"><span>' + yil + " toplam hak: <b>" + sayi(b.dev + b.hak) + "</b> (devreden " + sayi(b.dev) + " + " + sayi(b.hak) + ")</span><span>Daha önce kullanılan: <b>" + sayi(once) +
        "</b></span>" + (tur === "YILLIK İZİN" ? "<span>Bu izin: <b>" + sayi(bu) + '</b></span><span>Kalan: <b class="' + (kalan < 0 ? "eksi" : "") + '">' + sayi(kalan) + "</b></span>" : "<span>Bu izin yıllık izinden düşmez.</span>") + "</div>";
      const cak = bas && ib && V.izinler.find(x => x.personelId === pid && x.id !== iz.id && x.baslangic < ib && x.isBasi > bas);
      if (cak) h += '<div class="eksi" style="margin-top:6px">⚠ Bu tarihlerde bu kişinin başka bir izni var: ' + esc(cak.tur) + " " + goster(cak.baslangic) + " – " + goster(cak.isBasi) + "</div>";
      if (kalan < 0 && tur === "YILLIK İZİN") h += '<div class="eksi" style="margin-top:6px">⚠ Yıllık izin bakiyesi yetmiyor.</div>';
    }
    $("#izOzet").innerHTML = h;
  }
  ["personelId", "tur", "baslangic", "gun", "yil"].forEach(n => f.elements[n].addEventListener("input", () => { if (n !== "yil" && n !== "personelId") isBasiElle = false; guncelle(); }));
  f.elements.isBasi.addEventListener("input", () => { isBasiElle = true; guncelle(); });
  guncelle();
  belgeOlaylari(iz, () => { izinPencere(id); git(); });
  $("#izIptal").onclick = pencereKapat;
  if (id) $("#izSil").onclick = async () => {
    const dosyalar = (iz.belgeler || []).map(b => b.yol).filter(Boolean);
    if (!confirm("Bu izin kaydı silinsin mi?" + (dosyalar.length ? "\n\nBağlı " + dosyalar.length + " dosya da kişinin klasöründen kaldırılacak:\n• " +
      dosyalar.map(y => y.split("\\").pop()).join("\n• ") + "\n\n⚠ Dosyalar KALICI olarak silinir, geri alınamaz." : ""))) return;
    V.izinler = V.izinler.filter(i => i.id !== id);
    if (!(await kaydet("izinler"))) return;
    let tasinan = 0, hata = "";
    for (const y of dosyalar) {
      if (belgeKullaniliyor(y)) continue;  // başka bir izin de bu dosyayı gösteriyorsa dokunma
      try { if (await DK.dosyaSil(y)) tasinan++; } catch (e) { hata = e.message; }
    }
    pencereKapat(); git();
    if (hata) bildir("İzin silindi ama bazı dosyalar silinemedi: " + hata, true);
    else bildir("İzin silindi" + (tasinan ? "; " + tasinan + " dosya da silindi." : "."));
  };
  // Yeni izinde eklenen dosyalar burada bekler; Kaydet'e basınca izinle birlikte yüklenir
  const bekleyen = [];
  if (!id) {
    const liste = () => {
      $("#bekleyenListe").innerHTML = bekleyen.length ? "<table><tbody>" + bekleyen.map((f, n) => "<tr><td>📎 " + esc(f.name) +
        '</td><td class="sag"><button class="kucuk tehlike" data-bkl="' + n + '" title="Listeden çıkar">✕</button></td></tr>').join("") + "</tbody></table>" : "Dosya eklenmedi.";
      $$("[data-bkl]").forEach(b => b.onclick = () => { bekleyen.splice(+b.dataset.bkl, 1); liste(); });
    };
    const ekle = fl => {
      for (const f of Array.from(fl || [])) {
        const uz = (f.name.match(/\.[a-z0-9]+$/i) || [""])[0].toLowerCase();
        if (![".pdf", ".jpg", ".jpeg", ".png", ".tif", ".tiff", ".jfif"].includes(uz)) { bildir(f.name + ": sadece PDF ya da resim eklenebilir.", true); continue; }
        bekleyen.push(f);
      }
      liste();
    };
    $("#bdosya").onchange = e => { ekle(e.target.files); e.target.value = ""; };
    const z = $("#birak");
    z.ondragover = e => { e.preventDefault(); z.style.background = "#e3effb"; };
    z.ondragleave = () => { z.style.background = "#f7fafd"; };
    z.ondrop = e => { e.preventDefault(); z.style.background = "#f7fafd"; ekle(e.dataTransfer.files); };
  }
  async function kaydetIzin(formDa) {
    const pid = +g("personelId"), gun = +g("gun");
    if (!pid) { bildir("Personel seç.", true); return; }
    if (!g("baslangic")) { bildir("İzne çıkış tarihini gir.", true); return; }
    if (!(gun > 0)) { bildir("Gün sayısını gir.", true); return; }
    if (!g("isBasi") || g("isBasi") <= g("baslangic")) { bildir("İşe başlama tarihi izin başlangıcından sonra olmalı.", true); return; }
    const yeni = Object.assign({}, iz, { personelId: pid, tur: g("tur"), yil: +g("yil"), baslangic: g("baslangic"), gun, isBasi: g("isBasi"), adres: g("adres").trim(), aciklama: g("aciklama").trim(), yerineBakacak: g("yerineBakacak") });
    if (!id) { yeni.id = yeniId(V.izinler); yeni.kayit = bugun(); V.izinler.push(yeni); }
    else V.izinler[V.izinler.findIndex(i => i.id === id)] = yeni;
    if (!await kaydet("izinler")) return;
    let eklenen = 0;
    if (bekleyen.length) { bildir("Dosyalar kaydediliyor…"); for (const f of bekleyen) { if (await belgeYukle(yeni.id, f)) eklenen++; } }
    pencereKapat(); git();
    if (eklenen < bekleyen.length) bildir("İzin kaydedildi ama " + (bekleyen.length - eklenen) + " dosya eklenemedi; izni açıp tekrar ekle.", true);
    else bildir("İzin kaydedildi" + (eklenen ? " ve " + eklenen + " dosya eklendi." : "."));
    if (formDa && yeni.tur !== RAPOR) izinFormu(yeni.id);
  }
  $("#izKaydet").onclick = () => kaydetIzin(false);
  $("#izKaydetForm").onclick = () => kaydetIzin(true);
}

/* ---------------- izin belgeleri (imzalı form taraması, Excel form) ---------------- */
function imzaliBelge(iz) { const l = iz.belgeler || []; return l.find(b => b.tur === "İmzalı form") || (iz.tur === RAPOR ? l[0] : undefined); }
function izinDosyaKoku() { return (V.ayarlar.izinKlasoru || BILGI.varsayilanIzinKlasoru || "").replace(/\\+$/, ""); }
// Formlar kişinin kendi klasörüne gider: 4-PERSONEL\<ŞİRKET>\<AD SOYAD>\İZİN\<yıl>
function sirketKlasoru(p) {
  const s = trBuyuk(p.sirket) + " " + trBuyuk(p.statu);
  return /İSPER/.test(s) ? "İSPER" : /ÇIRAK/.test(s) ? "ÇIRAK" : /BOĞAZİÇİ/.test(s) ? "BOĞAZİÇİ" : /MEMUR/.test(s) ? "MEMUR" : "DİĞER";
}
function izinKlasoru(iz, p) {
  if (V.ayarlar.izinKlasoru) return izinDosyaKoku() + "\\" + dosyaAdi(p.ad) + "\\" + iz.yil;
  return izinDosyaKoku() + "\\" + sirketKlasoru(p) + "\\" + dosyaAdi(p.ad) + "\\İZİN\\" + iz.yil;
}
function izinDosyaAdi(iz, p) {
  const d = tarihNesne(iz.baslangic);
  return d.getFullYear() + "." + iki(d.getMonth() + 1) + "." + iki(d.getDate()) + " - " + p.ad + " - " + sayi(iz.gun) + " GÜN " + iz.tur;
}
// Rapor dosya adı: "2026.11.10- EREN SARICI - 1 GÜN RAPOR"
function raporDosyaAdi(bas, ad, gun) { const d = tarihNesne(bas); return d.getFullYear() + "." + iki(d.getMonth() + 1) + "." + iki(d.getDate()) + "- " + ad + " - " + sayi(gun) + " GÜN RAPOR"; }
function raporKlasoru(p) { return (BILGI.personelKlasoru || "4-PERSONEL") + "\\" + sirketKlasoru(p) + "\\" + dosyaAdi(p.ad) + "\\RAPOR"; }
async function belgeAc(yol) {
  try { await api("/api/ac", { yol }); } catch (e) { bildir("Açılamadı: " + e.message, true); }
}
async function belgeYukle(izinId, dosya) {
  const iz = V.izinler.find(i => i.id === izinId), p = iz && personelBul(iz.personelId);
  if (!iz || !p) return false;
  const uz = (dosya.name.match(/\.[a-z0-9]+$/i) || [".pdf"])[0].toLowerCase();
  if (![".pdf", ".jpg", ".jpeg", ".png", ".tif", ".tiff", ".jfif"].includes(uz)) { bildir("Sadece PDF ya da resim (JPG, PNG) yüklenebilir.", true); return false; }
  const rapor = iz.tur === RAPOR;
  const hedef = rapor ? raporKlasoru(p) + "\\" + dosyaAdi(raporDosyaAdi(iz.baslangic, p.ad, iz.gun)) + uz
    : izinKlasoru(iz, p) + "\\" + dosyaAdi(izinDosyaAdi(iz, p) + " - İMZALI") + uz;
  bildir("Yükleniyor…");
  try {
    const r = await DK.dosyaYazResp(hedef, dosya);
    const c = await r.json();
    if (!r.ok || c.hata) throw new Error(c.hata || ("Hata " + r.status));
    iz.belgeler = (iz.belgeler || []).concat([{ tur: rapor ? "Rapor" : "İmzalı form", yol: c.dosya, tarih: bugun() }]);
    if (await kaydet("izinler")) { bildir(rapor ? "Rapor kaydedildi: " + c.dosya.split("\\").pop() : "İmzalı form kaydedildi."); return true; }
  } catch (e) { bildir("Yüklenemedi: " + e.message, true); }
  return false;
}
function belgeBolumu(iz) {
  if (!iz.id) return '<h2 style="margin-top:16px">Belgeler</h2><div id="bekleyenListe" class="not">Dosya eklenmedi.</div>' +
    '<div id="birak" style="margin-top:10px;padding:14px;border:2px dashed #9cb3cc;border-radius:8px;text-align:center;background:#f7fafd">' +
    '📎 Taranmış <b>imzalı izin formunu</b> ya da <b>raporu</b> buraya sürükle ya da <label style="color:var(--mavi);text-decoration:underline;cursor:pointer">dosya seç<input type="file" id="bdosya" multiple accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff,.jfif" hidden></label>' +
    '<div class="not" style="margin-top:4px">Dosya, <b>Kaydet</b>\'e bastığında izinle birlikte doğru klasöre otomatik adla kaydedilir.</div></div>';
  const l = iz.belgeler || [];
  return '<h2 style="margin-top:16px">Belgeler</h2>' +
    (l.length ? "<table><tbody>" + l.map((b, n) => "<tr><td>" + (b.tur === "İmzalı form" ? "✅ " : "📄 ") + esc(b.tur) + '</td><td class="not">' + esc(b.yol.split("\\").pop()) +
      '</td><td class="sag" style="white-space:nowrap"><button class="kucuk" data-bac="' + n + '">Aç</button> <button class="kucuk tehlike" data-bsil="' + n + '" title="Sil (dosya kalıcı silinir)">✕</button></td></tr>').join("") + "</tbody></table>"
      : '<div class="not">Bu izne bağlı belge yok.</div>') +
    '<div id="birak" style="margin-top:10px;padding:14px;border:2px dashed #9cb3cc;border-radius:8px;text-align:center;background:#f7fafd">' +
    '📎 Taranmış <b>imzalı izin formunu</b> buraya sürükle ya da <label style="color:var(--mavi);text-decoration:underline;cursor:pointer">dosya seç<input type="file" id="bdosya" accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff,.jfif" hidden></label></div>';
}
// Bir dosyayı hâlâ bir izin kaydı gösteriyor mu? (silmeden önce bakılır)
function belgeKullaniliyor(yol) { return V.izinler.some(i => (i.belgeler || []).some(b => b.yol && DK.ayniYol(b.yol, yol))); }
function belgeOlaylari(iz, yenile) {
  if (!iz.id) return;
  $$("[data-bac]").forEach(b => b.onclick = () => belgeAc(iz.belgeler[+b.dataset.bac].yol));
  $$("[data-bsil]").forEach(b => b.onclick = async () => {
    const bel = iz.belgeler[+b.dataset.bsil];
    if (!confirm("Bu belge silinsin mi?\n\n" + bel.yol.split("\\").pop() + "\n\n⚠ Dosya kişinin klasöründen KALICI olarak silinir, geri alınamaz.")) return;
    iz.belgeler.splice(+b.dataset.bsil, 1);
    if (!(await kaydet("izinler"))) return;
    if (!belgeKullaniliyor(bel.yol)) {
      try { await DK.dosyaSil(bel.yol); bildir("Belge silindi."); }
      catch (e) { bildir("Kayıttan çıkarıldı ama dosya silinemedi: " + e.message, true); }
    } else bildir("Belge bu izinden çıkarıldı (başka bir izin de kullandığı için dosya yerinde bırakıldı).");
    yenile();
  });
  const yukle = async f => { if (f && await belgeYukle(iz.id, f)) yenile(); };
  $("#bdosya").onchange = e => yukle(e.target.files[0]);
  const z = $("#birak");
  z.ondragover = e => { e.preventDefault(); z.style.background = "#e3effb"; };
  z.ondragleave = () => { z.style.background = "#f7fafd"; };
  z.ondrop = e => { e.preventDefault(); z.style.background = "#f7fafd"; yukle(e.dataTransfer.files[0]); };
}

/* İsper personeli için İsper'in kendi "Çalışan İzin Formu" (FR.İKGMY.01): orijinal formun resmi üstüne bilgiler yazılıp yazdırılır.
   Konumlar formlar/isper_izin_formu.png (1622x2296 ölçeğinde ölçüldü) üzerinden mm'ye çevrilir. */
function isperMi(p) { return /İSPER/.test(trBuyuk(p.sirket)); }
function isperFormu(iz, p) {
  const mm = (x, y) => "left:" + (x / 1622 * 210).toFixed(2) + "mm;top:" + (y / 2296 * 297).toFixed(2) + "mm";
  const yaz = (x, y, metin, ek) => metin ? '<div class="y" style="' + mm(x, y) + ";" + (ek || "") + '">' + esc(metin) + "</div>" : "";
  const isaret = (x, y) => '<div class="x" style="' + mm(x, y) + '">X</div>';
  const kutu = { "YILLIK İZİN": [301, 614], "ÖLÜM İZNİ": [301, 651], "EVLİLİK İZNİ": [301, 688], "ÜCRETSİZ İZİN": [589, 651] };
  const k = kutu[iz.tur] || [1124, 686];
  const cmt = V.ayarlar.cumartesiIsGunu ? "PAZAR" : "CUMARTESİ - PAZAR";
  const html = '<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>' + esc(izinDosyaAdi(iz, p)) + " - İSPER İZİN FORMU</title><style>" +
    "@page{size:A4;margin:0}html,body{margin:0;background:#888}" +
    ".sayfa{position:relative;width:210mm;height:297mm;margin:0 auto;background:#fff url(" + new URL("formlar/isper_izin_formu.png", location.href).href + ") no-repeat 0 0/210mm 297mm}" +
    ".y{position:absolute;transform:translateY(-50%);font:600 2.9mm Arial,sans-serif;white-space:nowrap;color:#000}" +
    ".x{position:absolute;transform:translate(-50%,-50%);font:700 3.6mm Arial,sans-serif}" +
    ".arac{text-align:center;padding:10px;font:15px Arial}.arac button{font:15px Arial;padding:8px 16px;margin:0 6px;cursor:pointer}" +
    "@media print{.arac{display:none}html,body{background:#fff}}</style></head><body>" +
    '<div class="arac"><button onclick="print()">🖨 Yazdır</button> <span style="color:#fff">Yazıcı penceresinde “PDF olarak kaydet” de seçebilirsin.</span></div>' +
    '<div class="sayfa">' +
    yaz(395, 347, p.ad, "font-size:2.6mm;max-width:32mm;overflow:hidden") + yaz(735, 347, p.tc) + yaz(1468, 347, p.sicil, "font-size:2.5mm") +
    yaz(395, 381, p.bina || "FLORYA TEKNİK") + yaz(395, 412, [p.kadro, p.gorev].filter(Boolean).join(" / ")) +
    yaz(395, 444, iz.adres || p.adres, "font-size:2.6mm;max-width:108mm;overflow:hidden") + yaz(418, 504, p.telefon) +
    yaz(388, 560, goster(iz.baslangic)) + yaz(1392, 560, sayi(iz.gun)) + yaz(388, 590, cmt) +
    isaret(k[0], k[1]) + (kutu[iz.tur] ? "" : yaz(1212, 694, iz.tur, "font-size:2.3mm")) +
    yaz(1272, 858, p.ad, "transform:translate(-50%,-50%)") +
    '</div><script>setTimeout(function(){print()},400)<\/script></body></html>';
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) { bildir("Form penceresi açılamadı.", true); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

/* Çıraklar için "ÇIRAK PERSONEL İZİN KAĞIDI" (dilekçe + mütalaa kâğıdı), Word şablonu: sablonlar\cirak_izin_kagidi.doc */
function cirakMi(p) { return /ÇIRAK/.test(trBuyuk(p.sirket) + " " + trBuyuk(p.statu)); }
function adYazimi(ad) {
  const k = String(ad || "").trim().split(/\s+/);
  const bas = s => s.charAt(0) + s.slice(1).toLocaleLowerCase("tr-TR");
  return k.length < 2 ? bas(k[0] || "") : k.slice(0, -1).map(bas).join(" ") + " " + trBuyuk(k[k.length - 1]);
}
// Türkçe ses uyumuyla iyelik eki: SAKIZLI’nın, AKDERE’nin, KOÇ’un, ÖZTÜRK’ün
function iyelikEki(ad) {
  const s = trKucuk(String(ad || "").trim().split(/\s+/).pop()), unluler = s.match(/[aeıioöuü]/g) || ["e"];
  const son = unluler[unluler.length - 1], unluyleBiter = /[aeıioöuü]$/.test(s);
  const u = { a: "ı", ı: "ı", e: "i", i: "i", o: "u", u: "u", ö: "ü", ü: "ü" }[son];
  return "’" + (unluyleBiter ? "n" : "") + u + "n";
}
function cirakFormu(iz, p) {
  const yillik = iz.tur === "YILLIK İZİN", kucuk = trKucuk(iz.tur);
  const yonelme = yillik ? "yıllık izne" : /izni$/.test(kucuk) ? kucuk + "ne" : kucuk.replace(/izin$/, "izne");
  const d = {
    SICIL: p.sicil || "", AD: adYazimi(p.ad), ADIN: adYazimi(p.ad) + iyelikEki(p.ad), BABA: p.babaAdi || "", DOGUM: p.dogumYeriYili || "", UNVAN: (p.gorev ? adYazimi(p.gorev).trim() + " " : "") + "(Çırak)",
    OGRENIM: p.ogrenim || "", GIRIS: goster(p.iseGiris), BAS: goster(iz.baslangic), GUN: sayi(iz.gun), TUR: kucuk, TURE: yonelme,
    MAHSUBEN: yillik ? iz.yil + " yılı senelik iznime mahsuben " : "", AIT: yillik ? iz.yil + " yılına ait " : "",
    TC: p.tc || "", TEL: p.telefon || "", YER: iz.adres || "", YERINE: iz.yerineBakacak ? adYazimi(iz.yerineBakacak) : "", DONUS: goster(iz.isBasi)
  };
  const sat = (e, v) => '<tr><td class="e">' + e + '</td><td>:&nbsp;' + esc(v) + '</td></tr>';
  const html = '<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>' + esc(izinDosyaAdi(iz, p)) + ' - ÇIRAK İZİN KAĞIDI</title><style>' +
    '@page{size:A4;margin:18mm}body{margin:0;font:13px/1.5 Arial,sans-serif;color:#000}' +
    '.arac{text-align:center;padding:8px}.arac button{font:14px Arial;padding:7px 16px;cursor:pointer}@media print{.arac{display:none}}' +
    '.sayfa2{page-break-before:always}' +
    'table.bilgi{border-collapse:collapse;margin:0 0 10px}table.bilgi td{padding:2px 4px;vertical-align:top}.e{font-weight:bold;white-space:nowrap}' +
    'h3{text-align:center;margin:18px 0 14px;letter-spacing:1px}.govde{margin:14px 0;text-align:justify}' +
    '.imzalar{margin-top:70px;display:flex;justify-content:space-around;text-align:center}.imzalar b{display:block;margin-bottom:2px}' +
    '.sag{margin-top:46px;text-align:right}' +
    '</style></head><body>' +
    '<div class="arac"><button onclick="print()">🖨 Yazdır / PDF kaydet</button></div>' +
    '<div>' +
    '<table class="bilgi">' + sat("Sicil Numarası", d.SICIL) + sat("Adı Soyadı", d.AD) + sat("Baba Adı", d.BABA) + sat("Doğum Yeri / Yılı", d.DOGUM) + sat("Unvanı", d.UNVAN) + sat("Öğrenim Durumu", d.OGRENIM) + sat("İşe Giriş Tarihi", d.GIRIS) + '</table>' +
    '<h3>İŞLETMELER MÜDÜRLÜĞÜNE</h3>' +
    '<div class="govde">' + esc(d.BAS) + ' tarihinden itibaren ' + esc(d.MAHSUBEN) + esc(d.GUN) + ' gün ' + esc(d.TUR) + ' kullanmak istiyorum.</div>' +
    '<div class="govde">Bilgilerinizi ve gereğini arz ederim.</div>' +
    '<div class="sag">İmza<br><br><b>' + esc(d.AD) + '</b></div>' +
    '</div>' +
    '<div class="sayfa2">' +
    '<h3>MÜTALAA KÂĞIDI</h3>' +
    '<div class="govde">Florya Sosyal Tesisi Çırak personelimizden ' + esc(d.TC) + ' T.C. Kimlik numaralı ' + esc(d.ADIN) + ' ' + esc(d.BAS) + ' tarihinden itibaren ' + esc(d.AIT) + esc(d.GUN) + ' gün ' + esc(d.TURE) + ' çıkması tarafımızca uygun görülmüştür.</div>' +
    '<table class="bilgi" style="margin-top:20px">' + sat("Birimi", "Florya Sosyal Tesisi") + sat("Dahili Numarası", "3400") + sat("İletişim Bilgisi (Telefon)", d.TEL) + sat("İznini Geçireceği Yer", d.YER) + sat("Yerine Bakacak Personel", d.YERINE) + sat("İzinden Dönüş Tarihi", d.DONUS) + '</table>' +
    '<div class="imzalar"><div><br><br><b>Ömer ÇALIŞAN</b>Tesis Amiri</div><div><br><br><b>Yalçın ŞAHİN</b>İşletmeler Müdür Yardımcısı</div></div>' +
    '</div>' +
    '<scr' + 'ipt>setTimeout(function(){print()},500)</scr' + 'ipt></body></html>';
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) { bildir("Form penceresi açılamadı. Açılır pencere engelini kaldır.", true); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

async function bogaziciFormu(iz, p) {
  const b = bakiyeOku(p.id, iz.yil);
  const once = b.onc + kullanilan(p.id, iz.yil, iz.id, iz.baslangic);
  const bu = iz.tur === "YILLIK İZİN" ? iz.gun : 0;
  const toplam = b.dev + b.hak, kalan = toplam - once - bu;
  const gunAdi = s => s ? "(" + GUNLER[tarihNesne(s).getDay()] + ")" : "";
  const imzaAdi = (V.ayarlar.izinAmiri && V.ayarlar.izinAmiri.trim()) || "Celal ARAL";
  const isaret = FORM_ISARET[iz.tur] || "C21";
  const STIL = { D8: 353, K8: 445, D9: 348, D10: 348, D11: 348, D12: 348, D13: 348, D14: 379, D15: 376, L15: 449, D16: 365, C18: 102, C19: 104, C20: 104, C21: 106, H18: 104, H19: 104, H20: 104, H21: 108, H23: 473, D25: 307, D26: 322, F26: 322, I26: 46, L26: 480, D27: 301, F27: 302, D28: 303, F28: 305, C32: 486 };
  const deger = {
    D8: p.ad, K8: p.sicil, D9: p.tc, D10: p.mudurluk, D11: p.bina,
    D12: (p.kadro || "") + (p.gorev ? " (" + p.gorev + ")" : ""), D13: iz.adres || p.adres, D14: p.telefon,
    D15: goster(iz.baslangic), L15: sayi(iz.gun), D16: String(iz.yil),
    H23: p.ad, D25: goster(p.iseGiris),
    D26: sayi(toplam), F26: sayi(bu), I26: sayi(once), L26: sayi(kalan),
    D27: goster(iz.baslangic), F27: gunAdi(iz.baslangic), D28: goster(iz.isBasi), F28: gunAdi(iz.isBasi),
    C32: "Avrupa Yakası Bakım Şefliği\nBirim Sorumlusu\n" + imzaAdi
  };
  deger[isaret] = "X";
  if (typeof JSZip === "undefined") { bildir("Excel aracı yüklenemedi (internet gerekebilir).", true); return; }
  bildir("İzin formu (Excel) hazırlanıyor…");
  try {
    const ab = await (await fetch("sablonlar/izin_formu.xlsx", { cache: "force-cache" })).arrayBuffer();
    const zip = await JSZip.loadAsync(ab);
    const yolXml = "xl/worksheets/sheet1.xml";
    let xml = await zip.file(yolXml).async("string");
    const xmlEsc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    Object.keys(deger).forEach(ref => {
      const st = STIL[ref]; if (st == null) return;
      const metin = xmlEsc(deger[ref]).replace(/\r?\n/g, "&#10;");
      const yeniHucre = '<c r="' + ref + '" s="' + st + '" t="inlineStr"><is><t xml:space="preserve">' + metin + '</t></is></c>';
      const re = new RegExp('<c r="' + ref + '"[^>]*?/>|<c r="' + ref + '"[^>]*?>[\\s\\S]*?</c>');
      xml = xml.replace(re, yeniHucre);
    });
    zip.file(yolXml, xml);
    const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", compression: "DEFLATE" });
    const dad = dosyaAdi(izinDosyaAdi(iz, p)) + ".xlsx";
    const hedef = izinKlasoru(iz, p) + "\\" + dad;
    const r = await DK.dosyaYazResp(hedef, blob);
    const c = await r.json();
    if (!r.ok) throw new Error(c.hata || "kaydedilemedi");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = dad;
    a.style.display = "none"; document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
    if (!(iz.belgeler || []).some(x => x.yol === c.dosya)) { iz.belgeler = (iz.belgeler || []).concat([{ tur: "Excel form", yol: c.dosya, tarih: bugun() }]); await kaydet("izinler"); }
    bildir("İzin formu kişinin İZİN klasörüne kaydedildi ve indirildi.");
  } catch (e) { bildir("İzin formu hazırlanamadı: " + e.message, true); }
}
async function izinFormu(id) {
  const iz = V.izinler.find(i => i.id === id), p = iz && personelBul(iz.personelId);
  if (!iz || !p) { bildir("İzin ya da personel bulunamadı.", true); return; }
  if (iz.tur === RAPOR) { bildir("Sağlık raporu için izin formu hazırlanmaz.", true); return; }
  if (isperMi(p)) { isperFormu(iz, p); return; }
  if (cirakMi(p)) { await cirakFormu(iz, p); return; }
  bogaziciFormu(iz, p);
}

SAYFALAR.ayarlar = function () {
  const a = V.ayarlar, h = hakTablosu(), yil = new Date().getFullYear();
  let tatilYil = yil;
  $("#icerik").innerHTML =
    "<h1>Ayarlar</h1>" +
    '<div class="kutu"><h2>İzin kuralları</h2><form id="af" class="form">' +
    '<div class="tam not">Yıllık izin hakkı (iş günü), kıdeme göre:</div>' +
    '<div><label>1–5 yıl</label><input name="h0" type="number" value="' + h[0] + '"></div><div><label>6–14 yıl</label><input name="h1" type="number" value="' + h[1] + '"></div>' +
    '<div><label>15 yıl ve üstü</label><input name="h2" type="number" value="' + h[2] + '"></div>' +
    '<div><label>Cumartesi</label><select name="cmt"><option value="0">Tatil (izne sayılmaz)</option><option value="1"' + (a.cumartesiIsGunu ? " selected" : "") + ">İş günü (izne sayılır)</option></select></div>" +
    '<div><label>İzin formunda imza atan amir (ad soyad)</label><input name="amir" value="' + esc(a.izinAmiri) + '"></div>' +
    '<div><label>İzin formlarının kaydedileceği klasör (boş = her kişinin kendi İZİN klasörü)</label><input name="klasor" value="' + esc(a.izinKlasoru) + '" placeholder="' + esc(BILGI.personelKlasoru) + '\\<ŞİRKET>\\<AD>\\İZİN\\<yıl>"></div>' +
    '<div class="tam"><button class="ana" type="button" id="aKaydet">Kaydet</button></div></form></div>' +
    '<div class="kutu"><div class="ust"><h2 style="flex:1;margin:0">Resmi tatiller</h2><select id="ty" style="width:auto"></select></div>' +
    '<div class="form" style="grid-template-columns:180px 1fr auto;align-items:end;margin-bottom:10px"><div><label>Tarih</label><input type="date" id="tt"></div><div><label>Adı</label><input id="ta" placeholder="ör. Kurban Bayramı 2. gün"></div><button id="tEkle">Ekle</button></div>' +
    '<div id="tListe"></div></div>' +
    '<div class="kutu"><h2>Verilerin</h2><div class="not">Bütün çalışman tek klasörde: <b>' + esc(BILGI.veriKlasoru) + '</b><br>1-PROGRAM · 2-KAYITLAR (programın kayıtları; her gün otomatik yedek, son 60 gün) · 3-ŞABLONLAR · 4-PERSONEL (her kişinin İZİN, RAPOR, TUTANAK, ÖZLÜK, BORDRO klasörü) · 5-İZİN TAKİP · 6-PUANTAJ VE BORDRO</div>' +
    '<div style="margin-top:10px"><button id="vAc">Klasörü aç</button></div></div>';
  const yillar = Array.from(new Set(V.tatiller.map(t => +t.tarih.slice(0, 4)).concat([yil, yil + 1]))).sort();
  $("#ty").innerHTML = yillar.map(y => "<option" + (y === yil ? " selected" : "") + ">" + y + "</option>").join("");
  const tCiz = () => {
    const l = V.tatiller.filter(t => t.tarih.startsWith(tatilYil + "-")).sort((x, y) => x.tarih < y.tarih ? -1 : 1);
    $("#tListe").innerHTML = l.length ? "<table><tbody>" + l.map(t => "<tr><td>" + gosterGun(t.tarih) + "</td><td>" + esc(t.ad) + '</td><td class="sag"><button class="kucuk tehlike" data-sil="' + t.tarih + '">Sil</button></td></tr>').join("") + "</tbody></table>"
      : '<div class="not">Bu yıl için tatil girilmemiş.</div>';
    $$("[data-sil]").forEach(x => x.onclick = async () => { V.tatiller = V.tatiller.filter(t => t.tarih !== x.dataset.sil); tatilYenile(); await kaydet("tatiller"); tCiz(); });
  };
  $("#ty").onchange = e => { tatilYil = +e.target.value; tCiz(); };
  $("#tEkle").onclick = async () => {
    const t = $("#tt").value, ad = $("#ta").value.trim() || "Resmi tatil";
    if (!t) { bildir("Tarih seç.", true); return; }
    if (V.tatiller.some(x => x.tarih === t)) { bildir("Bu tarih zaten listede.", true); return; }
    V.tatiller.push({ tarih: t, ad }); tatilYenile();
    if (await kaydet("tatiller")) { $("#tt").value = ""; $("#ta").value = ""; tatilYil = +t.slice(0, 4); $("#ty").value = tatilYil; tCiz(); }
  };
  $("#aKaydet").onclick = async () => {
    const f = $("#af");
    V.ayarlar = Object.assign({}, V.ayarlar, {
      izinHak: [+f.h0.value || 18, +f.h1.value || 23, +f.h2.value || 28], cumartesiIsGunu: f.cmt.value === "1",
      izinAmiri: f.amir.value.trim(), izinKlasoru: f.klasor.value.trim()
    });
    if (await kaydet("ayarlar")) bildir("Ayarlar kaydedildi.");
  };
  $("#vAc").onclick = () => api("/api/ac", { yol: BILGI.veriKlasoru }).catch(e => bildir(e.message, true));
  tCiz();
};

/* ---------------- Tesisler ---------------- */
let tesisArama = "", tesisKategori = "";
const TESIS_KATEGORILER = ["Sosyal Tesis", "Kent Lokantası", "İtfaiye", "Otel / Konaklama"];
SAYFALAR.tesisler = function () {
  $("#icerik").innerHTML =
    '<div class="ust"><h1>Tesisler</h1><input class="ara" id="ara" placeholder="Ara: tesis, amir, dahili, muhasebeci…" value="' + esc(tesisArama) + '"><button class="ana" id="yeni">+ Yeni tesis</button></div>' +
    '<div class="ust" style="margin-top:-4px"><div class="sekmeler" id="kategoriler"></div></div>' +
    '<div id="liste"></div>' +
    '<div class="kutu" id="envanterKutu" style="margin-top:14px"><h2>📁 Envanter dosyaları</h2><div class="not">Yükleniyor…</div></div>';
  const ciz = () => {
    const a = trKucuk(tesisArama), hepsi = V.tesisler || [];
    const l = hepsi.filter(t => (!tesisKategori || t.kategori === tesisKategori) &&
      (!a || trKucuk([t.ad, t.bagli, t.amir, t.amirDahili, t.amirCep, t.muhasebeci, t.not].join(" ")).includes(a)));
    $("#kategoriler").innerHTML = '<button data-k=""' + (!tesisKategori ? ' class="secili"' : "") + ">Tümü (" + hepsi.length + ")</button>" +
      TESIS_KATEGORILER.filter(k => hepsi.some(t => t.kategori === k)).map(k => '<button data-k="' + esc(k) + '"' + (tesisKategori === k ? ' class="secili"' : "") + ">" + k + " (" + hepsi.filter(t => t.kategori === k).length + ")</button>").join("");
    $$("#kategoriler [data-k]").forEach(b => b.onclick = () => { tesisKategori = b.dataset.k; ciz(); });
    const gruplar = TESIS_KATEGORILER.map(k => [k, l.filter(t => t.kategori === k)]).filter(x => x[1].length);
    $("#liste").innerHTML = l.length ? gruplar.map(([k, ts]) =>
      '<div class="kutu"><div class="pbas"><h2>' + k + '</h2><span class="not">' + ts.length + " tesis</span></div>" +
      '<table><thead><tr><th>Tesis</th><th>Bağlı</th><th>Amir</th><th>Dahili</th><th>Cep</th><th>Muhasebeci</th><th>Muh. dahili</th><th>Not</th></tr></thead><tbody>' +
      ts.map(t => '<tr class="tikla" data-id="' + t.id + '"><td><b>' + esc(t.ad) + "</b>" + (t.tur ? ' <span class="not">(' + esc(t.tur) + ")</span>" : "") + '</td><td class="not">' + esc(t.bagli) + "</td><td>" + esc(t.amir) + "</td><td>" + esc(t.amirDahili) + '</td><td class="tel">' + esc(telefonYaz(t.amirCep)) + "</td><td>" + esc(t.muhasebeci) + "</td><td>" + esc(t.muhDahili) + '</td><td class="not">' + esc(t.not) + "</td></tr>").join("") +
      "</tbody></table></div>").join("") : '<div class="kutu bos">Kayıt bulunamadı.</div>';
    $$("#liste [data-id]").forEach(t => t.onclick = () => tesisPencere(+t.dataset.id));
  };
  $("#ara").oninput = e => { tesisArama = e.target.value; ciz(); };
  $("#yeni").onclick = () => tesisPencere(null);
  ciz();
  envanterListele();
};
async function envanterListele() {
  const kutu = $("#envanterKutu"); if (!kutu) return;
  let l = [];
  try { l = await api("/api/klasor-belgeler", { klasor: "9-TESİS ENVANTER" }); } catch (e) { kutu.innerHTML = '<h2>📁 Envanter dosyaları</h2><div class="eksi">' + esc(e.message) + "</div>"; return; }
  l.sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  kutu.innerHTML = "<h2>📁 Envanter dosyaları (" + l.length + ")</h2>" +
    '<div class="not" style="margin-bottom:6px">Tesis envanterleri, kombi/VRF kayıtları, kuver ve itfaiye listeleri. Tıkla, Excel\'de açılır.</div>' +
    (l.length ? '<div style="max-height:260px;overflow:auto;border:1px solid var(--cizgi);border-radius:8px"><table><tbody>' + l.map((b, n) =>
      '<tr class="tikla" data-e="' + n + '"><td style="width:28px">' + belgeSimge(b.ad) + "</td><td>" + esc(b.ad) + '</td><td class="not" style="white-space:nowrap">' + goster(b.tarih) + "</td></tr>").join("") + "</tbody></table></div>" : '<div class="not">Dosya yok.</div>');
  $$("#envanterKutu [data-e]").forEach(x => x.onclick = () => belgeAc(l[+x.dataset.e].yol));
}
function tesisPencere(id) {
  const t = id ? (V.tesisler.find(x => x.id === id) || {}) : { id: 0, kategori: "Sosyal Tesis", ad: "", bagli: "", tur: "", amir: "", amirDahili: "", amirCep: "", muhasebeci: "", muhDahili: "", not: "" };
  const alan = (ad, et, tam) => '<div' + (tam ? ' class="tam"' : "") + '><label>' + et + '</label><input name="' + ad + '" value="' + esc(t[ad] || "") + '"></div>';
  pencereAc(
    "<h2>" + (id ? esc(t.ad) : "Yeni tesis") + "</h2>" +
    '<form id="tf" class="form" autocomplete="off">' +
    '<div><label>Kategori</label><select name="kategori">' + TESIS_KATEGORILER.map(k => "<option" + (k === t.kategori ? " selected" : "") + ">" + k + "</option>").join("") + "</select></div>" +
    alan("ad", "Tesis adı *") + alan("bagli", "Bağlı (kent lokantası / sosyal tesis / konum)") + alan("tur", "Tür (otel, kafeterya…)") +
    alan("amir", "Tesis amiri") + alan("amirDahili", "Amir dahili") + alan("amirCep", "Amir cep") + alan("muhasebeci", "Muhasebeci") + alan("muhDahili", "Muhasebeci dahili") +
    alan("not", "Not", true) + "</form>" +
    '<div class="pencere-alt">' + (id ? '<button class="sol tehlike" id="tSil">Sil</button>' : "") + '<button id="tIptal">Vazgeç</button><button class="ana" id="tKaydet">Kaydet</button></div>');
  $("#tIptal").onclick = pencereKapat;
  if (id) $("#tSil").onclick = async () => { if (!confirm("Bu tesis kaydı silinsin mi?")) return; V.tesisler = V.tesisler.filter(x => x.id !== id); if (await kaydet("tesisler")) { pencereKapat(); bildir("Tesis silindi."); git(); } };
  $("#tKaydet").onclick = async () => {
    const f = $("#tf"), g = n => f.elements[n].value.trim();
    if (!g("ad")) { bildir("Tesis adı boş olamaz.", true); return; }
    const yeni = Object.assign({}, t, { kategori: f.elements.kategori.value, ad: g("ad"), bagli: g("bagli"), tur: g("tur"), amir: g("amir"), amirDahili: g("amirDahili"), amirCep: g("amirCep"), muhasebeci: g("muhasebeci"), muhDahili: g("muhDahili"), not: g("not") });
    if (!id) { yeni.id = yeniId(V.tesisler); V.tesisler.push(yeni); } else V.tesisler[V.tesisler.findIndex(x => x.id === id)] = yeni;
    if (await kaydet("tesisler")) { pencereKapat(); bildir("Kaydedildi."); git(); }
  };
}
function yakinda(baslik, metin) {
  return function () { $("#icerik").innerHTML = "<h1>" + baslik + '</h1><div class="kutu"><p>' + metin + '</p><p class="not">Bu bölüm sıradaki adımlarda eklenecek.</p></div>'; };
}
SAYFALAR.rehber = yakinda("Rehber", "Binaların dahili numaraları ve önemli telefonlar burada aranabilir olacak.");
SAYFALAR.ustyazi = yakinda("Üst Yazılar", "Konu ve muhatap seçilerek resmi biçimde üst yazı (Word) hazırlanacak; gönderilen yazılar listelenecek.");
SAYFALAR.saha = yakinda("Haftalık Saha Raporu", "Haftanın işleri girilecek, rapor senin şablonunla Word olarak hazırlanacak.");

/* ---------------- başlat ---------------- */
window.baslat = async function () {
  try {
    const [veri, bilgi] = await Promise.all([api("/api/veri"), api("/api/bilgi")]);
    SURUM = veri._surum || {}; delete veri._surum;
    Object.assign(V, veri); BILGI = bilgi;
    if (!V.ayarlar || Array.isArray(V.ayarlar)) V.ayarlar = {};
    tatilYenile();
    git();
  } catch (e) {
    $("#icerik").innerHTML = '<div class="kutu eksi">Program başlatılamadı: ' + esc(e.message) + "</div>";
  }
};
