/* MUHASEBE (Chrome sürümü) — Haftalık Saha Raporu
   Eski programdaki (1-PROGRAM\arayuz\saha.js) ekranın tarayıcıya taşınmış hali.
   WhatsApp grubunun dışa aktarımı (sohbet zip'i) + WhatsApp'tan indirilen fotoğraf zip'i tarayıcıda (JSZip) açılır,
   fotoğraflar 7-SAHA RAPORLARI\<yıl>\<No - dönem>\FOTOĞRAFLAR klasörüne yazılır, kayıtlar V.saha (2-KAYITLAR\saha.json).
   Menüde görünmesi: Ayarlar > Şeflik bilgileri > "Haftalık saha raporu" (ayarlar.sahaRaporu). Branşlar: ayarlar.sahaBranslar. */
"use strict";

const SAHA_KLASOR = "7-SAHA RAPORLARI";
const SAHA_RENKLER = ["#e39b1b", "#2f6db5", "#c0502e", "#2e8b57", "#7b4fa8", "#00838f", "#ad1457", "#5d6d7e"];
const SAHA_VARSAYILAN_BRANS = ["Elektrik", "Tesisat", "İnşaat", "Mekanik"];
// Branş adında geçen kelimeye göre anahtar kelimeler (Ayarlar'da yazılan branşlar bunlarla eşleşir)
const BRANS_SOZLUK = [
  ["ELEKTR", /elektrik|led|lamba|armatür|priz|sigorta|pano|kablo|trafo|şalter|aydınlatma|anahtar|siviç|switch|tabela|projektör|buton|hat çek|kısa devre|fotosel|jeneratör/],
  ["TESİSAT", /musluk|gider|sifon|batarya|tesisat|boru|rezervuar|hortum|petek|kombi|vana|lavabo|klozet|pisuar|su kaçağ|su akıt|tıkal|taharet|kartuş|kuğu|şofben|termosifon/],
  ["MUTFAK", /fırın|ocak|benmari|bulaşık makin|buzdolab|soğuk oda|blast|termakulp|kazan|aspiratör|davlumbaz|mutfak cihaz|fritöz|ızgara|tost|semaver|çay makin/],
  ["MEKAN", /fırın|havaland|kayış|soğuk oda|klima|bulaşık makin|motor|\bfan|blast|gaz ver|gaz kaça|ocak|termakulp|benmari|kazan|aspiratör|kompresör|hava perdes|soğutucu|buzdolab|tekerle|teker\b|yük araba|servis araba/],
  ["KAYNAK", /kaynak|demir|metal|ferforje|korkuluk|profil|sac\b|paslanmaz|krom|kaynat|tel örgü|kepenk/],
  ["BOYA", /boya|vernik|cila|badana|astar|macun|zımpara|lake|rötuş/],
  ["MARANGOZ", /marangoz|ahşap|masa|sandalye|dolap|kapı|kapak|menteşe|raf|tezgah|çekmece|kontrplak|mdf|sunta|parke|çıta|ayak|kulp|sehpa|tabure|bank/],
  ["DÖŞEME", /döşeme|kumaş|sünger|koltuk|minder|perde|deri/],
  ["CAM", /\bcam\b|ayna|vitrin|cam kır/],
  ["İNŞAAT", /fayans|derz|boya|sıva|mermer|kapı|kapak|dolap|menteşe|ahşap|raf|tavan|kalekim|seramik|parke|zemin|duvar|merdiven|basamak|masa|sandalye|kilit|cam|silikon|köşebent|alçı|tezgah|ayak|sabunluk|askı|peçetelik|tarifold|çıta|kaydırmaz/],
  ["BAKIM", /bakım|onarım|tamir|ayar|yağla|sökül|takıl|montaj/]
];
const SAHA_TESISLER = [
  ["SULTANGAZİ KENT L.", /sultan\s*gazi/], ["SULTANAHMET KENT L.", /sultan\s*ahmet/], ["FATİH İTFAİYESİ", /fatih\s*itfaiye/],
  ["ALTINBOYNUZ", /alt[ıi]n\s*boynuz/], ["KASIMPAŞA", /kas[ıi]mpaşa/], ["HALİÇ", /haliç/], ["CİHANGİR", /cihangir/], ["İSTİNYE", /istinye/],
  ["PEMBEKÖŞK", /pembe\s*köşk/], ["BOĞAZKÖY", /boğazköy/], ["HİSARÜSTÜ", /hisar\s*üstü/], ["GÜNGÖREN", /güngören/], ["KIR KAHVESİ", /k[ıi]r\s*kahve/],
  ["BEYAZKÖŞK", /beyaz\s*köşk/], ["TOPKAPI", /topkap[ıi]/], ["YAKUPLU", /yakuplu/], ["SAFA TEPESİ", /safa\s*tepe/], ["DENİZKÖŞK", /deniz\s*köşk/],
  ["ZEYTİNBURNU", /zeytinburnu/], ["ÇAMLICA", /çaml[ıi]ca/], ["ÇAPA KENT L.", /çapa/], ["BAĞCILAR KENT L.", /bağc[ıi]lar/], ["AVCILAR", /avc[ıi]lar/],
  ["KÜÇÜKÇEKMECE KENT L.", /küçük\s*çekmece|çekmece\s*kent/], ["BEŞYOL KENT L.", /beşyol/], ["ARNAVUTKÖY", /arnavutköy/], ["ESENYURT KENT L.", /esenyurt/], ["SİLİVRİ KENT L.", /silivri/],
  ["EYÜP KENT L.", /eyüp/], ["ÇATALCA KENT L.", /çatalca/], ["ÇIRPICI", /ç[ıia]rp[ıi]c[ıi]/], ["ESENLER", /esenler/], ["ŞİRİNEVLER", /şirinevler/], ["FETHİPAŞA", /fethi\s*paşa/],
  ["SULTANBEYLİ", /sultanbeyli/], ["MERKEZ MUTFAK", /merkez\s*mutfak/], ["GAZİ", /\bgazi\b/], ["LOJİSTİK", /lojistik/],
  ["FLORYA", /florya|alakart|ideal|şahin\s*tepe|sahil|havuz|pastane|idari\s*bina|k[ıi]r\s*bahçe|çay\s*bahçe|düğün\s*salon|kafeterya/]
];

function sahaBranslar() {
  const l = String((V.ayarlar && V.ayarlar.sahaBranslar) || "").split(",").map(s => s.trim()).filter(Boolean);
  return l.length ? l : SAHA_VARSAYILAN_BRANS.slice();
}
function bransRenk(b) { const l = sahaBranslar(), i = l.indexOf(b); return SAHA_RENKLER[(i < 0 ? l.length : i) % SAHA_RENKLER.length]; }
function bransDeseni(b) {
  const B = trBuyuk(b), s = BRANS_SOZLUK.find(([k]) => B.includes(k));
  if (s) return s[1];
  const kok = trKucuk(b).replace(/[^a-zçğıöşü0-9 ]/g, "").trim();
  return kok ? new RegExp(kok.slice(0, Math.max(4, kok.length - 2))) : null;
}
function sahaTesisListesi() {
  const ek = (V.tesisler || []).map(t => {
    const ad = trBuyuk(t.ad || "").replace(/\(.*?\)/g, "").replace(/SOSYAL TES[İI]S\S*|KENT LOKANTASI|DAVET VE TOPLANTI SALONU|OTEL|İTFAİYE(Sİ)?/g, "").replace(/\s+/g, " ").trim();
    return ad.length >= 4 ? [ad, new RegExp(trKucuk(ad).replace(/\s+/g, "\\s*"))] : null;
  }).filter(Boolean);
  return SAHA_TESISLER.concat(ek);
}
function tesisBul(metin) {
  const k = trKucuk(metin);
  for (const [ad, re] of sahaTesisListesi()) if (re.test(k)) return ad;
  return "";
}
function bransBul(metin, gonderen) {
  const k = trKucuk(metin), l = sahaBranslar();
  // Önce sözlük sırasıyla (özel → genel: Elektrik, Tesisat, Mutfak, Mekanik, Kaynak, Boya, Marangoz … İnşaat, Bakım)
  for (const [anahtar, re] of BRANS_SOZLUK) { const b = l.find(x => trBuyuk(x).includes(anahtar)); if (b && re.test(k)) return b; }
  // Sözlükte olmayan branş adları: adın kökü metinde geçiyorsa
  for (const b of l) { if (BRANS_SOZLUK.some(([a]) => trBuyuk(b).includes(a))) continue; const re = bransDeseni(b); if (re && re.test(k)) return b; }
  const p = gonderenPersonel(gonderen), g = trBuyuk(p && p.gorev);
  if (g) for (const b of l) { const B = trBuyuk(b); if (g.includes(B.slice(0, Math.max(4, B.length - 2)))) return b; }
  return l[0];
}
function gonderenPersonel(ad) {
  const a = trBuyuk(String(ad || "").replace(/^T\s+/, "").replace(/\babi\b/i, "")).replace(/\s+/g, " ").trim();
  if (!a) return null;
  return V.personel.find(p => p.ad === a) || V.personel.find(p => { const k = p.ad.split(" "); return a.includes(k[0]) && a.includes(k[k.length - 1]); }) ||
    V.personel.find(p => a.split(" ").length === 1 && p.ad.startsWith(a + " "));
}
function cumleDuzelt(s) {
  s = String(s || "").replace(/\s+/g, " ").replace(/\s+([.,;:])/g, "$1").trim();
  if (!s) return "";
  s = s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
  if (!/[.!?]$/.test(s)) s += ".";
  return s;
}
function pazartesi(t) { const d = tarihNesne(t); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return tarihMetin(d); }

/* ---- fotoğrafları klasörden okuyup ekranda göstermek (tarayıcı adresi) ---- */
const sahaFotoUrl = new Map();
async function sahaFotoAl(yol) {
  if (sahaFotoUrl.has(yol)) return sahaFotoUrl.get(yol);
  try { const t = await DK.dosyaTutamac(yol, false); const u = URL.createObjectURL(await t.tutamac.getFile()); sahaFotoUrl.set(yol, u); return u; }
  catch (e) { sahaFotoUrl.set(yol, ""); return ""; }
}
function sahaFotolariDoldur(kap) {
  $$("img[data-yol]", kap).forEach(async img => { const u = await sahaFotoAl(img.dataset.yol); if (u) img.src = u; else img.alt = "Fotoğraf bulunamadı"; });
}

/* ---------------- WhatsApp sohbetini işlere çevir ---------------- */
function sohbetiOku(metin) {
  const satirlar = String(metin || "").replace(/‎|‏/g, "").split(/\r?\n/);
  const re = /^\[(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4}),? (\d{1,2})[:.](\d{2})[:.](\d{2})\s?([AP]M)?\] ([^:]+): ?(.*)$/;
  const mesajlar = []; let son = null;
  for (const s of satirlar) {
    const m = re.exec(s);
    if (m) {
      let gun, ay, yil = +m[3]; if (yil < 100) yil += 2000;
      if (s.includes("/")) { ay = +m[1]; gun = +m[2]; } else { gun = +m[1]; ay = +m[2]; }   // ABD biçimi a/g/yy, Türkçe g.a.yyyy
      let sa = +m[4]; if (m[7] === "PM" && sa < 12) sa += 12; if (m[7] === "AM" && sa === 12) sa = 0;
      son = { tarih: yil + "-" + iki(ay) + "-" + iki(gun), saat: iki(sa) + "." + m[5] + "." + m[6], zaman: new Date(yil, ay - 1, gun, sa, +m[5], +m[6]).getTime(), gonderen: m[8].trim(), metin: m[9] };
      mesajlar.push(son);
    } else if (son) son.metin += "\n" + s;
  }
  mesajlar.forEach(m => {
    m.gorsel = /<(görsel|image|fotoğraf)[^>]*dahil edilmedi>|<eklendi:|\(dosya ekli\)/i.test(m.metin);
    m.iletildi = /^\[İletildi\]/.test(m.metin);
    m.silindi = /^Bu mesaj silindi$|^This message was deleted$/.test(m.metin.trim());
    m.temiz = m.metin.replace(/\[İletildi\]|<[^>]*dahil edilmedi>|<album mesajı>|<eklendi:[^>]*>|\S+\.(jpe?g|mp4|opus) \(dosya ekli\)/gi, "").trim();
  });
  return mesajlar;
}
function isleriCikar(mesajlar, fotoListesi, bas, bit) {
  const fotoAdlari = new Map(fotoListesi.map(y => [y.split("\\").pop().toLowerCase(), y]));
  const sayac = {};
  const fotoBul = m => {
    const k = m.tarih + " " + m.saat; const n = sayac[k] || 0; sayac[k] = n + 1;
    for (const uz of [".jpeg", ".jpg"]) { const ad = ("WhatsApp Image " + m.tarih + " at " + m.saat + (n ? " (" + n + ")" : "") + uz).toLowerCase(); if (fotoAdlari.has(ad)) return fotoAdlari.get(ad); }
    return null;
  };
  const atla = g => g === "Siz" || g === "You" || (gonderenPersonel(g) && /MEMUR|İDARİ/.test(trBuyuk(gonderenPersonel(g).statu)));
  // Gönderiler: aynı kişinin arka arkaya (2 dk içinde) attığı fotoğraf + yazılar; fotoğraftan sonra 6 dk içinde gelen yazı da eklenir.
  // Gönderinin içi BLOKLARA ayrılır: fotoğrafın altına yazılan açıklama (WhatsApp'ta resim yazısı) o fotoğrafla KESİN eşleşir;
  // yazısız fotoğraflar kendinden önceki açıklamalı fotoğrafın bloğuna katılır; fotoğraflardan sonra gelen yazı o fotoğraflara aittir.
  const gonderiler = []; let g = null;
  for (const m of mesajlar) {
    if (m.tarih < bas || m.tarih > bit || m.silindi) continue;
    const foto = m.gorsel ? fotoBul(m) : null;
    if (atla(m.gonderen)) continue;
    if (!m.temiz && !m.gorsel) continue;
    if (/^@\S+/.test(m.temiz) && m.temiz.split(/\s+/).length <= 3 && !m.gorsel) continue;
    const blokYazisiz = g && g.bloklar.length && !g.bloklar[g.bloklar.length - 1].metin.trim();
    const ayni = g && g.gonderen === m.gonderen && (m.zaman - g.sonZaman <= 120000 || (blokYazisiz && m.temiz && m.zaman - g.sonZaman <= 360000));
    if (!ayni) { g = { gonderen: m.gonderen, tarih: m.tarih, saat: m.saat, sonZaman: m.zaman, bloklar: [], iletildi: m.iletildi }; gonderiler.push(g); }
    g.sonZaman = m.zaman;
    // İletilen (başka yerden gelen) fotoğraf gönderiye katılmaz; ustanın kendi mesajı gelince gönderi "iletildi" sayılmaz
    if (ayni && !m.iletildi && g.iletildi) { g.iletildi = false; g.bloklar = g.bloklar.filter(b => !b.iletilen); }
    let son = g.bloklar[g.bloklar.length - 1];
    if (m.gorsel && m.temiz) {
      // Aynı açıklama ikinci kez gelirse (WhatsApp albümde tekrar yazar) eski bloğa eklenir
      const es = g.bloklar.find(b => b.metin === m.temiz);
      if (es) { if (foto && !es.fotolar.includes(foto)) es.fotolar.push(foto); son = es; }
      else g.bloklar.push({ fotolar: foto ? [foto] : [], metin: m.temiz, iletilen: m.iletildi, aciklamali: true });
    } else if (m.gorsel) {
      if (!son || (son.metin && !son.aciklamali && son.fotolar.length)) g.bloklar.push(son = { fotolar: [], metin: "", iletilen: m.iletildi });
      if (foto && !son.fotolar.includes(foto)) son.fotolar.push(foto);
    } else {
      if (son && !son.metin.trim()) son.metin = m.temiz;                     // önce fotoğraflar, sonra yazı
      else if (son && !son.aciklamali && !son.fotolar.length) { if (!son.metin.includes(m.temiz)) son.metin += "\n" + m.temiz; }
      else if (!g.bloklar.some(b => b.metin.includes(m.temiz))) g.bloklar.push({ fotolar: [], metin: m.temiz, iletilen: m.iletildi });
    }
  }
  // Her bloğun satırlarını ayrı işlere böl
  const isler = []; let no = 0;
  const satirBol = metin => {
    // Tek satıra yazılmış birden çok iş kodunu ("Haliç. 12360 … 12386 … 12419 …") ayrı satırlara böl;
    // ilk koddan önceki kısa yazı tesis adıysa ayrı tesis satırı olur.
    const satirlar = [];
    for (let s of String(metin || "").split(/\n/)) {
      s = s.replace(/\s+/g, " ").trim(); if (!s) continue;
      const kodlar = s.match(/(^|\s)\d{5}(?=\s*[:.\-–]?\s)/g) || [];
      if (kodlar.length >= 2 || (kodlar.length === 1 && !/^\d{5}/.test(s))) {
        const parca = s.split(/\s(?=\d{5}\s*[:.\-–]?\s)/).map(x => x.trim()).filter(Boolean);
        if (parca.length > 1 && !/^\d{5}/.test(parca[0])) {
          const on = parca[0].replace(/[.:,\-–]+$/, "").trim();
          if (on.length <= 30 && tesisBul(on) && on.split(" ").length <= 4) { satirlar.push(on); parca.shift(); }
        }
        parca.forEach(x => satirlar.push(x));
      } else satirlar.push(s);
    }
    return satirlar;
  };
  for (const go of gonderiler) {
    let tesis = "";
    const tumMetin = go.bloklar.map(b => b.metin).join("\n");
    for (const bl of go.bloklar) {
      let malzemeModu = false; const malzeme = [], kalemler = [];
      for (const s of satirBol(bl.metin)) {
        if (/^kullan[ıi]lan malzeme/i.test(s)) { malzemeModu = true; continue; }
        if (malzemeModu && /^\d+\s*(adet|metre|mt|m|kg|lt|paket|kutu)\b/i.test(s)) { malzeme.push(s.replace(/^(\d+)\s*adet\s*/i, "$1 adet ")); continue; }
        malzemeModu = false;
        const kod = /^((?:\d{4,5})(?:\s*[-–,\/&]\s*\d{4,5})*|kod\s*yok|kodsuz|kodyok)\s*[:.\-]?\s*(.*)$/i.exec(s);
        const yalnizTesis = !kod && s.length <= 30 && tesisBul(s) && s.split(" ").length <= 4;
        if (yalnizTesis) { tesis = tesisBul(s); continue; }
        if (kod) kalemler.push({ tesis, kod: /^\d/.test(kod[1]) ? kod[1].replace(/\s+/g, "") : "", metin: kod[2] });
        else if (/^bunlar kapat|^plantuma|iş kapat[ıi]labilir|^silebilirsiniz/i.test(s)) continue;
        else kalemler.push({ tesis, kod: "", metin: s });
      }
      if (!kalemler.length) kalemler.push({ tesis, kod: "", metin: "" });
      const n = kalemler.length, m = bl.fotolar.length;
      kalemler.forEach((k, i) => {
        // Blokta tek iş varsa fotoğraflar KESİN onundur. Birden çok iş varsa hepsine bloğun bütün fotoğrafları verilir,
        // başlangıç fotoğrafı tahmindir ve kart "kontrol et" diye işaretlenir.
        const bas = m ? (m >= n ? Math.floor(i * m / n) : i % m) : 0;
        const tesisSon = k.tesis || tesisBul(k.metin) || tesisBul(tumMetin) || "";
        const kisa = k.metin.replace(/\b(yap[ıi]ld[ıi]|kapat[ıi]labilir|kapat[ıi]lacak|tamam)\b/gi, "").trim().length < 4 ||
          /yönlendiril(ecek|di)|düşelim|iptal edil|yapılmayacak/i.test(k.metin);   // yapılmamış/başkasına giden iş rapora girmesin
        isler.push({
          id: ++no, tarih: go.tarih, saat: go.saat, gonderen: go.gonderen.replace(/^T\s+/, ""), kod: k.kod, tesis: tesisSon,
          brans: bransBul(k.metin, go.gonderen), baslik: "", aciklama: cumleDuzelt(k.metin), malzeme: i === n - 1 ? malzeme.join(", ") : "",
          fotolar: bl.fotolar.slice(), foto: bas, fotoKesin: m > 0 && n === 1,
          rapora: !go.iletildi && !bl.iletilen && !kisa && !!k.metin && m > 0, one: false, kaynak: k.metin
        });
      });
    }
  }
  return isler;
}
/* ---------------- ekranlar ---------------- */
let sahaAcik = null, sahaFiltre = "rapora";
SAYFALAR.saha = function () {
  if (!Array.isArray(V.saha)) V.saha = [];
  const r = sahaAcik && V.saha.find(x => x.id === sahaAcik);
  if (r) return raporDuzenle(r);
  const l = V.saha.slice().sort((a, b) => b.bas < a.bas ? -1 : 1);
  $("#icerik").innerHTML = '<div class="ust"><h1>Haftalık Saha Raporu</h1><button class="ana" id="yeniRapor">+ Yeni haftalık rapor</button></div>' +
    (l.length ? '<div class="tablo-kap"><table><thead><tr><th>No</th><th>Dönem</th><th>Rapor tarihi</th><th class="sag">İş kartı</th><th class="sag">Öne çıkan</th><th></th></tr></thead><tbody>' +
      l.map(x => '<tr class="tikla" data-r="' + x.id + '"><td><b>' + esc(x.no) + "</b></td><td>" + goster(x.bas) + " – " + goster(x.bit) + "</td><td>" + goster(x.tarih) +
        '</td><td class="sag">' + x.isler.filter(i => i.rapora).length + '</td><td class="sag">' + x.isler.filter(i => i.one).length +
        '</td><td class="sag"><button class="kucuk tehlike" data-rsil="' + x.id + '">Sil</button></td></tr>').join("") + "</tbody></table></div>"
      : '<div class="kutu"><p>Henüz rapor yok. <b>+ Yeni haftalık rapor</b> ile başla.</p><p class="not">Her hafta: WhatsApp grubunu <b>dışa aktar</b> (sohbet zip\'i) ve haftanın <b>fotoğraflarını</b> WhatsApp\'tan indir (fotoğraf zip\'i). Raporun içinde <b>📥 WhatsApp\'tan al</b> düğmesiyle ikisini seçersin.</p></div>');
  $("#yeniRapor").onclick = () => {
    const son = l[0], bas = son ? gunEkle(son.bas, 7) : pazartesi(gunEkle(bugun(), -7));
    const r = { id: yeniId(V.saha), no: son ? (+son.no || 0) + 1 : 1, bas, bit: gunEkle(bas, 6), tarih: gunEkle(bas, 7), birim: sef("sefAdi"),
      hazirlayan: son ? son.hazirlayan : "", sef: son ? son.sef : sef("izinAmiri"), gelenTalep: "", yapilanIs: "",
      aciklama: "Tüm çalışmalar saha ekipleri tarafından standartlara uygun şekilde tamamlanmıştır.", notlar: "", isler: [] };
    V.saha.push(r); sahaAcik = r.id; kaydet("saha"); SAYFALAR.saha();
  };
  $$("[data-r]").forEach(t => t.onclick = e => { if (e.target.closest("[data-rsil]")) return; sahaAcik = +t.dataset.r; SAYFALAR.saha(); });
  $$("[data-rsil]").forEach(b => b.onclick = async () => {
    const r = V.saha.find(x => x.id === +b.dataset.rsil);
    if (!r || !confirm("No " + r.no + " raporu silinsin mi? (Kayıt silinir; klasördeki fotoğraflar yerinde kalır.)")) return;
    V.saha = V.saha.filter(x => x !== r); if (await kaydet("saha")) { bildir("Rapor silindi."); SAYFALAR.saha(); }
  });
};

let sahaKayitZaman;
function sahaKaydetSonra() { clearTimeout(sahaKayitZaman); sahaKayitZaman = setTimeout(() => kaydet("saha"), 700); }
function sahaRaporKlasoru(r) { return SAHA_KLASOR + "\\" + r.bas.slice(0, 4) + "\\" + iki(+r.no || 0) + " - " + goster(r.bas) + " - " + goster(r.bit); }
function sayimlar(r) {
  const s = {}; sahaBranslar().forEach(b => s[b] = 0);
  r.isler.filter(i => i.rapora).forEach(i => { s[i.brans] = (s[i.brans] || 0) + 1; });
  return s;
}

function raporDuzenle(r) {
  const s = sayimlar(r), bl = Object.keys(s), top = bl.reduce((t, b) => t + s[b], 0), oneSay = r.isler.filter(i => i.one).length;
  const alan = (ad, etiket, tip) => '<div><label>' + etiket + '</label><input data-ra="' + ad + '" type="' + (tip || "text") + '" value="' + esc(r[ad]) + '"></div>';
  const filtreler = [["rapora", "Rapora girecekler"], ["disarida", "Dışarıda kalanlar"], ["one", "⭐ Öne çıkanlar"], ["hepsi", "Hepsi"]];
  $("#icerik").innerHTML =
    '<div class="ust"><button id="geri">← Raporlar</button><h1>Haftalık Saha Raporu — No ' + esc(r.no) + '</h1><button id="wa">📥 WhatsApp\'tan al</button><button class="ana" id="yazdir">🖨 Raporu oluştur</button></div>' +
    '<div class="kutu"><div class="form" style="grid-template-columns:repeat(4,1fr)">' + alan("no", "Rapor no", "number") + alan("tarih", "Rapor tarihi", "date") + alan("bas", "Dönem başı", "date") + alan("bit", "Dönem sonu", "date") +
    alan("hazirlayan", "Raporu hazırlayan") + alan("sef", "Sorumlu şef") + alan("gelenTalep", "Gelen talep sayısı (Minerva)", "number") + alan("yapilanIs", "Yapılan iş sayısı (boşsa kart sayısı)", "number") +
    '<div class="tam"><label>Hazırlayan birim</label><input data-ra="birim" value="' + esc(r.birim) + '"></div>' +
    '<div class="tam"><label>Açıklama</label><input data-ra="aciklama" value="' + esc(r.aciklama) + '"></div><div class="tam"><label>Notlar</label><input data-ra="notlar" value="' + esc(r.notlar) + '"></div></div>' +
    '<div class="ozet" style="margin-top:10px">' + bl.map(b => '<span style="color:' + bransRenk(b) + '">' + esc(b) + ": <b>" + s[b] + "</b></span>").join("") + "<span>Toplam kart: <b>" + top + "</b></span><span>⭐ Öne çıkan: <b>" + oneSay + "</b> / 6</span></div></div>" +
    '<div class="ust"><div class="sekmeler">' + filtreler.map(f => '<button data-f="' + f[0] + '"' + (f[0] === sahaFiltre ? ' class="secili"' : "") + ">" + f[1] + "</button>").join("") + "</div>" +
    '<span class="not">' + (r.isler.length ? r.isler.length + " iş bulundu. Kartı rapora almak/çıkarmak için kutucuğu işaretle; fotoğrafa tıklayınca diğer fotoğraflar arasında gezer." : "") + "</span></div>" +
    '<div id="kartlar" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:12px"></div>';
  $("#geri").onclick = () => { sahaAcik = null; SAYFALAR.saha(); };
  $$("[data-ra]").forEach(i => i.onchange = () => { r[i.dataset.ra] = i.type === "number" ? (i.value === "" ? "" : +i.value) : i.value; sahaKaydetSonra(); });
  $$("[data-f]").forEach(b => b.onclick = () => { sahaFiltre = b.dataset.f; raporDuzenle(r); });
  $("#wa").onclick = () => whatsappPencere(r);
  $("#yazdir").onclick = () => raporYazdir(r);
  kartlariCiz(r);
}

function kartlariCiz(r) {
  const l = r.isler.filter(i => sahaFiltre === "hepsi" || (sahaFiltre === "rapora" && i.rapora) || (sahaFiltre === "disarida" && !i.rapora) || (sahaFiltre === "one" && i.one));
  const tesisSecenek = Array.from(new Set(sahaTesisListesi().map(t => t[0]))).map(t => '<option value="' + esc(t) + '">').join("");
  const bl = sahaBranslar();
  $("#kartlar").innerHTML = (l.length ? "" : '<div class="bos">Bu listede kart yok.' + (r.isler.length ? "" : " Önce <b>📥 WhatsApp'tan al</b> düğmesine bas.") + "</div>") +
    '<datalist id="dlTesis">' + tesisSecenek + "</datalist>" +
    l.map(i => {
      const foto = i.fotolar[i.foto || 0];
      const secenek = bl.includes(i.brans) ? bl : bl.concat([i.brans]);
      return '<div class="kutu" style="padding:10px;margin:0;' + (i.rapora ? "" : "opacity:.55;") + (i.one ? "outline:3px solid #f5b400;" : "") + '" data-i="' + i.id + '">' +
        '<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><label style="display:flex;gap:5px;align-items:center;font-weight:600"><input type="checkbox" data-k="rapora"' + (i.rapora ? " checked" : "") + "> Rapora al</label>" +
        '<button class="kucuk" data-one title="Öne çıkan işler sayfasına koy">' + (i.one ? "⭐ Öne çıkan" : "☆ Öne çıkar") + '</button><span class="not" style="margin-left:auto">' + esc(i.gonderen) + " · " + goster(i.tarih) + " " + esc(i.saat.slice(0, 5).replace(".", ":")) + "</span></div>" +
        (foto ? '<img data-foto data-yol="' + esc(foto) + '" style="width:100%;height:210px;object-fit:cover;border-radius:6px;cursor:pointer;background:#eee" title="Tıkla: sonraki fotoğraf">' +
          '<div class="not" style="text-align:center">' + ((i.foto || 0) + 1) + " / " + i.fotolar.length + " fotoğraf" + (i.fotolar.length > 1 ? " · tıkla, değiştir" : "") + "</div>"
          : '<div class="bos" style="height:120px;background:#f3f3f3;border-radius:6px">Fotoğraf yok</div>') +
        '<div class="form" style="grid-template-columns:1fr 1fr;gap:6px 8px;margin-top:6px">' +
        '<div><label>Tarih</label><input type="date" data-k="tarih" value="' + esc(i.tarih) + '"></div>' +
        '<div><label>Branş</label><select data-k="brans">' + secenek.map(b => "<option" + (b === i.brans ? " selected" : "") + ">" + esc(b) + "</option>").join("") + "</select></div>" +
        '<div class="tam"><label>Tesis</label><input data-k="tesis" list="dlTesis" value="' + esc(i.tesis) + '"></div>' +
        (i.one ? '<div class="tam"><label>Başlık (öne çıkanlarda)</label><input data-k="baslik" value="' + esc(i.baslik) + '" placeholder="ör. Salon sandalyeleri onarımı"></div>' : "") +
        '<div class="tam"><label>Açıklama</label><textarea data-k="aciklama" rows="3">' + esc(i.aciklama) + "</textarea></div>" +
        '<div class="tam"><label>Malzeme</label><input data-k="malzeme" value="' + esc(i.malzeme) + '" placeholder="ör. Menteşe – 4 adet"></div></div>' +
        (i.kaynak && cumleDuzelt(i.kaynak) !== i.aciklama ? '<div class="not" style="margin-top:4px">Ustanın yazdığı: ' + esc(i.kaynak) + "</div>" : "") +
        (i.kod ? '<div class="not">İş kodu: ' + esc(i.kod) + "</div>" : "") + "</div>";
    }).join("");
  sahaFotolariDoldur($("#kartlar"));
  $$("#kartlar [data-i]").forEach(k => {
    const i = r.isler.find(x => x.id === +k.dataset.i);
    $$("[data-k]", k).forEach(a => a.onchange = () => {
      i[a.dataset.k] = a.type === "checkbox" ? a.checked : a.value; sahaKaydetSonra();
      if (a.type === "checkbox" || a.dataset.k === "brans") raporDuzenle(r);
    });
    const f = $("[data-foto]", k); if (f) f.onclick = () => { if (i.fotolar.length > 1) { i.foto = ((i.foto || 0) + 1) % i.fotolar.length; sahaKaydetSonra(); kartlariCiz(r); } };
    $("[data-one]", k).onclick = () => {
      if (!i.one && r.isler.filter(x => x.one).length >= 6) { bildir("En fazla 6 öne çıkan iş seçilebilir.", true); return; }
      i.one = !i.one; if (i.one) { i.rapora = true; if (!i.baslik) i.baslik = i.aciklama.split(/[.;,]/)[0].slice(0, 45); }
      sahaKaydetSonra(); raporDuzenle(r);
    };
  });
}

/* ---- WhatsApp zip'lerini tarayıcıda aç ---- */
function whatsappPencere(r) {
  if (!window.JSZip) { bildir("Zip okuyucu yüklenemedi. Sayfayı yenile.", true); return; }
  pencereAc("<h2>WhatsApp'tan işleri al</h2>" +
    '<div class="not">Dönem: <b>' + goster(r.bas) + " – " + goster(r.bit) + "</b>. Sadece bu tarihler arasındaki mesajlar ve fotoğraflar alınır.</div>" +
    '<h2 style="margin-top:12px">1) Sohbet (WhatsApp → grup → Sohbeti dışa aktar)</h2><input type="file" id="waSohbet" accept=".zip,.txt">' +
    '<h2 style="margin-top:12px">2) Fotoğraflar (WhatsApp\'tan indirilen zip ya da fotoğraflar)</h2><input type="file" id="waFoto" accept=".zip,.jpg,.jpeg" multiple>' +
    '<div class="not" style="margin-top:6px">Dosyalar genelde <b>İndirilenler</b> klasöründe olur. Sohbet zip\'inin içinde fotoğraflar da varsa 2. adımı boş bırakabilirsin.</div>' +
    (r.isler.length ? '<div class="eksi" style="margin-top:10px">⚠ Bu rapordaki ' + r.isler.length + " kartın yerine yenileri gelecek (düzeltmelerin silinir).</div>" : "") +
    '<div id="waDurum" class="not" style="margin-top:8px"></div>' +
    '<div class="pencere-alt"><button id="waIptal">Vazgeç</button><button class="ana" id="waAl">İçe aktar</button></div>');
  $("#waIptal").onclick = pencereKapat;
  $("#waAl").onclick = async () => {
    const sz = $("#waSohbet").files[0], fz = Array.from($("#waFoto").files || []);
    if (!sz) { bildir("Sohbet dosyasını seç.", true); return; }
    const durum = t => { const d = $("#waDurum"); if (d) d.textContent = t; };
    $("#waAl").disabled = true;
    try {
      let sohbet = ""; const resimler = [];   // [{ad, blob}]
      const zipAc = async f => {
        const z = await JSZip.loadAsync(f);
        for (const e of Object.values(z.files)) {
          if (e.dir) continue;
          const ad = e.name.split("/").pop();
          if (/\.txt$/i.test(ad) && (!sohbet || /chat/i.test(ad))) sohbet = await e.async("string");
          else if (/^WhatsApp Image .*\.jpe?g$/i.test(ad)) resimler.push({ ad, al: () => e.async("blob") });
        }
      };
      durum("Sohbet okunuyor…");
      if (/\.zip$/i.test(sz.name)) await zipAc(sz); else sohbet = await sz.text();
      if (!sohbet) throw new Error("Seçilen dosyada sohbet metni (.txt) bulunamadı.");
      for (const f of fz) {
        if (/\.zip$/i.test(f.name)) { durum("Fotoğraf zip'i açılıyor: " + f.name); await zipAc(f); }
        else if (/^WhatsApp Image .*\.jpe?g$/i.test(f.name)) resimler.push({ ad: f.name, al: async () => f });
      }
      // Sohbette bu döneme ait mesaj yoksa: mesajların tarihlerini söyle, dönemi o haftaya çevirmeyi teklif et
      const mesajlar = sohbetiOku(sohbet);
      if (!mesajlar.length) throw new Error("Sohbet dosyasında okunabilen mesaj yok.");
      if (!mesajlar.some(m => m.tarih >= r.bas && m.tarih <= r.bit)) {
        const ilk = mesajlar[0].tarih, son = mesajlar[mesajlar.length - 1].tarih, yb = pazartesi(son);
        if (!confirm("Sohbetteki mesajlar " + goster(ilk) + " – " + goster(son) + " tarihli, ama rapor dönemi " + goster(r.bas) + " – " + goster(r.bit) + ".\n\nRapor dönemini " + goster(yb) + " – " + goster(gunEkle(yb, 6)) + " yapıp devam edeyim mi?")) {
          durum("Dönemde mesaj yok. Rapor dönemini değiştirip tekrar dene."); $("#waAl").disabled = false; return;
        }
        r.bas = yb; r.bit = gunEkle(yb, 6); r.tarih = gunEkle(yb, 7);
      }
      // Sadece dönemdeki fotoğraflar klasöre yazılır
      const donemde = resimler.filter(x => { const m = /WhatsApp Image (\d{4}-\d{2}-\d{2})/i.exec(x.ad); return m && m[1] >= r.bas && m[1] <= r.bit; });
      const hedef = sahaRaporKlasoru(r) + "\\FOTOĞRAFLAR";
      await DK.dizin(hedef, true);
      const fotolar = [];
      for (let n = 0; n < donemde.length; n++) {
        durum("Fotoğraflar klasöre yazılıyor… " + (n + 1) + " / " + donemde.length);
        const yol = hedef + "\\" + donemde[n].ad;
        const c = await DK.dosyaYazResp(yol, await donemde[n].al(), true);
        if (c.ok) fotolar.push(yol);
      }
      durum("Mesajlar işlere çevriliyor…");
      r.isler = isleriCikar(mesajlar, fotolar, r.bas, r.bit);
      await kaydet("saha"); pencereKapat(); sahaFiltre = "rapora";
      bildir(r.isler.length + " iş bulundu (" + fotolar.length + " fotoğraf), " + r.isler.filter(i => i.rapora).length + " tanesi rapora alındı. Kontrol edip düzelt.");
      raporDuzenle(r);
    } catch (e) { bildir("Alınamadı: " + e.message, true); const b = $("#waAl"); if (b) b.disabled = false; durum(""); }
  };
}

/* ---------------- yazdırılabilir rapor (A4 yatay) ---------------- */
async function raporYazdir(r) {
  // Pencere hemen açılır (tarayıcı engellemesin), fotoğraflar hazırlanınca içi doldurulur
  const w = window.open("", "_blank", "width=1200,height=900");
  if (!w) { bildir("Rapor penceresi açılamadı. Tarayıcının açılır pencere engelini kaldır.", true); return; }
  w.document.write('<p style="font:16px Arial;padding:20px">Rapor hazırlanıyor, fotoğraflar yükleniyor…</p>');
  const isler = r.isler.filter(i => i.rapora).sort((a, b) => (a.tarih + a.saat < b.tarih + b.saat ? -1 : 1));
  const one = r.isler.filter(i => i.one).slice(0, 6), s = sayimlar(r), bl = Object.keys(s), top = bl.reduce((t, b) => t + s[b], 0);
  const gerekli = new Set();
  one.forEach(i => i.fotolar.slice(i.foto || 0).concat(i.fotolar.slice(0, i.foto || 0)).slice(0, 2).forEach(y => gerekli.add(y)));
  isler.forEach(i => { const f = i.fotolar[i.foto || 0]; if (f) gerekli.add(f); });
  const url = {}; for (const y of gerekli) url[y] = await sahaFotoAl(y);
  const img = (y, st) => url[y] ? '<img src="' + url[y] + '"' + (st ? ' style="' + st + '"' : "") + ">" : '<div class="yok"></div>';
  const tr = d => { const p = (d || "").split("-"); return p.length === 3 ? p[2] + " / " + p[1] + " / " + p[0] : ""; };
  const logo = ad => new URL("formlar/" + ad, location.href).href;
  const ust = '<div class="ust"><img src="' + logo("logo_sosyal_tesisler.jpg") + '"><div class="ortabaslik"><div class="b1">İSTANBUL BÜYÜKŞEHİR BELEDİYESİ</div><div class="b2">İŞLETMELER MÜDÜRLÜĞÜ &nbsp;|&nbsp; ' + esc(trBuyuk(r.birim || sef("sefAdi"))) + '</div><div class="b3">HAFTALIK SAHA RAPORU</div></div><img src="' + logo("logo_ibb.png") + '" style="height:24mm"></div>';
  const alt = '<div class="alt">İstanbul Büyükşehir Belediyesi &nbsp;•&nbsp; İşletmeler Müdürlüğü &nbsp;•&nbsp; ' + esc(r.birim || sef("sefAdi")) + "</div>";
  const sayfa = ic => '<section class="sayfa">' + ust + '<div class="govde">' + ic + "</div>" + alt + "</section>";
  const bolum = b => '<div class="bolum">' + b + "</div>";
  let html = sayfa(
    '<table class="bilgi"><tr><th>Rapor No</th><td>' + esc(r.no) + "</td><th>Rapor Tarihi</th><td>" + tr(r.tarih) + "</td></tr>" +
    "<tr><th>Rapor Dönemi</th><td>" + tr(r.bas) + " &nbsp;–&nbsp; " + tr(r.bit) + "</td><th>Hazırlayan Birim</th><td>" + esc(r.birim) + "</td></tr>" +
    "<tr><th>Raporu Hazırlayan</th><td>" + esc(r.hazirlayan) + "</td><th>Sorumlu Şef</th><td>" + esc(r.sef) + "</td></tr>" +
    "<tr><th>Gelen Talep Sayısı</th><td>" + esc(r.gelenTalep) + "</td><th>Yapılan İş Sayısı</th><td>" + esc(r.yapilanIs || top) + "</td></tr></table>" +
    bolum("RAPOR KAPSAMI") + "<p>Bu rapor, ilgili dönem içerisinde saha ekipleri tarafından gerçekleştirilen bakım, onarım ve teknik müdahalelerin tesis, tarih, branş, kullanılan malzeme ve fotoğraflı açıklamalarla birlikte özetlenmesi amacıyla hazırlanmıştır.</p>" +
    bolum("HAFTALIK YAPILAN İŞ ADET DAĞILIMI") + '<table class="dagilim"><tr>' + bl.map(b => '<th style="border-bottom:4px solid ' + bransRenk(b) + '">' + esc(b) + "</th>").join("") + "<th>Toplam</th></tr><tr>" +
    bl.map(b => '<td style="color:' + bransRenk(b) + '">' + s[b] + "</td>").join("") + '<td style="color:#222">' + top + "</td></tr></table>" +
    bolum("AÇIKLAMA") + "<p>" + esc(r.aciklama) + "</p>" + bolum("NOTLAR :") + "<p>" + esc(r.notlar) + "</p>");
  if (one.length) html += sayfa('<div class="onebaslik">BU HAFTANIN ÖNE ÇIKAN İŞLERİ</div><div class="onegrid">' + one.map(i => {
    const f = i.fotolar.slice(i.foto || 0).concat(i.fotolar.slice(0, i.foto || 0)).slice(0, 2);
    return '<div class="one"><div class="ot"><b>' + esc(i.tesis) + "</b> &nbsp;" + goster(i.tarih) + '</div><div class="obas">' + esc(i.baslik || "") + '</div><div class="ofoto">' +
      f.map(y => img(y)).join("") + '</div><div class="oac">' + esc(i.aciklama) + "</div></div>";
  }).join("") + "</div>");
  for (let n = 0; n < isler.length; n += 6) {
    html += sayfa('<div class="kartgrid">' + isler.slice(n, n + 6).map((i, k) => {
      const f = i.fotolar[i.foto || 0];
      return '<div class="kart"><div class="kb" style="border-bottom-color:' + bransRenk(i.brans) + '"><span>' + (n + k + 1) + " &nbsp; TARİH : " + goster(i.tarih) + '</span><span class="br">BRANŞ : &nbsp;' + esc(trBuyuk(i.brans)) + "</span></div>" +
        '<div class="kg">' + (f ? img(f) : '<div class="yok"></div>') + '<div class="ky"><div class="kt">TESİS ADI : ' + esc(i.tesis) + '</div><div class="ka">AÇIKLAMA :</div><div>' + esc(i.aciklama) + "</div>" +
        (i.malzeme ? '<div class="km"><b>Malzeme:</b> ' + esc(i.malzeme) + "</div>" : "") + "</div></div></div>";
    }).join("") + "</div>");
  }
  const css = "@page{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0;font-family:'Segoe UI',Calibri,Arial,sans-serif;color:#222;background:#777}" +
    ".sayfa{width:297mm;height:210mm;margin:0 auto 8mm;background:#fff;padding:9mm 11mm 6mm;display:flex;flex-direction:column;page-break-after:always;overflow:hidden}" +
    ".ust{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #2f4a7a;padding-bottom:3mm}.ust img{height:22mm}" +
    ".ortabaslik{text-align:center}.b1{font-weight:700;font-size:5.2mm;color:#1f2f55}.b2{font-size:3.9mm;color:#8a8f99;margin:1mm 0}.b3{font-weight:700;font-size:4.2mm;color:#1f2f55}" +
    ".govde{flex:1;padding-top:6mm;overflow:hidden}.alt{border-top:1px solid #ccc;text-align:center;font-size:2.4mm;color:#555;padding-top:2mm}" +
    ".bilgi{width:100%;border-collapse:separate;border-spacing:0 1.2mm;font-size:3.3mm}.bilgi th,.bilgi td{background:#efefef;padding:2.2mm 3mm;text-align:left}.bilgi th{width:18%}.bilgi td{width:32%}" +
    ".bolum{border-left:1.2mm solid #c97a2c;padding-left:2mm;font-weight:700;color:#1f2f55;font-size:3.4mm;margin:5mm 0 2mm}p{font-size:3.3mm;margin:0 0 1mm;line-height:1.5}" +
    ".dagilim{width:100%;border-collapse:collapse;text-align:center}.dagilim th{background:#323a4b;color:#fff;padding:2.5mm;font-size:3.4mm;border-right:1px solid #fff}.dagilim td{background:#efefef;padding:3mm;font-weight:700;font-size:3.6mm;border:1px solid #ddd}" +
    ".onebaslik{text-align:center;font-weight:700;color:#1f2f55;font-size:4.4mm;margin-bottom:3mm}.onegrid{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm 6mm}" +
    ".ot{font-size:3.3mm;color:#666}.ot b{color:#c97a2c;font-size:3.7mm}.obas{font-weight:700;font-size:3.4mm;margin:1mm 0}.ofoto{display:flex;gap:2mm}.ofoto img,.ofoto .yok{width:50%;height:42mm;object-fit:cover;background:#ddd}.oac{font-size:2.9mm;margin-top:1.5mm;line-height:1.45}" +
    ".kartgrid{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,1fr);gap:7mm 4mm;height:100%}.kart{border:1px solid #bbb;display:flex;flex-direction:column;overflow:hidden}" +
    ".kb{background:#343a45;color:#fff;font-weight:700;font-size:2.8mm;padding:1.6mm 3mm;border-bottom:1mm solid #e39b1b;display:flex;gap:8mm}.kb .br{color:#f0b84f}" +
    ".kg{flex:1;display:flex;min-height:0}.kg img,.kg .yok{width:50%;height:100%;object-fit:cover;background:#ddd}.ky{width:50%;background:#f1f1f1;padding:2.5mm 3mm;font-size:2.9mm;line-height:1.45;overflow:hidden}" +
    ".kt{font-weight:700;font-style:italic;color:#333;margin-bottom:2.5mm}.ka{font-weight:700;font-style:italic;margin-bottom:1mm}.km{margin-top:1.5mm}" +
    ".arac{position:sticky;top:0;text-align:center;padding:8px;background:#333;color:#fff;font:14px Arial;z-index:2}.arac button{font:15px Arial;padding:7px 16px;cursor:pointer}" +
    "@media print{body{background:#fff}.sayfa{margin:0}.arac{display:none}}";
  const ad = "HAFTALIK_SAHA_RAPORU_" + goster(r.bas).replace(/\./g, "_") + "_-_" + goster(r.bit).replace(/\./g, "_");
  w.document.open();
  w.document.write('<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>' + ad + "</title><style>" + css + '</style></head><body><div class="arac"><button onclick="print()">🖨 Yazdır / PDF olarak kaydet</button> &nbsp; ' +
    isler.length + " iş kartı, " + Math.ceil(isler.length / 6 + 1 + (one.length ? 1 : 0)) + " sayfa. Yazıcı olarak “PDF olarak kaydet”i seçersen PDF dosyası olur.</div>" + html + "</body></html>");
  w.document.close();
}
