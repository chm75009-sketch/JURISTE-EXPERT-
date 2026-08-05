/* L'accueil de l'application : quatre familles.
   « J'embauche · Je gère · Une mesure · Le CSE », présentées comme Nomos
   Traça. Ce test garde ce qui rend ces cartes utilisables : elles mènent
   quelque part, elles se distinguent, et elles se lisent. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test familles ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html');

let echecs = 0;
const ok = (c, m, d) => { if (c) console.log('  ok    ' + m); else { echecs++; console.log('  ECHEC ' + m + (d !== undefined ? ' — ' + d : '')); } };

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await (await nav.newContext({ viewport: { width: 390, height: 900 } })).newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e)));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    sessionStorage.setItem('jte_ok', '1'); sessionStorage.setItem('jte_admin', '1');
    document.getElementById('pg-inscription').style.display = 'none';
    document.getElementById('pg-app').style.display = 'block';
    document.getElementById('accueil-screen').style.display = 'none';
    goPage('home'); famRender();
  });
  await page.waitForTimeout(300);

  // ── Les quatre familles ──────────────────────────────────────────
  console.log('\n— Les quatre familles —');
  const fam = await page.evaluate(() => FAM.map(f => ({
    k: f.k, lib: f.lib,
    n: f.groupes.reduce((s, g) => s + g.cartes.length, 0),
    groupes: f.groupes.map(g => g.t)
  })));
  fam.forEach(f => console.log('    ' + f.lib + ' — ' + f.n + ' cartes : ' + f.groupes.join(' / ')));
  ok(fam.length === 4, 'il y a quatre familles', fam.length);
  ['J’embauche', 'Je gère', 'Une mesure', 'Le CSE']
    .forEach(l => ok(fam.some(f => f.lib === l), 'la famille « ' + l + ' » existe'));
  ok(fam.every(f => f.n >= 4), 'chaque famille propose au moins quatre cartes',
     fam.map(f => f.lib + ':' + f.n).join(' · '));
  ok(fam.every(f => f.groupes.length >= 2), 'chaque famille est découpée en sous-groupes',
     fam.map(f => f.lib + ':' + f.groupes.length).join(' · '));

  // ── Chaque carte mène à une page qui existe ──────────────────────
  console.log('\n— Les destinations —');
  const morts = await page.evaluate(() =>
    FAM.flatMap(f => f.groupes.flatMap(g => g.cartes))
       .map(c => c.page)
       .filter((p, i, a) => a.indexOf(p) === i)
       .filter(p => !document.getElementById('pg-' + p)));
  ok(morts.length === 0, 'aucune carte ne mène à une page absente', morts.join(', '));

  const cse = await page.evaluate(() => {
    const f = FAM.filter(x => x.k === 'cse')[0];
    return f.groupes.flatMap(g => g.cartes).map(c => c.page);
  });
  ['csehub', 'csediag', 'socle', 'cse', 'csedos', 'moncse', 'csecal', 'csereu', 'csercl', 'csecns', 'csebud']
    .forEach(p => ok(cse.indexOf(p) >= 0, 'le CSE reprend « ' + p +' »'));

  const mesures = await page.evaluate(() => {
    const f = FAM.filter(x => x.k === 'disc')[0];
    return f.groupes.flatMap(g => g.cartes).map(c => c.lib).join(' | ');
  });
  ['Avertissement', 'Mise à pied', 'motif personnel', 'économique', 'Inaptitude', 'conventionnelle']
    .forEach(m => ok(mesures.indexOf(m) >= 0, 'les mesures vont jusqu’à « ' + m + ' »'));

  // ── Ouvrir une famille ───────────────────────────────────────────
  console.log('\n— L’ouverture d’une famille —');
  await page.evaluate(() => famOuvrir('disc'));
  await page.waitForTimeout(250);
  const vis = await page.evaluate(() => ({
    cartes: document.querySelectorAll('#fam-zone .fam-carte').length,
    titres: document.querySelectorAll('#fam-zone .fam-titre').length,
    memoire: localStorage.getItem('accueil_famille_v1')
  }));
  ok(vis.cartes >= 10, 'les cartes de la famille s’affichent', vis.cartes);
  ok(vis.titres >= 3, 'avec leurs sous-titres de groupe', vis.titres);
  ok(vis.memoire === 'disc', 'le choix est retenu d’une visite à l’autre', vis.memoire);

  await page.evaluate(() => famOuvrir('disc'));
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.querySelectorAll('#fam-zone .fam-carte').length === 0),
     're-cliquer sur la même tuile referme la famille');

  // ── Des couleurs distinctes ──────────────────────────────────────
  console.log('\n— La lisibilité —');
  await page.evaluate(() => famOuvrir('cse'));
  await page.waitForTimeout(250);
  const couleurs = await page.evaluate(() =>
    [...document.querySelectorAll('#fam-zone .fam-carte')]
      .map(e => getComputedStyle(e).backgroundImage));
  ok(new Set(couleurs).size >= 6, 'les cartes ne sont pas toutes de la même couleur',
     new Set(couleurs).size + ' teintes pour ' + couleurs.length + ' cartes');

  const contraste = await page.evaluate(() => {
    const lum = c => {
      const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(Number).map(v => {
        v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    // Le fond des cartes est un dégradé : on prend la couleur la plus claire
    // des deux, c'est le pire cas pour du texte blanc.
    return [...document.querySelectorAll('#fam-zone .fam-carte')].map(e => {
      const g = getComputedStyle(e).backgroundImage.match(/rgb\([^)]+\)/g) || [];
      const lc = Math.max(...g.map(lum));
      const lt = lum(getComputedStyle(e.querySelector('.ct2')).color);
      const [h, l] = lt > lc ? [lt, lc] : [lc, lt];
      return { t: e.querySelector('.ct2').textContent.slice(0, 26), r: +((h + 0.05) / (l + 0.05)).toFixed(2) };
    });
  });
  const faibles = contraste.filter(c => c.r < 3);
  console.log('    contraste le plus faible : ' + Math.min(...contraste.map(c => c.r)).toFixed(2) + ':1');
  ok(faibles.length === 0, 'le titre de chaque carte se lit sur son fond',
     faibles.map(f => f.t + ' (' + f.r + ':1)').join(' · '));

  const taille = await page.evaluate(() =>
    [...document.querySelectorAll('#fam-zone .fam-carte')].map(e => {
      const r = e.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height));
    }));
  ok(taille.every(t => t >= 44), 'chaque carte est une cible tactile confortable',
     Math.min(...taille) + ' px');

  // ── Les anciennes rubriques ──────────────────────────────────────
  console.log('\n— Les anciennes rubriques —');
  const tous = await page.evaluate(() => {
    const d = document.getElementById('home-tous');
    return { existe: !!d, ouvert: d ? d.open : null,
             sections: d ? d.querySelectorAll('.home-sec').length : 0 };
  });
  ok(tous.existe, 'la liste complète est toujours là');
  ok(tous.ouvert === false, 'mais repliée : on ne la voit plus en premier');
  ok(tous.sections >= 6, 'et elle contient bien toutes les rubriques', tous.sections);

  console.log('\nExceptions : ' + erreurs.length);
  erreurs.slice(0, 4).forEach(e => console.log('   ! ' + e.slice(0, 200)));
  ok(erreurs.length === 0, 'aucune exception JavaScript');

  await nav.close();
  console.log('\n' + (echecs ? echecs + ' ECHEC(S)' : 'tout est vert'));
  process.exit(echecs ? 1 : 0);
})();
