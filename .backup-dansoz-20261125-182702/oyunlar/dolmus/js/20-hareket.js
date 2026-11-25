/* DOLMUŞ HAREKETİ — hız, yolun akışı, fren, viraj, havalanma; yolcuların yürüyüşü ve pozları.
 * otoIlerle(): dolmuşun hızı ve duruşu, OTO dönüşümü · yolcuHareket(k, dt) · yolcuPoz(k)
 * Kancalar: oyunGuncelle(dt), oyunKamera().
 */
const UCUS_SURE = 12;

function otoIlerle() {
  const dB = Math.max(0, B - D._B);
  D._B = B;
  const fren = B - D.fren, kaset = B < D.kaset + 16;
  const eskiKm = Math.floor(Math.max(0, D.yol) / 1000);
  const durakSovu = B < D.durakSovBit;
  let hedef = 1.3 + 2.2 * D.cosku + (kaset ? 0.5 : 0) + (D.ucus ? 2 : 0) + (durakSovu ? 0.65 : 0);
  if (fren >= 0 && fren < 4)
    hedef = fren < 2.5 ? 0 : hedef * 0.5;
  // fren ani, gaz yumuşak
  D.hiz += (hedef - D.hiz) * Math.min(1, dB * (hedef < D.hiz && fren >= 0 && fren < 1 ? 3 : 0.8));
  D.yol += D.hiz * dB;
  const yeniKm = Math.floor(Math.max(0, D.yol) / 1000);
  if (eskiKm !== yeniKm && eskiKm % 2 !== yeniKm % 2)
    pankart(dolmusGece() ? 'Gece seferi başladı' : 'Gün doğdu, sefer sürüyor', 'Dolmuş ' + yeniKm + '. kilometrede');
  // viraj: dolmuş 8 vuruşta bir yana kıvrılıp döner
  let yaw = 0, kay = 0;
  if (D.viraj) {
    const u = (B - D.viraj.b0) / 8;
    if (u >= 1)
      D.viraj = null;
    else if (u >= 0) {
      yaw = D.viraj.yon * 0.24 * Math.sin(u * TAU);
      kay = D.viraj.yon * 0.45 * Math.sin(u * Math.PI);
    }
  }
  D.yaw = yaw;
  D.otoX = kay;
  // havalanma: bir vuruş hız alır, altı vuruş havada, iner
  let ucY = 0;
  if (D.ucus) {
    const u = B - D.ucus.b0;
    if (u >= UCUS_SURE || !D.oy.has(D.ucus.k.id)) {
      D.ucus.k.yildiz = false;
      D.ucus = null;
    }
    else if (u >= 1 && u < 7)
      ucY = 0.9 * Math.sin(Math.PI * (u - 1) / 6);
  }
  D.otoY = ucY;
  // motor titremesi ve yol sarsıntısı: vuruşla, hızla artar
  const sars = 0.012 * Math.abs(Math.sin(TAU * B)) * (0.4 + D.hiz / 3);
  OTO = donusum(D.otoX, ucY + sars, 2, Math.PI + yaw);
}

function oyunGuncelle(dt) {
  otoIlerle();
  if (D.dansci) {
    D.dansci.kalan -= dt;
    if (D.dansci.kalan <= 0 || D.dansci.k.cikiyor || !D.oy.has(D.dansci.k.id))
      D.dansci = null;
  }
  D.pavyonIsikKalan = Math.max(0, D.pavyonIsikKalan - dt);
  if (D.tema && B >= D.tema.b0 + 16) {
    if (D.tema.hava && muzik.bekleyen === D.tema.hava)
      muzik.bekleyen = null;
    if (D.tema.hava && muzik.hava === D.tema.hava)
      muzik.bekleyen = D.tema.donusHava;
    D.tema = null;
  }
  muzik.sov = B < D.kaset + 16;
  for (const k of D.oy.values()) {
    if (k.girisYorum) {
      k.yx = k.hx;
      k.yz = k.hz;
      k.yer = 1;
      k.girisYorum = false;
    }
    yolcuHareket(k, dt);
  }
}

function yolcuHareket(k, dt) {
  yolcuHazir(k);
  // şoför kasketi takar; koltuğunu bırakınca kendi başlığına döner
  if (!k.g0)
    k.g0 = { baslik: k.g.baslik, baslikRenk: k.g.baslikRenk };
  const sofor = k.yerTur === 'sofor';
  k.g.baslik = sofor ? 'kasket' : k.g0.baslik;
  k.g.baslikRenk = sofor ? '#23263a' : k.g0.baslikRenk;
  const ucan = D.ucus && D.ucus.k === k && B - D.ucus.b0 < UCUS_SURE - 1;
  const dansci = D.dansci && D.dansci.k === k;
  const gosteride = ucan || dansci;
  // hedef (yerel): çıkan kapıdan dışarı, uçuşta kaputun üstü, yoksa kendi yeri
  const hx = k.cikiyor ? KAPI[0] + 1.2 : gosteride ? 0 : k.hx, hz = k.cikiyor ? KAPI[1] : gosteride ? -0.4 : k.hz;
  // dolmuşun içinde yürüyen önce koridora (x = 0,32) geçer, sonra yerine: koltukların içinden geçmesin
  const iceride = k.yx < 1.02 && k.yx > -1.02;
  let ax = hx, az = hz;
  if (!gosteride && Math.abs(k.yz - hz) > 0.15 && Math.abs(k.yx - 0.32) > 0.12 && iceride)
    ax = 0.32, az = k.yz;
  else if (!gosteride && Math.abs(k.yz - hz) > 0.15 && !iceride)
    ax = 0.32, az = KAPI[1];
  const dx = ax - k.yx, dz = az - k.yz, uz = Math.hypot(dx, dz), kalan = Math.hypot(hx - k.yx, hz - k.yz);
  if (uz > 0.002) {
    const adim = Math.min(uz, (gosteride ? 4 : 2.2) * dt);
    k.yx += dx / uz * adim;
    k.yz += dz / uz * adim;
    k.kos = (k.kos || 0) + dt;
  }
  k.yer += ((kalan < 0.06 && !k.cikiyor ? 1 : 0) - k.yer) * Math.min(1, dt * 8);
  if (k.cikiyor)
    k.gitti = k.yx > KAPI[0] + 1.1;
  const w = otoNokta(k.yx, 0, k.yz);
  k.x = w[0];
  k.z = w[2];
  const ic = k.yx < 1.02 && k.yx > -1.02 && k.yz > -0.1;
  k.y0 = gosteride && k.yz < 0 ? OTO.y + 0.72 : ic ? OTO.y + TABAN : 0;
  // gövde kameraya (dolmuşun önüne) bakar; yürürken gittiği yöne
  const on = Math.PI + D.yaw, bak = kalan > 0.08 && uz > 0.01 ? Math.atan2(dx, -dz) + on - Math.PI : on;
  k.yon += aciFark(k.yon, bak) * Math.min(1, dt * 8);
  k.basYon = undefined;
  yolcuPoz(k, ucan, dansci, kalan);
}

// Ortak savrulma: frende öne, virajda yana; kaset çalarken herkes vuruşla sallanır.
function savrulma() {
  const f = B - D.fren, on = f >= 0 && f < 3 ? Math.sin(Math.PI * Math.min(1, f / 1.2)) * Math.max(0, 1 - f / 3) : 0;
  let yan = 0;
  if (D.viraj) {
    const u = (B - D.viraj.b0) / 8;
    if (u >= 0 && u < 1)
      yan = -D.viraj.yon * Math.sin(u * TAU);
  }
  return { on, yan };
}

function yolcuPoz(k, ucan, dansci, kalan) {
  const s = savrulma(), kaset = B < D.kaset + 16, selam = B >= k.selam && B < k.selam + 4;
  k.kolBoy = 1;
  k.elSekil = null;
  if (ucan || dansci || kalan > 0.08 || k.yerTur === 'ayakta' || k.cikiyor) {
    const poz = pozBekle(k), adim = kalan > 0.08 ? Math.sin(k.kos * 10) * 0.12 : 0;
    poz.aS[1] = adim;
    poz.aL[1] = -adim;
    poz.egim += s.on * 0.16;
    poz.yat += s.yan * 0.06 + (kaset ? Math.sin(TAU * B / 2) * 0.03 : 0);
    if (dansci) {
      const ritim = Math.sin(TAU * B);
      poz.hipY += 0.04 * Math.abs(ritim);
      poz.yat += 0.08 * ritim;
    }
    if (ucan) {
      const z = 0.12 * Math.abs(Math.sin(Math.PI * B));
      poz.hipY += z;
      poz.aS[2] += z;
      poz.aL[2] += z;
    }
    const W = iskeletKur(k, poz);
    if (ucan) {
      k.j.haR = W(-0.24, poz.hipY + 0.66, 0.05 + Math.sin(TAU * B) * 0.06);
      k.j.haL = W(0.24, poz.hipY + 0.66, 0.05 - Math.sin(TAU * B) * 0.06);
      k.elSekil = { R: 'avuc', L: 'avuc' };
    }
    else if (dansci) {
      const t = Math.sin(TAU * B);
      k.j.haR = W(-0.24, poz.hipY + 0.55 + t * 0.14, 0.05);
      k.j.haL = W(0.24, poz.hipY + 0.55 - t * 0.14, 0.05);
      k.elSekil = { R: 'avuc', L: 'avuc' };
    }
    else if (k.yerTur === 'ayakta' && kalan <= 0.08 && !k.cikiyor) {
      // tavandaki tutamağa tutunur (ölçüler boya göre: kol uzar)
      const tut = otoNokta(0.32, TABAN + 1.32, k.yz);
      k.j.haR = tut;
      k.kolBoy = 1.6;
      k.elSekil = { R: 'yumruk' };
      k.j.haL = selam || kaset ? W(0.24, poz.hipY + 0.6 + Math.sin(TAU * B) * 0.05, 0.05) : W(0.2, poz.hipY + 0.06, 0.04);
    }
    else {
      k.j.haR = W(-0.2, poz.hipY + 0.08, -adim * 0.6);
      k.j.haL = W(0.2, poz.hipY + 0.08, adim * 0.6);
    }
    kolKur(k);
    return;
  }
  // oturan: koltukta, savrulmayla öne ve yana
  const poz = pozOtur(k, OTURAK);
  poz.egim += s.on * 0.22;
  poz.yat += s.yan * 0.07 + (kaset ? Math.sin(TAU * B / 2) * 0.025 : 0);
  const W = iskeletKur(k, poz);
  if (k.yerTur === 'sofor') {
    // eller direksiyonda; virajda direksiyon döner
    const don = D.viraj ? s.yan * -0.5 : Math.sin(TAU * B / 4) * 0.06, m = otoNokta(k.hx, TABAN + 0.66, k.hz - 0.3);
    const r = 0.13;
    k.j.haR = otoNokta(k.hx - r * Math.cos(don), TABAN + 0.66 + r * Math.sin(don), k.hz - 0.3);
    k.j.haL = otoNokta(k.hx + r * Math.cos(don), TABAN + 0.66 - r * Math.sin(don), k.hz - 0.3);
    k.direksiyon = m;
    k.direksiyonDon = don;
    k.kolBoy = 1.3;
    if (selam || B - D.kornaB < 1)
      k.j.haL = W(0.24, poz.hipY + 0.6 + Math.sin(TAU * B * 2) * 0.05, 0.06);
  }
  else if (kaset) {
    // kaset çalarken eller havada, vuruşla sırayla
    const t = Math.sin(TAU * B);
    k.j.haR = W(-0.22, poz.hipY + 0.55 + t * 0.06, 0.08);
    k.j.haL = W(0.22, poz.hipY + 0.55 - t * 0.06, 0.08);
    k.elSekil = { R: 'avuc', L: 'avuc' };
  }
  else if (selam) {
    k.j.haR = W(...poz.dizR);
    k.j.haL = W(0.24, poz.hipY + 0.6 + Math.sin(TAU * B * 2) * 0.05, 0.06);
    k.elSekil = { L: 'avuc' };
  }
  else {
    k.j.haR = W(...poz.dizR);
    k.j.haL = W(...poz.dizL);
  }
  kolKur(k);
}

// Kadraj: yolcu geldikçe uzayan dolmuşun kaput ve arka tamponu da kadraja girer.
function oyunKamera() {
  const on = otoZ(-0.75);
  const arka = otoZ(4.3);
  return { noktalar: [[-1.25, on, 0.3], [1.25, on, 0.3], [-1.25, arka, 0.3], [1.25, arka, 0.3]], x: 0, ustPx: 36 };
}
