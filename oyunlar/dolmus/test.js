// Dolmuşa özgü kontroller: şoför ve yolcu dizilişi, hediye etkileri ve süsleri, gece-gündüz seferi,
// havalanan dolmuşun inişi. Çekirdek testleri ayrıca çalışır.
// Çalıştırma: node oyunlar/dolmus/test.js
'use strict';
const path = require('path');
const { OYUN_URL, CIKTI, tarayici, raporla, kontrolcu, bekle: durumBekle, hazirBekle, kareBekle } = require(path.join(__dirname, '..', '..', 'cekirdek', 'test', 'ortak'));
const { sonuc, kontrol } = kontrolcu();

(async () => {
  const b = await tarayici();
  const hatalar = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  p.on('pageerror', e => hatalar.push('SAYFA HATASI: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) hatalar.push(m.text()); });
  await p.goto(OYUN_URL);
  await hazirBekle(p);
  const bosalt = () => p.evaluate(() => { document.getElementById('bosalt').click(); });
  const O = o => p.evaluate(o2 => CanliOyun.olay(o2), o);
  const durum = () => p.evaluate(() => CanliOyun.durum());
  const youtubeKisayollari = await p.evaluate(() => {
    const y = CanliOyun.youtube, eskiCal = y.cal, cagrilar = [];
    const genel = document.getElementById('yt-link').value;
    y.cal = link => { cagrilar.push(link); return true; };
    document.getElementById('dolmus-ankara-youtube-cal').click();
    document.getElementById('dolmus-karadeniz-youtube-cal').click();
    y.cal = eskiCal;
    return {
      cagrilar,
      izinler: Object.assign({}, CanliOyun._test.D.youtubeHediyeOnay),
      genelDegismedi: document.getElementById('yt-link').value === genel,
      ankara: y.linkCoz(cagrilar[0]),
      karadeniz: y.linkCoz(cagrilar[1])
    };
  });
  kontrol('Ankara ve Karadeniz için ayrı YouTube bağlantı düğmeleri, genel müzik alanına dokunmaz',
    youtubeKisayollari.genelDegismedi &&
      youtubeKisayollari.ankara.video === 'b2_caqJW03Y' &&
      youtubeKisayollari.karadeniz.video === 'kpiF-epNP7Y' &&
      youtubeKisayollari.izinler.ankara && youtubeKisayollari.izinler.karadeniz, youtubeKisayollari);
  const siraHavalari = await p.evaluate(() => CanliOyun._test.muzik.havalar.map(h => h.id));
  kontrol('Sırayla çalan listede yalnız Durak Havası ve Son Durak kalır',
    JSON.stringify(siraHavalari) === JSON.stringify(['durak', 'hat']), siraHavalari);
  const ozelHavalar = await p.evaluate(() => CanliOyun._test.HAVALAR.map(h => h.id));
  kontrol('Ankara ve Karadeniz sentez havaları hediye için korunur',
    ozelHavalar.includes('ankara-pavyon') && ozelHavalar.includes('karadeniz-yol'), ozelHavalar);

  // şoför ve ayakta kalanlar
  await bosalt();
  await O({ tip: 'yorum', kullanici: { id: 'herkes-biner', ad: 'Her Yorum' }, metin: 'rastgele herhangi bir yorum' });
  let d = await durum();
  kontrol('Herhangi bir yorumla kullanıcı sahneye biner', d.sira.some(x => x[0] === 'Her Yorum'), d.sira);
  await kareBekle(p, 1);
  const etiketBolgesi = await p.evaluate(() => {
    const c = CanliOyun._test.cekirdek.c, x = Math.floor(c.canvas.width * 0.02), y = Math.floor(c.canvas.height * 0.26);
    return Array.from(c.getImageData(x, y, 1, 1).data);
  });
  kontrol('Şoför etiketi sahnenin sol üstünü kaplamaz',
    !(etiketBolgesi[0] === 255 && etiketBolgesi[1] === 209 && etiketBolgesi[2] === 102) &&
      !(etiketBolgesi[0] === 35 && etiketBolgesi[1] === 38 && etiketBolgesi[2] === 58), etiketBolgesi);
  await bosalt();
  await O({ tip: 'yorum', kullanici: { id: 'a', ad: 'Ali' }, metin: 'selam' });
  await O({ tip: 'yorum', kullanici: { id: 'b', ad: 'Bora' }, metin: 'selam' });
  await O({ tip: 'hediye', kullanici: { id: 'b', ad: 'Bora' }, jeton: 5 });
  d = await durum();
  const pk = await p.evaluate(() => document.getElementById('pankart-yeri').textContent);
  kontrol('En çok hediye atan şoför olur, pankart yeni şoförü yazar', d.sofor === 'Bora' && /Direksiyon el değiştirdi/.test(pk) && pk.includes('Bora'), [d.sofor, pk]);
  const yer = await p.evaluate(() => CanliOyun._test.D.oy.get('b').yerTur);
  kontrol('Şoför şoför koltuğunda oturur', yer === 'sofor', yer);
  for (let i = 0; i < 25; i++)
    await O({ tip: 'yorum', kullanici: { id: 'y' + i, ad: 'y' + i }, metin: 'bindim' });
  await durumBekle(p, 'dolmuş 20 yolcu aldı', () => CanliOyun.durum().kisi === 20, undefined, 6000);
  d = await durum();
  kontrol('Dolmuş 20 yolcuda dolar, sabit boyunu korur ve 4 kişi ayakta kalır',
    d.kisi === 20 && d.ayakta === 4 && d.otobusOlcek === 1, [d.kisi, d.ayakta, d.otobusOlcek]);

  // her kademe kendi etkisini başlatır
  await bosalt();
  for (const id of ['a', 'b', 'c'])
    await O({ tip: 'yorum', kullanici: { id, ad: id }, metin: 'selam' });
  const kd = await p.evaluate(() => {
    const D = CanliOyun._test.D, cik = {};
    for (const j of [1, 2, 3, 4, 5, 9, 10, 49, 50, 199, 200, 999]) {
      D.fren = -99; D.kaset = -99; D.viraj = null; D.kornaB = -99; D.tema = null; D.ucus = null; D.dansci = null; D.pavyonIsikKalan = 0;
      D.youtubeHediyeOnay = { ankara: false, karadeniz: false };
      D.aracRenk = '#f2c84b'; D.renkSayisi = 0;
      CanliOyun._test.muzik.bekleyen = null;
      CanliOyun._test.zamanEkle(0.1);
      CanliOyun.olay({ tip: 'hediye', kullanici: { id: 'c', ad: 'c' }, jeton: j });
      const d = CanliOyun.durum(), B = d.vurus;
      cik[j] = { korna: B - D.kornaB < 1, fren: D.fren > B - 1, kaset: D.kaset > B - 1, viraj: !!D.viraj,
        tema: D.tema && D.tema.tur, hava: CanliOyun._test.muzik.bekleyen && CanliOyun._test.muzik.bekleyen.id,
        aracRenk: D.aracRenk, ucus: !!D.ucus, dansci: D.dansci && D.dansci.k.id,
        dansSure: D.dansci && D.dansci.kalan, isikSure: D.pavyonIsikKalan };
    }
    D.fren = -99; D.kaset = -99; D.viraj = null;
    return cik;
  });
  const e = (j, korna, fren, kaset, viraj) => kd[j].korna === korna && kd[j].fren === fren && kd[j].kaset === kaset && kd[j].viraj === viraj && !kd[j].ucus;
  kontrol('1 jeton: korna', e(1, true, false, false, false), kd[1]);
  kontrol('2–3 jeton: yalnız dolmuşun rengi değişir, pavyon ışığı açılmaz',
    kd[2].aracRenk !== '#f2c84b' && kd[3].aracRenk !== '#f2c84b' && kd[2].isikSure === 0 && kd[3].isikSure === 0 &&
      !kd[2].tema && !kd[3].tema, [kd[2], kd[3]]);
  kontrol('4 jeton: Karadeniz havası hediye için sıraya girer; onay yoksa YouTube kendiliğinden açılmaz',
    kd[4].tema === 'karadeniz' && kd[4].hava === 'karadeniz-yol', kd[4]);
  kontrol('5–9 jeton: Ankara gösterisi, gönderen kaputta 10 saniye dans eder ve ışıklar yanar',
    kd[5].tema === 'ankara' && kd[5].hava === 'ankara-pavyon' && kd[5].dansci === 'c' &&
      kd[5].dansSure === 10 && kd[5].isikSure === 10 &&
      kd[9].tema === 'ankara' && kd[9].hava === 'ankara-pavyon', [kd[5], kd[9]]);
  kontrol('10–49 jeton: müsait bir yerde, fren', e(10, false, true, false, false) && e(49, false, true, false, false), [kd[10], kd[49]]);
  kontrol('50–199 jeton: kaset çalar', e(50, true, false, true, false) && e(199, true, false, true, false), [kd[50], kd[199]]);
  kontrol('200–999 jeton: sert viraj', e(200, false, false, false, true) && e(999, false, false, false, true), [kd[200], kd[999]]);
  const ozelParcalar = await p.evaluate(async () => {
    const m = CanliOyun._test.muzik;
    const onceki = { parcalar: m.parcalar, kaynak: m.kaynak, hz: m.hz, acik: m.acik, hazirCal: m.hazirCal, bekleyen: m.bekleyen, havaSure: m.havaSure };
    m.parcalar = [{ dosya: 'ankara-pavyon.wav' }, { dosya: 'karadeniz.ogg' }];
    m.kaynak = 'sentez';
    m.hz = null;
    m.acik = false;
    m.hazirCal = false;
    m.bekleyen = null;
    CanliOyun.olay({ tip: 'hediye', kullanici: { id: 'c', ad: 'c' }, jeton: 5 });
    await Promise.resolve();
    const ankara = m.hz && m.hz.no;
    m.kaynak = 'sentez';
    m.hz = null;
    CanliOyun.olay({ tip: 'hediye', kullanici: { id: 'c', ad: 'c' }, jeton: 4 });
    await Promise.resolve();
    const karadeniz = m.hz && m.hz.no;
    Object.assign(m, onceki);
    return { ankara, karadeniz };
  });
  kontrol('Kendi ses dosyaları Ankara ve Karadeniz hediyesine göre seçilir',
    ozelParcalar.ankara === 0 && ozelParcalar.karadeniz === 1, ozelParcalar);
  const youtubeHediyesi = await p.evaluate(() => {
    const D = CanliOyun._test.D, m = CanliOyun._test.muzik, y = CanliOyun.youtube;
    const eskiCal = y.cal, eskiParcalar = m.parcalar, cagrilar = [];
    y.cal = link => { cagrilar.push(link); return true; };
    m.parcalar = [];
    D.youtubeHediyeOnay = { ankara: false, karadeniz: false };
    D.tema = null; D.kaset = -99; D.hediyeJeton = 0; D.durakJeton = 0;
    CanliOyun.olay({ tip: 'hediye', kullanici: { id: 'yt', ad: 'YT' }, jeton: 5 });
    const onaysiz = cagrilar.length;
    D.youtubeHediyeOnay.ankara = true;
    CanliOyun.olay({ tip: 'hediye', kullanici: { id: 'yt', ad: 'YT' }, jeton: 5 });
    D.youtubeHediyeOnay.karadeniz = true;
    CanliOyun.olay({ tip: 'hediye', kullanici: { id: 'yt', ad: 'YT' }, jeton: 4 });
    y.cal = eskiCal;
    m.parcalar = eskiParcalar;
    return { onaysiz, cagrilar };
  });
  kontrol('Ankara ve Karadeniz hediyesi yalnız ilgili YouTube bağlantısına Çal ile izin verildiyse çalar',
    youtubeHediyesi.onaysiz === 0 && youtubeHediyesi.cagrilar.length === 2 &&
      youtubeHediyesi.cagrilar[0].includes('b2_caqJW03Y') &&
      youtubeHediyesi.cagrilar[1].includes('kpiF-epNP7Y'), youtubeHediyesi);
  const renkDegisimi = await p.evaluate(() => {
    const D = CanliOyun._test.D, olay = { tip: 'hediye', kullanici: { id: 'renkli', ad: 'Renkli' }, jeton: 2 };
    D.aracRenk = '#f2c84b'; D.renkSayisi = 0;
    CanliOyun.olay(olay);
    const once = D.aracRenk;
    CanliOyun.olay(olay);
    return { once, sonra: D.aracRenk };
  });
  kontrol('Her 2 jetonluk hediye rengi yeniden seçer', renkDegisimi.once !== renkDegisimi.sonra, renkDegisimi);
  const kademeler = await p.evaluate(() => CanliOyun._test.OYUN.kademe.map(k => [k.min, k.ad]));
  kontrol('Jeton kademeleri tek eşik değeriyle görünür; Fren yerine Müsait yer yazar',
    JSON.stringify(kademeler.map(k => k[0])) === JSON.stringify([1000, 200, 50, 10, 5, 4, 2, 1]) &&
      kademeler.some(k => k[1] === 'Müsait yer'), kademeler);
  const baslik = await p.evaluate(() => ({ ad: CanliOyun._test.OYUN.ad, logo: CanliOyun._test.OYUN.logo, belge: document.title }));
  kontrol('Ana başlık Dolmuş Hattı olarak kalır',
    baslik.ad === 'Dolmuş' && baslik.logo.join(' ') === 'Dolmuş Hattı' && baslik.belge === 'Dolmuş', baslik);

  await bosalt();
  await O({ tip: 'yorum', kullanici: { id: 'dans', ad: 'Dansçı' }, metin: 'bindim' });
  await O({ tip: 'hediye', kullanici: { id: 'dans', ad: 'Dansçı' }, jeton: 5 });
  await p.waitForTimeout(3000);
  await kareBekle(p, 1);
  await p.locator('#sahne').screenshot({ path: CIKTI + '/d-pavyon.png' });
  const kaputDanscisi = await p.evaluate(() => {
    const D = CanliOyun._test.D, k = D.oy.get('dans');
    return { ad: D.dansci && D.dansci.k.ad, kalan: D.dansci && D.dansci.kalan, z: k && k.yz, isik: D.pavyonIsikKalan };
  });
  kontrol('Ankara hediyesi göndereni 10 saniyeliğine kaputa çıkarır',
    kaputDanscisi.ad === 'Dansçı' && kaputDanscisi.kalan > 5 && kaputDanscisi.z < 0 && kaputDanscisi.isik > 5, kaputDanscisi);

  // Hediyeler gönderenin kıyafetini geliştirir, ortak toplam dolmuş süslerini açar.
  await bosalt();
  await O({ tip: 'yorum', kullanici: { id: 'hediye', ad: 'Hediye Dostu' }, metin: 'bindim' });
  const hat = [];
  let durakSovu;
  for (const jeton of [1, 49, 200, 250, 500]) {
    await O({ tip: 'hediye', kullanici: { id: 'hediye', ad: 'Hediye Dostu' }, jeton });
    const s = await durum();
    hat.push({ seviye: s.hatSeviye, durak: s.durak, hedef: s.durakHedef, jeton: s.durakJeton });
    if (jeton === 200)
      durakSovu = await p.evaluate(() => ({
        aktif: CanliOyun._test.D.durakSovBit > CanliOyun.durum().vurus,
        pankart: document.getElementById('pankart-yeri').textContent
      }));
  }
  await kareBekle(p);
  const gorunum = await p.evaluate(() => {
    const k = CanliOyun._test.D.oy.get('hediye');
    return { seviye: k.dolmusHediyeSeviye, yelek: k.g.yelek, etiket: !!k.et };
  });
  kontrol('Kişisel hediye kıyafeti değişir, yolcunun adı sahnede etiketlenir',
    gorunum.seviye === 4 && gorunum.yelek === '#a88bff' && gorunum.etiket, gorunum);
  kontrol('50, 200, 500 ve 1000 jetonda dolmuş süsleri; her 25 jetonda topluluk yeni durağı açar',
    JSON.stringify(hat) === JSON.stringify([
      { seviye: 0, durak: 'ANKARA ULUS', hedef: 'İSTANBUL KADIKÖY', jeton: 1 },
      { seviye: 1, durak: 'İZMİR KORDON', hedef: 'TRABZON MEYDAN', jeton: 0 },
      { seviye: 2, durak: 'ANKARA ULUS', hedef: 'İSTANBUL KADIKÖY', jeton: 0 },
      { seviye: 3, durak: 'ANKARA ULUS', hedef: 'İSTANBUL KADIKÖY', jeton: 0 },
      { seviye: 4, durak: 'ANKARA ULUS', hedef: 'İSTANBUL KADIKÖY', jeton: 0 }
    ]), hat);
  kontrol('Yeni durak açılınca katkı yapanın adı duyurulur ve kısa turbo başlar',
    !!durakSovu && durakSovu.aktif && /Yeni durak açıldı/.test(durakSovu.pankart) && durakSovu.pankart.includes('Hediye Dostu'), durakSovu);
  const gece = await p.evaluate(() => {
    const D = CanliOyun._test.D;
    D.yol = 1200;
    const n = CanliOyun.durum();
    D.yol = 2200;
    const g = CanliOyun.durum();
    return { gece: n.gece, geceKm: n.km, gunduz: g.gece, gunduzKm: g.km };
  });
  kontrol('1000. kilometrede gece seferi, 2000. kilometrede gündüz seferi başlar',
    gece.gece && gece.geceKm === 1 && !gece.gunduz && gece.gunduzKm === 2, gece);
  await bosalt();

  // fren dolmuşu durdurur
  await p.evaluate(() => { CanliOyun._test.D.hiz = 3; });
  await O({ tip: 'hediye', kullanici: { id: 'a', ad: 'a' }, jeton: 10 });
  await durumBekle(p, 'dolmuş durdu', () => CanliOyun._test.D.hiz < 0.3, undefined, 6000);
  kontrol('Frende dolmuş durur', (await p.evaluate(() => CanliOyun._test.D.hiz)) < 0.3);

  // havalanma: gönderen kaputa çıkar, dolmuş yükselir, sonra iner, gönderen yerine döner
  await O({ tip: 'hediye', kullanici: { id: 'b', ad: 'b' }, jeton: 1000 });
  d = await durum();
  kontrol('1000+ jeton: dolmuş uçar, gönderen yıldız olur', d.ucus === 'b' && await p.evaluate(() => CanliOyun._test.D.oy.get('b').yildiz), d.ucus);
  await durumBekle(p, 'dolmuş havada', () => CanliOyun._test.D.otoY > 0.5, undefined, 8000);
  await p.locator('#sahne').screenshot({ path: CIKTI + '/d-ucus.png' });
  await durumBekle(p, 'uçuş bitti', () => !CanliOyun.durum().ucus, undefined, 15000);
  const son = await p.evaluate(() => ({ y: CanliOyun._test.D.otoY, yildiz: CanliOyun._test.D.oy.get('b').yildiz }));
  kontrol('Uçuş biter, dolmuş yere iner, gönderen yıldızlıktan çıkar', son.y === 0 && !son.yildiz, son);

  kontrol('Dolmuş testlerinde sayfada hata çıkmadı', hatalar.length === 0, hatalar.slice(0, 4).join(' | '));
  await b.close();
  process.exit(raporla(sonuc) ? 1 : 0);
})().catch(e => { console.error('TEST ÇÖKTÜ', e); process.exit(1); });
