/* TOUS LES SEUILS D'EFFECTIF, ET L'APPLICATION QUI S'Y ADAPTE.
   La liste proposee a la creation du dossier s'arretait a « 250 salaries et
   plus ». Au-dessus, le droit du travail continue de compter : 300, 500,
   750, 1 000, 2 000, 5 000, et le bareme du nombre d'elus va jusqu'a 10 000.
   Demande : proposer tous les effectifs prevus par la loi, puis faire
   correspondre les modules a la taille de l'entreprise, « pour etre juste
   et ne pas encombrer les structures a effectif reduit ».
   Ce test garde les deux : le tableau des seuils, et le tri qui en decoule. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test seuils ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html');

let echecs = 0;
const ok = (c, m, d) => { if (c) console.log('  ok    ' + m); else { echecs++; console.log('  ECHEC ' + m + (d !== undefined ? ' — ' + d : '')); } };

/* Chaque seuil, et l'article qui doit etre cite en regard. Verifie a la
   source. Un seuil qui disparaitrait du tableau ferait tomber ce test. */
const ATTENDUS = [
  [1,     /R\.4121-1/,       'document unique'],
  [1,     /L\.1221-13/,      'registre unique du personnel'],
  [1,     /L\.911-7/,        'complémentaire santé'],
  [11,    /L\.2311-2/,       'mise en place du CSE'],
  [11,    /L\.2333-64/,      'versement mobilité'],
  [11,    /L\.6331-1/,       'formation professionnelle portée à 1 %'],
  [11,    /2023-1107/,       'partage de la valeur'],
  [20,    /L\.5212-1/,       'obligation d’emploi des travailleurs handicapés'],
  [50,    /L\.2312-17/,      'consultations récurrentes'],
  [50,    /L\.2315-61/,      'budget de fonctionnement 0,20 %'],
  [50,    /L\.1311-2/,       'règlement intérieur'],
  [50,    /L\.3322-2/,       'participation'],
  [50,    /L\.1142-8/,       'index de l’égalité'],
  [50,    /L\.2143-3/,       'délégué syndical'],
  [50,    /L\.1233-61/,      'plan de sauvegarde de l’emploi'],
  [50,    /R\.4228-22/,      'local de restauration'],
  [50,    /L\.834-1/,        'FNAL porté à 0,50 %'],
  [50,    /L\.313-1/,        'effort de construction — 1 % logement'],
  [200,   /L\.2142-8/,       'local syndical commun'],
  [200,   /R\.4623-32/,      'infirmier en établissement industriel'],
  [250,   /L\.1153-5-1/,     'référent harcèlement sexuel côté employeur'],
  [250,   /L\.5213-6-1/,     'référent handicap'],
  [250,   /1609 quinvicies/, 'contribution supplémentaire à l’apprentissage'],
  [300,   /L\.2315-36/,      'commission santé-sécurité'],

  [300,   /L\.2312-28/,      'bilan social'],
  [300,   /L\.2242-2/,       'négociation GEPP'],
  [500,   /2016-1691/,       'dispositif anticorruption'],
  [750,   /600 fois/,        'contribution handicap majorée'],
  [1000,  /L\.2315-46/,      'commission économique — mille salariés, pas trois cents'],
  [1000,  /L\.1233-71/,      'congé de reclassement'],
  [1000,  /L\.1233-84/,      'contribution à la revitalisation'],
  [1000,  /L\.225-27-1/,     'administrateurs salariés'],
  [1000,  /L\.2341-1/,       'comité d’entreprise européen'],
  [1000,  /L\.1142-11/,      'écarts de représentation'],
  [2000,  /L\.2315-61/,      'subvention portée à 0,22 %'],
  [5000,  /L\.225-102-4/,    'plan de vigilance'],
  [5000,  /L\.225-27-1/,     'second administrateur salarié'],
  [10000, /R\.2314-1/,       'dernière tranche du barème']
];

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e)));
  page.on('dialog', d => d.dismiss());
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  // ══ 1. LE TABLEAU DES SEUILS ════════════════════════════════════
  console.log('\n— Les seuils déclarés —');
  const seuils = await page.evaluate(() =>
    JX_SEUILS.map(x => ({ n: x.n, lib: x.lib, regle: x.regle || '',
                          txt: x.o.map(p => p[0] + ' | ' + p[1]).join(' ~~ ') })));
  console.log('    ' + seuils.map(s => s.n).join(' · '));
  ok(seuils.length >= 13, 'le tableau va bien au-delà de 250', seuils.length + ' seuils');
  ok(seuils[seuils.length - 1].n === 10000,
     'et monte jusqu’à 10 000 — dernière tranche du barème R.2314-1',
     seuils[seuils.length - 1].n);

  const manquants = [];
  ATTENDUS.forEach(([n, re, quoi]) => {
    const s = seuils.filter(x => x.n === n)[0];
    if (!s || !re.test(s.txt)) manquants.push(n + ' : ' + quoi);
  });
  ok(manquants.length === 0, 'chaque obligation figure au bon seuil, avec son article',
     manquants.join(' · '));
  console.log('    ' + ATTENDUS.length + ' obligations contrôlées, article par article');

  /* Les bornes sont ordonnees et sans doublon : c'est ce qui garantit que
     les tranches se suivent sans trou ni chevauchement. */
  const bornes = seuils.map(s => s.n);
  ok(bornes.every((n, i) => i === 0 || n > bornes[i - 1]),
     'les seuils sont strictement croissants', bornes.join(', '));

  /* Les deux regles de franchissement ne doivent pas etre confondues, et
     elles se portent OBLIGATION PAR OBLIGATION, non seuil par seuil : au
     meme seuil de 50, le reglement interieur suit les douze mois (L.1311-2
     renvoie a L.2312-2) tandis que la participation suit les cinq annees
     civiles. Le tableau qui m'a ete soumis les regroupait par seuil. */
  console.log('\n— La règle de franchissement, obligation par obligation —');
  const regles = await page.evaluate(() => {
    const m = {};
    JX_SEUILS.forEach(x => x.o.forEach(p => { m[p[1] + ' | ' + p[0].slice(0, 40)] = p[2] || ''; }));
    return m;
  });
  const REGLE = [
    ['L.2311-2',  '12 mois', 'la mise en place du comité'],
    ['L.1311-2',  '12 mois', 'le règlement intérieur — L.1311-2 renvoie à L.2312-2'],
    ['L.2312-17', '12 mois', 'les attributions élargies du comité'],
    ['L.3322-2',  '5 ans',   'la participation aux résultats'],
    ['L.5212-1',  '5 ans',   'l’obligation d’emploi des travailleurs handicapés'],
    ['L.834-1',   '5 ans',   'le FNAL'],
    ['L.313-1',   '5 ans',   'l’effort de construction']
  ];
  const faux = [];
  REGLE.forEach(([art, att, quoi]) => {
    const k = Object.keys(regles).filter(x => x.split(' | ')[0].indexOf(art) >= 0)[0];
    if (!k || regles[k] !== att) faux.push(quoi + ' → ' + (k ? regles[k] || '(aucune)' : 'article absent'));
  });
  ok(faux.length === 0, 'chaque obligation porte sa propre règle de franchissement',
     faux.join(' · '));
  REGLE.forEach(([, att, quoi]) => console.log('    ' + att.padEnd(8) + ' ' + quoi));

  /* Ce qui n'est pas en vigueur n'est pas presente comme une obligation. */
  const avenir = await page.evaluate(() => JX_SEUILS_AVENIR.map(x => x.lib + ' | ' + x.o.map(p => p[0]).join(' ')));
  ok(avenir.some(t => /100/.test(t) && /2023\/970/.test(t) && /transposition/.test(t)),
     'le seuil de 100 est annoncé comme à venir, non comme en vigueur', avenir.join(' | '));
  ok(!seuils.some(s => s.n === 100), 'et il ne figure pas parmi les seuils applicables');

  // ══ 2. LES TRANCHES PROPOSEES ═══════════════════════════════════
  console.log('\n— Les tranches proposées —');
  const tr = await page.evaluate(() => ({
    calc: jxTranches().map(t => ({ v: t.v, min: t.min, max: t.max, lib: t.lib })),
    fiche: [...document.getElementById('ins-effectif').options].map(o => o.value)
  }));
  tr.calc.forEach(t => console.log('    ' + t.lib));
  ok(tr.calc.length === seuils.length, 'une tranche par seuil, pas une de plus', tr.calc.length);
  ok(tr.calc.every((t, i) => i === 0 || t.min === tr.calc[i - 1].max + 1),
     'les tranches se suivent sans trou ni chevauchement');
  ok(tr.calc[tr.calc.length - 1].max === null, 'la dernière est ouverte vers le haut');
  ok(tr.fiche.filter(v => v).length === tr.calc.length,
     'et la fiche d’entreprise propose exactement les mêmes', tr.fiche.length);
  ok(!tr.calc.some(t => /^250 salariés et plus/.test(t.lib)),
     '« 250 et plus » a disparu : ce n’était pas le dernier palier');

  // ══ 3. LES MODULES SUIVENT LA TAILLE ════════════════════════════
  console.log('\n— Les modules suivent la taille —');
  await page.evaluate(() => {
    sessionStorage.setItem('jte_ok', '1'); sessionStorage.setItem('jte_admin', '1');
    document.getElementById('pg-inscription').style.display = 'none';
    document.getElementById('pg-app').style.display = 'block';
    document.getElementById('accueil-screen').style.display = 'none';
    goPage('home'); famOuvrir('cse');
  });

  const parTaille = (v) => page.evaluate(t => {
    E.effectif = t; famRender();
    return {
      max: jxEffectifMax(),
      vues: [...document.querySelectorAll('#fam-zone .fam-carte .ct2')].map(e => e.textContent),
      hors: [...document.querySelectorAll('#fam-zone .fam-hors-l .hl')].map(e => e.textContent),
      seuilsAffiches: [...document.querySelectorAll('#fam-zone .fam-hors-l .hs')].map(e => e.textContent)
    };
  }, v);

  const t1 = await parTaille('1');
  console.log('    1 à 10 salariés → ' + t1.hors.length + ' modules mis de côté');
  ok(t1.max === 10, 'la tranche « 1 à 10 » plafonne à 10', t1.max);
  ok(t1.hors.indexOf('Organiser les élections') >= 0,
     'sous onze salariés, les élections sont mises de côté', t1.hors.join(', '));
  ok(t1.vues.indexOf('Mon effectif et mes seuils') >= 0,
     'mais « Mon effectif et mes seuils » reste — c’est lui qui répond à la question');
  ok(t1.vues.indexOf('Où en suis-je ?') >= 0, 'et le diagnostic aussi');
  ok(t1.seuilsAffiches.every(t => /à partir de \d+ salariés — [LR]\./.test(t)),
     'chaque module mis de côté affiche son seuil et son article',
     t1.seuilsAffiches.slice(0, 2).join(' | '));

  const t11 = await parTaille('11');
  console.log('    11 à 19 salariés → ' + t11.hors.length + ' modules mis de côté');
  ok(t11.hors.indexOf('Organiser les élections') < 0,
     'à onze salariés, les élections reviennent');
  ok(t11.hors.indexOf('Consultations récurrentes') >= 0 && t11.hors.indexOf('Budgets et comptes') >= 0,
     'mais les consultations et les budgets attendent cinquante', t11.hors.join(', '));

  const t50 = await parTaille('50');
  ok(t50.hors.length === 0, 'à cinquante salariés, plus rien n’est mis de côté', t50.hors.join(', '));

  const t0 = await parTaille('');
  ok(t0.max === null && t0.hors.length === 0,
     'effectif inconnu : rien n’est masqué — on ne suppose pas', JSON.stringify(t0.max));

  /* ── LA TRANCHE RENSEIGNEE A L'OUVERTURE EST RECONNUE ───────────
     Signale : « pourquoi il me dit effectif n'est pas reconnu alors que je
     l'ai renseigne a l'ouverture ? ». cseEffectifSource() ne lisait que le
     registre et l'exercice clos ; la tranche declaree a la creation du
     dossier etait ignoree, et l'accueil repondait « pas connu » a quelqu'un
     qui venait de la renseigner. */
  console.log('\n— La tranche renseignée à l’ouverture —');
  const decl = await page.evaluate(() => {
    RX.staff = []; rxSaveLocal();
    if (typeof CSED !== 'undefined') CSED.exercices = [];
    E.effectif = '50'; goPage('home'); famRender();
    const b = document.querySelector('#fam-zone .eff-bandeau');
    return { src: cseEffectifSource(), calc: cseEffectif(),
             txt: b ? b.textContent.replace(/\s+/g, ' ') : '',
             vide: b ? b.classList.contains('vide') : null };
  });
  ok(decl.src.src === 'tranche', 'la tranche déclarée est reconnue comme source', decl.src.src);
  ok(decl.vide === false && !/n’est pas connu/.test(decl.txt),
     'l’accueil ne répond plus « effectif pas connu » à qui vient de le renseigner',
     decl.txt.slice(0, 70));
  ok(/50 à 199/.test(decl.txt), 'il affiche la tranche', decl.txt.slice(0, 60));
  ok(/comité obligatoire/.test(decl.txt) && /règlement intérieur/.test(decl.txt),
     'et ce qu’elle déclenche à coup sûr', decl.txt.slice(0, 120));
  /* Mais une tranche n'est pas un chiffre : elle ne doit jamais servir de
     base a un calcul juridique. */
  ok(decl.calc === null,
     'elle ne devient pas pour autant un effectif calculé — aucun calcul ne s’appuie dessus',
     JSON.stringify(decl.calc));
  ok(/pas un chiffre/.test(decl.txt), 'et l’application le dit', decl.txt.slice(0, 200));

  const socleDecl = await page.evaluate(() => {
    goPage('socle'); if (typeof socOnEnter === 'function') socOnEnter();
    const t = document.getElementById('pg-socle').textContent;
    return { tranche: /50 à 199/.test(t), acoupsur: /à coup sûr/.test(t),
             marques: (t.match(/✓/g) || []).length };
  });
  ok(socleDecl.tranche && socleDecl.acoupsur,
     'le module Socle la reconnaît aussi, et marque ce qui est atteint à coup sûr');
  ok(socleDecl.marques === 4,
     'quatre seuils marqués pour une borne basse de 50 : 1, 11, 20 et 50',
     socleDecl.marques);
  await page.evaluate(() => { E.effectif = ''; famRender(); });

  /* Le registre prime sur la tranche declaree : l'effectif est calcule,
     jamais declare (L.1111-2, L.1111-3). */
  const calcule = await page.evaluate(() => {
    E.effectif = '5000';                       // declaration volontairement fausse
    RX.staff = ['a', 'b'].map(k =>
      ({ id: k, nom: k.toUpperCase(), entree: '2020-01-01',
         typeContrat: 'CDI', tempsTravail: 'Temps plein' }));
    rxSaveLocal();
    return { max: jxEffectifMax(), eff: cseEffectif() };
  });
  ok(calcule.max === calcule.eff && calcule.max < 50,
     'dès que le registre est tenu, c’est lui qui fait foi, pas la tranche déclarée',
     JSON.stringify(calcule));
  await page.evaluate(() => { RX.staff = []; rxSaveLocal(); E.effectif = ''; famRender(); });

  // ══ 4. LE MODULE « MON EFFECTIF ET MES SEUILS » ═════════════════
  console.log('\n— Le module Socle —');
  const socle = await page.evaluate(() => {
    goPage('socle');
    if (typeof socOnEnter === 'function') socOnEnter();
    const t = document.getElementById('pg-socle').textContent;
    return { t, n: JX_SEUILS.filter(x => t.indexOf(x.lib) >= 0).length, total: JX_SEUILS.length };
  });
  ok(socle.n === socle.total, 'il affiche tous les seuils, pas seulement 11 et 50',
     socle.n + '/' + socle.total);
  ok(/cinq années civiles/i.test(socle.t) && /douze mois consécutifs/i.test(socle.t),
     'et rappelle les deux règles de franchissement, distinctes');
  ok(/obligation par obligation/i.test(socle.t),
     'en précisant qu’elles se portent obligation par obligation, pas seuil par seuil');
  ok(/12 mois consécutifs/.test(socle.t) && /5 années civiles/.test(socle.t),
     'et chaque ligne affiche la sienne');
  ok(/L\.130-1/.test(socle.t), 'avec l’article qui porte celle des cinq années');

  console.log('\nExceptions : ' + erreurs.length);
  erreurs.slice(0, 4).forEach(e => console.log('   ! ' + e.slice(0, 200)));
  ok(erreurs.length === 0, 'aucune exception JavaScript');

  await nav.close();
  console.log('\n' + (echecs ? echecs + ' ECHEC(S)' : 'tout est vert'));
  process.exit(echecs ? 1 : 0);
})();
