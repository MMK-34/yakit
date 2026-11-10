'use strict';
// Besin değerleri yaklaşık ortalamalardır. [ad, porsiyon, kcal, protein, karbonhidrat, yağ, kategori]
const FOODS = [
  ['Tavuk göğsü ızgara', '150 g', 250, 46, 0, 5.5, 'Protein'],
  ['Tavuk but ızgara', '150 g', 290, 36, 0, 16, 'Protein'],
  ['Izgara köfte', '4 adet · 120 g', 300, 24, 6, 20, 'Protein'],
  ['Dana biftek', '150 g', 330, 38, 0, 19, 'Protein'],
  ['Yağsız kıyma', '100 g pişmiş', 215, 26, 0, 12, 'Protein'],
  ['Somon ızgara', '150 g', 310, 31, 0, 20, 'Protein'],
  ['Levrek / çipura ızgara', '1 porsiyon · 200 g', 250, 40, 0, 9, 'Protein'],
  ['Ton balığı', '1 kutu, süzülmüş', 150, 22, 0, 7, 'Protein'],
  ['Hindi füme', '50 g', 55, 10, 1, 1, 'Protein'],
  ['Yumurta', '1 adet', 75, 6.5, 0.5, 5, 'Protein'],
  ['Yumurta akı', '1 adet', 17, 3.6, 0.2, 0, 'Protein'],
  ['Omlet', '3 yumurta, az yağ', 270, 20, 2, 20, 'Protein'],
  ['Menemen', '2 yumurtalı', 280, 15, 10, 20, 'Protein'],
  ['Whey protein', '1 ölçek · 30 g', 120, 24, 2.5, 1.5, 'Protein'],
  ['Protein bar', '1 adet', 200, 20, 18, 7, 'Protein'],

  ['Lor peyniri', '100 g', 90, 13, 3, 3, 'Süt ürünü'],
  ['Beyaz peynir', '30 g', 80, 5, 1, 6.5, 'Süt ürünü'],
  ['Kaşar peyniri', '30 g', 105, 7.5, 0.5, 8, 'Süt ürünü'],
  ['Yoğurt', '200 g, yarım yağlı', 110, 8, 10, 4, 'Süt ürünü'],
  ['Süzme yoğurt', '150 g', 140, 13, 6, 7, 'Süt ürünü'],
  ['Proteinli yoğurt / skyr', '150 g', 100, 15, 6, 0.5, 'Süt ürünü'],
  ['Ayran', '1 bardak', 75, 4, 5, 4, 'Süt ürünü'],
  ['Süt', '200 ml, yarım yağlı', 95, 6.5, 9.5, 3.5, 'Süt ürünü'],
  ['Kefir', '200 ml', 110, 6.5, 8, 5.5, 'Süt ürünü'],

  ['Pirinç pilavı', '150 g', 260, 4, 45, 7, 'Karbonhidrat'],
  ['Bulgur pilavı', '150 g', 210, 5.5, 38, 4.5, 'Karbonhidrat'],
  ['Makarna', '200 g pişmiş, sade', 280, 10, 56, 2, 'Karbonhidrat'],
  ['Haşlanmış patates', '200 g', 170, 4, 38, 0.2, 'Karbonhidrat'],
  ['Tatlı patates', '200 g', 180, 3.5, 41, 0.3, 'Karbonhidrat'],
  ['Yulaf', '50 g', 190, 6.5, 33, 3.5, 'Karbonhidrat'],
  ['Tam buğday ekmek', '1 dilim', 70, 3, 12, 1, 'Karbonhidrat'],
  ['Beyaz ekmek', '1 dilim', 75, 2.5, 14.5, 0.8, 'Karbonhidrat'],
  ['Lavaş', '1 adet', 180, 5, 34, 3, 'Karbonhidrat'],
  ['Simit', '1 adet', 320, 10, 58, 6, 'Karbonhidrat'],
  ['Pirinç patlağı', '2 adet', 70, 1.5, 15, 0.5, 'Karbonhidrat'],
  ['Bal', '1 tatlı kaşığı', 30, 0, 8, 0, 'Karbonhidrat'],

  ['Kuru fasulye', '1 porsiyon', 300, 15, 35, 10, 'Ev yemeği'],
  ['Nohut yemeği', '1 porsiyon', 300, 13, 35, 11, 'Ev yemeği'],
  ['Mercimek çorbası', '1 kase', 160, 8, 22, 4.5, 'Ev yemeği'],
  ['Zeytinyağlı sebze yemeği', '1 porsiyon', 180, 3, 15, 12, 'Ev yemeği'],
  ['Kıymalı sebze yemeği', '1 porsiyon', 280, 18, 18, 16, 'Ev yemeği'],
  ['Tavuk sote', '1 porsiyon', 320, 35, 10, 15, 'Ev yemeği'],
  ['Izgara tavuklu salata', '1 büyük kase', 350, 40, 12, 15, 'Ev yemeği'],
  ['Cacık', '1 kase', 90, 5, 6, 5, 'Ev yemeği'],
  ['Salata, yağsız', '1 büyük kase', 50, 2, 9, 0.5, 'Ev yemeği'],

  ['Muz', '1 orta', 105, 1.3, 27, 0.4, 'Meyve'],
  ['Elma', '1 orta', 80, 0.4, 21, 0.3, 'Meyve'],
  ['Portakal', '1 orta', 65, 1.2, 16, 0.2, 'Meyve'],
  ['Çilek', '150 g', 50, 1, 11, 0.5, 'Meyve'],
  ['Hurma', '2 adet', 46, 0.4, 12, 0, 'Meyve'],

  ['Zeytinyağı', '1 yemek kaşığı', 90, 0, 0, 10, 'Yağ / kuruyemiş'],
  ['Zeytin', '5 adet', 35, 0.3, 1, 3.5, 'Yağ / kuruyemiş'],
  ['Fıstık ezmesi', '1 yemek kaşığı · 16 g', 95, 4, 3, 8, 'Yağ / kuruyemiş'],
  ['Badem', '20 g', 120, 4.3, 4, 10.5, 'Yağ / kuruyemiş'],
  ['Ceviz', '3 tam · 20 g', 130, 3, 2.7, 13, 'Yağ / kuruyemiş'],
  ['Fındık', '20 g', 126, 3, 3.4, 12, 'Yağ / kuruyemiş'],

  ['Probis', '1 adet · ~28 g', 135, 1.8, 19, 5.7, 'Atıştırmalık'],
  ['Petibör bisküvi', '3 adet', 80, 1.3, 13.5, 2.4, 'Atıştırmalık'],
  ['Bitter çikolata', '2 kare · 20 g', 115, 1.6, 9, 8.5, 'Atıştırmalık'],
  ['Sütlü çikolata', '30 g', 160, 2.3, 17.5, 9, 'Atıştırmalık'],
  ['Dondurma', '1 top', 110, 2, 13, 5.5, 'Atıştırmalık'],
  ['Baklava', '2 dilim', 330, 5, 38, 18, 'Atıştırmalık'],
  ['Sütlaç', '1 kase', 250, 7, 42, 6, 'Atıştırmalık'],

  ['Tavuk döner dürüm', '1 adet', 550, 32, 55, 21, 'Dışarıda'],
  ['Lahmacun', '1 adet', 270, 11, 35, 9.5, 'Dışarıda'],
  ['Kıymalı pide', '1 porsiyon', 650, 28, 80, 23, 'Dışarıda'],
  ['Hamburger', '1 adet', 550, 27, 42, 30, 'Dışarıda'],
  ['Pizza', '2 dilim', 560, 24, 66, 22, 'Dışarıda'],
  ['Kaşarlı tost', '1 adet', 330, 14, 34, 15, 'Dışarıda'],

  ['Latte', '1 orta boy', 150, 8, 12, 8, 'İçecek'],
  ['Sade kahve / çay', '1 fincan', 3, 0, 0, 0, 'İçecek'],
  ['Kola', '330 ml', 140, 0, 35, 0, 'İçecek'],
  ['Taze portakal suyu', '200 ml', 90, 1.4, 21, 0.4, 'İçecek']
].map(a => ({ n: a[0], por: a[1], k: a[2], p: a[3], c: a[4], f: a[5], cat: a[6] }));

// Örnek öğünler. items: [ad, miktar, birim] — miktar hedefe göre ölçeklenir.
const MEALS = {
  kahvalti: [
    { n: 'Yumurtalı klasik kahvaltı', k: 485, p: 35, c: 35, f: 22, items: [['Yumurta', 3, 'adet'], ['Lor peyniri', 60, 'g'], ['Tam buğday ekmek', 2, 'dilim'], ['Zeytin', 5, 'adet'], ['Domates, salatalık']] },
    { n: 'Proteinli yulaf', k: 608, p: 42, c: 81, f: 14.5, items: [['Yulaf', 60, 'g'], ['Whey protein', 1, 'ölçek'], ['Süt', 200, 'ml'], ['Muz', 1, 'adet'], ['Fıstık ezmesi', 10, 'g']] },
    { n: 'Menemen tabağı', k: 575, p: 34, c: 37, f: 35, items: [['Menemen (yumurta)', 3, 'adet'], ['Beyaz peynir', 40, 'g'], ['Tam buğday ekmek', 2, 'dilim']] },
    { n: 'Süzme yoğurt kasesi', k: 560, p: 30, c: 57, f: 24.5, items: [['Süzme yoğurt', 250, 'g'], ['Yulaf', 40, 'g'], ['Çilek', 150, 'g'], ['Ceviz', 15, 'g'], ['Bal', 1, 'tatlı kaşığı']] }
  ],
  ogle: [
    { n: 'Tavuk + pilav + salata', k: 705, p: 62, c: 63, f: 20.5, items: [['Tavuk göğsü ızgara', 180, 'g'], ['Pirinç pilavı', 180, 'g'], ['Büyük salata'], ['Zeytinyağı', 1, 'tatlı kaşığı']] },
    { n: 'Köfte + bulgur + cacık', k: 725, p: 42.5, c: 60, f: 35, items: [['Izgara köfte', 150, 'g'], ['Bulgur pilavı', 150, 'g'], ['Cacık', 1, 'kase'], ['Salata']] },
    { n: 'Somon + patates', k: 605, p: 39, c: 60, f: 23, items: [['Somon ızgara', 150, 'g'], ['Haşlanmış patates', 250, 'g'], ['Izgara sebze']] },
    { n: 'Kuru fasulye menüsü', k: 720, p: 35, c: 90, f: 23, items: [['Etli kuru fasulye', 1, 'porsiyon'], ['Pirinç pilavı', 120, 'g'], ['Yoğurt', 200, 'g'], ['Salata']] },
    { n: 'Ton balıklı makarna salatası', k: 535, p: 34, c: 66, f: 15, items: [['Ton balığı', 1, 'kutu'], ['Makarna (pişmiş)', 200, 'g'], ['Mısır, yeşillik'], ['Zeytinyağı', 1, 'tatlı kaşığı']] }
  ],
  ara: [
    { n: 'Muz + whey', k: 225, p: 25, c: 29.5, f: 2, items: [['Muz', 1, 'adet'], ['Whey protein', 1, 'ölçek']] },
    { n: 'Proteinli yoğurt + badem', k: 220, p: 19, c: 10, f: 11, items: [['Proteinli yoğurt', 150, 'g'], ['Badem', 20, 'g']] },
    { n: 'Pirinç patlağı + fıstık ezmesi + muz', k: 265, p: 6.5, c: 45, f: 8.5, items: [['Pirinç patlağı', 2, 'adet'], ['Fıstık ezmesi', 15, 'g'], ['Muz', 1, 'adet']] },
    { n: 'Lor + elma', k: 215, p: 20, c: 25.5, f: 4.8, items: [['Lor peyniri', 150, 'g'], ['Elma', 1, 'adet']] },
    { n: 'Ayran + yarım tost', k: 240, p: 11, c: 22, f: 11.5, items: [['Ayran', 1, 'bardak'], ['Kaşarlı tost', 0.5, 'adet']] }
  ],
  aksam: [
    { n: 'Izgara tavuk + bulgur + sebze', k: 675, p: 66.5, c: 47, f: 22, items: [['Tavuk göğsü ızgara', 180, 'g'], ['Bulgur pilavı', 120, 'g'], ['Zeytinyağlı sebze', 1, 'porsiyon'], ['Yoğurt', 100, 'g']] },
    { n: 'Biftek + tatlı patates', k: 605, p: 43.5, c: 50, f: 24.8, items: [['Dana biftek', 150, 'g'], ['Tatlı patates', 200, 'g'], ['Salata + zeytinyağı']] },
    { n: 'Levrek + salata + ekmek', k: 485, p: 48, c: 33, f: 16.5, items: [['Levrek ızgara', 200, 'g'], ['Büyük salata + zeytinyağı'], ['Tam buğday ekmek', 2, 'dilim']] },
    { n: 'Kıymalı sebze + pilav + yoğurt', k: 565, p: 29, c: 58, f: 25, items: [['Kıymalı sebze yemeği', 1, 'porsiyon'], ['Pirinç pilavı', 100, 'g'], ['Yoğurt', 200, 'g']] },
    { n: 'Ev yapımı tavuk dürüm', k: 490, p: 55, c: 41, f: 10, items: [['Lavaş', 1, 'adet'], ['Tavuk göğsü ızgara', 150, 'g'], ['Yoğurt sos, yeşillik']] }
  ]
};
