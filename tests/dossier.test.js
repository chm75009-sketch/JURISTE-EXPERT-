/* Le dossier étape par étape.
   Ce module dit à un employeur ce qu'il doit avoir sur la table. Une pièce
   oubliée dans la liste, et c'est une réunion à refaire — ou une élection
   annulable. Le test vérifie donc la présence effective de chaque pièce
   clé, avec son article, et le filtrage par effectif. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test dossier ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html');

let echecs = 0;
const ok = (c, m, d) => { if (c) console.log('  ok    ' + m); else { echecs++; console.log('  ECHEC ' + m + (d !== undefined ? ' — ' + d : '')); } };

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await (await nav.newContext()).newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e)));
  page.on('dialog', d => d.accept());
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  const poserEffectif = (n) => page.evaluate(nb => {
    localStorage.setItem('cse_diag_v1::' + rxAccountId(), JSON.stringify({
      exercices: [{ cloture: '2025-12-31', ent: String(nb) }]
    }));
    if (typeof CSED !== 'undefined') CSED.exercices = [{ cloture: '2025-12-31', ent: String(nb) }];
    return cseEffectif();
  }, n);

  const etape = (cle) => page.evaluate(k => {
    const E = dosEtapes().filter(e => e.k === k)[0];
    if (!E) return null;
    return {
      num: E.num, lib: E.lib, art: E.art, quand: E.quand,
      avant: (E.avant || []).map(p => p.lib + ' §§ ' + p.art),
      seance: (E.seance || []).map(p => p.lib + ' §§ ' + p.art),
      apres: (E.apres || []).map(p => p.lib + ' §§ ' + p.art)
    };
  }, cle);

  // ══ L'exemple demandé : la négociation du protocole ══════════════
  console.log('\n— La réunion de négociation du protocole préélectoral —');
  await poserEffectif(150);
  const pap = await etape('pap');
  ok(pap !== null, 'l’étape existe');
  const seance = pap.seance.join(' | ');
  console.log('  ' + pap.seance.length + ' pièces à avoir en séance :');
  pap.seance.forEach(p => console.log('    · ' + p.split(' §§ ')[0].slice(0, 88)));

  ok(/liste des électeurs par collège[\s\S]*?L\.2314-18/.test(seance),
     'la liste des électeurs est demandée, avec L.2314-18');
  ok(/seize ans révolus/.test(seance) && /trois mois d’ancienneté/.test(seance),
     'et ses conditions sont rappelées (16 ans, 3 mois)');
  ok(/liste des éligibles par collège[\s\S]*?L\.2314-19/.test(seance),
     'la liste des éligibles est demandée, avec L.2314-19');
  ok(/dix-huit ans révolus/.test(seance) && /un an d’ancienneté/.test(seance),
     'et ses conditions (18 ans, 1 an)');
  ok(/assimilés à l’employeur[\s\S]*?électeurs, mais non éligibles/.test(seance),
     'les assimilés employeur : électeurs mais non éligibles');
  ok(/nombre de sièges[\s\S]*?R\.2314-1/.test(seance), 'le nombre de sièges, avec R.2314-1');
  ok(/répartition du personnel dans les collèges[\s\S]*?L\.2314-13/.test(seance),
     'la répartition du personnel dans les collèges');
  ok(/répartition des sièges entre les collèges[\s\S]*?L\.2314-13/.test(seance),
     'la répartition des sièges entre collèges');
  ok(/proportion de femmes et d’hommes[\s\S]*?L\.2314-30/.test(seance),
     'la proportion femmes-hommes, sans laquelle aucune liste paritaire');
  ok(/effectif[\s\S]*?L\.1111-2/.test(seance), 'le décompte de l’effectif');
  ok(/mis à disposition[\s\S]*?L\.2314-23/.test(seance), 'le sort des mis à disposition et intérimaires');
  ok(/vote électronique[\s\S]*?L\.2314-26/.test(seance), 'le vote électronique le cas échéant');
  ok(/feuille de présence/.test(seance), 'la feuille de présence de la réunion');
  ok(pap.seance.length >= 12, 'au moins douze pièces listées pour cette seule réunion', pap.seance.length);

  const apres = pap.apres.join(' | ');
  ok(/double condition de majorité[\s\S]*?L\.2314-6/.test(apres),
     'la double condition de majorité du protocole est rappelée');
  ok(/saisine de l’autorité administrative[\s\S]*?L\.2314-13/.test(apres),
     'et la saisine de l’administration en cas de désaccord');

  // ══ Les délais de chaque étape ═══════════════════════════════════
  console.log('\n— Les délais —');
  const info = await etape('information');
  ok(/quatre-vingt-dix jours/.test(info.quand) && /L\.2314-4/.test(info.art),
     'information du personnel : 90 jours, L.2314-4', info.quand);
  const inv = await etape('invitation');
  ok(/quinze jours avant la première réunion/.test(inv.quand) && /L\.2314-5/.test(inv.art),
     'invitation des organisations : 15 jours, L.2314-5');
  ok(/deux mois avant la fin des mandats/.test(inv.quand),
     'et deux mois avant la fin des mandats en cas de renouvellement');
  const listes = await etape('listes');
  ok(/trois jours/.test(listes.quand) && /R\.2314-24/.test(listes.art),
     'affichage des listes : ouvre les 3 jours de contestation');
  const t2 = await etape('tour2');
  ok(/quinze jours/.test(t2.quand) && /L\.2314-29/.test(t2.art), 'second tour : 15 jours, L.2314-29');
  const pv = await etape('pv');
  ok(/15822\*04/.test(pv.apres.join(' ')) && /15823\*04/.test(pv.apres.join(' ')),
     'les formulaires officiels titulaires et suppléants sont nommés');
  ok(/15248\*05/.test(pv.apres.join(' ')), 'et le formulaire de carence');

  // ══ Le filtrage par effectif ═════════════════════════════════════
  console.log('\n— Ce qui concerne chaque taille —');
  const cles = (n) => page.evaluate(nb => {
    localStorage.setItem('cse_diag_v1::' + rxAccountId(), JSON.stringify({
      exercices: [{ cloture: '2025-12-31', ent: String(nb) }]
    }));
    if (typeof CSED !== 'undefined') CSED.exercices = [{ cloture: '2025-12-31', ent: String(nb) }];
    return dosEtapes().map(e => e.k);
  }, n);

  let k = await cles(30);
  ok(k.indexOf('reclamations') >= 0, '30 salariés : les réclamations formalisées sont là');
  ok(k.indexOf('consultations') < 0, '30 salariés : pas de consultations récurrentes');
  ok(k.indexOf('budgets') < 0, '30 salariés : pas de budgets');
  k = await cles(50);
  ok(k.indexOf('reclamations') < 0, '50 salariés : plus de formalisme de réclamation');
  ok(k.indexOf('consultations') >= 0 && k.indexOf('budgets') >= 0,
     '50 salariés : consultations et budgets apparaissent');
  ok(k.indexOf('commissions') < 0, '50 salariés : pas encore les commissions');
  k = await cles(300);
  ok(k.indexOf('commissions') >= 0, '300 salariés : les commissions apparaissent');
  k = await cles(8);
  ok(k.indexOf('information') < 0 && k.indexOf('pap') < 0,
     '8 salariés : aucune étape électorale', k.join(','));
  ok(k.indexOf('effectif') >= 0, '8 salariés : l’établissement de l’effectif reste');

  // ══ Les identifiants de pièce sont stables ═══════════════════════
  console.log('\n— La mémoire des cases cochées —');
  const stable = await page.evaluate(() => {
    const a = dosId('pap', 'seance', 'La liste des électeurs par collège — seize ans révolus');
    const b = dosId('pap', 'seance', 'La liste des électeurs par collège — seize ans révolus');
    const c = dosId('pap', 'avant', 'La liste des électeurs par collège — seize ans révolus');
    return { egal: a === b, differe: a !== c, exemple: a };
  });
  ok(stable.egal, 'le même libellé donne toujours le même identifiant');
  ok(stable.differe, 'mais deux blocs différents ne se confondent pas');

  const doublons = await page.evaluate(() => {
    const vus = {}, dbl = [];
    dosEtapes().forEach(e => ['avant', 'seance', 'apres'].forEach(b =>
      (e[b] || []).forEach(p => {
        const id = dosId(e.k, b, p.lib);
        if (vus[id]) dbl.push(id); else vus[id] = 1;
      })));
    return dbl;
  });
  ok(doublons.length === 0, 'aucun identifiant en double sur toutes les étapes', doublons.join(','));

  // ══ La page ══════════════════════════════════════════════════════
  console.log('\n— La page —');
  await poserEffectif(150);
  const av = erreurs.length;
  await page.evaluate(() => { goPage('csedos'); dosOnEnter(); dosOuvrir('pap'); });
  await page.waitForTimeout(400);
  ok(erreurs.length === av, 'la page s’ouvre sans exception', erreurs.slice(av).join(' | '));
  const txt = await page.evaluate(() => (document.getElementById('csedos-body') || {}).textContent || '');
  ok(/À avoir en séance/.test(txt), 'le bloc « à avoir en séance » est affiché');
  ok(/À avoir envoyé avant/.test(txt) && /À produire après/.test(txt), 'les trois blocs sont là');
  ok(/L\.2314-18/.test(txt) && /L\.2314-19/.test(txt), 'les articles sont visibles à l’écran');
  ok(!/undefined|NaN|\[object/.test(txt), 'aucun « undefined » à l’écran');

  const compte = await page.evaluate(() => {
    const e = dosEtapes().filter(x => x.k === 'pap')[0];
    const avant = dosCompte(e);
    dosSetEtat(dosId('pap', 'seance', e.seance[0].lib), 'pret');
    const apres = dosCompte(e);
    dosSetEtat(dosId('pap', 'seance', e.seance[1].lib), 'sansobj');
    const so = dosCompte(e);
    return { avant, apres, so };
  });
  ok(compte.apres.pret === compte.avant.pret + 1, 'cocher « prêt » fait monter le compteur');
  ok(compte.so.tot === compte.avant.tot - 1, '« sans objet » sort la pièce du total', JSON.stringify(compte.so));

  const hub = await page.evaluate(() => {
    const a = (typeof hubAlertes === 'function') ? hubAlertes() : [];
    return a.filter(x => x.mod && x.mod.k === 'dossier').length;
  });
  ok(hub > 0, 'le module global signale le dossier incomplet', hub);

  await nav.close();
  console.log('\n' + (echecs ? echecs + ' ECHEC(S)' : 'tout est vert'));
  process.exit(echecs ? 1 : 0);
})();
