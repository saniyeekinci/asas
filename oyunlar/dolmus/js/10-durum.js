/* DOLMUŞ DURUMU — koltuklar, kim nereye oturur, hediye etkileri, direksiyonun el değiştirmesi.
 * Dolmuşun kendi ekseni (yerel): x sağa, z arkaya (0 ön cam, 4,5 arka); dünyaya otoNokta ile çevrilir, böylece
 * viraj ve havalanma bütün dolmuşu (içindekilerle) birlikte döndürür ve kaldırır.
 * D'ye eklenenler: yol (gidilen yol, metre), hiz (vuruş başına metre), yaw (dolmuşun dönüşü), otoY (havalanma),
 * hediye katkısı, durak hedefi ve süreli gösteri durumları.
 * Kancalar: oyunYerlesim, oyunGiris, oyunHediye, oyunLiderDegisti, oyunBaslat, oyunBosalt, oyunDurum.
 */
const TABAN = 0.25;          // dolmuşun tabanının yerden yüksekliği
const OTURAK = 0.3;          // koltuğun tabandan yüksekliği
const KAPI = [1.55, 0.95];   // binenin geldiği yer (sağ ön kapının dışı)
const DOLMUS_DURAKLAR = ['ANKARA ULUS', 'İSTANBUL KADIKÖY', 'İZMİR KORDON', 'TRABZON MEYDAN', 'DİYARBAKIR SUR'];
const DURAK_HEDEF = 25;

// Yerler, öncelik sırasıyla: şoför (lider), ön koltuklar, üç sıra üçlü koltuk, arka dörtlü, ayakta (toplam 20).
// Sıralar 0,8 m arayla: arkadakinin yüzü öndekinin adının altında kalmasın.
const YERLER = [['sofor', -0.55, 0.42], ['koltuk', 0.15, 0.42], ['koltuk', 0.72, 0.42]];
for (const z of [1.25, 2.05, 2.85])
  YERLER.push(['koltuk', -0.72, z], ['koltuk', -0.13, z], ['koltuk', 0.72, z]);
for (const x of [-0.78, -0.26, 0.26, 0.78])
  YERLER.push(['koltuk', x, 3.7]);
for (const z of [1.65, 2.45, 3.25, 0.9])
  YERLER.push(['ayakta', 0.32, z]);
const KOLTUKLAR = YERLER.filter(y => y[0] !== 'ayakta');

Object.assign(D, { yol: 0, hiz: 1.4, yaw: 0, otoY: 0, otoX: 0, fren: -99, kaset: -99, viraj: null, ucus: null, tema: null, dansci: null, pavyonIsikKalan: 0, youtubeHediyeOnay: { ankara: false, karadeniz: false }, otobusOlcek: 1, aracRenk: '#f2c84b', renkSayisi: 0, kornaB: -99, _B: 0, hediyeJeton: 0, hatSeviye: 0, durak: 0, durakJeton: 0, durakSovBit: -99 });

function dolmusGece() {
  return Math.floor(Math.max(0, D.yol) / 1000) % 2 === 1;
}

function hediyeSeviye(tip) {
  return ({ korna: 1, renk: 2, fren: 2, karadeniz: 2, kaset: 3, ankara: 3, viraj: 4, ucus: 5 })[tip] || 1;
}

function hediyeRengi(seviye) {
  return ['#ffd166', '#2fc4b2', '#ef8b4b', '#a88bff', '#fff1a8'][seviye - 1];
}

function dolmusTemaBaslat(tur, k) {
  const oncekiTema = D.tema;
  const normalHava = oncekiTema && oncekiTema.donusHava ||
    (muzik.havalar.includes(muzik.hava) ? muzik.hava : muzik.havalar[0]);
  if (oncekiTema && oncekiTema.hava) {
    if (muzik.bekleyen === oncekiTema.hava)
      muzik.bekleyen = null;
    if (muzik.hava === oncekiTema.hava)
      muzik.bekleyen = normalHava;
  }
  D.tema = { tur, k, b0: B };
  D.kaset = Math.max(D.kaset, B);
  D.durakSovBit = Math.max(D.durakSovBit, B + 12);
  const dosyaAdi = tur === 'ankara' ? 'ankara-pavyon' : 'karadeniz';
  const parcaNo = muzik.parcalar.findIndex(p => p.dosya.replace(/\.[^.]+$/, '') === dosyaAdi);
  let ozelParcaCaldi = D.youtubeHediyeOnay[tur] && dolmusYoutubeHediyeCal(tur);
  if (!ozelParcaCaldi && parcaNo >= 0) {
    if (muzik.hazirCal)
      muzik.hazirBaslat(parcaNo);
    else {
      muzik.hz = { no: parcaNo };
      muzik.kaynakSec('hazir');
    }
    ozelParcaCaldi = true;
  }
  if (!ozelParcaCaldi) {
    const havaId = tur === 'ankara' ? 'ankara-pavyon' : 'karadeniz-yol';
    const hava = HAVALAR.find(h => h.id === havaId);
    if (hava) {
      D.tema.hava = hava;
      D.tema.donusHava = normalHava;
      muzik.bekleyen = hava;
    }
  }
  muzik.sov = true;
}
function dolmusYoutubeHediyeCal(tur) {
  if (!D.youtubeHediyeOnay[tur])
    return false;
  const secenek = tur === 'ankara' ?
    { alan: 'dolmus-ankara-youtube-link', ad: 'Ankara Pavyon' } :
    { alan: 'dolmus-karadeniz-youtube-link', ad: 'Karadeniz' };
  const youtube = window.CanliOyun && CanliOyun.youtube;
  const girdi = document.getElementById(secenek.alan);
  if (!youtube || !girdi)
    return false;
  if (!youtube.linkCoz(girdi.value)) {
    D.youtubeHediyeOnay[tur] = false;
    const ileti = document.getElementById('yt-ileti');
    if (ileti)
      ileti.textContent = secenek.ad + ' bağlantısı geçersiz. Düzenleyip yeniden Çal düğmesine bas.';
    return false;
  }
  youtube.cal(girdi.value);
  return true;
}

function dolmusRenginiDegistir(k) {
  const renkler = ['#e74c3c', '#3485e4', '#269b70', '#9b59b6', '#ef8c31', '#d84b91'];
  D.renkSayisi++;
  D.aracRenk = renkler[(ozet(k.id) + D.renkSayisi - 1) % renkler.length];
}

// Dolmuşun dönüşümü: her karede oyunGuncelle kurar. Yerel (x, y, z) → dünya.
let OTO = donusum(0, 0, 2, Math.PI);
function otoZ(z) { return z; }
function otoNokta(x, y, z) { return yerelNokta(OTO, x, y, -(otoZ(z) - 2)); }

function yolcuHazir(k) {
  if (k.yx !== undefined)
    return;
  k.yx = KAPI[0];
  k.yz = KAPI[1];
  k.lurk = 0;
}
// Jetona göre: lider şoför koltuğunda, sonra öndeki koltuklar; koltuk kalmazsa ayakta.
function oyunYerlesim() {
  const kullanilan = new Set();
  D.sira.forEach(k => {
    yolcuHazir(k);
    let no;
    if (k === D.lider) {
      no = 0;
    }
    else {
      no = Number.isInteger(k.dolmusKoltuk) ? k.dolmusKoltuk : null;
      if (no === null || no < 1 || no >= YERLER.length || kullanilan.has(no)) {
        no = null;
        for (let aday = 1; aday < YERLER.length; aday++) {
          if (!kullanilan.has(aday)) {
            no = aday;
            break;
          }
        }
      }
    }
    kullanilan.add(no);
    k.dolmusKoltuk = no;
    const y = YERLER[no];
    k.yerTur = y[0];
    k.hx = y[1];
    k.hz = y[2];
  });
}
function oyunGiris(k) {
  k.yx = KAPI[0] + 0.6;
  k.yz = KAPI[1];
  k.yeni = zaman;
}

function oyunHediye(k, jeton, kd) {
  const v = Math.ceil(B);
  const seviye = hediyeSeviye(kd.tip);
  if (seviye > (k.dolmusHediyeSeviye || 0)) {
    const renk = hediyeRengi(seviye);
    k.g.yelek = renk;
    k.g.kusak = renk;
    k.dolmusHediyeSeviye = seviye;
  }
  D.hediyeJeton += jeton;
  const yeniHatSeviye = D.hediyeJeton >= 1000 ? 4 : D.hediyeJeton >= 500 ? 3 : D.hediyeJeton >= 200 ? 2 : D.hediyeJeton >= 50 ? 1 : 0;
  if (yeniHatSeviye > D.hatSeviye) {
    D.hatSeviye = yeniHatSeviye;
    pankart('Dolmuş süslendi!', k.ad + ' katkısıyla hat seviyesi ' + D.hatSeviye);
    konfeti(24 + D.hatSeviye * 12, 0.35 + D.hatSeviye * 0.1);
  }
  const durakIlerlemesi = D.durakJeton + jeton;
  const acilanDurakSayisi = Math.floor(durakIlerlemesi / DURAK_HEDEF);
  D.durakJeton = durakIlerlemesi % DURAK_HEDEF;
  if (acilanDurakSayisi > 0) {
    D.durak = (D.durak + acilanDurakSayisi) % DOLMUS_DURAKLAR.length;
    D.durakSovBit = B + 12;
    pankart('Yeni durak açıldı!', k.ad + ' ile ' + DOLMUS_DURAKLAR[D.durak] + ' durağı');
    konfeti(55, 0.75);
  }
  k.selam = v;
  if (kd.tip === 'korna')
    D.kornaB = B;
  else if (kd.tip === 'fren') {
    D.fren = v;
    // yayıncı balonları kapatmadıysa gönderen bağırır (çekirdeğin konuşma balonu)
    if (ayar.balon)
      k.balon = { m: 'Müsait yer!', t0: zaman };
  }
  else if (kd.tip === 'ankara') {
    dolmusTemaBaslat('ankara', k);
    D.dansci = { k, kalan: 10 };
    D.pavyonIsikKalan = 10;
    pankart('Ankara pavyon dolmuşu!', k.ad + ' için Ankara havası başladı');
    konfeti(80, 0.8);
    D.sarsinti = Math.max(D.sarsinti, 0.65);
  }
  else if (kd.tip === 'karadeniz') {
    dolmusTemaBaslat('karadeniz', k);
    D.dansci = null;
    pankart('Karadeniz dolmuşu!', k.ad + ' için kemençe gösterisi başladı');
    konfeti(72, 0.75);
    D.sarsinti = Math.max(D.sarsinti, 0.55);
  }
  else if (kd.tip === 'renk') {
    dolmusRenginiDegistir(k);
    pankart('Dolmuşun rengi değişti!', k.ad + ' yeni rengi seçti');
    konfeti(24, 0.4);
  }
  else if (kd.tip === 'kaset') {
    D.kaset = Math.max(D.kaset, v);
    D.kornaB = B;
    konfeti(30, 0.4);
  }
  else if (kd.tip === 'viraj') {
    D.viraj = { b0: v, yon: ozet(k.id + v) % 2 ? 1 : -1 };
    D.sarsinti = Math.max(D.sarsinti, 0.5);
  }
  else if (kd.tip === 'ucus') {
    konfeti(120, 1);
    D.sarsinti = 1;
    if (!D.ucus) {
      D.ucus = { k, b0: v };
      k.yildiz = true;
      pankart('Dolmuş uçuyor!', k.ad + ' kaputun üstünde');
    }
  }
  muzik.sov = B < D.kaset + 16;
}
// Direksiyon el değiştirir: eski şoför arkaya geçer, yeni şoför kasketi takar.
function oyunLiderDegisti(eski, yeni) {
  pankart('Direksiyon el değiştirdi', 'Yeni şoför: ' + yeni.ad);
  konfeti(90, 0.9);
  D.kornaB = B;
  D.sarsinti = Math.max(D.sarsinti, 0.5);
}
function oyunBaslat() {
  muzik.havalar = HAVALAR.filter(h => h.id === 'durak' || h.id === 'hat');
  dolmusYoutubeLinkleriKur();
  for (const k of D.sira) {
    yolcuHazir(k);
    k.yx = k.hx;
    k.yz = k.hz;
    k.yer = 1;
    k.yeni = -9;
  }
  D._B = B;
}
function dolmusYoutubeLinkleriKur() {
  const kutu = document.getElementById('yt-kutu');
  if (!kutu || !window.CanliOyun || !CanliOyun.youtube || document.getElementById('dolmus-youtube-ekleri'))
    return;
  const bolum = document.createElement('div');
  bolum.id = 'dolmus-youtube-ekleri';
  bolum.className = 'grup';
  const baslik = document.createElement('span');
  baslik.className = 'etiket';
  baslik.textContent = 'Dolmuş gösterileri için ayrı müzik bağlantıları';
  bolum.append(baslik);
  for (const secenek of [
    { ad: 'Ankara Pavyon', tur: 'ankara', url: 'https://www.youtube.com/shorts/b2_caqJW03Y?feature=share', id: 'dolmus-ankara-youtube' },
    { ad: 'Karadeniz', tur: 'karadeniz', url: 'https://www.youtube.com/shorts/kpiF-epNP7Y?feature=share', id: 'dolmus-karadeniz-youtube' }
  ]) {
    const satir = document.createElement('div');
    satir.className = 'yt-satir';
    const alan = document.createElement('div');
    alan.className = 'alan';
    const etiket = document.createElement('label');
    etiket.htmlFor = secenek.id + '-link';
    etiket.textContent = secenek.ad + ' bağlantısı';
    const girdi = document.createElement('input');
    girdi.type = 'text';
    girdi.id = secenek.id + '-link';
    girdi.autocomplete = 'off';
    girdi.spellcheck = false;
    girdi.maxLength = 400;
    girdi.value = secenek.url;
    girdi.addEventListener('input', () => { D.youtubeHediyeOnay[secenek.tur] = false; });
    alan.append(etiket, girdi);
    const cal = document.createElement('button');
    cal.type = 'button';
    cal.className = 'dugme ana kucuk';
    cal.id = secenek.id + '-cal';
    cal.textContent = secenek.ad + ' çal';
    cal.addEventListener('click', () => {
      const youtube = CanliOyun.youtube;
      D.youtubeHediyeOnay[secenek.tur] = !!youtube.linkCoz(girdi.value);
      youtube.cal(girdi.value);
    });
    satir.append(alan, cal);
    bolum.append(satir);
  }
  const bilgi = document.createElement('p');
  bilgi.className = 'aciklama';
  bilgi.textContent = 'Bir bağlantıya Çal ile izin verince, ilgili hediye geldiğinde o bağlantı yeniden çalar. Bağlantıyı değiştirince yeniden Çal’a bas; genel YouTube alanı ayrıdır.';
  bolum.append(bilgi);
  kutu.append(bolum);
}
function oyunBosalt() {
  D.yol = 0;
  D.fren = -99;
  D.kaset = -99;
  D.viraj = null;
  D.ucus = null;
  if (D.tema && D.tema.hava) {
    if (muzik.bekleyen === D.tema.hava)
      muzik.bekleyen = null;
    if (muzik.hava === D.tema.hava)
      muzik.bekleyen = D.tema.donusHava;
  }
  D.tema = null;
  D.dansci = null;
  D.pavyonIsikKalan = 0;
  D.youtubeHediyeOnay = { ankara: false, karadeniz: false };
  D.otobusOlcek = 1;
  D.aracRenk = '#f2c84b';
  D.renkSayisi = 0;
  D.yaw = 0;
  D.otoY = 0;
  D.hediyeJeton = 0;
  D.hatSeviye = 0;
  D.durak = 0;
  D.durakJeton = 0;
  D.durakSovBit = -99;
  for (const k of D.oy.values())
    k.dolmusKoltuk = null;
  muzik.sov = false;
}
function oyunDurum(d) {
  d.sofor = D.lider ? D.lider.ad : null;
  d.ayakta = D.sira.filter(k => k.yerTur === 'ayakta').length;
  d.hiz = Math.round(D.hiz * 100) / 100;
  d.fren = B < D.fren + 4;
  d.kaset = B < D.kaset + 16;
  d.viraj = !!D.viraj;
  d.ucus = D.ucus ? D.ucus.k.ad : null;
  d.tema = D.tema ? D.tema.tur : null;
  d.km = Math.floor(Math.max(0, D.yol) / 1000);
  d.gece = dolmusGece();
  d.hediyeJeton = D.hediyeJeton;
  d.hatSeviye = D.hatSeviye;
  d.durak = DOLMUS_DURAKLAR[D.durak];
  d.durakHedef = DOLMUS_DURAKLAR[(D.durak + 1) % DOLMUS_DURAKLAR.length];
  d.durakJeton = D.durakJeton;
  d.durakHedefJeton = DURAK_HEDEF;
  d.otobusOlcek = Math.round(D.otobusOlcek * 100) / 100;
  d.dansci = D.dansci ? D.dansci.k.ad : null;
}
