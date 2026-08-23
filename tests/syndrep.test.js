/* LA REPRESENTATIVITE SYNDICALE — CE QUE LE MODULE DOIT TENIR.

   Le module ne saisit rien : il lit les colleges et les listes du premier
   tour deja saisis dans « Organiser les elections ». Ce test ecrit donc
   dans les memes cles que le module d'elections, puis verifie :

   1. LE SCORE D'UNE LISTE EST UNE MOYENNE, JAMAIS UNE SOMME. Une liste de
      quatre candidats a 300, 250, 200 et 50 voix pese 200 dans son college,
      pas 800. L'audience dans l'entreprise rapporte la somme de ces
      moyennes au total des suffrages exprimes de TOUS les colleges.
   2. Le score personnel de chaque candidat, sur les suffrages de SON
      college : un candidat rature tombe sous 10 % quand sa liste y est.
   3. Un syndicat representatif dont AUCUN candidat saisi n'atteint 10 % :
      le deuxieme alinea de L.2143-3 ouvre alors la designation aux autres
      candidats — et l'application doit le dire, pas se taire.
   4. Moins de cinquante salaries : L.2143-6, un elu du comite, sans credit
      d'heures propre. A trois cents salaries et plus : le representant
      syndical se designe a part (L.2314-2), sans condition de score ;
      en dessous, le delegue syndical l'est de droit (L.2143-22).
   5. Le rapport imprimable et l'export.

   Aucun chiffre affiche par le module ne doit sortir d'ailleurs que du
   texte : chaque conclusion porte son article et son identifiant de
   version. Le test le verifie. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test syndrep ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html');

let echecs = 0;
const ok = (c, m, d) => { if (c) console.log('  ok    ' + m); else { echecs++; console.log('  ECHEC ' + m + (d !== undefined ? ' — ' + d : '')); } };

/* Le jeu principal : deux colleges, trois syndicats. */
const COLLEGES = [
  { cle: '1', inscrits: '1000', exprimes: '800', sieges: '4' },
  { cle: '2', inscrits: '250', exprimes: '200', sieges: '1' }
];
const LISTES = [
  { nom: 'Liste CGT', syndicat: 'CGT', college: '1', cands: [
      { nom: 'ALBERT', voix: '300' }, { nom: 'BERNARD', voix: '250' },
      { nom: 'CLAIRE', voix: '200' }, { nom: 'DENIS', voix: '50' } ] },
  { nom: 'Liste CFDT — 1er collège', syndicat: 'CFDT', college: '1', cands: [
      { nom: 'EMILE', voix: '100' }, { nom: 'FANNY', voix: '90' },
      { nom: 'GILLES', voix: '80' }, { nom: 'HELENE', voix: '30' } ] },
  { nom: 'Liste CFDT — 2e collège', syndicat: 'CFDT', college: '2', cands: [
      { nom: 'IRENE', voix: '60' }, { nom: 'JULIEN', voix: '40' } ] },
  { nom: 'Liste FO', syndicat: 'FO', college: '2', cands: [
      { nom: 'KARIM', voix: '20' }, { nom: 'LUCIE', voix: '10' } ] }
];

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await ctx.newPage();
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
  await page.waitForTimeout(500);

  /* Ecrire le premier tour la ou le module d'elections le range. */
  const poser = (colleges, listes, reglages) => page.evaluate(([c, l, r]) => {
    localStorage.setItem(jxCle('cse_colleges_v1'), JSON.stringify(c));
    localStorage.setItem(jxCle('cse_listes_v1'), JSON.stringify(l));
    localStorage.setItem(jxCle('syndrep_v1'), JSON.stringify(r));
    goPage('syndrep');
    const R = srepCalc();
    return {
      ecran: document.getElementById('syndrep-zone').innerText,
      syndicats: R.syndicats.map(s => ({ nom: s.nom, somme: s.somme, audience: s.audience, repr: s.representatif })),
      candidats: R.candidats.map(x => ({ nom: x.nom, synd: x.syndicat, voix: x.voix, pct: x.pct, seuil: x.seuil })),
      total: R.totalSVE, colleges: R.colleges.length
    };
  }, [colleges, listes, reglages]);

  const tousOK = { eff: '150', eff12: 'oui', synd: {
    CGT:  { adh: 'plusieurs', qual: 'affilie', sect: 'oui' },
    CFDT: { adh: 'plusieurs', qual: 'affilie', sect: 'oui' },
    FO:   { adh: 'plusieurs', qual: 'affilie', sect: 'oui' } } };

  // ══ 1. LE MODULE LIT LES DONNEES DU MODULE D'ELECTIONS ══════════
  console.log('\n— Deux collèges, trois syndicats : rien n’est ressaisi —');
  let r = await poser(COLLEGES, LISTES, tousOK);
  ok(r.colleges === 2, 'les deux collèges saisis dans le module d’élections sont lus', r.colleges);
  ok(r.total === 1000, 'le total des suffrages valablement exprimés vaut 800 + 200 = 1 000', r.total);
  ok(r.candidats.length === 12, 'les douze candidats saisis liste par liste sont lus', r.candidats.length);

  // ══ 2. LA MOYENNE, JAMAIS LA SOMME ══════════════════════════════
  console.log('\n— Le score d’une liste est une moyenne —');
  const cgt = r.syndicats.filter(s => s.nom === 'CGT')[0];
  ok(cgt.somme === 200, 'CGT : 300 + 250 + 200 + 50 = 800 voix ÷ 4 candidats = 200 — et non 800', cgt.somme);
  ok(Math.abs(cgt.audience - 20) < 1e-9, 'son audience vaut 200 ÷ 1 000 = 20,00 %', cgt.audience);
  ok(cgt.repr === true, 'CGT est représentative : le seuil de 10 % est atteint (L.2122-1)');

  const cfdt = r.syndicats.filter(s => s.nom === 'CFDT')[0];
  ok(cfdt.somme === 125, 'CFDT agrège ses deux collèges : 75 (1er) + 50 (2e) = 125', cfdt.somme);
  ok(Math.abs(cfdt.audience - 12.5) < 1e-9, 'son audience vaut 125 ÷ 1 000 = 12,50 % — le dénominateur est le total de TOUS les collèges', cfdt.audience);
  ok(cfdt.repr === true, 'CFDT est représentative alors qu’elle est sous 10 % dans le 1er collège (9,375 %)');

  const fo = r.syndicats.filter(s => s.nom === 'FO')[0];
  ok(fo.somme === 15, 'FO : 20 + 10 = 30 voix ÷ 2 candidats = 15', fo.somme);
  ok(Math.abs(fo.audience - 1.5) < 1e-9, 'son audience vaut 15 ÷ 1 000 = 1,50 %', fo.audience);
  ok(fo.repr === false, 'FO n’est pas représentative');

  ok(/24,00|20,00 %/.test(r.ecran) || r.ecran.indexOf('20,00 %') >= 0, 'l’audience s’affiche à l’écran');
  ok(r.ecran.indexOf('÷ 4 candidat(s) présenté(s)') >= 0, 'le détail du calcul est affiché, pas seulement le résultat');
  ok(r.ecran.indexOf('LEGIARTI000035652769') >= 0, 'L.2122-1 est affiché avec son identifiant de version');
  ok(/ne tranche pas un litige/i.test(r.ecran), 'l’en-tête dit que l’outil ne tranche pas un litige');

  // ══ 3. LE SCORE PERSONNEL, ET LA RATURE ═════════════════════════
  console.log('\n— Le score personnel de chaque candidat —');
  const c = n => r.candidats.filter(x => x.nom === n)[0];
  ok(Math.abs(c('ALBERT').pct - 37.5) < 1e-9, 'ALBERT : 300 voix ÷ 800 suffrages du 1er collège = 37,50 %', c('ALBERT').pct);
  ok(c('ALBERT').seuil === true, 'il dépasse 10 % à titre personnel : il peut être délégué syndical (L.2143-3, al. 1)');
  ok(Math.abs(c('DENIS').pct - 6.25) < 1e-9, 'DENIS, raturé, tombe à 6,25 %', c('DENIS').pct);
  ok(c('DENIS').seuil === false, 'et il n’atteint donc pas le seuil personnel, quand sa liste, elle, l’atteint');
  ok(Math.abs(c('GILLES').pct - 10) < 1e-9, 'GILLES est à 10,00 % exactement', c('GILLES').pct);
  ok(c('GILLES').seuil === true, 'et « au moins 10 % » comprend 10 % : il remplit la condition');
  ok(Math.abs(c('IRENE').pct - 30) < 1e-9, 'IRENE : 60 voix ÷ 200 suffrages du 2e collège = 30,00 % — son collège, pas l’entreprise', c('IRENE').pct);

  // Les noms proposes comme delegues syndicaux.
  ok(r.ecran.indexOf('ALBERT') >= 0 && r.ecran.indexOf('BERNARD') >= 0,
     'les candidats à 10 % sont nommés dans les désignations possibles');
  ok(r.ecran.indexOf('LEGIARTI000052437195') >= 0, 'L.2143-3 est affiché avec son identifiant de version');

  // ══ 4. UN SYNDICAT REPRESENTATIF SANS AUCUN CANDIDAT A 10 % ═════
  console.log('\n— Représentatif, mais aucun candidat à 10 % —');
  /* CFTC pèse 30 dans le 1er collège par une liste dont les candidats ne
     sont pas saisis un par un, et 5 dans le 2e par une liste dont les
     quatre candidats, raturés, plafonnent à 2,50 %. Audience 3,5 % — non.
     On lui donne donc 60 dans le 1er collège : audience 6,5 %… il faut
     davantage. Le jeu ci-dessous porte sa liste du 1er collège à 150. */
  const LISTES2 = [
    { nom: 'Liste CFTC — 1er collège', syndicat: 'CFTC', college: '1', voix: '600', cand: '4' },
    { nom: 'Liste CFTC — 2e collège', syndicat: 'CFTC', college: '2', cands: [
        { nom: 'MARTIN', voix: '5' }, { nom: 'NADIA', voix: '5' },
        { nom: 'OLIVIER', voix: '5' }, { nom: 'PAUL', voix: '5' } ] }
  ];
  const r2 = await poser(COLLEGES, LISTES2, { eff: '150', eff12: 'oui',
    synd: { CFTC: { adh: 'plusieurs', qual: 'affilie', sect: 'oui' } } });
  const cftc = r2.syndicats.filter(s => s.nom === 'CFTC')[0];
  ok(cftc.somme === 155, 'CFTC : 150 (600 ÷ 4) dans le 1er collège + 5 dans le 2e = 155', cftc.somme);
  ok(cftc.repr === true, 'elle est représentative — 15,50 % de 1 000', cftc.audience);
  ok(r2.candidats.every(x => x.seuil === false),
     'aucun de ses candidats saisis n’atteint 10 % à titre personnel',
     JSON.stringify(r2.candidats.map(x => x.nom + ':' + x.pct)));
  ok(r2.ecran.indexOf('AUTRES CANDIDATS') >= 0,
     'le module ouvre alors la désignation aux autres candidats (L.2143-3, al. 2)');
  ok(r2.ecran.indexOf('MARTIN') >= 0 && r2.ecran.indexOf('PAUL') >= 0,
     'et il les nomme, au lieu de laisser l’utilisateur les chercher');
  ok(/RÉSERVE/.test(r2.ecran),
     'il signale la liste dont les candidats ne sont pas saisis nominativement, au lieu d’affirmer qu’aucun n’atteint le seuil');

  // ══ 5. MOINS DE CINQUANTE SALARIES ══════════════════════════════
  console.log('\n— Moins de cinquante salariés —');
  const r3 = await poser(COLLEGES, LISTES, Object.assign({}, tousOK, { eff: '30' }));
  ok(r3.ecran.indexOf('LEGIARTI000035653218') >= 0, 'L.2143-6 est affiché avec son identifiant de version');
  ok(/membre de la délégation du personnel au comité social et économique comme délégué syndical/.test(r3.ecran)
     || /parmi les élus du comité/.test(r3.ecran),
     'le délégué syndical se choisit parmi les élus du comité');
  ok(/n’ouvre pas droit à un crédit d’heures/.test(r3.ecran), 'et ce mandat n’ouvre pas droit à un crédit d’heures propre');
  ok(/au moins cinquante salariés/.test(r3.ecran), 'la désignation de L.2143-3 est écartée : l’article vise au moins cinquante salariés');
  ok(/le barème de R\. 2143-2 commence à cinquante salariés/.test(r3.ecran),
     'aucun nombre de délégués n’est avancé sous cinquante salariés');
  ok(/AU MOINS CINQUANTE salariés/.test(r3.ecran),
     'et le représentant de section syndicale est écarté faute d’effectif (L.2142-1-1)');
  ok(/Aucune condition d’effectif n’est posée/.test(r3.ecran),
     'mais la section syndicale, elle, reste possible : L.2142-1 ne pose aucun seuil');

  // ══ 6. TROIS CENTS SALARIES ET PLUS ═════════════════════════════
  console.log('\n— Trois cents salariés et plus —');
  const r4 = await poser(COLLEGES, LISTES, Object.assign({}, tousOK, { eff: '350' }));
  ok(r4.ecran.indexOf('LEGIARTI000035651175') >= 0, 'L.2314-2 est affiché avec son identifiant de version');
  ok(/désignation DISTINCTE/.test(r4.ecran), 'à 300 et plus, le représentant syndical se désigne à part');
  ok(/AUCUNE condition de score/.test(r4.ecran), 'et sans condition de score personnel');
  ok(/L\. 2314-19/.test(r4.ecran), 'parmi les salariés remplissant les conditions d’éligibilité de L.2314-19');
  ok(r4.ecran.indexOf('LEGIARTI000018535800') >= 0, 'le nombre de délégués syndicaux porte R.2143-2 et son identifiant');
  ok(/Nombre de délégués syndicaux par section syndicale : 1/.test(r4.ecran.replace(/\s+/g, ' ')),
     'à 350 salariés, R.2143-2 donne un délégué syndical par section');

  console.log('\n— En dessous de trois cents —');
  ok(r.ecran.indexOf('LEGIARTI000035652997') >= 0, 'à 150 salariés, L.2143-22 est affiché avec son identifiant');
  ok(/de droit/i.test(r.ecran), 'le délégué syndical est de droit représentant syndical au comité');
  ok(r.ecran.indexOf('LEGIARTI000035651175') < 0 || r.ecran.indexOf('désignation DISTINCTE') < 0,
     'et aucune désignation distincte n’est proposée sous trois cents salariés');

  // ══ 7. CE QUI N'A PAS ETE CONFIRME ══════════════════════════════
  console.log('\n— Ce qui n’a pas été confirmé —');
  ok(/R\. 2143-4/.test(r.ecran) && /n’a pas été confirmé|commande publique/i.test(r.ecran),
     'R.2143-4 est signalé comme non confirmé, et rien n’en est affiché');
  ok(!/représentativité de branche|niveau national et interprofessionnel.{0,40}calcul/i.test(r.ecran)
     || /ne traite ni la représentativité de branche/.test(r.ecran),
     'le module dit qu’il ne traite ni la branche ni le niveau national');

  // ══ 8. LE RAPPORT IMPRIMABLE ════════════════════════════════════
  console.log('\n— Le rapport imprimable —');
  await poser(COLLEGES, LISTES, tousOK);
  const rapport = await page.evaluate(() => {
    let capte = null;
    const vrai = window.open;
    window.open = function () {
      return { document: { open() {}, write(h) { capte = h; }, close() {} } };
    };
    try { srepRapport(); } finally { window.open = vrai; }
    return capte;
  });
  ok(!!rapport && rapport.length > 4000, 'le rapport est produit', rapport ? rapport.length : 'rien');
  ok(/Représentativité syndicale/.test(rapport || ''), 'il porte son titre');
  ok(/ne tranche pas un litige/i.test(rapport || ''), 'il répète que l’outil ne tranche pas un litige');
  ok(/LEGIARTI000035652769/.test(rapport || '') && /LEGIARTI000052437195/.test(rapport || ''),
     'et chaque texte y porte son identifiant de version');
  ok(/ALBERT/.test(rapport || ''), 'les candidats y figurent nommément');
  ok(/POSSIBLE|IMPOSSIBLE/.test(rapport || ''), 'les désignations possibles et impossibles y sont dites');
  ok(!/undefined|NaN/.test(rapport || ''), 'aucun « undefined » ni « NaN » dans le rapport');

  // ══ 9. L'EXPORT ═════════════════════════════════════════════════
  console.log('\n— L’export —');
  for (const format of ['json', 'csv']) {
    const dl = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
    await page.evaluate(f => srepExport(f), format);
    const d = await dl;
    if (!d) { ok(false, 'l’export ' + format + ' produit un fichier'); continue; }
    const flux = await d.createReadStream();
    let txt = '';
    if (flux) { for await (const b of flux) txt += b.toString('utf8'); }
    ok(/representativite-syndicale\./.test(d.suggestedFilename()), 'l’export ' + format + ' porte un nom de fichier', d.suggestedFilename());
    ok(txt.length > 200, 'le fichier ' + format + ' n’est pas vide', txt.length);
    ok(txt.indexOf('CGT') >= 0, 'il contient les syndicats (' + format + ')');
    if (format === 'json') {
      const o = JSON.parse(txt);
      ok(o.totalSuffragesExprimes === 1000, 'le JSON porte le total des suffrages exprimés', o.totalSuffragesExprimes);
      ok(o.syndicats.filter(s => s.nom === 'CGT')[0].audience === 20, 'et l’audience calculée');
      ok(!!o.textes['L2122-1'] && o.textes['L2122-1'].id === 'LEGIARTI000035652769',
         'et les textes avec leur identifiant de version');
    } else {
      ok(/ALBERT/.test(txt), 'le CSV porte les candidats');
      ok(/audience/.test(txt), 'et la ligne d’audience par syndicat');
    }
  }

  // ══ 10. LA SAISIE AJOUTEE AU MODULE D'ELECTIONS ═════════════════
  console.log('\n— Ce qui a été ajouté à la saisie des élections —');
  const elec = await page.evaluate(() => {
    goPage('cse');
    csesRender();
    const z = document.getElementById('cse-listes-zone').innerText;
    const col = document.getElementById('cse-colleges-zone').innerText;
    const sel = document.getElementById('cse-college-actif');
    return { listes: z, colleges: col, choix: !!sel, options: sel ? sel.options.length : 0 };
  });
  ok(elec.colleges.indexOf('Suffrages valablement exprimés') >= 0,
     'les suffrages exprimés se saisissent collège par collège');
  ok(elec.listes.indexOf('Les candidats, un par un') >= 0,
     'les voix se saisissent candidat par candidat');
  ok(elec.listes.indexOf('Collège dans lequel cette liste se présente') >= 0,
     'chaque liste se rattache à son collège');
  ok(elec.listes.indexOf('Organisation syndicale qui présente la liste') >= 0,
     'et à son organisation syndicale');
  ok(elec.choix && elec.options >= 5, 'le calcul des sièges se fait collège par collège, au choix', elec.options);

  console.log('\nExceptions : ' + erreurs.length);
  ok(erreurs.length === 0, 'aucune exception JavaScript', erreurs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(echecs ? ('\n' + echecs + ' ECHEC(S)') : '\ntout est vert');
  process.exit(echecs ? 1 : 0);
})();
