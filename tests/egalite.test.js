/* L'INDEX DE L'EGALITE PROFESSIONNELLE — L.1142-7 a L.1142-10, D.1142-2.

   L'application ne comportait aucun calcul de l'ecart de remuneration entre
   les femmes et les hommes : la BDESE portait le theme en case a cocher, et
   rien derriere. Ce fichier verifie ce qui, dans ce calcul, se trompe le
   plus souvent :

   - un groupe de comparaison n'entre dans le calcul que s'il compte au
     moins TROIS femmes ET TROIS hommes ;
   - si les groupes valides couvrent moins de 40 % de l'effectif classe,
     l'indicateur est INCALCULABLE — ce n'est pas zero point, c'est une
     impossibilite qu'il faut declarer ;
   - le seuil de pertinence (5 % par categorie, 2 % par niveau de la
     convention) se retranche a la valeur absolue de l'ecart, sans en
     changer le sens : il joue en faveur de l'employeur, jamais contre ;
   - l'indicateur maternite est TOUT OU RIEN (L.1225-26) ;
   - l'index n'est calculable que si les indicateurs calculables totalisent
     au moins 75 points de bareme ;
   - le registre du personnel alimente le calcul : apprentis, contrats de
     professionnalisation, interimaires et salaries presents moins de six
     mois sont ecartes, et ce qui manque au registre est DIT, pas devine. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test egalite ignore.'); process.exit(0); }
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
  await page.waitForTimeout(700);

  /* ── Le groupe de comparaison ─────────────────────────────────────── */
  console.log('\n— Trois femmes ET trois hommes, sinon le groupe ne compte pas —');
  let r = await page.evaluate(() => {
    const g = (n, sexe, rem) => Array.from({ length: n }, (_, i) => ({
      nom: sexe + i, sexe, dateNaissance: '1990-01-01', statut: 'Cadre', remuneration: rem
    }));
    return egaIndicateur1([...g(2, 'Femme', 30000), ...g(5, 'Homme', 40000)], { finPeriode: '2025-12-31' });
  });
  ok(r.calculable === false, 'deux femmes seulement : l’indicateur n’est pas calculé');
  ok(/INCALCULABLE/.test(r.motif || ''), 'et l’écran annonce une impossibilité, pas un zéro', (r.motif || '').slice(0, 60));
  ok((r.ecartes || []).length === 1, 'le groupe écarté est nommé', JSON.stringify(r.ecartes));

  /* ── La regle des 40 % ────────────────────────────────────────────── */
  console.log('\n— Les groupes valides doivent couvrir 40 % de l’effectif —');
  r = await page.evaluate(() => {
    /* Un groupe valide de 6 personnes, et 20 personnes dispersees dans des
       groupes d'une seule personne : couverture 6/26 = 23 %. */
    const S = [];
    for (let i = 0; i < 3; i++) S.push({ nom: 'F' + i, sexe: 'Femme', dateNaissance: '1990-01-01', statut: 'Cadre', remuneration: 30000 });
    for (let i = 0; i < 3; i++) S.push({ nom: 'H' + i, sexe: 'Homme', dateNaissance: '1990-01-01', statut: 'Cadre', remuneration: 32000 });
    const st = ['Ouvrier', 'Employé', 'Technicien', 'Cadre'];
    const an = ['1998-01-01', '1988-01-01', '1978-01-01', '1968-01-01'];
    let k = 0;
    for (const a of an) for (const t of st) { S.push({ nom: 'X' + (k++), sexe: (k % 2 ? 'Femme' : 'Homme'), dateNaissance: a, statut: t, remuneration: 25000 }); }
    const R = egaIndicateur1(S, { finPeriode: '2025-12-31' });
    return { calculable: R.calculable, couverture: Math.round(R.couverture), motif: R.motif };
  });
  ok(r.calculable === false, 'couverture insuffisante : l’indicateur est incalculable');
  ok(r.couverture < 40, 'la couverture calculée est bien inférieure à 40 %', r.couverture + ' %');
  ok(/40 %/.test(r.motif || ''), 'et le motif cite le seuil de 40 %');

  /* ── Le seuil de pertinence joue en faveur de l'employeur ─────────── */
  console.log('\n— Le seuil de pertinence —');
  r = await page.evaluate(() => {
    const S = [];
    for (let i = 0; i < 3; i++) S.push({ nom: 'F' + i, sexe: 'Femme', dateNaissance: '1990-01-01', statut: 'Cadre', remuneration: 38000 });
    for (let i = 0; i < 3; i++) S.push({ nom: 'H' + i, sexe: 'Homme', dateNaissance: '1990-01-01', statut: 'Cadre', remuneration: 40000 });
    const csp = egaIndicateur1(S, { finPeriode: '2025-12-31', methode: 'csp' });
    S.forEach(function (x, i) { x.niveau = '150'; });
    const ccn = egaIndicateur1(S, { finPeriode: '2025-12-31', methode: 'ccn' });
    return { seuilCsp: csp.seuilPertinence, ecartCsp: csp.ecart, ptsCsp: csp.points,
             seuilCcn: ccn.seuilPertinence, ecartCcn: ccn.ecart };
  });
  ok(r.seuilCsp === 5, 'par catégorie socioprofessionnelle, le seuil est de 5 %', r.seuilCsp);
  ok(r.seuilCcn === 2, 'par niveau de la convention collective, il est de 2 %', r.seuilCcn);
  ok(r.ecartCsp === 0, 'un écart brut de 5 % est absorbé par le seuil de 5 %', r.ecartCsp);
  ok(r.ecartCcn === 3, 'le même écart laisse 3 points avec le seuil de 2 %', r.ecartCcn);
  ok(r.ptsCsp === 40, 'un écart ramené à zéro vaut les 40 points de l’indicateur', r.ptsCsp);

  /* Le signe est conserve : quand les femmes sont mieux payees, l'ecart est
     negatif, et il ne devient pas positif en passant le seuil. */
  console.log('\n— Le sens de l’écart est conservé —');
  r = await page.evaluate(() => {
    const S = [];
    for (let i = 0; i < 3; i++) S.push({ nom: 'F' + i, sexe: 'Femme', dateNaissance: '1990-01-01', statut: 'Cadre', remuneration: 50000 });
    for (let i = 0; i < 3; i++) S.push({ nom: 'H' + i, sexe: 'Homme', dateNaissance: '1990-01-01', statut: 'Cadre', remuneration: 40000 });
    const R = egaIndicateur1(S, { finPeriode: '2025-12-31' });
    return { ecart: R.ecart, points: R.points };
  });
  ok(r.ecart < 0, 'les femmes mieux rémunérées : l’écart reste négatif', r.ecart);
  ok(r.points !== null && r.points < 40, 'et il coûte des points, comme un écart de même ampleur en sens inverse', r.points);

  /* ── Les indicateurs 2 et 3 ───────────────────────────────────────── */
  console.log('\n— Augmentations : le barème s’applique aux deux mesures, on garde la meilleure —');
  r = await page.evaluate(() => {
    const R = egaEcartTaux(10, 100, 5, 60, JX_EGA_BAREME.augmentations250, JX_EGA_BAREME.augmentations250Hors, 20);
    return R;
  });
  ok(r.calculable === true, 'le calcul aboutit');
  ok(Math.abs(r.ecartPoints - 10) < 0.001, 'écart en points de pourcentage : 60 % − 50 % = 10', r.ecartPoints);
  ok(Math.abs(r.ecartSalaries - 1) < 0.001, 'écart en nombre équivalent de salariés : 1', r.ecartSalaries);
  ok(r.points === Math.max(r.pointsParPourcentage, r.pointsParSalaries), 'la note retenue est la plus élevée des deux', r.points);

  console.log('\n— Ce que le calcul refuse de faire —');
  r = await page.evaluate(() => [
    egaEcartTaux(2, 50, 1, 10, JX_EGA_BAREME.augmentations250, 0, 20),
    egaEcartTaux(50, 50, 60, 10, JX_EGA_BAREME.augmentations250, 0, 20),
    egaEcartTaux('', 50, 1, 10, JX_EGA_BAREME.augmentations250, 0, 20)
  ]);
  ok(r[0].calculable === false && /trois femmes/.test(r[0].motif), 'moins de trois femmes : refus motivé', r[0].motif);
  ok(r[1].calculable === false && /dépasser/.test(r[1].motif), 'plus d’augmentés que d’effectif : refus motivé', r[1].motif);
  ok(r[2].calculable === false, 'un effectif vide ne devient pas zéro');

  /* ── L'indicateur maternite ───────────────────────────────────────── */
  console.log('\n— Le retour de congé maternité : tout ou rien —');
  r = await page.evaluate(() => [
    egaIndicateurMaternite(4, 4), egaIndicateurMaternite(4, 3),
    egaIndicateurMaternite(0, 0), egaIndicateurMaternite('', '')
  ]);
  ok(r[0].points === 15, 'quatre retours, quatre augmentations : 15 points', r[0].points);
  ok(r[1].points === 0, 'une seule omission sur quatre : zéro point', r[1].points);
  ok(r[2].calculable === false && r[2].sansObjet === true, 'aucun retour : incalculable, et non zéro');
  ok(r[3].calculable === false && !r[3].sansObjet, 'champ vide : on demande l’information, on ne suppose rien');

  /* ── Les dix plus hautes remunerations ────────────────────────────── */
  console.log('\n— Les dix plus hautes rémunérations —');
  r = await page.evaluate(() => [0, 1, 2, 4, 5, 11].map(n => egaIndicateurHautes(n)));
  ok(r[0].points === 0 && r[1].points === 0, 'zéro ou un : aucun point', r[0].points + '/' + r[1].points);
  ok(r[4].points === 10, 'cinq et cinq : la note maximale', r[4].points);
  ok(r[5].calculable === false, 'onze sur dix : refusé');

  /* ── L'index ──────────────────────────────────────────────────────── */
  console.log('\n— L’index n’est calculable qu’au-delà de 75 points de barème —');
  r = await page.evaluate(() => {
    const S = [];
    for (let i = 0; i < 3; i++) S.push({ nom: 'F' + i, sexe: 'Femme', dateNaissance: '1990-01-01', statut: 'Cadre', remuneration: 40000 });
    for (let i = 0; i < 3; i++) S.push({ nom: 'H' + i, sexe: 'Homme', dateNaissance: '1990-01-01', statut: 'Cadre', remuneration: 40000 });
    const complet = egaIndex({ effectif: 120, salaries: S, finPeriode: '2025-12-31',
      nbF: 60, nbH: 60, augF: 30, augH: 30, matRetours: 2, matAugmentees: 2, hautes: 5 });
    const troue = egaIndex({ effectif: 120, salaries: S, finPeriode: '2025-12-31',
      nbF: '', nbH: '', augF: '', augH: '', matRetours: '', matAugmentees: '', hautes: '' });
    const grande = egaIndex({ effectif: 400, salaries: S, finPeriode: '2025-12-31',
      nbF: 200, nbH: 200, augF: 100, augH: 100, promoF: 10, promoH: 10, matRetours: 1, matAugmentees: 1, hautes: 5 });
    return {
      completTotal: complet.total, completSur: complet.sur, completGrande: complet.grande,
      troueCalc: troue.calculable, troueSur: troue.sur, troueMotif: (troue.motifs || [])[0] || '',
      grandeTotal: grande.total, grandeGrande: grande.grande, grandeNb: grande.indicateurs.length,
      petiteNb: complet.indicateurs.length
    };
  });
  ok(r.completTotal === 100, 'égalité parfaite dans une entreprise de 120 salariés : 100 sur 100', r.completTotal);
  ok(r.completSur === 100, 'les quatre indicateurs totalisent bien 100 points', r.completSur);
  ok(r.petiteNb === 4, 'de 50 à 250 salariés : quatre indicateurs', r.petiteNb);
  ok(r.grandeNb === 5, 'à partir de 250 salariés : cinq indicateurs', r.grandeNb);
  ok(r.grandeTotal === 100, 'et l’égalité parfaite y vaut aussi 100', r.grandeTotal);
  ok(r.troueCalc === false, 'trois indicateurs manquants : l’index n’est pas calculé');
  ok(r.troueSur === 40 && /75 points calculables/.test(r.troueMotif), 'et le motif dit qu’il faut 75 points calculables', r.troueSur);

  /* Un index sur 85 points quand la maternite est sans objet. */
  console.log('\n— La maternité sans objet : les points restants sont ramenés à 100 —');
  r = await page.evaluate(() => {
    const S = [];
    for (let i = 0; i < 3; i++) S.push({ nom: 'F' + i, sexe: 'Femme', dateNaissance: '1990-01-01', statut: 'Cadre', remuneration: 40000 });
    for (let i = 0; i < 3; i++) S.push({ nom: 'H' + i, sexe: 'Homme', dateNaissance: '1990-01-01', statut: 'Cadre', remuneration: 40000 });
    return egaIndex({ effectif: 120, salaries: S, finPeriode: '2025-12-31',
      nbF: 60, nbH: 60, augF: 30, augH: 30, matRetours: 0, matAugmentees: 0, hautes: 5 });
  });
  ok(r.sur === 85, 'le total calculable tombe à 85 points', r.sur);
  ok(r.total === 100, 'et le résultat est ramené à 100 par règle de trois', r.total);

  /* ── Le registre du personnel alimente le calcul ──────────────────── */
  console.log('\n— Ce qui vient du registre, et ce qui en est écarté —');
  r = await page.evaluate(() => {
    goPage('cse'); hubOnEnter();
    const base = (id, nom, sexe, statut, contrat, entree, sortie) => ({
      id, nom, prenom: '', sexe, naissance: '1985-06-15', statut,
      typeContrat: contrat, tempsTravail: 'Temps plein', salaire: '2500',
      coeff: '150', entree, sortie: sortie || ''
    });
    RX.staff = [
      base('a', 'DUPONT', 'Femme', 'Cadre', 'CDI', '2015-01-01'),
      base('b', 'MARTIN', 'Homme', 'Cadre', 'CDI', '2015-01-01'),
      base('c', 'APPRENTI', 'Homme', 'Ouvrier', 'Apprentissage', '2015-01-01'),
      base('d', 'PRO', 'Femme', 'Ouvrier', 'Contrat de professionnalisation', '2015-01-01'),
      base('e', 'INTER', 'Homme', 'Ouvrier', 'Intérim', '2015-01-01'),
      base('f', 'ARRIVE', 'Femme', 'Cadre', 'CDI', '2025-11-01'),
      base('g', 'PARTI', 'Homme', 'Cadre', 'CDI', '2010-01-01', '2024-06-30'),
      base('h', 'SANSSEXE', '', 'Cadre', 'CDI', '2015-01-01')
    ];
    rxSaveLocal();
    const G = egaLoad(); G.periodeFin = '2025-12-31'; G.rem = {}; G.exclus = {}; hubSave();
    const L = egaSalaries();
    return {
      retenus: L.retenus.map(x => x.nom).sort(),
      exclus: L.exclus.map(x => x.nom + '|' + x.motif).sort(),
      debut: L.periode.debut, fin: L.periode.fin
    };
  });
  ok(r.debut === '2025-01-01' && r.fin === '2025-12-31', 'la période court sur douze mois consécutifs', r.debut + ' → ' + r.fin);
  ok(r.retenus.join(',') === 'DUPONT,MARTIN,SANSSEXE', 'seuls les salariés éligibles sont retenus', r.retenus.join(','));
  ok(/APPRENTI\|contrat d’apprentissage/.test(r.exclus.join(' ')), 'l’apprenti est écarté, et le motif est écrit');
  ok(/PRO\|contrat de professionnalisation/.test(r.exclus.join(' ')), 'le contrat de professionnalisation aussi');
  ok(/INTER\|mis à disposition/.test(r.exclus.join(' ')), 'l’intérimaire aussi');
  ok(/ARRIVE\|présent moins de six mois/.test(r.exclus.join(' ')), 'le salarié entré en novembre aussi');
  ok(/PARTI\|sorti avant/.test(r.exclus.join(' ')), 'le salarié parti avant la période aussi');

  console.log('\n— Ce qui manque au registre est dit, jamais deviné —');
  r = await page.evaluate(() => {
    const G = egaLoad(); G.rem = { a: '40000', b: '42000' }; hubSave();
    const D = egaDonnees();
    const R = egaIndicateur1(D.salaries, { methode: 'csp', finPeriode: '2025-12-31' });
    return { manque: R.manque.map(m => m.nom + '|' + m.quoi) };
  });
  ok(r.manque.length === 1, 'un seul salarié non classable', JSON.stringify(r.manque));
  ok(/SANSSEXE/.test(r.manque[0]) && /sexe/.test(r.manque[0]) && /rémunération/.test(r.manque[0]),
     'et l’application nomme exactement ce qui lui manque', r.manque[0]);

  /* ── L'ecran ──────────────────────────────────────────────────────── */
  console.log('\n— L’écran —');
  r = await page.evaluate(() => {
    hubGo('egalite');
    const z = document.getElementById('csehub-body');
    const t = z ? z.innerText : '';
    return { t, nan: /NaN|undefined|\[object/.test(t), n: t.length };
  });
  ok(!r.nan, 'aucun « NaN », « undefined » ni « [object » à l’écran');
  ok(/L\.1142-8/.test(r.t), 'l’obligation de publication est citée avec son article');
  ok(/1 % de la masse salariale/.test(r.t), 'la pénalité est rappelée');
  ok(/confronter au texte|tables de conversion/i.test(r.t),
     'et l’écran dit que les tables de conversion n’ont pas pu être vérifiées à la source');

  console.log('\n— La BDESE : les dix thèmes de la loi, détaillés —');
  r = await page.evaluate(() => {
    hubGo('bdese');
    const t = document.getElementById('csehub-body').innerText;
    return { t, nb: HUB_BDESE.length, nan: /NaN|undefined|\[object/.test(t),
             sous: HUB_BDESE.reduce((a, x) => a + (x.sous || []).length, 0) };
  });
  ok(r.nb === 11, 'les dix thèmes, le premier dédoublé : onze rubriques', r.nb);
  ok(r.sous >= 40, 'chaque rubrique porte ses sous-rubriques', r.sous);
  ok(!r.nan, 'aucun « NaN » ni « undefined » à l’écran de la BDESE');
  ok(/R\.2312-8/.test(r.t), 'le décret applicable est cité');
  ok(/Transferts commerciaux et financiers/.test(r.t),
     'le 9° — les transferts entre entités du groupe — n’est plus absent de la liste');
  ok(/Registre du personnel/.test(r.t), 'et les rubriques renvoient aux documents qui les alimentent');

  /* ── Le perimetre de la base : etablissements, groupe, UES ────────── */
  console.log('\n— Où est la base, et qui y accède —');
  r = await page.evaluate(() => {
    RX.staff = Array.from({ length: 320 }, (_, i) => ({
      id: 'x' + i, nom: 'S' + i, sexe: i % 2 ? 'Femme' : 'Homme', naissance: '1985-01-01',
      statut: 'Employé', typeContrat: 'CDI', tempsTravail: 'Temps plein', salaire: '2500', entree: '2015-01-01'
    }));
    rxSaveLocal(); hubOnEnter(); hubGo('bdese');
    HUB.bdeseOrg = {}; HUB.bdeseConf = {}; hubSave();
    bdoSet('multi', 'Oui — au moins deux établissements distincts');
    bdoSet('central', 'Non');
    bdoSet('groupe', 'Oui — société dominante ou société contrôlée');
    bdoSet('ues', 'Oui — UES reconnue par accord');
    bdoSet('accord', 'Aucun accord — les règles supplétives s’appliquent');
    bdoSet('support', 'Support papier');
    return { eff: cseEffectif(), t: document.getElementById('csehub-body').innerText };
  });
  ok(r.eff === 320, 'l’effectif est calculé sur le registre', r.eff);
  ok(/R\.2312-11/.test(r.t), 'la base est constituée au niveau de l’entreprise (R.2312-11)');
  ok(/L\.2316-1 et L\.2316-20|L\.2316-20/.test(r.t),
     'qui est consulté sur quoi : comité central et comité d’établissement');
  ok(/L\.2312-18/.test(r.t), 'l’accès permanent est cité avec son article');
  ok(/R\.2312-14/.test(r.t), 'la mise à disposition vaut communication, et fait courir le délai');
  ok(/L\.2332-1/.test(r.t), 'le groupe renvoie au régime propre du comité de groupe');
  ok(/n’existe pas de base de données de groupe/.test(r.t),
     'et l’écran dit qu’il n’existe pas de base de groupe');
  ok(/unité économique et sociale/i.test(r.t), 'l’UES appelle une clause d’accord');

  console.log('\n— Les réponses incohérentes sont dites, pas absorbées —');
  ok(/L\.2313-1/.test(r.t), 'deux établissements et aucun comité central : l’entrave est signalée');
  ok(/support informatique s’impose/.test(r.t), '320 salariés et base papier : R.2312-12 est opposé');
  ok(/accès permanent des élus des autres établissements/.test(r.t),
     'base papier et plusieurs établissements : l’accès doit être organisé par écrit');

  console.log('\n— Ce qui est confidentiel, et ce qui ne peut pas l’être —');
  r = await page.evaluate(() => {
    bdcSet('egalite', 'oui');
    bdcSet('fonds', 'non');
    const t = document.getElementById('csehub-body').innerText;
    return { t, sd: bdcSansDuree().map(x => x.k), ct: bdcContestables().map(x => x.k) };
  });
  ok(/L\.1227-1/.test(r.t), 'le secret de fabrique et sa sanction pénale sont cités');
  ok(/13-17\.270/.test(r.t), 'les deux conditions cumulatives, avec l’arrêt qui les pose');
  ok(/R\.2312-13/.test(r.t), 'la durée de la confidentialité est exigée');
  ok(/L\.2315-84/.test(r.t), 'l’expert du comité est tenu au secret : la confidentialité ne lui est pas opposable');
  ok(r.sd.join(',') === 'egalite', 'une rubrique confidentielle sans durée est signalée', r.sd.join(','));
  ok(r.ct.join(',') === 'egalite', 'et une rubrique que la loi impose de publier ne peut pas être confidentielle', r.ct.join(','));
  ok(/publiée par la loi/.test(r.t), 'le motif est affiché sur la rubrique elle-même');
  ok(/non tranchée n’est pas confidentielle/.test(r.t),
     'à défaut de déclaration, l’obligation de discrétion ne joue pas — et l’écran le dit');

  console.log('\n— La durée renseignée lève l’alerte —');
  r = await page.evaluate(() => {
    bdcDuree('egalite', 'jusqu’à la publication du 1er mars');
    return { sd: bdcSansDuree().length, ct: bdcContestables().length };
  });
  ok(r.sd === 0, 'plus aucune rubrique confidentielle sans durée');
  ok(r.ct === 1, 'mais la publicité légale, elle, ne se lève pas', r.ct);

  /* ── Le journal des mises a disposition ───────────────────────────── */
  console.log('\n— Le journal : une case cochée ne date rien —');
  r = await page.evaluate(() => {
    HUB.bdeseJournal = []; HUB.bdeseAcces = []; HUB.bdeseOrg = {}; hubSave();
    hubGo('bdese');
    const vide = document.getElementById('csehub-body').innerText;
    bdjAjouter('fonds');
    bdjSet(0, 'date', '2026-03-02');
    bdjSet(0, 'objet', 'comptes 2025');
    bdoSet('delaiExamen', '2');
    const t = document.getElementById('csehub-body').innerText;
    return { vide, t, der: bdjDerniereBase(), rub: bdjDernier('fonds'),
             ech1: bdjEcheance('2026-03-02', 1), ech2: bdjEcheance('2026-03-02', 2),
             ech3: bdjEcheance('2026-03-02', 3), bis: bdjEcheance('2026-12-31', 2) };
  });
  ok(/Aucune mise à disposition n’est datée/.test(r.vide),
     'journal vide : la base n’est opposable à personne, et l’écran le dit');
  ok(r.der === '2026-03-02' && r.rub === '2026-03-02', 'la date est retenue, rubrique par rubrique', r.der);
  ok(r.ech1 === '2026-04-02', 'un mois : échéance au 2 avril', r.ech1);
  ok(r.ech2 === '2026-05-02', 'deux mois en cas d’expertise', r.ech2);
  ok(r.ech3 === '2026-06-02', 'trois mois pour les expertises central + établissement', r.ech3);
  ok(r.bis === '2027-02-28' || r.bis === '2027-03-03', 'le passage d’année ne casse pas le calcul', r.bis);
  ok(/R\.2312-14/.test(r.t), 'la mise à disposition vaut communication (R.2312-14)');
  ok(/avis négatif/.test(r.t), 'et l’échéance de l’avis négatif présumé est affichée');
  ok(/ne court que si la base est complète/.test(r.t),
     'avec la réserve : une base incomplète ne fait pas courir le délai');

  /* ── Le registre des acces ────────────────────────────────────────── */
  console.log('\n— Qui a accès à la base —');
  r = await page.evaluate(() => {
    mcLoad();
    MC.elus = [{ nom: 'DUPONT', q: 'tit', col: '1', sexe: 'F' },
               { nom: 'MARTIN', q: 'sup', col: '1', sexe: 'H' }];
    mcSave();
    bdaReprendreElus();
    const avant = bdaLoad().length;
    bdaReprendreElus();                       /* deux fois : pas de doublon */
    bdaAdd(); bdaSet(2, 'nom', 'SYNDIC'); bdaSet(2, 'q', 'ds'); bdaSet(2, 'depuis', '2026-01-05');
    bdaAdd(); bdaSet(3, 'nom', 'PROX'); bdaSet(3, 'q', 'prox');
    const t = document.getElementById('csehub-body').innerText;
    return { avant, apres: bdaLoad().length, sansDate: bdaSansDate().map(x => x.nom),
             actifs: bdaActifs().length, t };
  });
  ok(r.avant === 2, 'les élus sont repris de « Mon CSE », sans seconde saisie', r.avant);
  ok(r.apres === 4, 'reprendre deux fois n’ajoute pas de doublon', r.apres);
  ok(/Accès de droit/.test(r.t), 'l’accès de droit des élus et des délégués syndicaux est signalé');
  ok(/à prévoir par l’accord/.test(r.t),
     'et l’accès du représentant de proximité renvoie à l’accord, il n’est pas supposé');
  ok(r.sansDate.length === 3, 'les accès sans date d’ouverture sont comptés', r.sansDate.join(','));
  ok(/accès sans date d’ouverture/.test(r.t), 'et l’écran dit pourquoi la date compte');
  ok(r.actifs === 4, 'les accès ouverts sont dénombrés', r.actifs);

  console.log('\n— Un accès retiré se date, il ne s’efface pas —');
  r = await page.evaluate(() => {
    bdaSet(0, 'fin', '2026-06-30');
    return { actifs: bdaActifs().length, lignes: bdaLoad().length };
  });
  ok(r.lignes === 4 && r.actifs === 3, 'la ligne reste au registre, avec sa date de fin',
     r.lignes + ' lignes / ' + r.actifs + ' actifs');

  /* ── LA BASE ELLE-MEME : les six annees de R.2312-10 ──────────────── */
  console.log('\n— Les six années : deux révolues, l’année en cours, trois à venir —');
  r = await page.evaluate(() => {
    HUB.bdeseData = {}; hubSave();
    bdoSet('annee', '2026');
    return { C: bddColonnes(), an: bddAnnee() };
  });
  ok(r.C.length === 6, 'six colonnes, pas une de plus', r.C.length);
  ok(r.C.map(x => x.an).join(',') === '2024,2025,2026,2027,2028,2029',
     'de A−2 à A+3', r.C.map(x => x.an).join(','));
  ok(r.C.filter(x => x.futur).map(x => x.an).join(',') === '2027,2028,2029',
     'les trois années à venir sont identifiées comme telles');

  console.log('\n— Une ligne n’est complète que si les six années portent quelque chose —');
  r = await page.evaluate(() => {
    const lib = HUB_BDESE[0].sous[0];
    const out = {};
    out.vide = bddLigneEtat('inv-social', lib);
    ['am2', 'am1', 'a0'].forEach(c => bddSet('inv-social', lib, c, '120'));
    out.moitie = bddLigneEtat('inv-social', lib);
    ['a1', 'a2', 'a3'].forEach(c => bddSet('inv-social', lib, c, 'stable'));
    out.plein = bddLigneEtat('inv-social', lib);
    return out;
  });
  ok(r.vide.complet === false && r.vide.remplies === 0, 'ligne vide : rien n’est compté comme renseigné');
  ok(r.moitie.complet === false && r.moitie.manque.join(',') === '2027,2028,2029',
     'trois années saisies : les années manquantes sont nommées', r.moitie.manque.join(','));
  ok(r.plein.complet === true, 'les six années renseignées : la ligne est complète');

  console.log('\n— L’impossibilité se déclare, mais elle se motive —');
  r = await page.evaluate(() => {
    const lib = HUB_BDESE[1].sous[1];
    bddSet('inv-mat', lib, 'mode', 'indispo');
    const sans = bddLigneEtat('inv-mat', lib);
    bddSet('inv-mat', lib, 'motif', 'Aucune dépense de recherche et développement engagée.');
    const avec = bddLigneEtat('inv-mat', lib);
    return { sans, avec, t: document.getElementById('csehub-body').innerText };
  });
  ok(r.sans.sansMotif === true && r.sans.complet === false,
     'impossibilité déclarée sans raison : la ligne reste incomplète');
  ok(r.avec.complet === true && r.avec.sansMotif === false,
     'la raison indiquée, la ligne est complète — R.2312-10 est satisfait');

  console.log('\n— Les grandes tendances ne valent que pour les années à venir —');
  r = await page.evaluate(() => {
    const lib = HUB_BDESE[2].sous[0];
    bddSet('egalite', lib, 'mode', 'tendance');
    bddSet('egalite', lib, 'a1', 'en hausse');
    const futurSeul = bddLigneEtat('egalite', lib);
    bddSet('egalite', lib, 'am1', 'en hausse');
    const passe = bddLigneEtat('egalite', lib);
    return { futurSeul, passe };
  });
  ok(!r.futurSeul.tendancePassee, 'une tendance sur une année à venir ne déclenche rien');
  ok(r.passe.tendancePassee === true,
     'une tendance portée sur une année révolue est signalée : la donnée chiffrée y est due');

  console.log('\n— La clé d’une sous-rubrique est son libellé, pas son rang —');
  r = await page.evaluate(() => {
    const t = HUB_BDESE[0], lib = t.sous[0];
    const avant = bddCle(t.k, lib);
    /* Au-delà de 300 salariés la liste s'allonge : les clés déjà saisies
       ne doivent pas se décaler d'un cran. */
    const l50 = bddSousRubriques(t, false), l300 = bddSousRubriques(t, true);
    return { avant, apres: bddCle(t.k, lib), n50: l50.length, n300: l300.length,
             memeTete: l300[0] === l50[0], slug: /^[a-z0-9|-]+$/.test(avant) };
  });
  ok(r.avant === r.apres, 'la clé ne bouge pas', r.avant);
  ok(r.n300 > r.n50, 'la liste s’allonge à partir de trois cents salariés', r.n50 + ' → ' + r.n300);
  ok(r.memeTete, 'et les sous-rubriques déjà saisies restent en tête');
  ok(r.slug, 'la clé ne contient que des caractères sûrs pour un attribut HTML', r.avant);

  console.log('\n— L’écran de saisie —');
  r = await page.evaluate(() => {
    BDD_OUVERT = {};
    hubGo('bdese');
    const ferme = document.getElementById('csehub-body').innerText;
    bddBasculer('inv-social');
    const ouvert = document.getElementById('csehub-body').innerText;
    return { ferme, ouvert, av: bddAvancement(false) };
  });
  ok(/Saisir les données — six années/.test(r.ferme), 'chaque rubrique ouvre sa grille de saisie');
  ok(r.ouvert.length > r.ferme.length, 'et la grille apparaît quand on l’ouvre');
  ok(/R\.2312-10/.test(r.ouvert), 'l’article qui impose les six années est cité');
  ok(/2024/.test(r.ouvert) && /2029/.test(r.ouvert), 'les six millésimes sont affichés');
  ok(!/NaN|undefined|\[object/.test(r.ouvert), 'aucun « NaN » ni « undefined » dans la grille');
  ok(r.av.total === 42, 'les 42 sous-rubriques dues en dessous de trois cents salariés sont comptées', r.av.total);
  ok(r.av.alertes === 1, 'et la ligne à corriger est comptée', r.av.alertes);

  /* ── L'IMPORT DU FICHIER DU PERSONNEL ─────────────────────────────── */
  /* Le fichier d'exemple est fait pour malmener l'application : exclusions
     du décret, informations manquantes, temps partiels, noms à apostrophe,
     civilités à la place du sexe, montants à la française. */
  console.log('\n— Le fichier du personnel s’importe, et ses pièges se déclenchent —');
  const CSV = require('path').resolve(__dirname, '..', 'exemples', 'PERSONNEL_FICTIF_BANQUE.csv');
  if (!require('fs').existsSync(CSV)) {
    ok(false, 'le fichier d’exemple existe', CSV);
  } else {
    await page.evaluate(() => {
      goPage('home'); rxLoad(); RX.staff = []; rxSaveLocal();
      if (!document.getElementById('rx-csv')) {
        const i = document.createElement('input');
        i.type = 'file'; i.id = 'rx-csv'; i.style.display = 'none';
        i.onchange = function () { rxImport(this); };
        document.body.appendChild(i);
      }
      _rxImportMode = 'replace';
    });
    await page.setInputFiles('#rx-csv', CSV);
    await page.waitForTimeout(1200);

    r = await page.evaluate(() => {
      const st = RX.staff, c = f => st.filter(f).length;
      goPage('cse'); hubOnEnter();
      const G = egaLoad(); G.periodeFin = '2025-12-31'; G.rem = {}; G.exclus = {}; hubSave();
      const L = egaSalaries();
      egaReprendreSalaires();
      const R = egaIndex(egaDonnees());
      const i1 = R.indicateurs[0].r;
      return {
        n: st.length, cadres: c(s => /Cadre/.test(s.statut)),
        salaires: c(s => !!s.salaire), coeffs: c(s => !!s.coeff),
        partiels: c(s => /partiel/i.test(s.tempsTravail || '')),
        sansSexe: c(s => !s.sexe),
        mmeLueFemme: (st.filter(s => s.nom === 'MÜLLER-SCHMIDT')[0] || {}).sexe,
        apostrophe: c(s => /'/.test(s.nom)),
        motifs: [...new Set(L.exclus.map(x => x.motif.replace(/\(\d+ jours\)/, '')))].sort(),
        retenus: L.retenus.length,
        i1: { calc: i1.calculable, ecart: i1.ecart, groupes: i1.retenus.length,
              ecartes: i1.ecartes.length, manque: i1.manque.length },
        grande: R.grande, nbInd: R.indicateurs.length,
        src: cseEffectifSource()
      };
    });
    ok(r.n === 320, '320 salariés importés', r.n);
    ok(r.salaires >= 315 && r.coeffs >= 315,
       'le salaire et le coefficient sont importés — sans eux l’index n’a rien à lire',
       r.salaires + ' salaires / ' + r.coeffs + ' coefficients');
    ok(r.cadres >= 25, 'plus de vingt-cinq cadres : le troisième collège se déclenche', r.cadres);
    ok(r.partiels === 15, 'les quinze temps partiels sont reconnus, quotité comprise', r.partiels);
    ok(r.mmeLueFemme === 'F', '« Mme » à la place du sexe est lue comme une femme', r.mmeLueFemme);
    ok(r.sansSexe === 1, 'le salarié sans sexe reste sans sexe : rien n’est deviné', r.sansSexe);
    ok(r.apostrophe >= 2, 'les noms à apostrophe passent l’import intacts', r.apostrophe);
    ok(r.motifs.join(' | ') ===
       ['contrat d’apprentissage', 'contrat de professionnalisation',
        'mis à disposition par une entreprise extérieure',
        'présent moins de six mois sur la période ', 'sorti avant le début de la période',
        'stagiaire — non salarié'].sort().join(' | '),
       'les six motifs d’exclusion du décret se déclenchent', r.motifs.join(' | '));
    ok(r.grande === true && r.nbInd === 5,
       'au-dessus de 250 salariés : cinq indicateurs', r.nbInd);
    ok(r.i1.calc === true, 'l’écart de rémunération est calculable sur ce fichier');
    ok(r.i1.ecartes >= 1, 'et au moins un groupe est écarté comme non valide', r.i1.ecartes);
    ok(r.i1.manque >= 3, 'les salariés non classables sont nommés, pas comptés à zéro', r.i1.manque);
    ok(r.src.src === 'incomplet' && r.src.quoi && r.src.quoi.length >= 2,
       'l’effectif reste non calculé, et l’application dit CE QUI manque',
       (r.src.quoi || []).join(' · '));
  }

  console.log('\n— La BDESE et l’index s’atteignent en un geste —');
  r = await page.evaluate(() => {
    goPage('home'); goBdese();
    const b = (_hubT === 'bdese');
    goIndexEgalite();
    const e = (_hubT === 'egalite');
    goPage('home');
    try { localStorage.setItem(FAM_LS, 'cse'); } catch (x) {}
    famRender();
    const z = document.getElementById('fam-detail');
    const t = z ? z.innerText : '';
    return { b, e, t, menu: document.body.innerHTML };
  });
  ok(r.b, 'le raccourci ouvre directement l’onglet BDESE');
  ok(r.e, 'et l’autre l’onglet Index égalité');
  ok(/INFORMER LE COMITÉ/.test(r.t), 'un groupe « Informer le comité » apparaît dans la famille CSE');
  ok(/BDESE — la base de données/.test(r.t) && /Index égalité femmes-hommes/.test(r.t),
     'avec les deux cartes');
  ok(/goBdese\(\);closeMenu\(\)/.test(r.menu) && /goIndexEgalite\(\);closeMenu\(\)/.test(r.menu),
     'et les deux entrées de menu');

  console.log('\nExceptions : ' + erreurs.length);
  ok(erreurs.length === 0, 'aucune exception JavaScript', erreurs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(echecs ? ('\n' + echecs + ' ECHEC(S)') : '\ntout est vert');
  process.exit(echecs ? 1 : 0);
})();
