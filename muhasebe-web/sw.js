/* Basit çevrimdışı önbellek: ilk açılıştan sonra internet olmadan da açılsın.
   Uygulama kabuğu (html, css, js, simgeler) önbelleğe alınır; kişisel veri önbelleğe GİRMEZ (o klasörde). */
const AD = "muhasebe-v1";
const DOSYALAR = ["./", "index.html", "stil.css", "veri_katmani.js", "uygulama.js", "jszip.min.js",
  "sablonlar/izin_formu.xlsx", "formlar/bogazici-logo1.jpeg", "formlar/bogazici-logo2.jpeg",
  "manifest.webmanifest", "formlar/favicon.png", "formlar/simge-192.png", "formlar/simge-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(AD).then(c => c.addAll(DOSYALAR)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== AD).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;           // sadece kendi dosyalarımız
  if (u.pathname.indexOf("/api/") >= 0) return;                                      // veri istekleri asla önbelleğe girmez
  // Önce internet (en güncel sürüm gelsin), olmazsa önbellek (çevrimdışı çalışsın)
  e.respondWith(fetch(e.request).then(r => {
    if (r && r.ok) { const k = r.clone(); caches.open(AD).then(ca => ca.put(e.request, k)); }
    return r;
  }).catch(() => caches.match(e.request)));
});
