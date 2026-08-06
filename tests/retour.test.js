/* AUCUNE PAGE SANS RETOUR — SANS EXCEPTION.
   Consigne explicite. Ce test n'accepte aucune liste d'exemptions : il
   énumère toutes les pages de l'application, les ouvre une par une, et
   exige de chacune un retour visible, cliquable, dans le premier écran.
   L'accueil est le seul point d'arrivée : il n'a rien à quitter. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test retour ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html');

let echecs = 0;
const ok = (c, m, d) => { if (c) console.log('  ok    ' + m); else { echecs++; console.log('  ECHEC ' + m + (d !== undefined ? ' — ' + d : '')); } };

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e)));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    sessionStorage.setItem('jte_ok', '1'); sessionStorage.setItem('jte_admin', '1');
    document.getElementById('pg-inscription').style.display = 'none';
    document.getElementById('pg-app').style.display = 'block';
    document.getElementById('accueil-screen').style.display = 'none';
    if (typeof applyClientSector === 'function') applyClientSector();
    goPage('home');
  });
  await page.waitForTimeout(300);

  const pages = await page.evaluate(() =>
    [...document.querySelectorAll('#pg-app .page')].map(e => e.id.slice(3)));
  console.log('\n— ' + pages.length + ' pages à vérifier —');

  const sans = [];
  for (const p of pages) {
    if (p === 'home') continue;                 // l'accueil EST le retour
    await page.evaluate(id => { goPage(id); window.scrollTo(0, 0); }, p);
    await page.waitForTimeout(160);
    const r = await page.evaluate(id => {
      const pg = document.getElementById('pg-' + id);
      if (!pg) return { err: 'page absente' };
      const cands = [...pg.querySelectorAll('button,a,[onclick]')];
      for (const e of cands) {
        const on = (e.getAttribute && e.getAttribute('onclick')) || '';
        const txt = (e.textContent || '').trim();
        if (!/goPage\(|accueilShow|history\.back|jxRetour/.test(on)) continue;
        if (!/←|↑|retour|accueil|precedent|précédent|CSE/i.test(txt)) continue;
        const b = e.getBoundingClientRect();
        if (b.height > 0 && b.width > 0 && b.top < 420) {
          return { ok: true, txt: txt.slice(0, 24), haut: Math.round(b.top),
                   h: Math.round(b.height), filet: e.classList.contains('jx-retour-filet') };
        }
      }
      return { ok: false };
    }, p);
    if (!r.ok) { sans.push(p); console.log('    ECHEC  ' + p + ' — aucun retour visible'); }
    else console.log('    ' + (r.filet ? '(filet) ' : '        ') + p.padEnd(14) +
                     ' « ' + r.txt + ' »  haut ' + r.haut + 'px, ' + r.h + 'px de haut');
  }
  ok(sans.length === 0, 'chaque page offre un retour visible dans son premier écran',
     sans.join(', '));

  // La cible doit être assez grande pour le pouce.
  console.log('\n— La taille des cibles —');
  const petites = [];
  for (const p of pages) {
    if (p === 'home') continue;
    await page.evaluate(id => goPage(id), p);
    await page.waitForTimeout(120);
    const h = await page.evaluate(id => {
      const pg = document.getElementById('pg-' + id);
      const cands = [...pg.querySelectorAll('button,a,[onclick]')];
      for (const e of cands) {
        const on = (e.getAttribute && e.getAttribute('onclick')) || '';
        const txt = (e.textContent || '').trim();
        if (!/goPage\(|accueilShow|history\.back|jxRetour/.test(on)) continue;
        if (!/←|↑|retour|accueil|CSE/i.test(txt)) continue;
        const b = e.getBoundingClientRect();
        if (b.height > 0 && b.top < 420) return Math.round(b.height);
      }
      return 0;
    }, p);
    if (h < 36) petites.push(p + ' (' + h + 'px)');
  }
  ok(petites.length === 0, 'et cette cible fait au moins 36 px de haut', petites.join(', '));

  // ── Le filet attrape une page ajoutée sans retour ────────────────
  console.log('\n— Le filet —');
  const filet = await page.evaluate(() => {
    const n = document.createElement('div');
    n.id = 'pg-essaisansretour'; n.className = 'page';
    n.innerHTML = '<div style="padding:20px">Une page ajoutée sans bouton de retour.</div>';
    document.getElementById('pg-app').appendChild(n);
    goPage('essaisansretour');
    return null;
  });
  await page.waitForTimeout(300);
  const rattrape = await page.evaluate(() => {
    const pg = document.getElementById('pg-essaisansretour');
    const b = pg.querySelector('.jx-retour-filet');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { txt: b.textContent, visible: r.height > 0, premier: pg.firstChild === b };
  });
  ok(rattrape !== null, 'une page ajoutée sans retour en reçoit un automatiquement');
  ok(rattrape && rattrape.visible && rattrape.premier,
     'posé en tête de page, et visible', JSON.stringify(rattrape));
  await page.evaluate(() => { goPage('home'); document.getElementById('pg-essaisansretour').remove(); });

  console.log('\nExceptions : ' + erreurs.length);
  erreurs.slice(0, 4).forEach(e => console.log('   ! ' + e.slice(0, 180)));
  ok(erreurs.length === 0, 'aucune exception JavaScript');

  await nav.close();
  console.log('\n' + (echecs ? echecs + ' ECHEC(S)' : 'tout est vert'));
  process.exit(echecs ? 1 : 0);
})();
