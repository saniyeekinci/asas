/* DOLMUŞ ÇİZİMİ — akan yol, kaldırım, ağaçlar ve direkler; üstü açık dolmuş (taban, tekerler, yanlar, koltuklar,
 * tutamak, kaput, ön cam ve hat tabelası); korna, kaset notaları, hız çizgileri.
 * Dolmuşun parçaları otoKutu ile yerel ölçüde kurulur (OTO dönüşümü, 10-durum.js).
 * Kancalar: oyunZemin(), oyunCiz(), oyunUst(dt).
 */
const GOVDE = '#f2c84b', SERIT_KIRMIZI = '#d8402f', KOLTUK = '#7a2f3a', CAM = 'rgba(190,228,255,0.16)';

// Yerel kutu (x sağa, z arkaya): kutuCiz'in yerel ekseninde ileri = -(z - 2).
function otoKutu(x0, x1, y0, y1, z0, z1, renk, cizgi) {
  return kutuCiz(OTO, x0, x1, y0, y1, 2 - otoZ(z1), 2 - otoZ(z0), renk, cizgi === undefined ? 1.5 : cizgi);
}
function otoDerinlik(x, y, z) { return pr(otoNokta(x, y, z)).d; }
function yolCokgen(nok, renk) {
  const p = nok.map(([x, z]) => pr([x, 0, z]));
  if (p.some(q => !q.ok))
    return;
  cokgenCiz(p, renk);
}

let gokBoya = null;
function oyunZemin() {
  if (!gokBoya) {
    gokBoya = {
      gun: c.createLinearGradient(0, 0, 0, GH),
      gece: c.createLinearGradient(0, 0, 0, GH)
    };
    gokBoya.gun.addColorStop(0, '#6f9c4a');
    gokBoya.gun.addColorStop(1, '#4f7d35');
    gokBoya.gece.addColorStop(0, '#34456b');
    gokBoya.gece.addColorStop(1, '#17243b');
  }
  const gece = dolmusGece();
  c.fillStyle = gece ? gokBoya.gece : gokBoya.gun;
  c.fillRect(0, 0, GW, GH);
  if (gece) {
    c.save();
    c.fillStyle = '#e9e4c4';
    c.beginPath();
    c.arc(603, 132, 25, 0, TAU);
    c.fill();
    c.fillStyle = '#e6e9ff';
    for (let i = 0; i < 24; i++) {
      const x = (37 + i * 97) % GW, y = 35 + (i * 53) % 270;
      c.globalAlpha = 0.45 + 0.45 * Math.abs(Math.sin(B + i));
      c.beginPath();
      c.arc(x, y, i % 4 === 0 ? 2 : 1, 0, TAU);
      c.fill();
    }
    c.restore();
  }
  const Z0 = -6, Z1 = 40;
  const kaldirim = gece ? '#625d62' : '#b8b1a2';
  const asfalt = gece ? '#343945' : '#4b4f5a';
  // kaldırımlar, asfalt, kenar çizgileri
  yolCokgen([[-5.2, Z0], [5.2, Z0], [5.2, Z1], [-5.2, Z1]], kaldirim);
  yolCokgen([[-3.1, Z0], [3.1, Z0], [3.1, Z1], [-3.1, Z1]], gece ? '#55545a' : '#8a8a8a');
  yolCokgen([[-2.95, Z0], [2.95, Z0], [2.95, Z1], [-2.95, Z1]], asfalt);
  for (const x of [-2.75, 2.75])
    yolCokgen([[x - 0.06, Z0], [x + 0.06, Z0], [x + 0.06, Z1], [x - 0.06, Z1]], '#f4f1e6');
  // kaldırım taşları: yol aktıkça geriye kayar
  const yol = D.yol % 1.2;
  for (const yan of [-1, 1])
    for (let z = Z0 - 1.2; z < Z1; z += 1.2) {
      const zz = z + yol, x0 = yan * 3.1, x1 = yan * 5.2;
      yolCokgen([[x0, zz], [x1, zz], [x1, zz + 0.05], [x0, zz + 0.05]], 'rgba(90,80,70,0.35)');
    }
  // orta şerit: kesikli, dolmuşun solunda
  const kes = D.yol % 4;
  for (let z = Z0 - 4; z < Z1; z += 4) {
    const zz = z + kes;
    yolCokgen([[-1.62, zz], [-1.5, zz], [-1.5, zz + 1.7], [-1.62, zz + 1.7]], '#f4f1e6');
  }
  // dolmuşun gölgesi: havalanınca küçülür, açılır
  const g = 1 - D.otoY * 0.5;
  const gp = [[-1.15, -0.75], [1.15, -0.75], [1.15, 4.3], [-1.15, 4.3]].map(([x, z]) => pr([D.otoX + x * g, 0, otoZ(z * g + 2 * (1 - g))]));
  if (gp.every(q => q.ok)) {
    c.globalAlpha = 0.35 * g;
    cokgenCiz(gp, '#10131c');
    c.globalAlpha = 1;
  }
  // tekerler (gövdenin altından görünür) ve taban: en altta, her şeyden önce
  for (const z of [-0.3, 3.5])
    for (const x of [-1.04, 1.04])
      tekerCiz(x, z);
  const t = [otoNokta(-1.08, TABAN, -0.05), otoNokta(1.08, TABAN, -0.05), otoNokta(1.08, TABAN, 4.25), otoNokta(-1.08, TABAN, 4.25)].map(pr);
  if (t.every(q => q.ok)) {
    cokgenCiz(t, '#5b4d43', 2);
    // taban oluklu lastik
    c.strokeStyle = 'rgba(30,20,15,0.35)';
    c.lineWidth = 1;
    for (let z = 0.2; z < 4.2; z += 0.3) {
      const a = pr(otoNokta(-1.0, TABAN, z)), b = pr(otoNokta(1.0, TABAN, z));
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
    }
  }
}
function tekerCiz(x, z) {
  const m = pr(otoNokta(x, 0.24, z));
  if (!m.ok)
    return;
  const don = (D.yol * 3) % TAU;
  c.fillStyle = '#16181f';
  c.beginPath();
  c.ellipse(m.x, m.y, 0.14 * m.s, 0.24 * m.s, 0, 0, TAU);
  c.fill();
  c.strokeStyle = '#8f939e';
  c.lineWidth = Math.max(1, m.s * 0.02);
  c.beginPath();
  c.ellipse(m.x, m.y, 0.07 * m.s, 0.12 * m.s, don, 0, TAU);
  c.stroke();
}

function dansozGorunum(g) {
  return {
    kadin: false, ten: g.ten, sac: g.sac, boy: g.boy, salin: g.salin,
    gomlek: g.ten, yelek: '#c2185b', alt: g.ten, onluk: g.ten,
    kusak: '#ffd166', baslik: 'yok', baslikRenk: '#ffd166',
    biyik: false, ayakkabi: '#ffd166'
  };
}

function dansozSusCiz(k, eskiG) {
  const p = k.p, be = k.basEkran, boy = k.g.boy;
  if (!p.hip || !p.hip.ok || !p.gogus || !p.gogus.ok || !p.kafa || !p.kafa.ok)
    return;
  const ritim = azHareket ? 0 : Math.sin(TAU * B / 2);
  const parilti = azHareket ? 0.85 : 0.65 + 0.35 * Math.sin(TAU * B * 2);
  const isikRenk = ['#ff4f8b', '#ffd166', '#2fc4b2', '#a88bff'];
  const s = p.hip.s;

  // 1) Kaput üstünde hafif pavyon sahne ışığı
  if (p.ayL && p.ayL.ok && p.ayR && p.ayR.ok) {
    const ayX = (p.ayL.x + p.ayR.x) / 2, ayY = Math.max(p.ayL.y, p.ayR.y) + 2;
    const spotRenk = isikRenk[azHareket ? 1 : Math.floor(B * 2) % isikRenk.length];
    ozel(Math.max(p.ayL.d, p.ayR.d) + 0.04, () => {
      c.save();
      c.globalAlpha = 0.28 + 0.1 * parilti;
      c.fillStyle = spotRenk;
      c.beginPath();
      c.ellipse(ayX, ayY, 0.44 * boy * s, 0.14 * boy * s, 0, 0, TAU);
      c.fill();
      c.globalAlpha = 0.65;
      c.strokeStyle = '#ffd166';
      c.lineWidth = Math.max(1.5, s * 0.014);
      c.stroke();
      c.restore();
    });
  }

  // 2) Omuzlara dökülen uzun dalgalı saç (başın arkasında)
  if (be && p.omL && p.omR && p.omL.ok && p.omR.ok) {
    const R = be.r, x0 = be.x, y0 = be.y, cw = Math.max(1.2, p.kafa.s * 0.012);
    ozel(p.kafa.d + 0.03, () => {
      c.save();
      c.fillStyle = eskiG.sac;
      c.strokeStyle = MUREKKEP;
      c.lineWidth = cw;
      for (const yan of [-1, 1]) {
        const sal = ritim * R * 0.18;
        c.beginPath();
        c.moveTo(x0 + yan * R * 0.55, y0 - R * 0.35);
        c.bezierCurveTo(
          x0 + yan * R * 1.28 + sal, y0 + R * 0.25,
          x0 + yan * R * 1.18 + sal * 1.4, y0 + R * 1.25,
          x0 + yan * R * 0.72 + sal * 1.6, y0 + R * 1.75
        );
        c.quadraticCurveTo(x0 + yan * R * 0.42 + sal, y0 + R * 1.35, x0 + yan * R * 0.45, y0 + R * 0.5);
        c.closePath();
        c.fill();
        c.stroke();
      }
      c.restore();
    });

    // 3) Zarif alınlık, yakut damla, küpeler ve kirpikler
    ozel(p.kafa.d - 0.06, () => {
      c.save();
      // Ortadan ayrık yumuşak kahkül kıvrımı
      c.fillStyle = eskiG.sac;
      for (const yan of [-1, 1]) {
        c.beginPath();
        c.ellipse(x0 + yan * R * 0.42, y0 - R * 0.56, R * 0.38, R * 0.19, yan * 0.32, 0, TAU);
        c.fill();
      }
      // İnce altın alınlık zinciri ve ortada tek yakut taş
      c.strokeStyle = '#ffd166';
      c.lineWidth = Math.max(1.6, R * 0.09);
      c.beginPath();
      c.moveTo(x0 - R * 0.76, y0 - R * 0.36);
      c.quadraticCurveTo(x0, y0 - R * 0.68, x0 + R * 0.76, y0 - R * 0.36);
      c.stroke();
      c.fillStyle = '#ff4f8b';
      c.strokeStyle = '#ffd166';
      c.lineWidth = Math.max(1, R * 0.055);
      c.beginPath();
      c.arc(x0, y0 - R * 0.44, R * 0.11, 0, TAU);
      c.fill();
      c.stroke();
      // Altın küpeler ve kirpik vurgusu
      for (const yan of [-1, 1]) {
        c.fillStyle = '#ffd166';
        c.strokeStyle = MUREKKEP;
        c.lineWidth = Math.max(1, cw * 0.7);
        c.beginPath();
        c.arc(x0 + yan * R * 0.96, y0 + R * 0.14, R * 0.11, 0, TAU);
        c.fill();
        c.stroke();
        c.strokeStyle = MUREKKEP;
        c.lineWidth = Math.max(1, R * 0.065);
        c.beginPath();
        c.moveTo(x0 + yan * R * 0.43, y0 - R * 0.08);
        c.lineTo(x0 + yan * R * 0.56, y0 - R * 0.16);
        c.stroke();
      }
      c.restore();
    });
  }

  const etekD = Math.min(p.hip.d, p.dzL && p.dzL.ok ? p.dzL.d : p.hip.d, p.dzR && p.dzR.ok ? p.dzR.d : p.hip.d) - 0.28;
  // 4) İnce bel, açık karın ve payetli dansöz üstü
  const gogusD = Math.min(p.gogus.d - 0.04, etekD - 0.02);
  ozel(gogusD, () => {
    const gx = p.gogus.x, gy = p.gogus.y, hx = p.hip.x, hy = p.hip.y;
    const gs = p.gogus.s, cw = Math.max(1.2, gs * 0.011);
    const belX = lerp(hx, gx, 0.38), belY = lerp(hy, gy, 0.38);
    c.save();
    // Bel boşluğu (ten rengi) + zarif göbek taşı
    c.fillStyle = eskiG.ten;
    c.strokeStyle = MUREKKEP;
    c.lineWidth = cw;
    c.beginPath();
    c.ellipse(belX, belY, 0.125 * boy * gs, 0.075 * boy * gs, 0, 0, TAU);
    c.fill();
    c.stroke();
    c.fillStyle = '#ffd166';
    c.beginPath();
    c.arc(belX, belY + 0.015 * boy * gs, 0.02 * boy * gs, 0, TAU);
    c.fill();

    // Payetli büstiyer (çift kavisli dansöz üstü)
    const ustY = gy - 0.01 * boy * gs;
    c.fillStyle = '#e91e63';
    c.strokeStyle = MUREKKEP;
    c.beginPath();
    c.moveTo(gx - 0.155 * boy * gs, ustY + 0.02 * boy * gs);
    c.quadraticCurveTo(gx - 0.075 * boy * gs, ustY - 0.075 * boy * gs, gx, ustY - 0.01 * boy * gs);
    c.quadraticCurveTo(gx + 0.075 * boy * gs, ustY - 0.075 * boy * gs, gx + 0.155 * boy * gs, ustY + 0.02 * boy * gs);
    c.quadraticCurveTo(gx + 0.08 * boy * gs, ustY + 0.075 * boy * gs, gx, ustY + 0.055 * boy * gs);
    c.quadraticCurveTo(gx - 0.08 * boy * gs, ustY + 0.075 * boy * gs, gx - 0.155 * boy * gs, ustY + 0.02 * boy * gs);
    c.closePath();
    c.fill();
    c.stroke();

    // Altın gerdanlık ve göğüs ortası parıltısı
    c.strokeStyle = '#ffd166';
    c.lineWidth = Math.max(1.4, gs * 0.015);
    c.beginPath();
    c.arc(gx, ustY - 0.075 * boy * gs, 0.085 * boy * gs, 0.25, Math.PI - 0.25);
    c.stroke();
    c.fillStyle = '#fff1a8';
    c.beginPath();
    c.arc(gx, ustY + 0.02 * boy * gs, 0.024 * boy * gs, 0, TAU);
    c.fill();
    c.restore();
  });

  // 5) Geniş, kıvrımlı, ışıklı ve pullu etek + şakşaklı altın kemer
  if (p.dzL && p.dzR && p.ayL && p.ayR && p.dzL.ok && p.dzR.ok && p.ayL.ok && p.ayR.ok) {
    ozel(etekD, () => {
      const hx = p.hip.x, hy = p.hip.y - 0.01 * boy * s;
      const altY = lerp((p.dzL.y + p.dzR.y) / 2, (p.ayL.y + p.ayR.y) / 2, 0.58);
      const sal = ritim * 0.075 * boy * s;
      const ustW = 0.16 * boy * s, altW = 0.34 * boy * s;
      const cw = Math.max(1.2, s * 0.012);
      c.save();

      // Etek gövdesi: koyu yakuttan canlı fuşyaya geçiş
      const grad = c.createLinearGradient(hx, hy, hx, altY);
      grad.addColorStop(0, '#c2185b');
      grad.addColorStop(0.65, '#ff4f8b');
      grad.addColorStop(1, '#a88bff');
      c.fillStyle = grad;
      c.strokeStyle = MUREKKEP;
      c.lineWidth = cw;
      c.beginPath();
      c.moveTo(hx - ustW, hy);
      c.quadraticCurveTo(hx, hy + 0.045 * boy * s, hx + ustW, hy);
      c.quadraticCurveTo(hx + ustW * 1.45 + sal * 0.4, lerp(hy, altY, 0.55), hx + altW + sal, altY - 0.02 * boy * s);
      c.quadraticCurveTo(hx + altW * 0.45 + sal * 0.8, altY + 0.045 * boy * s, hx + sal * 0.6, altY + 0.015 * boy * s);
      c.quadraticCurveTo(hx - altW * 0.45 + sal * 0.4, altY + 0.045 * boy * s, hx - altW + sal * 0.5, altY - 0.02 * boy * s);
      c.quadraticCurveTo(hx - ustW * 1.45, lerp(hy, altY, 0.55), hx - ustW, hy);
      c.closePath();
      c.fill();
      c.stroke();

      // Etek pilileri (ince tül kıvrımları)
      c.strokeStyle = 'rgba(255, 241, 168, 0.42)';
      c.lineWidth = Math.max(1, s * 0.008);
      for (const t of [-0.55, -0.18, 0.18, 0.55]) {
        c.beginPath();
        c.moveTo(hx + t * ustW, hy + 0.02 * boy * s);
        c.quadraticCurveTo(hx + t * lerp(ustW, altW, 0.55) + sal * 0.4, lerp(hy, altY, 0.55), hx + t * altW + sal * 0.7, altY + 0.01 * boy * s);
        c.stroke();
      }

      // Etek ucunda ışıklı LED / payet noktaları
      const noktaSayi = 9;
      for (let i = 0; i < noktaSayi; i++) {
        const u = i / (noktaSayi - 1) * 2 - 1;
        const lx = hx + u * altW * 0.92 + sal * (0.5 + 0.25 * (u + 1));
        const ly = altY + (1 - u * u) * 0.022 * boy * s - 0.005 * boy * s;
        const lr = (0.019 + (azHareket ? 0.004 : 0.008 * Math.abs(Math.sin(TAU * B * 2 + i)))) * boy * s;
        const rnk = isikRenk[(i + (azHareket ? 0 : Math.floor(B * 4))) % isikRenk.length];
        c.globalAlpha = 0.4;
        c.fillStyle = rnk;
        c.beginPath();
        c.arc(lx, ly, lr * 1.85, 0, TAU);
        c.fill();
        c.globalAlpha = 1;
        c.fillStyle = '#fff8dc';
        c.beginPath();
        c.arc(lx, ly, lr, 0, TAU);
        c.fill();
      }

      // Kalçada altın şakşaklı kemer ve sarkan paralar
      c.fillStyle = '#ffd166';
      c.strokeStyle = MUREKKEP;
      c.lineWidth = Math.max(1, cw * 0.85);
      c.beginPath();
      c.moveTo(hx - ustW * 1.04, hy - 0.01 * boy * s);
      c.quadraticCurveTo(hx, hy + 0.055 * boy * s, hx + ustW * 1.04, hy - 0.01 * boy * s);
      c.lineTo(hx + ustW * 1.06, hy + 0.03 * boy * s);
      c.quadraticCurveTo(hx, hy + 0.095 * boy * s, hx - ustW * 1.06, hy + 0.03 * boy * s);
      c.closePath();
      c.fill();
      c.stroke();

      for (let i = -3; i <= 3; i++) {
        const u = i / 3;
        const px = hx + u * ustW * 0.86 + sal * 0.12;
        const py = hy + 0.048 * boy * s + (1 - u * u) * 0.032 * boy * s;
        c.fillStyle = i % 2 === 0 ? '#fff1a8' : '#ffd166';
        c.beginPath();
        c.arc(px, py, 0.02 * boy * s, 0, TAU);
        c.fill();
        c.stroke();
      }
      c.restore();
    });
  }

  // 6) Kollarda uçuşan tül şal, altın bilezikler ve ışıltı yıldızları
  if (p.haL && p.haR && p.drL && p.drR && p.omL && p.omR && p.haL.ok && p.haR.ok) {
    const elD = Math.min(p.haL.d, p.haR.d) - 0.04;
    ozel(elD, () => {
      c.save();
      // İnce saydam şal: omuzdan ellere süzülür
      c.strokeStyle = 'rgba(255, 110, 175, 0.42)';
      c.lineWidth = Math.max(3, 0.075 * boy * s);
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(p.haL.x, p.haL.y);
      c.quadraticCurveTo(p.drL.x, p.drL.y + 0.1 * boy * s, p.omL.x, p.omL.y + 0.06 * boy * s);
      c.quadraticCurveTo(p.gogus.x, p.gogus.y + 0.08 * boy * s, p.omR.x, p.omR.y + 0.06 * boy * s);
      c.quadraticCurveTo(p.drR.x, p.drR.y + 0.1 * boy * s, p.haR.x, p.haR.y);
      c.stroke();

      // Bilezikler ve parmak zilleri
      for (const [ha, dr] of [[p.haL, p.drL], [p.haR, p.drR]]) {
        const bx = lerp(ha.x, dr.x, 0.18), by = lerp(ha.y, dr.y, 0.18);
        c.fillStyle = '#ffd166';
        c.strokeStyle = MUREKKEP;
        c.lineWidth = Math.max(1, ha.s * 0.009);
        c.beginPath();
        c.arc(bx, by, 0.046 * boy * ha.s, 0, TAU);
        c.fill();
        c.stroke();
        c.fillStyle = '#fff1a8';
        c.beginPath();
        c.arc(ha.x, ha.y, 0.025 * boy * ha.s, 0, TAU);
        c.fill();
      }

      // Etrafında parlayan ışıltılar
      for (let i = 0; i < 6; i++) {
        const aci = i / 6 * TAU + (azHareket ? 0 : B * 1.4);
        const sx = p.gogus.x + Math.cos(aci) * 0.42 * boy * s;
        const sy = p.gogus.y - 0.08 * boy * s + Math.sin(aci * 1.3) * 0.34 * boy * s;
        const r = (0.02 + (azHareket ? 0 : 0.01 * Math.sin(B * 6 + i))) * boy * s;
        c.fillStyle = isikRenk[i % isikRenk.length];
        c.globalAlpha = 0.85;
        c.beginPath();
        c.moveTo(sx, sy - r);
        c.lineTo(sx + r * 0.35, sy - r * 0.35);
        c.lineTo(sx + r, sy);
        c.lineTo(sx + r * 0.35, sy + r * 0.35);
        c.lineTo(sx, sy + r);
        c.lineTo(sx - r * 0.35, sy + r * 0.35);
        c.lineTo(sx - r, sy);
        c.lineTo(sx - r * 0.35, sy - r * 0.35);
        c.closePath();
        c.fill();
      }
      c.restore();
    });
  }
}

function oyunCiz() {
  for (const k of D.oy.values()) {
    const dansoz = D.dansci && D.dansci.k === k;
    const eskiG = k.g, eskiGuler = k.guler;
    let cizildi = false;
    if (dansoz) {
      k.g = dansozGorunum(eskiG);
      k.guler = true;
    }
    try {
      cizildi = insanEkle(k);
    }
    finally {
      if (dansoz) {
        k.g = eskiG;
        k.guler = eskiGuler;
      }
    }
    if (cizildi) {
      if (dansoz)
        dansozSusCiz(k, eskiG);
      k.et.asagi = dansoz ? false : Math.round(k.hz / 0.8) % 2 === 0;
      if (k.yerTur === 'sofor' && k.direksiyon) {
        direksiyonCiz(k);
        const tabela = otoDerinlik(k.hx, TABAN + 1.22, k.hz - 0.12);
        ozel(tabela, () => {
          const p = pr(otoNokta(k.hx, TABAN + 1.22, k.hz - 0.12));
          if (!p.ok)
            return;
          const w = 84, h = 28;
          c.save();
          c.fillStyle = '#23263a';
          c.strokeStyle = '#ffd166';
          c.lineWidth = 2;
          c.beginPath();
          c.roundRect(p.x - w / 2, p.y - h / 2, w, h, 8);
          c.fill();
          c.stroke();
          c.fillStyle = '#ffd166';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.font = '700 13px Rubik, system-ui, sans-serif';
          c.fillText('ŞOFÖR', p.x, p.y);
          c.restore();
        });
      }
    }
  }
  koltuklarCiz();
  govdeCiz();
  aracSusCiz();
  cevreCiz();
}

function aracSusCiz() {
  if (D.pavyonIsikKalan > 0) {
    const renkler = ['#ff4f8b', '#ffd166', '#2fc4b2', '#8a78ff', '#ef5a3c'];
    for (let i = 0; i < 10; i++) {
      const x = i % 2 ? 1.08 : -1.08, z = 0.25 + Math.floor(i / 2) * 0.82;
      const p = pr(otoNokta(x, 1.04, z));
      if (p.ok) {
        const renk = renkler[(i + Math.floor(B * 2)) % renkler.length];
        const cap = 0.045 + 0.03 * Math.abs(Math.sin(TAU * B + i));
        top(p, cap, renk, p.d, 2);
      }
    }
  }
}

function koltuklarCiz() {
  for (const [tur, x, z] of KOLTUKLAR) {
    const m = otoDerinlik(x, TABAN + 0.3, z + 0.05);
    ozel(m + 0.05, () => {
      otoKutu(x - 0.25, x + 0.25, TABAN + 0.05, TABAN + OTURAK, z - 0.16, z + 0.2, KOLTUK);
      otoKutu(x - 0.26, x + 0.26, TABAN + OTURAK, TABAN + 0.86, z + 0.2, z + 0.3, tur === 'sofor' ? '#2c2f3a' : '#8a3644');
    });
  }
  // ayakta duranların tutamağı: koridor boyunca
  const a = pr(otoNokta(0.32, TABAN + 1.34, 0.7)), b = pr(otoNokta(0.32, TABAN + 1.34, 3.4));
  if (a.ok && b.ok) {
    kap(a, 0.022, b, 0.022, '#c9ccd4');
    for (const [z, p] of [[0.7, a], [3.4, b]]) {
      const yer = pr(otoNokta(0.32, TABAN, z));
      if (yer.ok)
        kap(p, 0.02, yer, 0.02, '#c9ccd4');
    }
  }
}

function govdeCiz() {
  const isikRenkleri = ['#ff5577', '#ffca58', '#55d6bf', '#a88bff', '#f07b4f'];
  const govdeRengi = D.pavyonIsikKalan > 0 ? isikRenkleri[Math.floor(B * 2) % isikRenkleri.length] : D.aracRenk || GOVDE;
  // yan duvarlar: parça parça, ki aradaki yolcularla derinliği doğru sıralansın. Sağda ön kapı açık.
  for (let z = -0.05; z < 4.2; z += 0.5) {
    const z1 = Math.min(4.25, z + 0.5);
    for (const yan of [-1, 1]) {
      if (yan > 0 && z1 > 0.55 && z < 1.3)
        continue;
      const x0 = yan < 0 ? -1.08 : 1.0, x1 = yan < 0 ? -1.0 : 1.08;
      ozel(otoDerinlik(yan * 1.04, 0.6, (z + z1) / 2), () => {
        otoKutu(x0, x1, TABAN - 0.1, 0.98, z, z1, govdeRengi, 1.2);
        // kırmızı şerit
        const g = [otoNokta(yan * 1.085, 0.6, z), otoNokta(yan * 1.085, 0.6, z1), otoNokta(yan * 1.085, 0.7, z1), otoNokta(yan * 1.085, 0.7, z)].map(pr);
        if (g.every(q => q.ok)) {
          const serit = D.hatSeviye >= 1 ? ['#2fc4b2', '#ffd166', '#ef8b4b', '#a88bff'][D.hatSeviye - 1] : SERIT_KIRMIZI;
          cokgenCiz(g, serit);
        }
      });
    }
  }
  // arka duvar ve arka cam
  ozel(otoDerinlik(0, 0.7, 4.2), () => {
    otoKutu(-1.08, 1.08, TABAN - 0.1, 1.2, 4.15, 4.25, govdeRengi);
  });
  // ön: torpido, kaput, tampon, farlar
  ozel(otoDerinlik(0, 0.5, -0.35), () => {
    otoKutu(-1.08, 1.08, 0.18, 0.72, -0.65, -0.05, govdeRengi);
    otoKutu(-1.12, 1.12, 0.12, 0.3, -0.75, -0.63, '#c9ccd4');
    for (const x of [-0.75, 0.75]) {
      const f = pr(otoNokta(x, 0.52, -0.66));
      const renkler = ['#ff4f8b', '#ffd166', '#2fc4b2', '#8a78ff'];
      const renkli = pavyonHavasiCalisiyor();
      const renk = renkli ? renkler[(Math.floor(B * 2) + (x > 0 ? 0 : 2)) % renkler.length] : '#f6f1df';
      if (renkli) {
        c.globalAlpha = 0.25;
        daireCiz(f, 0.25, renk);
        c.globalAlpha = 1;
      }
      daireCiz(f, 0.12, renk, 1.5);
    }
    // ızgara
    const iz = [otoNokta(-0.45, 0.34, -0.655), otoNokta(0.45, 0.34, -0.655), otoNokta(0.45, 0.62, -0.655), otoNokta(-0.45, 0.62, -0.655)].map(pr);
    if (iz.every(q => q.ok))
      cokgenCiz(iz, '#2c2f3a', 1.5);
  });
  ozel(otoDerinlik(0, 0.6, 0.02), () => {
    otoKutu(-1.02, 1.02, TABAN, 0.86, -0.08, 0.1, '#2c2f3a');
  });
  // ön cam: saydam, iki yan dikme ve üstte hat tabelası
  const cam = [otoNokta(-1.04, 0.86, -0.05), otoNokta(1.04, 0.86, -0.05), otoNokta(1.0, 1.6, 0.25), otoNokta(-1.0, 1.6, 0.25)].map(pr);
  if (cam.every(q => q.ok)) {
    ozel(cam[0].d - 0.6, () => {
      cokgenCiz(cam, CAM);
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(lerp(cam[0].x, cam[1].x, 0.15), lerp(cam[0].y, cam[3].y, 0.2));
      c.lineTo(lerp(cam[0].x, cam[1].x, 0.3), lerp(cam[0].y, cam[3].y, 0.75));
      c.stroke();
    });
    for (const [a, b] of [[0, 3], [1, 2]])
      kap(cam[a], 0.035, cam[b], 0.035, '#2c2f3a', cam[a].d - 0.62);
    tabelaCiz();
  }
}
function pavyonHavasiCalisiyor() {
  return D.pavyonIsikKalan > 0;
}
function tabelaCiz() {
  const k = [otoNokta(-0.75, 1.82, 0.27), otoNokta(0.75, 1.82, 0.27), otoNokta(0.75, 1.56, 0.25), otoNokta(-0.75, 1.56, 0.25)].map(pr);
  if (!k.every(q => q.ok))
    return;
  ozel(k[2].d - 0.65, () => {
    cokgenCiz(k, '#fff4dc', 1.5);
    const m = pr(otoNokta(0, 1.69, 0.26));
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '700 ' + Math.round(0.13 * m.s) + 'px Rubik, system-ui, sans-serif';
    c.fillStyle = '#1d2433';
    const tabela = D.tema && D.tema.tur === 'ankara' ? 'PAVYON DOLMUŞ' :
      D.tema && D.tema.tur === 'karadeniz' ? 'KARADENİZ' : DOLMUS_DURAKLAR[D.durak];
    c.fillText(tabela, m.x, m.y, 1.3 * m.s);
  });
}
function direksiyonCiz(k) {
  const m = pr(k.direksiyon);
  if (!m.ok)
    return;
  ozel(m.d - 0.02, () => {
    c.strokeStyle = '#1b1d26';
    c.lineWidth = Math.max(2, m.s * 0.035);
    c.beginPath();
    c.ellipse(m.x, m.y, 0.15 * m.s, 0.08 * m.s, k.direksiyonDon * 0.6, 0, TAU);
    c.stroke();
  });
}

// Kaldırımda ağaçlar ve sokak lambaları: yol aktıkça geriye (uzağa) kayar.
function cevreCiz() {
  const boy = 36;
  for (let i = 0; i < 12; i++) {
    const yan = i % 2 ? 1 : -1, z = ((i * 3 + D.yol) % boy) - 6, x = yan * (i % 4 < 2 ? 4.2 : 3.6);
    if (i % 4 < 2)
      agacCiz(x, z, i);
    else
      lambaCiz(x, z, yan);
  }
}
function agacCiz(x, z, i) {
  const a = pr([x, 0, z]), b = pr([x, 1.2, z]);
  if (!a.ok || !b.ok)
    return;
  kap(a, 0.09, b, 0.07, '#6b4426');
  const yesil = ['#3f7d3a', '#4f8f44', '#367035'][i % 3];
  for (const [dx, dy, r] of [[0, 1.55, 0.6], [-0.35, 1.3, 0.45], [0.35, 1.35, 0.45]]) {
    const p = pr([x + dx, dy + 0.03 * Math.sin(TAU * B / 2 + i), z]);
    if (p.ok)
      top(p, r, yesil, p.d, 1.5);
  }
}
function lambaCiz(x, z, yan) {
  const a = pr([x, 0, z]), b = pr([x, 2.4, z]), u = pr([x - yan * 0.5, 2.4, z]);
  if (!a.ok || !b.ok || !u.ok)
    return;
  kap(a, 0.05, b, 0.04, '#3b3f4c');
  kap(b, 0.035, u, 0.035, '#3b3f4c');
  top(u, dolmusGece() ? 0.16 : 0.1, dolmusGece() ? '#ffe28a' : '#fff1b8', u.d - 0.01, 1.5);
}

// Üste: korna yazısı, kaset notaları, hızlıyken yanlarda hız çizgileri.
function oyunUst() {
  if (B - D.kornaB < 1.5) {
    const m = pr(otoNokta(0, 1.0, -0.9)), t = (B - D.kornaB) / 1.5;
    if (m.ok) {
      c.save();
      c.globalAlpha = 1 - t;
      c.textAlign = 'center';
      c.font = Math.round(0.42 * m.s * (1 + t * 0.4)) + 'px "Paytone One", Rubik, system-ui, sans-serif';
      c.lineWidth = Math.max(3, m.s * 0.05);
      c.strokeStyle = MUREKKEP;
      c.strokeText('DIT DIIT!', m.x, m.y - t * 40);
      c.fillStyle = RENK.vurgu;
      c.fillText('DIT DIIT!', m.x, m.y - t * 40);
      c.restore();
    }
  }
  if (B < D.kaset + 16) {
    c.font = '30px Rubik, system-ui, sans-serif';
    c.textAlign = 'center';
    for (let i = 0; i < 6; i++) {
      const t = (B * 0.5 + i / 6) % 1, p = pr(otoNokta(-0.9 + i * 0.36, 1.4 + t * 1.4, 1.2 + (i % 3) * 1.2));
      if (!p.ok)
        continue;
      c.globalAlpha = Math.sin(t * Math.PI);
      c.fillStyle = ['#ffd166', '#ef5a3c', '#2fc4b2'][i % 3];
      c.fillText(i % 2 ? '♪' : '♫', p.x, p.y);
    }
    c.globalAlpha = 1;
  }
  if (D.hiz > 2.6) {
    const a = clamp((D.hiz - 2.6) / 2, 0, 1);
    c.strokeStyle = 'rgba(255,255,255,' + (0.5 * a).toFixed(2) + ')';
    c.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const yan = i % 2 ? 1 : -1, z = ((i * 1.7 + D.yol * 1.5) % 9) - 1, p0 = pr([yan * 1.7, 0.6 + (i % 3) * 0.3, z]), p1 = pr([yan * 1.7, 0.6 + (i % 3) * 0.3, z + 1.2]);
      if (p0.ok && p1.ok) {
        c.beginPath();
        c.moveTo(p0.x, p0.y);
        c.lineTo(p1.x, p1.y);
        c.stroke();
      }
    }
  }
  temaGosterisiCiz();
  hediyeDurakCiz();
}

function temaGosterisiCiz() {
  const e = D.tema;
  if (!e)
    return;
  const yas = B - e.b0, giris = clamp(yas / 1.5, 0, 1), cikis = clamp((16 - yas) / 2, 0, 1);
  const renk = e.tur === 'ankara' ? '#ffd166' : '#2fc4b2';
  const x = 560, y = 850 + Math.sin(TAU * B / 2) * 4;
  c.save();
  c.globalAlpha = Math.min(giris, cikis);
  c.translate(x, y);
  c.fillStyle = 'rgba(25,31,45,0.94)';
  c.strokeStyle = renk;
  c.lineWidth = 3;
  c.beginPath();
  c.roundRect(-112, -156, 224, 240, 18);
  c.fill();
  c.stroke();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = renk;
  c.font = '700 17px Rubik, system-ui, sans-serif';
  c.fillText(e.tur === 'ankara' ? 'ANKARA PAVYON DOLMUŞ' : 'KARADENİZ DOLMUŞU', 0, -135, 205);
  if (e.tur === 'ankara')
    dansozCiz();
  else
    kemenceCiz();
  c.fillStyle = '#fff';
  c.font = '500 14px Rubik, system-ui, sans-serif';
  c.fillText(e.k.ad, 0, 67, 196);
  c.restore();
}

function dansozCiz() {
  const ritim = azHareket ? 0 : Math.sin(TAU * B / 2);
  const kol = ritim * 15, kalca = ritim * 6;
  const isikRenk = ['#ff4f8b', '#ffd166', '#2fc4b2', '#a88bff'];
  c.save();
  c.translate(0, -12);

  // Sahne spot ışığı ve ışıltı halesi
  const spot = c.createRadialGradient(0, -28, 6, 0, -28, 68 + Math.abs(ritim) * 6);
  spot.addColorStop(0, 'rgba(255, 79, 139, 0.34)');
  spot.addColorStop(0.55, 'rgba(255, 209, 102, 0.2)');
  spot.addColorStop(1, 'rgba(255, 209, 102, 0)');
  c.fillStyle = spot;
  c.beginPath();
  c.arc(0, -28, 68 + Math.abs(ritim) * 6, 0, TAU);
  c.fill();

  // Arkada uçuşan şeffaf tül şal
  c.strokeStyle = 'rgba(255, 110, 175, 0.4)';
  c.lineWidth = 10;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-58, -80 + kol);
  c.quadraticCurveTo(-24, -42, 0, -48);
  c.quadraticCurveTo(24, -42, 58, -78 - kol);
  c.stroke();

  // Uzun dalgalı saç (arka katman)
  c.fillStyle = '#2d182b';
  c.strokeStyle = '#080a1c';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(-14, -92);
  c.bezierCurveTo(-30, -76 + ritim * 2, -28, -50 + ritim * 3, -18 + ritim * 2, -38);
  c.quadraticCurveTo(0, -34, 18 + ritim * 2, -38);
  c.bezierCurveTo(28, -50 + ritim * 3, 30, -76 + ritim * 2, 14, -92);
  c.closePath();
  c.fill();
  c.stroke();

  // Bacaklar, altın halhal ve dans pabuçları
  c.strokeStyle = '#f5c99b';
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(-9, 14);
  c.lineTo(-13 + kalca * 0.3, 42);
  c.moveTo(9, 14);
  c.lineTo(13 + kalca * 0.3, 40);
  c.stroke();
  for (const [bx, by] of [[-13 + kalca * 0.3, 43], [13 + kalca * 0.3, 41]]) {
    c.fillStyle = '#ffd166';
    c.beginPath();
    c.ellipse(bx, by, 5.5, 3, 0, 0, TAU);
    c.fill();
  }

  // Zarif kollar, altın bilezikler ve parmak zilleri
  c.strokeStyle = '#f5c99b';
  c.lineWidth = 6.5;
  c.beginPath();
  c.moveTo(-12, -57);
  c.quadraticCurveTo(-38, -62 + kol * 0.35, -56, -80 + kol);
  c.moveTo(12, -57);
  c.quadraticCurveTo(38, -62 - kol * 0.35, 56, -78 - kol);
  c.stroke();
  for (const [hx, hy] of [[-56, -80 + kol], [56, -78 - kol]]) {
    c.fillStyle = '#ffd166';
    c.beginPath();
    c.arc(hx, hy, 3.6, 0, TAU);
    c.fill();
  }

  // Bel ve ince karın (ten)
  c.fillStyle = '#f5c99b';
  c.beginPath();
  c.moveTo(-10, -54);
  c.lineTo(10, -54);
  c.quadraticCurveTo(7 + kalca * 0.35, -40, 14 + kalca * 0.6, -28);
  c.lineTo(-14 + kalca * 0.6, -28);
  c.quadraticCurveTo(-7 + kalca * 0.35, -40, -10, -54);
  c.closePath();
  c.fill();

  // Payetli yakut-fuşya büstiyer
  c.fillStyle = '#e91e63';
  c.strokeStyle = '#080a1c';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(-15, -56);
  c.quadraticCurveTo(-8, -66, 0, -58);
  c.quadraticCurveTo(8, -66, 15, -56);
  c.quadraticCurveTo(9, -46, 0, -49);
  c.quadraticCurveTo(-9, -46, -15, -56);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = '#ffd166';
  c.beginPath();
  c.arc(0, -54, 2.5, 0, TAU);
  c.fill();

  // Geniş, kıvrımlı, ışıklı dansöz eteği
  const etekGrad = c.createLinearGradient(0, -28, 0, 34);
  etekGrad.addColorStop(0, '#c2185b');
  etekGrad.addColorStop(0.6, '#ff4f8b');
  etekGrad.addColorStop(1, '#a88bff');
  c.fillStyle = etekGrad;
  c.strokeStyle = '#080a1c';
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(-15 + kalca * 0.6, -28);
  c.quadraticCurveTo(kalca * 0.6, -21 + ritim * 2, 15 + kalca * 0.6, -28);
  c.quadraticCurveTo(28 + kalca * 0.8, 0, 40 + kalca, 24 + ritim * 3);
  c.quadraticCurveTo(20 + kalca * 0.7, 36 + ritim * 4, kalca * 0.5, 29 + ritim * 2);
  c.quadraticCurveTo(-20 + kalca * 0.3, 36 - ritim * 4, -40 + kalca * 0.5, 24 - ritim * 3);
  c.quadraticCurveTo(-28 + kalca * 0.5, 0, -15 + kalca * 0.6, -28);
  c.closePath();
  c.fill();
  c.stroke();

  // Etek pilileri ve ışıklı LED noktalar
  c.strokeStyle = 'rgba(255, 241, 168, 0.45)';
  c.lineWidth = 1.4;
  for (const u of [-0.55, -0.18, 0.18, 0.55]) {
    c.beginPath();
    c.moveTo(u * 14 + kalca * 0.6, -23);
    c.quadraticCurveTo(u * 26 + kalca * 0.7, 2, u * 35 + kalca * 0.8, 25);
    c.stroke();
  }
  for (let i = 0; i < 9; i++) {
    const u = i / 8 * 2 - 1;
    const lx = u * 35 + kalca * (0.65 + u * 0.25);
    const ly = 24 + (1 - u * u) * 7 + u * ritim * 3;
    const rnk = isikRenk[(i + (azHareket ? 0 : Math.floor(B * 4))) % isikRenk.length];
    c.fillStyle = rnk;
    c.globalAlpha = 0.45;
    c.beginPath();
    c.arc(lx, ly, 4.5, 0, TAU);
    c.fill();
    c.globalAlpha = 1;
    c.fillStyle = '#fff8dc';
    c.beginPath();
    c.arc(lx, ly, 2.1, 0, TAU);
    c.fill();
  }

  // Altın şakşaklı kemer
  c.fillStyle = '#ffd166';
  c.strokeStyle = '#080a1c';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(-16 + kalca * 0.6, -30);
  c.quadraticCurveTo(kalca * 0.6, -21, 16 + kalca * 0.6, -30);
  c.lineTo(17 + kalca * 0.6, -24);
  c.quadraticCurveTo(kalca * 0.6, -15, -17 + kalca * 0.6, -24);
  c.closePath();
  c.fill();
  c.stroke();
  for (let i = -3; i <= 3; i++) {
    c.fillStyle = i % 2 === 0 ? '#fff1a8' : '#ffd166';
    c.beginPath();
    c.arc(i * 4.5 + kalca * 0.6, -18 + (9 - i * i) * 0.35, 2, 0, TAU);
    c.fill();
  }

  // Baş, yüz, alınlık ve altın küpeler
  c.fillStyle = '#f5c99b';
  c.strokeStyle = '#080a1c';
  c.lineWidth = 1.5;
  c.beginPath();
  c.arc(0, -83, 13, 0, TAU);
  c.fill();
  c.stroke();
  // Ön saç kakülü
  c.fillStyle = '#2d182b';
  c.beginPath();
  c.arc(0, -88, 13.5, Math.PI * 0.95, Math.PI * 2.05);
  c.fill();
  // Altın alınlık / taç
  c.strokeStyle = '#ffd166';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(0, -85, 11.5, Math.PI * 1.18, Math.PI * 1.82);
  c.stroke();
  c.fillStyle = '#ff4f8b';
  c.beginPath();
  c.arc(0, -93, 2.6, 0, TAU);
  c.fill();
  // Gözler, kirpik, allık ve gülüş
  c.fillStyle = '#080a1c';
  for (const s of [-1, 1]) {
    c.beginPath();
    c.arc(s * 4.5, -83, 1.5, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(240,112,95,0.45)';
    c.beginPath();
    c.arc(s * 7.5, -79.5, 2.3, 0, TAU);
    c.fill();
    c.fillStyle = '#ffd166';
    c.beginPath();
    c.arc(s * 12.8, -80, 2.2, 0, TAU);
    c.fill();
    c.fillStyle = '#080a1c';
  }
  c.strokeStyle = '#7a1f2a';
  c.lineWidth = 1.6;
  c.beginPath();
  c.arc(0, -78.5, 3.8, 0.15, Math.PI - 0.15);
  c.stroke();

  // Çevrede dönen ışıklı yıldızcıklar
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU + (azHareket ? 0 : B * 1.1);
    const sx = Math.cos(a) * 56, sy = -30 + Math.sin(a) * 54;
    c.fillStyle = isikRenk[i % isikRenk.length];
    c.beginPath();
    c.arc(sx, sy, 2.6, 0, TAU);
    c.fill();
  }
  c.restore();
}

function kemenceCiz() {
  const salin = Math.sin(TAU * B / 2) * 0.12;
  c.save();
  c.translate(0, -12);
  c.fillStyle = 'rgba(47,196,178,0.2)';
  c.beginPath();
  c.arc(0, -28, 62 + Math.abs(salin) * 20, 0, TAU);
  c.fill();
  c.save();
  c.rotate(salin);
  c.fillStyle = '#a66a3f';
  c.strokeStyle = '#f0d2a4';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(-8, -103);
  c.lineTo(8, -103);
  c.lineTo(9, -42);
  c.bezierCurveTo(30, -27, 35, -4, 22, 16);
  c.quadraticCurveTo(0, 31, -22, 16);
  c.bezierCurveTo(-35, -4, -30, -27, -9, -42);
  c.closePath();
  c.fill();
  c.stroke();
  c.strokeStyle = '#f5e6ca';
  c.lineWidth = 1.4;
  for (let i = -4; i <= 4; i += 4) {
    c.beginPath();
    c.moveTo(i, -97);
    c.lineTo(i, 17);
    c.stroke();
  }
  c.strokeStyle = '#2c2f3a';
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(-36, -99 + salin * 45);
  c.lineTo(34, 17 - salin * 45);
  c.stroke();
  c.restore();
  c.fillStyle = '#d8efc2';
  c.font = '700 15px Rubik, system-ui, sans-serif';
  c.fillText('KEMENÇE', 0, 43);
  for (let i = 0; i < 3; i++) {
    const yuk = (B * 0.3 + i / 3) % 1;
    c.globalAlpha = 1 - yuk;
    c.fillStyle = i % 2 ? '#d8efc2' : '#ffd166';
    c.font = '20px Rubik, system-ui, sans-serif';
    c.fillText('♪', Math.sin(TAU * yuk + i) * 70, -75 - yuk * 40);
  }
  c.globalAlpha = 1;
  c.restore();
}

function hediyeDurakCiz() {
  const x = 495, y = 385, w = 212, h = 262;
  const satirlar = KADEME.slice().reverse();
  const etkiAdlari = { korna: 'KORNA', renk: 'RENK', karadeniz: 'KEMENÇE', ankara: 'PAVYON', fren: 'MÜSAİT YER', kaset: 'KASET', viraj: 'SERT VİRAJ', ucus: 'DOLMUŞ UÇAR' };
  const etkiRenkleri = { korna: '#ffd166', renk: '#ef8b4b', karadeniz: '#2fc4b2', ankara: '#ef8b4b', fren: '#2fc4b2', kaset: '#ef8b4b', viraj: '#a88bff', ucus: '#fff1a8' };
  c.save();
  c.fillStyle = 'rgba(25,31,45,0.94)';
  c.strokeStyle = '#ffd166';
  c.lineWidth = 2;
  c.beginPath();
  c.roundRect(x, y, w, h, 14);
  c.fill();
  c.stroke();
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.fillStyle = '#ffd166';
  c.font = '700 17px Rubik, system-ui, sans-serif';
  c.fillText('HEDİYE KADEMESİ', x + 12, y + 18);
  c.fillStyle = '#d7dbea';
  c.font = '500 12px Rubik, system-ui, sans-serif';
  c.fillText('Jeton toplamına göre etki', x + 12, y + 37);
  for (let i = 0; i < satirlar.length; i++) {
    const kademe = satirlar[i];
    const yy = y + 58 + i * 17;
    c.fillStyle = '#f2f3f8';
    c.font = '700 13px Rubik, system-ui, sans-serif';
    c.fillText(kademe.min + ' jeton', x + 12, yy);
    c.fillStyle = etkiRenkleri[kademe.tip] || '#f2f3f8';
    c.textAlign = 'right';
    c.fillText(etkiAdlari[kademe.tip] || kademe.ad.toLocaleUpperCase('tr-TR'), x + w - 12, yy);
    c.textAlign = 'left';
  }
  c.strokeStyle = 'rgba(255,255,255,0.24)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(x + 12, y + 194);
  c.lineTo(x + w - 12, y + 194);
  c.stroke();
  c.fillStyle = '#ffd166';
  c.font = '700 14px Rubik, system-ui, sans-serif';
  c.fillText('TOPLULUK HEDEFİ', x + 12, y + 203);
  c.fillStyle = '#fff';
  c.textAlign = 'center';
  c.font = '700 12px Rubik, system-ui, sans-serif';
  c.fillText(DOLMUS_DURAKLAR[(D.durak + 1) % DOLMUS_DURAKLAR.length], x + w / 2, y + 217, w - 24);
  c.textAlign = 'left';
  c.fillStyle = 'rgba(255,255,255,0.2)';
  c.beginPath();
  c.roundRect(x + 12, y + 228, w - 24, 9, 5);
  c.fill();
  const doluluk = clamp(D.durakJeton / DURAK_HEDEF, 0, 1);
  if (doluluk > 0) {
    c.fillStyle = '#2fc4b2';
    c.beginPath();
    c.roundRect(x + 12, y + 228, (w - 24) * doluluk, 9, 5);
    c.fill();
  }
  c.fillStyle = '#d7dbea';
  c.font = '500 11px Rubik, system-ui, sans-serif';
  c.fillText(D.durakJeton + ' / ' + DURAK_HEDEF + ' jeton · yeni durak aç', x + 12, y + 247);
  c.restore();
}
