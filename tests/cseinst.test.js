/* INSTALLER LE COMITE : le parcours suit la taille, et rien n'est affirme
   sans texte. Aucun « trente jours » invente ; la documentation de
   L.2312-57 date le calendrier ; sous cinquante salaries ni secretaire,
   ni tresorier, ni reglement du comite ne sont reclames ; la carence
   arrete le module. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test cseinst ignore.'); process.exit(0); }
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
    appSetSecteur('banque');
    window.E = window.E || {}; E.effectif = '200'; E.nom = 'BANQUE ESSAI';
    try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    goPage('cseinst');
  });
  await page.waitForTimeout(800);

  console.log('\n— A 200-249 salaries, le parcours complet —');
  let t = await page.evaluate(() => document.getElementById('cseinst-zone').innerText);
  ok(t.indexOf('trente jours') >= 0 && t.indexOf('Aucun texte n’impose') >= 0, 'le faux delai de trente jours est demonte, pas repris');
  await page.selectOption('#ci-issue', 'elus'); await page.waitForTimeout(500);
  await page.evaluate(() => { const i = document.getElementById('ci-date'); i.value = '2026-08-01'; i.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(600);
  t = await page.evaluate(() => document.getElementById('cseinst-zone').innerText);
  ok(t.indexOf('01/09/2026') >= 0, 'la documentation L.2312-57 est datee un mois apres la proclamation');
  ok(t.indexOf('secrétaire') >= 0 && t.indexOf('trésorier') >= 0, 'secretaire et tresorier a l\'ordre du jour (L.2315-23)');
  ok(t.indexOf('référent harcèlement sexuel') >= 0, 'le referent harcelement sexuel est designe (L.2314-1)');
  ok(t.indexOf('règlement intérieur du comité') >= 0, 'le reglement interieur du comite est au parcours (L.2315-24)');
  ok(t.indexOf('une par mois') < 0 && t.indexOf('tous les deux mois') >= 0, 'a 200-249 : reunions tous les deux mois (moins de 300 — L.2315-28)') ;

  console.log('\n— A 2 000 : mensuelle et CSSCT —');
  await page.evaluate(() => { E.effectif = '2000'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {} cseinstRender(); });
  await page.waitForTimeout(500);
  t = await page.evaluate(() => document.getElementById('cseinst-zone').innerText);
  ok(t.indexOf('une par mois') >= 0, 'reunion au moins mensuelle a 300 et plus');
  ok(t.indexOf('CSSCT') >= 0, 'la CSSCT est au parcours (L.2315-36)');

  console.log('\n— A 30 salaries : le parcours se reduit —');
  await page.evaluate(() => { E.effectif = '20'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {} cseinstRender(); });
  await page.waitForTimeout(500);
  t = await page.evaluate(() => document.getElementById('cseinst-zone').innerText);
  ok(t.indexOf('au moins une fois par mois (L.2315-21)') >= 0, 'la reception mensuelle remplace les reunions de la section 3');
  ok(t.indexOf('ni secrétaire, ni trésorier') >= 0, 'secretaire et tresorier ne sont pas reclames sous cinquante');
  ok(t.indexOf('référent harcèlement sexuel') >= 0, 'le referent reste du, a toute taille de comite');

  console.log('\n— La carence arrete le module —');
  await page.selectOption('#ci-issue', 'carence'); await page.waitForTimeout(500);
  t = await page.evaluate(() => document.getElementById('cseinst-zone').innerText);
  ok(t.indexOf('Pas de comité à installer') >= 0, 'carence : pas d\'installation, renvoi au PV');

  console.log('\n— Les modeles portent la reserve —');
  await page.selectOption('#ci-issue', 'elus'); await page.waitForTimeout(400);
  await page.evaluate(() => { window.partagerDocActuel = function () {}; });
  for (const m of ['convocation', 'odj', 'documentation', 'pvbureau', 'ricse']) {
    const r = await page.evaluate(k => { cseinstDoc(k); const d = window._docCurrent; return { t: d.titre, res: d.html.indexOf('À VÉRIFIER ET COMPLÉTER PAR VOTRE ACCORD D’ENTREPRISE') >= 0, ent: d.html.indexOf('BANQUE ESSAI') >= 0 }; }, m);
    ok(r.res && r.ent, 'modele « ' + r.t.slice(0, 46) + ' »');
  }

  ok(err.length === 0, 'aucune exception JavaScript', err.join(' | '));
  await nav.close();
  console.log(e ? '\n' + e + ' echec(s)' : '\ntout est vert');
  process.exit(e ? 1 : 0);
})();
