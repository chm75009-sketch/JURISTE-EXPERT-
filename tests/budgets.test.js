/* Les budgets du CSE, éprouvés sur des chiffres réels.
   Ce module calcule de l'argent dû : un taux appliqué au mauvais palier ou
   un plafond de transfert mal arrondi se traduit en euros réclamés à tort,
   ou jamais réclamés. Chaque assertion porte donc sur un montant. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test des budgets ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html');

let echecs = 0;
const ok = (c, m, d) => { if (c) console.log('  ok    ' + m); else { echecs++; console.log('  ECHEC ' + m + (d !== undefined ? ' — ' + d : '')); } };
const proche = (a, b) => a !== null && a !== undefined && Math.abs(a - b) < 0.005;

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await (await nav.newContext()).newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e)));
  page.on('dialog', d => d.accept());
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  // ── Le taux, palier par palier (L.2315-61) ───────────────────────
  console.log('\n— Le taux légal —');
  const T = await page.evaluate(() => ({
    a49: budTaux(49), a50: budTaux(50), a1999: budTaux(1999),
    a2000: budTaux(2000), a2001: budTaux(2001), nul: budTaux(null)
  }));
  ok(T.a49.taux === null && T.a49.code === 'aucun', '49 salariés : pas de budget légal', JSON.stringify(T.a49.taux));
  ok(T.a50.taux === 0.20, '50 salariés : 0,20 %', T.a50.taux);
  ok(T.a1999.taux === 0.20, '1 999 salariés : encore 0,20 %', T.a1999.taux);
  ok(T.a2000.taux === 0.22, '2 000 salariés : 0,22 % — le seuil est atteint, pas dépassé', T.a2000.taux);
  ok(T.a2001.taux === 0.22, '2 001 salariés : 0,22 %', T.a2001.taux);
  ok(T.nul === null, 'effectif inconnu : aucun taux inventé');

  // ── Le calcul d'un exercice ──────────────────────────────────────
  console.log('\n— Un exercice de 3 000 000 € de masse salariale —');
  const C = await page.evaluate(() => {
    const e = { an: 2025, masse: '3000000', fonctVerse: '5000', ascVerse: '30000',
                excFonct: '1200', excAsc: '4000', transFonctAsc: '', transAscFonct: '' };
    const prec = { an: 2024, masse: '2800000', ascVerse: '30800' };   // 1,100 %
    return { c: budCalcul(e, 150, prec), sansPrec: budCalcul(e, 150, null) };
  });
  ok(proche(C.c.du, 6000), 'dû de fonctionnement : 0,20 % de 3 000 000 = 6 000 €', C.c.du);
  ok(proche(C.c.ecart, -1000), 'écart : il manque 1 000 €', C.c.ecart);
  ok(proche(C.c.ratio, 1.0), 'part des activités sociales 2025 : 1,000 %', C.c.ratio);
  ok(proche(C.c.ratioPrec, 1.1), 'part 2024 : 1,100 %', C.c.ratioPrec);
  ok(proche(C.c.ascMini, 33000), 'au taux de 2024, il faudrait 33 000 €', C.c.ascMini);
  ok(C.c.ecartAsc < 0, 'la baisse de la part est détectée', C.c.ecartAsc);
  ok(proche(C.c.plafondFA, 120), 'plafond de transfert vers les ASC : 10 % de 1 200 = 120 €', C.c.plafondFA);
  ok(proche(C.c.plafondAF, 400), 'plafond de transfert vers le fonctionnement : 400 €', C.c.plafondAF);
  ok(C.sansPrec.ratioPrec === undefined, 'sans exercice précédent, aucun cliquet n’est supposé');

  // ── Le régime comptable ──────────────────────────────────────────
  console.log('\n— Le régime comptable —');
  const R = await page.evaluate(() => ({
    petit: budRegimeCompta(153000, 150, null),
    justeAu: budRegimeCompta(153001, 150, null),
    grand: budRegimeCompta(3200000, 150, 1600000),
    grand2: budRegimeCompta(3200000, 150, null),
    moyen: budRegimeCompta(500000, 150, null),
    inconnu: budRegimeCompta(null, 150, null)
  }));
  ok(R.petit.code === 'ultra', '153 000 € : comptabilité ultra-simplifiée (seuil inclus)', R.petit.code);
  ok(R.justeAu.code !== 'ultra', '153 001 € : on change de régime', R.justeAu.code);
  ok(R.moyen.code === 'moyen' && R.moyen.art === 'L.2315-67', 'entre les deux : expert-comptable', R.moyen.art);
  ok(R.grand.code === 'grand' && R.grand.art === 'L.2315-73', '3 seuils dépassés : commissaire aux comptes', R.grand.code);
  ok(R.grand2.code === 'grand', '2 seuils sur 3 suffisent (salariés + ressources)', R.grand2.code);
  ok(R.inconnu === null, 'ressources inconnues : aucun régime affirmé');

  // ── L'analyse dit ce qu'il faut faire ────────────────────────────
  console.log('\n— L’analyse —');
  const A = await page.evaluate(() => {
    // L'effectif vient des exercices saisis a la main : le registre est vide ici.
    localStorage.setItem('cse_diag_v1::' + rxAccountId(), JSON.stringify({
      exercices: [{ cloture: '2025-12-31', ent: '150', fr: '150', monde: '150' }]
    }));
    localStorage.setItem('cse_budgets_v1::' + rxAccountId(), JSON.stringify({
      compta: 'tresorier',
      exos: [
        { an: 2025, masse: '3000000', fonctVerse: '5000', ascVerse: '30000', ressources: '600000' },
        { an: 2024, masse: '2800000', fonctVerse: '5600', ascVerse: '30800' }
      ]
    }));
    const r = budAnalyse();
    return { titres: r.alertes.map(a => a.gravite + ' | ' + a.titre), textes: r.alertes.map(a => a.texte) };
  });
  A.titres.forEach(t => console.log('    ' + t));
  const tous = A.titres.join(' | ');
  ok(/stop \| Subvention de fonctionnement incomplète/.test(tous), 'le manque de subvention est signalé comme bloquant');
  // Les montants sont mis en forme par le navigateur : l'espace des milliers
  // est une espace fine insecable, pas une espace ordinaire.
  const tout = (A.titres.join(' ') + ' ' + A.textes.join(' ')).replace(/\s/g, ' ');
  ok(/il manque 1 000,00 /.test(tout), 'et le montant manquant est chiffré au centime');
  ok(/6 000,00 /.test(tout) && /5 000,00 /.test(tout), 'le dû et le versé sont rappelés');
  ok(/33 000,00 /.test(tout), 'le montant qu’exigerait le taux de l’an dernier est donné');
  ok(/stop \| Activités sociales : la part a baissé/.test(tous), 'la baisse de la part ASC est signalée');
  ok(/stop \| Un expert-comptable est requis/.test(tous), '600 000 € de ressources avec le trésorier seul : signalé');

  // ── Le module ne parle pas de budget en dessous de 50 ────────────
  console.log('\n— Une entreprise de 30 salariés —');
  const P = await page.evaluate(() => {
    const t = budTaux(30);
    return { code: t.code, lib: t.lib };
  });
  ok(P.code === 'aucun', 'aucun budget légal annoncé en dessous de cinquante', P.code);

  // ── La page s'ouvre ──────────────────────────────────────────────
  console.log('\n— La page —');
  const av = erreurs.length;
  await page.evaluate(() => { goPage('csebud'); budOnEnter(); });
  await page.waitForTimeout(400);
  ok(erreurs.length === av, 'la page s’ouvre sans exception', erreurs.slice(av).join(' | '));
  const txt = await page.evaluate(() => (document.getElementById('csebud-body') || {}).textContent || '');
  ok(txt.length > 400, 'la page affiche le module', 'longueur ' + txt.length);
  ok(/L\.2315-61/.test(txt), 'l’article du budget de fonctionnement est cité');
  ok(/L\.2312-81/.test(txt), 'l’article des activités sociales est cité');
  ok(!/undefined|NaN/.test(txt), 'aucun « undefined » ni « NaN » à l’écran');

  // ── Le module global le reprend ──────────────────────────────────
  const H = await page.evaluate(() => {
    const a = (typeof hubAlertes === 'function') ? hubAlertes() : [];
    return a.filter(x => x.mod && x.mod.k === 'budgets').map(x => x.gravite + ' | ' + x.titre);
  });
  ok(H.length > 0, 'les alertes des budgets remontent dans le module global', H.length);

  await nav.close();
  console.log('\n' + (echecs ? echecs + ' ECHEC(S)' : 'tout est vert'));
  process.exit(echecs ? 1 : 0);
})();
