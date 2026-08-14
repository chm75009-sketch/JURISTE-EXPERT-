/* LA CONVENTION IDCC 16 PORTE TROIS GRILLES OUVRIERS, PAS UNE.
   Serie M — marchandises : accord du 11 octobre 2023, effet 01/12/2023.
   Serie V — voyageurs    : avenant n° 120 du 27 novembre 2025, effet 01/01/2026.
   Serie L — prestations logistiques : avenant n° 16 du 9 avril 2025 (etendu) ;
             l'avenant n° 17 du 12 mars 2026 n'est pas etendu, et l'application
             ne detient pas cette grille.
   Le simulateur travaille sur la seule serie M. Un employeur de transport de
   VOYAGEURS qui s'y fierait paierait sous son minimum conventionnel : la serie
   V est partout superieure, et elle reste au-dessus du SMIC la ou la serie M
   passe dessous. Ce test verifie que la grille V est affichee telle qu'elle
   figure au texte officiel, et que l'avertissement est bien la. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test idcc16 ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let e = 0; const ok = (c, m, d) => { console.log((c ? '  ok    ' : '  ECHEC ') + m + (c ? '' : ' — ' + d)); if (!c) e++; };

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await (await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  const err = []; page.on('pageerror', x => err.push(String(x)));
  await page.goto('file://' + require('path').resolve(__dirname, '..', 'index.html'), { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    sessionStorage.setItem('jte_ok', '1'); sessionStorage.setItem('jte_admin', '1');
    document.getElementById('pg-inscription').style.display = 'none';
    document.getElementById('pg-app').style.display = 'block';
    document.getElementById('accueil-screen').style.display = 'none';
    appSetSecteur('transport'); goPage('home');
  });
  await page.evaluate(() => goPage('remuneration'));
  await page.waitForTimeout(500);

  console.log('\n— La grille voyageurs est affichee —');
  /* toLocaleString('fr-FR') separe les milliers par une espace insecable
     etroite : on normalise avant de comparer. */
  const norm = x => x.replace(/[\u00a0\u202f\u2009]/g, ' ');
  const t = norm(await page.evaluate(() => (document.getElementById('ccn16-series') || {}).innerText || ''));
  ok(t.length > 200, 'le tableau de la serie V est rendu', String(t.length) + ' caracteres');

  /* Valeurs relevees sur le texte de l'avenant n° 120, KALITEXT000053914012. */
  [['110 V', '12,43'], ['138 V', '13,12'], ['150 V', '13,82'], ['155 V', '14,51']]
    .forEach(([c, taux]) => ok(t.indexOf(c) >= 0 && t.indexOf(taux) >= 0,
      'coefficient ' + c + ' au taux ' + taux + ' €'));
  ok(t.indexOf('2 261,76') >= 0, 'le SMPG du 110 V apres 30 ans figure au tableau');
  ok(t.indexOf('2 514,70') >= 0, 'le SMPG du 150 V apres 30 ans figure au tableau');
  ok(t.indexOf('Après 30 ans') >= 0, 'les huit echelons d’anciennete de la CCNA1 sont en colonnes');

  console.log('\n— Aucun coefficient V ne passe sous le SMIC —');
  const smic = await page.evaluate(() => (typeof SMIC_H !== 'undefined' ? SMIC_H : null));
  ok(smic !== null, 'le SMIC horaire est defini dans l’application', String(smic));
  const sous = await page.evaluate(() => CCN16_V_OUV.filter(r => r.t < SMIC_H).map(r => r.c));
  ok(sous.length === 0, 'la serie V est entierement au-dessus du SMIC', sous.join(', '));
  /* Et la serie M, elle, passe dessous : c'est tout l'objet de l'avertissement. */
  const sousM = await page.evaluate(() => Object.keys(MINIMA_RAW).filter(k => MINIMA_RAW[k] < SMIC_H));
  ok(sousM.length > 0, 'la serie M, elle, compte des coefficients sous le SMIC', sousM.join(', '));

  console.log('\n— L’avertissement nomme les trois series —');
  const pg = norm(await page.evaluate(() => document.getElementById('pg-remuneration').innerText));
  ['marchandises', 'voyageurs', 'prestations logistiques', 'avenant n° 120', '11 octobre 2023']
    .forEach(m => ok(pg.toLowerCase().indexOf(m.toLowerCase()) >= 0, 'la page dit « ' + m + ' »'));
  ok(pg.indexOf('n’est pas étendu') >= 0 || pg.indexOf("n'est pas étendu") >= 0,
     'l’avenant n° 17 est signale comme NON etendu');
  ok(/à vérifier/i.test(pg), 'la grille logistique manquante est marquee « a verifier »');

  console.log('\n— Aucune exception JavaScript —');
  ok(err.length === 0, 'aucune exception sur le parcours', err.join(' | '));

  await nav.close();
  console.log(e ? '\n' + e + ' echec(s)' : '\ntout est vert');
  process.exit(e ? 1 : 0);
})();
