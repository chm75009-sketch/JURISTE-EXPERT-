/* Trois défauts signalés depuis un téléphone, le même jour :
   — le générateur de codes clients visible sur un compte client ;
   — l'effectif introuvable, alors qu'il commande tout ;
   — aucun moyen de revenir en arrière une fois la page déroulée.
   Ce test les garde tous les trois. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test garde ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html');

let echecs = 0;
const ok = (c, m, d) => { if (c) console.log('  ok    ' + m); else { echecs++; console.log('  ECHEC ' + m + (d !== undefined ? ' — ' + d : '')); } };

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e)));
  const dialogues = [];
  page.on('dialog', d => { dialogues.push(d.message()); d.dismiss(); });

  const ouvrir = (admin) => page.evaluate(a => {
    sessionStorage.setItem('jte_ok', '1');
    if (a) { sessionStorage.setItem('jte_admin', '1'); sessionStorage.removeItem('jte_sector'); }
    else { sessionStorage.removeItem('jte_admin'); sessionStorage.setItem('jte_sector', 'formation'); sessionStorage.setItem('jte_code', 'essai'); }
    document.getElementById('pg-inscription').style.display = 'none';
    document.getElementById('pg-app').style.display = 'block';
    document.getElementById('accueil-screen').style.display = 'none';
    if (typeof applyClientSector === 'function') applyClientSector();
    goPage('home');
    if (typeof famRender === 'function') famRender();
    if (typeof secChipMaj === 'function') secChipMaj();
  }, admin);

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  // ══ 1. Le générateur de codes ═══════════════════════════════════
  console.log('\n— Le générateur de codes clients —');
  await ouvrir(false);
  await page.waitForTimeout(400);
  const vu = id => page.evaluate(i => {
    const e = document.getElementById(i);
    return !!e && getComputedStyle(e).display !== 'none';
  }, id);
  ok(!(await vu('admin-secteur-wrap')),
     'sur un compte client, le générateur de codes est invisible');

  // Même si quelque chose le rend visible, les fonctions doivent refuser.
  await page.evaluate(() => {
    const e = document.getElementById('admin-secteur-wrap');
    if (e) e.style.display = 'block';
  });
  const av = dialogues.length;
  await page.evaluate(() => { try { cgGenerer(); } catch (e) {} });
  await page.waitForTimeout(200);
  ok(dialogues.length > av && /réservée à l’administrateur/.test(dialogues[dialogues.length - 1]),
     'et forcer la génération est refusé', dialogues.slice(av).join(' | '));
  ok(!(await vu('admin-secteur-wrap')),
     'le bloc est même refermé au passage');

  await page.evaluate(() => { try { cgRenderRegistre(); } catch (e) {} });
  await page.waitForTimeout(150);
  const reg = await page.evaluate(() => {
    const e = document.getElementById('cg-registre');
    return e ? e.textContent : '';
  });
  ok(reg.indexOf('TEC') < 0 && reg.length < 400,
     'le registre des autres clients n’est pas affiché', reg.slice(0, 80));

  // Le changement de page rejoue la garde.
  await page.evaluate(() => {
    const e = document.getElementById('admin-secteur-wrap');
    if (e) e.style.display = 'block';
    goPage('socle'); goPage('home');
  });
  await page.waitForTimeout(250);
  ok(!(await vu('admin-secteur-wrap')), 'changer de page referme ce qui est réservé');

  console.log('\n— Sur le compte administrateur —');
  await ouvrir(true);
  await page.waitForTimeout(400);
  ok(await vu('admin-secteur-wrap'), 'l’administrateur, lui, garde son générateur');

  // ══ 2. L'effectif ═══════════════════════════════════════════════
  console.log('\n— L’effectif —');
  await page.evaluate(() => {
    localStorage.removeItem('cse_diag_v1::' + jxCompte());
    if (typeof CSED !== 'undefined') CSED.exercices = [];
    if (typeof RX !== 'undefined') RX.staff = [];
    famRender();
  });
  await page.waitForTimeout(250);
  let band = await page.evaluate(() => {
    const b = document.querySelector('#fam-zone .eff-bandeau');
    return b ? { txt: b.textContent, vide: b.classList.contains('vide'),
                 rang: [...document.querySelectorAll('#fam-zone > *')].indexOf(b) } : null;
  });
  ok(band !== null, 'un bandeau d’effectif ouvre l’accueil');
  ok(band && band.rang === 0, 'et il est le tout premier élément, avant les familles', band && band.rang);
  ok(band && band.vide && /n’est pas connu/.test(band.txt),
     'sans donnée, il dit que l’effectif est inconnu — il n’invente pas zéro', band && band.txt.slice(0, 60));

  await page.evaluate(() => {
    localStorage.setItem('cse_diag_v1::' + jxCompte(), JSON.stringify({
      exercices: [{ cloture: '2025-12-31', ent: '150' }]
    }));
    if (typeof CSED !== 'undefined') CSED.exercices = [{ cloture: '2025-12-31', ent: '150' }];
    famRender();
  });
  await page.waitForTimeout(250);
  band = await page.evaluate(() => {
    const b = document.querySelector('#fam-zone .eff-bandeau');
    return b ? b.textContent : '';
  });
  console.log('    ' + band.replace(/\s+/g, ' ').trim().slice(0, 110));
  ok(/150/.test(band), 'avec 150 salariés, le chiffre s’affiche');
  ['comité obligatoire', 'règlement intérieur', 'budgets et consultations']
    .forEach(m => ok(band.indexOf(m) >= 0, 'et il dit ce que cela déclenche : « ' + m + ' »'));
  ok(band.indexOf('commissions') < 0, 'mais pas les commissions, qui viennent à trois cents');

  // ══ 3. Le retour en arrière ═════════════════════════════════════
  console.log('\n— Revenir en arrière —');
  await page.evaluate(() => { goPage('csefonc'); window.scrollTo(0, 900); });
  await page.waitForTimeout(700);
  const r1 = await page.evaluate(() => {
    const b = document.getElementById('jx-retour');
    const rect = b.getBoundingClientRect();
    return { visible: getComputedStyle(b).display !== 'none', txt: b.textContent,
             dansEcran: rect.top >= 0 && rect.bottom <= innerHeight + 1 };
  });
  ok(r1.visible, 'une fois la page déroulée, un bouton de retour apparaît');
  ok(r1.dansEcran, 'et il est bien dans l’écran');
  ok(/Haut de page/.test(r1.txt), 'il propose d’abord de remonter', r1.txt);

  await page.evaluate(() => jxRetour());
  await page.waitForTimeout(800);
  ok(await page.evaluate(() => (window.scrollY || 0) < 60), 'un appui remonte en haut de la page',
     await page.evaluate(() => window.scrollY));

  const r2 = await page.evaluate(() => document.getElementById('jx-retour').textContent);
  ok(/Accueil/.test(r2), 'puis il propose de revenir à l’accueil', r2);
  await page.evaluate(() => jxRetour());
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.getElementById('pg-home').classList.contains('act')),
     'et un second appui y ramène');

  ok(await page.evaluate(() => {
    const b = document.querySelector('.home-brand');
    return !!b && /pointer/.test(getComputedStyle(b).cursor);
  }), 'le nom de l’application ramène aussi à l’accueil');

  console.log('\nExceptions : ' + erreurs.length);
  erreurs.slice(0, 4).forEach(e => console.log('   ! ' + e.slice(0, 180)));
  ok(erreurs.length === 0, 'aucune exception JavaScript');

  await nav.close();
  console.log('\n' + (echecs ? echecs + ' ECHEC(S)' : 'tout est vert'));
  process.exit(echecs ? 1 : 0);
})();
