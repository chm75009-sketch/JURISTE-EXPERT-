/* QUI EST ELU — QUOTIENT ELECTORAL ET PLUS FORTE MOYENNE.

   « quotient electoral » et « plus forte moyenne » : zero occurrence dans
   toute l'application. Le proces-verbal du premier tour portait une colonne
   « Sieges attribues » laissee vide, sans methode. C'est pourtant
   l'operation qui decide qui est elu, et le premier terrain de la
   contestation.

   R.2314-19 a R.2314-22 :
   - quotient electoral = suffrages valablement exprimes / sieges a pourvoir
     dans le COLLEGE ;
   - chaque liste obtient autant de sieges que sa MOYENNE contient de fois
     le quotient ;
   - les sieges restants vont a la plus forte moyenne, un par un, la moyenne
     etant divisee par le nombre de sieges deja obtenus plus un ;
   - la moyenne d'une liste est la somme des voix de ses candidats divisee
     par le nombre de candidats QU'ELLE PRESENTE : une liste incomplete a
     donc une moyenne plus haute, et les ratures jouent. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test sieges ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html');

let echecs = 0;
const ok = (c, m, d) => { if (c) console.log('  ok    ' + m); else { echecs++; console.log('  ECHEC ' + m + (d !== undefined ? ' — ' + d : '')); } };

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e)));
  page.on('dialog', d => d.dismiss());
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    sessionStorage.setItem('jte_ok', '1'); sessionStorage.setItem('jte_admin', '1');
    document.getElementById('pg-inscription').style.display = 'none';
    document.getElementById('pg-app').style.display = 'block';
    document.getElementById('accueil-screen').style.display = 'none';
    const m = document.getElementById('admin-sec-modal'); if (m) m.style.display = 'none';
    goPage('home');
  });
  await p(page, 1000);

  const calc = (L, n, e) => page.evaluate(([l, s, x]) => {
    const r = cseAttribuer(l, s, x);
    return { ok: r.ok, motif: r.motif, quotient: r.quotient, alerte: r.alerte,
             res: (r.listes || []).map(y => y.nom + ':' + y.sieges).join(' '),
             total: (r.listes || []).reduce((a, y) => a + y.sieges, 0) };
  }, [L, n, e]);

  /* Le cas d'ecole. 4 sieges, 100 suffrages : quotient 25.
     A 240 voix / 4 candidats = 60 → 2 sieges ; B 120/4 = 30 → 1 ; C 40/4 = 10 → 0.
     Un siege reste : A 60/3 = 20 ; B 30/2 = 15 ; C 10/1 = 10 → A. */
  console.log('\n— Le cas d’école —');
  let r = await calc([{ nom: 'A', voix: 240, cand: 4 }, { nom: 'B', voix: 120, cand: 4 }, { nom: 'C', voix: 40, cand: 4 }], 4, 100);
  ok(r.quotient === 25, 'le quotient électoral vaut 100 ÷ 4 = 25', r.quotient);
  ok(r.res === 'A:3 B:1 C:0', 'A obtient 3 sièges, B 1, C aucun', r.res);

  /* Une liste incomplete a une moyenne plus haute : c'est la regle, pas un
     defaut. B ne presente que deux candidats pour 60 voix : moyenne 30,
     superieure a celle de A (100/4 = 25). */
  console.log('\n— Une liste incomplète —');
  r = await calc([{ nom: 'A', voix: 100, cand: 4 }, { nom: 'B', voix: 60, cand: 2 }], 3, 80);
  ok(r.res === 'A:1 B:2', 'la liste incomplète, à moyenne plus élevée, prend deux sièges sur trois', r.res);

  /* Egalite parfaite : R.2314-22 donne le siege au candidat le plus age.
     L'application ne doit pas trancher en silence. */
  console.log('\n— Égalité parfaite entre deux listes —');
  r = await calc([{ nom: 'A', voix: 100, cand: 2 }, { nom: 'B', voix: 100, cand: 2 }], 3, 100);
  ok(!!r.alerte, 'l’égalité est signalée au lieu d’être tranchée en silence');
  ok(/plus âgé/.test(r.alerte || ''), 'et la règle du candidat le plus âgé est rappelée (R.2314-22)', r.alerte);

  /* Sans le nombre de candidats, la moyenne est fausse : on refuse. */
  console.log('\n— Ce qui manque est dit —');
  r = await calc([{ nom: 'A', voix: 100, cand: 0 }], 2, 100);
  ok(r.ok === false, 'sans le nombre de candidats présentés, aucun siège n’est attribué');
  ok(/nombre de candidats/.test(r.motif || ''), 'et l’écran dit pourquoi', r.motif);

  /* Invariant : le total attribue egale toujours le nombre de sieges. */
  console.log('\n— L’invariant —');
  const inv = await page.evaluate(() => {
    const jeux = [
      [{ nom: 'A', voix: 37, cand: 3 }, { nom: 'B', voix: 11, cand: 2 }],
      [{ nom: 'A', voix: 1, cand: 1 }, { nom: 'B', voix: 1, cand: 1 }, { nom: 'C', voix: 1, cand: 1 }],
      [{ nom: 'A', voix: 999, cand: 9 }],
      [{ nom: 'A', voix: 500, cand: 10 }, { nom: 'B', voix: 3, cand: 1 }]
    ];
    const rates = [];
    for (let n = 1; n <= 20; n++) for (const j of jeux) {
      const r = cseAttribuer(JSON.parse(JSON.stringify(j)), n, 400);
      const t = r.listes.reduce((a, x) => a + x.sieges, 0);
      if (t !== n) rates.push(n + '→' + t);
    }
    return rates;
  });
  ok(inv.length === 0, '80 combinaisons : le total attribué égale toujours les sièges à pourvoir', inv.slice(0, 5).join(' '));

  /* L'écran. */
  console.log('\n— L’écran —');
  const ecran = await page.evaluate(() => {
    goPage('cse');
    localStorage.setItem(jxCle('cse_listes_v1'), JSON.stringify([
      { nom: 'CGT', voix: '240', cand: '4' }, { nom: 'CFDT', voix: '120', cand: '4' }]));
    const sp = document.getElementById('cse-sieges-pourvoir'); if (sp) sp.value = '4';
    const ex = document.getElementById('cse-exprimes'); if (ex) ex.value = '100';
    csesRender();
    const z = document.getElementById('cse-sieges-result');
    return z ? z.textContent.replace(/\s+/g, ' ') : null;
  });
  ok(ecran && /Quotient électoral/.test(ecran), 'le quotient est affiché');
  ok(ecran && /R\.2314-19/.test(ecran), 'avec les articles qui le fondent');
  ok(ecran && /collège par collège|collège/.test(ecran), 'et le rappel que le calcul se fait collège par collège');
  ok(ecran && !/undefined|NaN/.test(ecran), 'aucun « undefined » ni « NaN » à l’écran');

  console.log('\nExceptions : ' + erreurs.length);
  ok(erreurs.length === 0, 'aucune exception JavaScript', erreurs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(echecs ? ('\n' + echecs + ' ECHEC(S)') : '\ntout est vert');
  process.exit(echecs ? 1 : 0);
})();

function p(page, ms) { return page.waitForTimeout(ms); }
