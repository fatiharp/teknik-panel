/* MUHASEBE – Chrome sürümü veri katmanı (DK)
   Eski sürüm verileri bir PowerShell sunucusundan okuyordu; bu sürüm hiçbir sunucu kullanmaz.
   Chrome'un "File System Access" özelliğiyle doğrudan TEKNİK PANEL klasöründen okur/yazar.
   Hiçbir kişisel veri internete gitmez; her şey seçtiğin klasörde kalır.

   DK.handle : seçilen TEKNİK PANEL kök klasörünün tutamacı (index.html doldurur)
   DK.demo   : sadece geliştirme/deneme için; true ise verileri yerel bir test sunucusundan çeker. */
"use strict";
const DK = {
  handle: null,
  demo: false,
  KOKLER: { personel: [], izinler: [], bakiye: [], tatiller: [], saha: [], giris: [], ayarlar: {} },

  /* ---- klasör gezinme yardımcıları (yol: "4-PERSONEL\\BOĞAZİÇİ\\AD\\İZİN\\2026") ---- */
  // Eski program belge yollarını TAM yol yazıyordu (C:\...\TEKNİK PANEL\4-PERSONEL\...).
  // Seçilen TEKNİK PANEL klasörüne göre göreli hale getir; zaten göreliyse dokunma.
  kokRel(yol) {
    const y = String(yol || "").replace(/\//g, "\\");
    const isaret = "TEKNİK PANEL\\";
    const i = y.indexOf(isaret);
    if (i >= 0) return y.slice(i + isaret.length);
    const m = /(?:^|\\)(\d-[^\\]*(?:\\.*)?)$/.exec(y);
    return m ? m[1] : y;
  },
  parcala(yol) { return DK.kokRel(yol).split(/[\\/]+/).filter(Boolean); },
  async dizin(yol, olustur) {
    let h = DK.handle;
    for (const p of DK.parcala(yol)) h = await h.getDirectoryHandle(p, { create: !!olustur });
    return h;
  },
  async dosyaTutamac(yol, olustur) {
    const parts = DK.parcala(yol), ad = parts.pop();
    let h = DK.handle;
    for (const p of parts) h = await h.getDirectoryHandle(p, { create: !!olustur });
    return { dizin: h, tutamac: await h.getFileHandle(ad, { create: !!olustur }), ad };
  },

  /* ---- JSON koleksiyonları ---- */
  async jsonOku(ad) {
    const bos = Array.isArray(DK.KOKLER[ad]) ? [] : {};
    try {
      const d = await DK.dizin("2-KAYITLAR"); const fh = await d.getFileHandle(ad + ".json");
      const f = await fh.getFile(); const t = (await f.text()).trim();
      return { veri: t ? JSON.parse(t) : bos, surum: String(f.lastModified) };
    } catch (e) { return { veri: bos, surum: "0" }; }
  },
  async tumVeri() {
    const sonuc = {}, surum = {};
    for (const ad of Object.keys(DK.KOKLER)) { const r = await DK.jsonOku(ad); sonuc[ad] = r.veri; surum[ad] = r.surum; }
    sonuc._surum = surum;
    return sonuc;
  },
  async jsonYaz(ad, metin, surum) {
    const d = await DK.dizin("2-KAYITLAR", true);
    const fh = await d.getFileHandle(ad + ".json", { create: true });
    // Ekrandaki bilgi eskiyse (dosya bu arada başka yerden değiştiyse) üstüne yazma
    if (surum && surum !== "yok" && surum !== "0") {
      const simdiki = String((await fh.getFile()).lastModified);
      if (simdiki !== String(surum)) throw new Error("Kayıtlar bu arada başka yerden değişmiş. Değişikliğin karışmasın diye kaydetmedim; sayfayı yenile (Ctrl+Shift+R) ve tekrar dene.");
    }
    const w = await fh.createWritable(); await w.write(new Blob([metin], { type: "application/json" })); await w.close();
    const f = await fh.getFile();
    return { surum: String(f.lastModified) };
  },

  /* ---- dosya aç (yeni sekmede) ---- */
  async ac(yol) {
    try {
      const { tutamac } = await DK.dosyaTutamac(yol, false);
      const f = await tutamac.getFile();
      const url = URL.createObjectURL(f);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      // Klasör ya da bulunamayan dosya
      throw new Error("Bu öğe tarayıcıda açılamadı (klasörler Dosya Gezgini'nden açılır).");
    }
  },

  /* ---- bir kişinin belgelerini listele ---- */
  async kisiBelgeler(ad, sirket) {
    const kokRel = "4-PERSONEL\\" + sirket + "\\" + ad;
    let kokH;
    try { kokH = await DK.dizin(kokRel); } catch (e) { return { klasor: null, belgeler: [] }; }
    const belgeler = [];
    async function tara(dirH, rel, grup, alt) {
      for await (const [isim, girdi] of dirH.entries()) {
        if (girdi.kind === "directory") {
          await tara(girdi, rel + "\\" + isim, grup || isim, alt ? alt + "\\" + isim : isim);
        } else {
          let tarih = "";
          try { const f = await girdi.getFile(); tarih = new Date(f.lastModified).toISOString().slice(0, 10); } catch (e) {}
          belgeler.push({ ad: isim, yol: rel + "\\" + isim, grup: grup || "", alt: alt || "", tarih });
        }
      }
    }
    await tara(kokH, kokRel, "", "");
    return { klasor: kokRel, belgeler };
  },

  /* ---- dosya yaz (belge yükleme) — eski fetch(...) yerine ---- */
  // Var olan dosyanın üstüne asla yazma: aynı ad varsa "ad (2).uzantı", "ad (3).uzantı"…
  async bosAd(hedef) {
    const parts = DK.parcala(hedef), ad = parts.pop();
    let h = DK.handle;
    for (const p of parts) h = await h.getDirectoryHandle(p, { create: true });
    const m = /^(.*?)(\.[^.]*)?$/.exec(ad), kok = m[1], uz = m[2] || "";
    let aday = ad;
    for (let i = 2; i < 500; i++) {
      try { await h.getFileHandle(aday); aday = kok + " (" + i + ")" + uz; } catch (e) { break; }
    }
    return { dizin: h, ad: aday, yol: parts.concat([aday]).join("\\") };
  },
  async dosyaYazResp(hedef, blob) {
    try {
      const b = await DK.bosAd(hedef);
      const fh = await b.dizin.getFileHandle(b.ad, { create: true });
      const w = await fh.createWritable(); await w.write(blob); await w.close();
      return { ok: true, json: async () => ({ dosya: b.yol }) };
    } catch (e) {
      return { ok: false, json: async () => ({ hata: e.message }) };
    }
  },

  /* ---- dosyayı kalıcı sil (Fatih böyle istedi; tarayıcı Windows Çöp Kutusu'na atamaz, geri alınamaz).
     Sadece seçilen TEKNİK PANEL klasörünün içindeki DOSYALARI siler, klasör silmez. Dosya zaten yoksa false. */
  async dosyaSil(yol) {
    let t;
    try { t = await DK.dosyaTutamac(DK.kokRel(yol), false); } catch (e) { return false; }
    await t.dizin.removeEntry(t.ad);
    return true;
  },
  ayniYol(a, b) { return DK.kokRel(a).toLocaleUpperCase("tr-TR") === DK.kokRel(b).toLocaleUpperCase("tr-TR"); },

  /* ---- eski api() çağrılarını buraya yönlendiriyoruz ---- */
  async api(yol, govde, ekBaslik) {
    if (DK.demo) return DK.demoApi(yol, govde, ekBaslik);
    if (yol === "/api/veri") return DK.tumVeri();
    if (yol === "/api/bilgi") return {
      veriKlasuru: DK.handle ? DK.handle.name : "TEKNİK PANEL",
      veriKlasoru: DK.handle ? DK.handle.name : "TEKNİK PANEL",
      personelKlasoru: "4-PERSONEL", varsayilanIzinKlasoru: "4-PERSONEL"
    };
    if (yol === "/api/ping") return {};
    if (yol.indexOf("/api/kaydet/") === 0) { const ad = yol.slice("/api/kaydet/".length); return DK.jsonYaz(ad, typeof govde === "string" ? govde : JSON.stringify(govde), (ekBaslik || {})["X-Surum"]); }
    if (yol === "/api/ac") return DK.ac((govde || {}).yol).then(() => ({}));
    if (yol === "/api/kisi-belgeler") { const g = govde || {}; return DK.kisiBelgeler(g.ad, g.sirket); }
    if (yol === "/api/excel") throw new Error("İzin formu (Excel) çıktısı Chrome sürümüne yakında eklenecek. Şimdilik İsper formları ve program çalışıyor.");
    if (yol === "/api/word") throw new Error("Çırak izin kâğıdı (Word) çıktısı Chrome sürümüne yakında eklenecek.");
    throw new Error("Bilinmeyen istek: " + yol);
  },

  /* ---- sadece deneme modu: yerel test sunucusundan çek ---- */
  async demoApi(yol, govde, ekBaslik) {
    const r = await fetch(yol, {
      method: govde === undefined ? "GET" : "POST",
      headers: Object.assign({ "X-Teknik-Panel": "1", "Content-Type": "application/json; charset=utf-8" }, ekBaslik || {}),
      body: govde === undefined ? undefined : (typeof govde === "string" ? govde : JSON.stringify(govde))
    });
    let c = null; try { c = await r.json(); } catch (e) { throw new Error("Deneme sunucusu cevap vermedi."); }
    if (!r.ok || (c && c.hata)) throw new Error((c && c.hata) || ("Hata " + r.status));
    return c;
  }
};
window.DK = DK;
