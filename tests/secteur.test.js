/* Changer de secteur, depuis n'importe quelle page.
   Demande : « je dois pouvoir a chaque niveau changer de secteur pour faire
   mes tests ». Et l'inverse doit rester vrai : un compte client verrouille
   par son code ne doit pas pouvoir en changer. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test secteur ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let e = 0; const ok = (c, m, d) => { console.log((c ? '  ok    ' : '  ECHEC ') + m + (c ? '' : ' — ' + d)); if (!c) e++; };
(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await (await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  const err = []; page.on('pageerror', x => err.push(String(x)));
  await page.goto('file://' + require('path').resolve(__dirname, '..', 'index.html'), { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    sessionStorage.setItem('jte_ok','1'); sessionStorage.setItem('jte_admin','1');
    document.getElementById('pg-inscription').style.display='none';
    document.getElementById('pg-app').style.display='block';
    document.getElementById('accueil-screen').style.display='none';
    goPage('home'); famRender(); secChipMaj();
  });
  await page.waitForTimeout(300);

  console.log('\n— Compte administrateur —');
  ok(await page.evaluate(() => getComputedStyle(document.getElementById('sec-chip')).display !== 'none'),
     'le bouton de secteur est visible dans la barre du haut');
  await page.evaluate(() => secOuvrir()); await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.getElementById('sec-ov').style.display === 'block'), 'la liste s’ouvre');
  const n = await page.evaluate(() => document.querySelectorAll('#sec-ov-liste button').length);
  ok(n >= 9, 'huit secteurs plus « aucun »', n);
  await page.evaluate(() => secChoisir('banque')); await page.waitForTimeout(300);
  /* Le bouton est devenu une icone : ecrit en toutes lettres a cote du titre
     de l'application, il ne lui laissait que 82 px et le cassait sur trois
     lignes. Le nom du secteur est desormais dans l'infobulle du bouton, dans
     le menu, et surtout sous le titre — trois endroits, tous lisibles. */
  ok((await page.evaluate(() => document.getElementById('sec-chip').title)).indexOf('Banque') >= 0,
     'choisir Banque met à jour le bouton',
     await page.evaluate(() => document.getElementById('sec-chip').title));
  ok((await page.evaluate(() => document.getElementById('mi-secteur').textContent)).indexOf('Banque') >= 0,
     'et l’entrée de menu « Changer de secteur »',
     await page.evaluate(() => document.getElementById('mi-secteur').textContent));
  ok((await page.evaluate(() => document.getElementById('top-nom').textContent)).indexOf('2120') >= 0,
     'et l’en-tête passe à IDCC 2120',
     await page.evaluate(() => document.getElementById('top-nom').textContent));

  /* Depuis une autre page que l'accueil. Les pages de module ont leur propre
     barre de titre : l'en-tete global n'y est plus affiche (deux barres
     empilees mangeaient un tiers de l'ecran). Le chemin, la, c'est le menu —
     present dans chaque barre de page. */
  await page.evaluate(() => goPage('socle')); await page.waitForTimeout(300);
  ok(await page.evaluate(() => {
    const m = document.getElementById('mi-secteur');
    return !!m && m.closest('.mi') && getComputedStyle(m.closest('.mi')).display !== 'none';
  }), 'depuis la page Socle, le menu propose toujours de changer de secteur');
  ok(await page.evaluate(() => !!document.querySelector('#pg-socle .topbar button[onclick*="openMenu"]')),
     'et cette page a bien son bouton de menu');
  await page.evaluate(() => { secOuvrir(); secChoisir('syntec'); }); await page.waitForTimeout(300);
  ok((await page.evaluate(() => document.getElementById('sec-chip').title)).indexOf('Syntec') >= 0,
     'et on change de secteur depuis cette page',
     await page.evaluate(() => document.getElementById('sec-chip').title));

  console.log('\n— Compte client verrouillé par son code —');
  await page.evaluate(() => { sessionStorage.removeItem('jte_admin'); sessionStorage.setItem('jte_sector','formation'); goPage('home'); secChipMaj(); });
  await page.waitForTimeout(200);
  const chip = await page.evaluate(() => document.getElementById('sec-chip').textContent);
  ok(chip.indexOf('🔒') >= 0, 'le cadenas apparaît', chip);
  await page.evaluate(() => secOuvrir()); await page.waitForTimeout(200);
  ok(await page.evaluate(() => [...document.querySelectorAll('#sec-ov-liste button')].every(b => b.disabled)),
     'aucun secteur n’est cliquable : le verrou reste un verrou');
  await page.evaluate(() => secChoisir('banque')); await page.waitForTimeout(200);
  ok(await page.evaluate(() => (sessionStorage.getItem('jte_sector') === 'formation')),
     'et forcer le changement ne fait rien');
  await page.evaluate(() => secFermer()); await page.waitForTimeout(150);
  ok(await page.evaluate(() => document.body.style.overflow === ''), 'la fermeture rend le défilement');

  console.log('\nexceptions : ' + err.length);
  err.slice(0,3).forEach(x => console.log('   ! ' + x.slice(0,180)));
  ok(err.length === 0, 'aucune exception');
  await nav.close();
  console.log('\n' + (e ? e + ' ECHEC(S)' : 'tout est vert'));
  process.exit(e ? 1 : 0);
})();
