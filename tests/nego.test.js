/* LE MODULE NEGOCIATIONS OBLIGATOIRES NE SUPPOSE RIEN.
   Sans delegue syndical : pas d'obligation, et il le dit. Accord de
   methode non verifie : regime indetermine, aucune date affirmee.
   Regime legal : echeance annuelle calculee, GEPP seulement quand la
   taille peut y conduire, penalite egalite signalee des 50 salaries,
   et chaque modele porte la reserve de l'accord d'entreprise. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test nego ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let e = 0; const ok = (c, m, d) => { console.log((c ? '  ok    ' : '  ECHEC ') + m + (c ? '' : ' — ' + (d||''))); if (!c) e++; };

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const err = []; page.on('pageerror', x => err.push(String(x)));
  await page.goto('file://' + require('path').resolve(__dirname, '..', 'index.html'), { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    sessionStorage.setItem('jte_ok', '1'); sessionStorage.setItem('jte_admin', '1');
    document.getElementById('pg-inscription').style.display = 'none';
    document.getElementById('pg-app').style.display = 'block';
    appSetSecteur('transport');
    window.E = window.E || {}; E.effectif = '50'; E.nom='SARL ESSAI';
    try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    goPage('nego');
  });
  await page.waitForTimeout(800);

  console.log('\n— Sans delegue syndical, pas d\'obligation —');
  await page.selectOption('#nego-ds', 'non'); await page.waitForTimeout(500);
  let t = await page.evaluate(() => document.getElementById('nego-zone').innerText);
  ok(t.indexOf('aucune négociation obligatoire') >= 0, 'le module le dit au lieu de derouler des echeances');

  console.log('\n— Accord de methode non verifie : regime indetermine —');
  await page.selectOption('#nego-ds', 'oui'); await page.waitForTimeout(400);
  await page.selectOption('#nego-meth', 'nsp'); await page.waitForTimeout(500);
  t = await page.evaluate(() => document.getElementById('nego-zone').innerText);
  ok(/Régime indéterminé/.test(t), 'aucune echeance affirmee tant que l\'accord n\'est pas verifie');
  ok(t.indexOf('Vos obligations') < 0, 'le tableau des obligations ne s\'affiche pas');

  console.log('\n— Regime legal : echeance annuelle et penalite egalite —');
  await page.selectOption('#nego-meth', 'absent'); await page.waitForTimeout(500);
  await page.evaluate(() => { const i = document.getElementById('nego-dRem'); i.value = '2025-11-15'; i.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(600);
  t = await page.evaluate(() => document.getElementById('nego-zone').innerText);
  ok(t.indexOf('15/11/2026') >= 0, 'la prochaine NAO remuneration est datee un an apres');
  ok(/pénalité \(L\.2242-8\)/.test(t), 'l\'egalite jamais engagee est signalee avec sa penalite');
  ok(t.indexOf('aucune décision unilatérale') >= 0, 'le verrou de L.2242-4 est affiche');
  ok(t.indexOf('GEPP — gestion des emplois') < 0, 'pas de GEPP a 199 salaries au plus');

  console.log('\n— A 2 000 salaries, la GEPP apparait —');
  await page.evaluate(() => { E.effectif = '2000'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {} negoRender(); });
  await page.waitForTimeout(500);
  const hasG = await page.evaluate(() => !!document.getElementById('nego-g300'));
  ok(hasG, 'la question des 300 salaries (entreprise ou groupe) est posee');
  await page.selectOption('#nego-g300', 'oui'); await page.waitForTimeout(500);
  t = await page.evaluate(() => document.getElementById('nego-zone').innerText);
  ok(t.indexOf('GEPP — gestion des emplois et des parcours professionnels') >= 0, 'la ligne GEPP triennale est la');

  console.log('\n— Les modeles portent la reserve et la fiche societe —');
  await page.evaluate(() => { window.partagerDocActuel = function () {}; });
  for (const m of ['invitation', 'odj', 'bordereau', 'accord1', 'accord2', 'accordg', 'pv', 'plan']) {
    const r = await page.evaluate(k => { negoDoc(k); const d = window._docCurrent; return { t: d.titre, res: d.html.indexOf('À VÉRIFIER ET COMPLÉTER PAR VOTRE ACCORD D’ENTREPRISE') >= 0, ent: d.html.indexOf('SARL ESSAI') >= 0 }; }, m);
    ok(r.res && r.ent, 'modele « ' + r.t.slice(0, 48) + ' » — reserve + fiche societe');
  }

  console.log('\n— Aucune exception —');
  ok(err.length === 0, 'aucune exception JavaScript', err.join(' | '));
  await nav.close();
  console.log(e ? '\n' + e + ' echec(s)' : '\ntout est vert');
  process.exit(e ? 1 : 0);
})();
