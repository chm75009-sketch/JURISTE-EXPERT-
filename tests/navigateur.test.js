/* Test de fumée : on ouvre réellement la page dans un navigateur et on
   regarde ce qu'un client voit — d'abord sans secteur choisi (le cas de
   l'administrateur « tous secteurs »), puis après avoir choisi « Banque ».
   Toute erreur JavaScript est un échec. */
/* Playwright n'est pas une dependance du projet : si le poste ne l'a pas,
   on le dit et on s'arrete, sans faire echouer la serie de tests. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.log('Playwright absent — test navigateur ignore.');
  console.log('Pour l\'activer : npm i playwright  (le navigateur est deja installe)');
  process.exit(0);
}
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const path = 'file://' + require('path').resolve(__dirname, '..', 'index.html');

let echecs = 0;
function ok(cond, msg, detail) {
  if (cond) console.log('  ok   ' + msg);
  else { echecs++; console.log('  ECHEC ' + msg + (detail ? ' — ' + detail : '')); }
}

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await nav.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e)));
  /* Hors ligne, les appels au stockage en ligne echouent : c'est l'environnement
     de test, pas un defaut du code. On ne retient que les vraies exceptions. */
  const RESEAU = /ERR_|Failed to load resource|net::|NetworkError|Failed to fetch/i;
  page.on('console', m => { if (m.type() === 'error' && !RESEAU.test(m.text())) erreurs.push('console: ' + m.text()); });

  await page.goto(path, { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  console.log('\n— Aucun secteur choisi —');
  ok(erreurs.length === 0, 'aucune erreur JavaScript au chargement', erreurs.slice(0, 4).join(' | '));

  // On sort de l'écran d'inscription comme le ferait un visiteur pressé.
  await page.evaluate(() => { try { validerInscription(); } catch (e) { window.__err = String(e); } });
  await page.waitForTimeout(600);
  ok(!(await page.evaluate(() => window.__err)), 'validerInscription() sans secteur ne casse pas',
     await page.evaluate(() => window.__err));

  const entete = await page.evaluate(() => (document.getElementById('top-nom') || {}).textContent || '');
  console.log('     en-tête : ' + JSON.stringify(entete));
  ok(!/IDCC\s*0*16\b/.test(entete), 'l’en-tête n’invente pas la convention du transport');

  const secteur = await page.evaluate(() => appGetSecteur());
  ok(secteur === '', 'appGetSecteur() vaut "" tant que rien n’est choisi', JSON.stringify(secteur));

  const opt = await page.evaluate(() => {
    const s = document.getElementById('home-secteur');
    return s ? { v: s.value, prem: s.options[0].value, lab: s.options[0].textContent } : null;
  });
  ok(opt && opt.v === '' && opt.prem === '', 'le sélecteur d’accueil est sur l’option neutre', JSON.stringify(opt));

  // Le questionnaire de conformité ne doit pas parler de conducteurs.
  await page.evaluate(() => { goPage('audit'); auditRender(); });
  await page.waitForTimeout(300);
  const txtAudit = await page.evaluate(() => (document.getElementById('audit-list') || {}).textContent || '');
  ok(txtAudit.length > 200, 'le questionnaire de conformité s’affiche', 'longueur ' + txtAudit.length);

  console.log('\n— Secteur « Banque » —');
  await page.evaluate(() => { appSetSecteur('banque'); auditRender(); });
  await page.waitForTimeout(400);
  const entete2 = await page.evaluate(() => (document.getElementById('top-nom') || {}).textContent || '');
  console.log('     en-tête : ' + JSON.stringify(entete2));
  ok(/IDCC\s*2120/.test(entete2), 'l’en-tête affiche la convention de la banque');

  const txtBanque = await page.evaluate(() => (document.getElementById('audit-list') || {}).textContent || '');
  ok(!/carte de conducteur/i.test(txtBanque), 'plus de question « carte de conducteur » pour une banque');
  ok(!/tachygraphe/i.test(txtBanque), 'plus de question « tachygraphe » pour une banque');
  ok(!/casse-croûte/i.test(txtBanque), 'plus de question sur les frais du transport pour une banque');
  ok(/minima de la convention collective/i.test(txtBanque), 'la question sur les minima reste posée à tous');

  console.log('\n— Secteur « Transport » —');
  await page.evaluate(() => { appSetSecteur('transport'); auditRender(); });
  await page.waitForTimeout(400);
  const txtTr = await page.evaluate(() => (document.getElementById('audit-list') || {}).textContent || '');
  ok(/tachygraphe/i.test(txtTr), 'le transporteur retrouve ses questions tachygraphe');
  ok(/garantie annuelle de rémunération/i.test(txtTr), 'la GAR est posée au transporteur');
  const ent3 = await page.evaluate(() => (document.getElementById('top-nom') || {}).textContent || '');
  ok(/IDCC\s*0016/.test(ent3), 'l’en-tête affiche IDCC 0016 pour le transport', ent3);

  console.log('\n— Modules CSE —');
  for (const p of ['socle', 'csediag', 'moncse', 'csecal', 'csereu', 'csercl', 'csecns', 'csehub']) {
    const av = erreurs.length;
    await page.evaluate(id => goPage(id), p);
    await page.waitForTimeout(250);
    ok(erreurs.length === av, 'page ' + p + ' s’ouvre sans erreur', erreurs.slice(av).join(' | '));
  }

  console.log('\nErreurs JavaScript sur toute la session : ' + erreurs.length);
  erreurs.slice(0, 10).forEach(e => console.log('   ! ' + e.slice(0, 220)));

  await nav.close();
  console.log('\n' + (echecs ? echecs + ' ECHEC(S)' : 'tout est vert'));
  process.exit(echecs ? 1 : 0);
})();
