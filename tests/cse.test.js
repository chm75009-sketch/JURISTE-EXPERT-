/* ══════════════════════════════════════════════════════════════════
   TESTS DU MODULE CSE — a lancer avec :  node tests/cse.test.js
   Ce fichier existe pour une raison precise : dans ce module, le
   message affiche et le calcul qui l'applique sont ecrits a deux
   endroits differents. Rien n'empeche l'un de dire une chose et
   l'autre d'en faire une autre. C'est arrive trois fois.
   Ces tests echouent quand les deux divergent, et sur chaque borne
   de seuil : 10/11, 49/50, 299/300, 999/1000, 1999/2000.
   ══════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');

/* ── Extraction des modules depuis le fichier unique ── */
function bloc(debut, finMarqueur) {
  const i = SRC.indexOf(debut);
  if (i < 0) throw new Error('bloc introuvable : ' + debut);
  const f = SRC.indexOf(finMarqueur, i);
  if (f < 0) throw new Error('fin introuvable : ' + finMarqueur);
  const j = SRC.lastIndexOf('/*', f);
  return SRC.slice(i, j > i ? j : f);
}
function helpers() {
  const i = SRC.indexOf('function jxArticles(txt)');
  const j = SRC.indexOf('function jxCohHTML(alertes)');
  if (i < 0 || j < 0) throw new Error('helpers d’affichage introuvables');
  return SRC.slice(i, j);
}

const PRELUDE = `
var _store={};
var localStorage={getItem:function(k){return _store[k]||null;},setItem:function(k,v){_store[k]=v;}};
function rxAccountId(){return 'test';}
function rxISO(s){ if(!s) return ''; s=String(s).trim();
  var m=s.match(/^(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})$/);
  if(m) return m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);
  if(/^\\d{4}-\\d{2}-\\d{2}/.test(s)) return s.slice(0,10); return ''; }
function rxLoad(){}
function csedRender(){} function mcRender(){} function calRender(){}
function reuRender(){} function rclRender(){} function cnsRender(){} function hubRender(){}
function socRender(){} function goPage(){}
var RX={staff:[],ent:{}};
`;

/* La lecture de l'effectif est partagee par tous les modules : elle doit
   entrer dans le bac a sable, sinon chaque module tombe sur une fonction
   absente au lieu d'etre reellement teste. */
function effectifCommun() {
  /* Depuis que l'effectif annonce sa source, cseEffectif() delegue a
     cseEffectifSource() — qui le precede dans le fichier. Partir du premier
     des deux, sinon le bac a sable recoit un appel vers une fonction qu'il
     n'a pas extraite. */
  /* Le bareme R.2314-1 (JX_BAREME / jxBareme) precede desormais la lecture
     de l'effectif : mcBareme et cseBareme s'y ramenent, il doit donc entrer
     dans le bac a sable, sinon « jxBareme is not defined ». */
  const i = SRC.indexOf('function jxEffectifSaisi(');
  const j = SRC.indexOf('var BUD={};', i);
  if (i < 0 || j < 0) throw new Error('lecture commune de l’effectif introuvable');
  return SRC.slice(i, j);
}

const CODE = PRELUDE
  + bloc('var SOC = { idcc:', '   RENDU\n')
  + effectifCommun()
  + bloc('var CSED = {};', 'function csedTableExos')
  + bloc('var MC={};', 'function mcOnEnter')
  + bloc('var CAL={};', 'function calOnEnter')
  + bloc('var REU={};', 'function reuV(x,def)')
  + bloc('var RCL={};', 'function rclDoc(k)')
  + bloc('var CNS={};', 'function cnsOnEnter')
  + bloc('var HUB={};', 'var HUB_CATS=')
  + bloc('var HUB_CATS=', 'function hubVueTaches')
  + bloc('var GUIDE_MOTS=', 'function hubVueGuide')
  + helpers();

/* On evalue dans un contexte ou l'on peut ecrire les globales des modules. */
const ctx = {};
(function () {
  // Des fonctions, pas des accesseurs : Object.assign lirait les getters
  // au moment de la copie, avant que les globales n'existent.
  const f = new Function(CODE + `
    return {
      poser:function(nom,v){
        if(nom==='RX') RX=v; else if(nom==='SOC') SOC=v; else if(nom==='CSED') CSED=v;
        else if(nom==='MC') MC=v; else if(nom==='CAL') CAL=v; else if(nom==='REU') REU=v;
        else if(nom==='RCL') RCL=v; else if(nom==='CNS') CNS=v; else if(nom==='HUB') HUB=v;
        else throw new Error('globale inconnue : '+nom);
      },
      lire:function(nom){
        if(nom==='RX') return RX; if(nom==='SOC') return SOC; if(nom==='CSED') return CSED;
        if(nom==='MC') return MC; if(nom==='CAL') return CAL; if(nom==='REU') return REU;
        if(nom==='RCL') return RCL; if(nom==='CNS') return CNS; if(nom==='HUB') return HUB;
        throw new Error('globale inconnue : '+nom);
      },
      socEffectifAt:socEffectifAt, socSerie:socSerie, socSeuil:socSeuil,
      csedAnalyse:csedAnalyse, mcAnalyse:mcAnalyse, mcBareme:mcBareme,
      calAnalyse:calAnalyse, calNombre:calNombre, calRegime:calRegime, calSeances:calSeances,
      reuAnalyse:reuAnalyse, rclAnalyse:rclAnalyse, rclRegime:rclRegime,
      cnsAnalyse:cnsAnalyse, cnsPeriodicite:cnsPeriodicite,
      hubAlertes:hubAlertes, hubEcheances:hubEcheances, hubClasseur:hubClasseur,
      hubTaches:hubTaches, hubIdTache:hubIdTache,
      cseEffectif:cseEffectif, cseEffectifSaisi:cseEffectifSaisi,
      guideEtapes:guideEtapes, guidePlan:guidePlan,
      jxArticles:jxArticles, jxPremierePhrase:jxPremierePhrase
    };
  `);
  const api = f.call({});
  Object.keys(api).forEach(k => { if (k !== 'poser' && k !== 'lire') ctx[k] = api[k]; });
  ['RX','SOC','CSED','MC','CAL','REU','RCL','CNS','HUB'].forEach(nom => {
    Object.defineProperty(ctx, nom, {
      get: () => api.lire(nom),
      set: v => api.poser(nom, v)
    });
  });
})();

/* ── Petit harnais ── */
let ok = 0, ko = 0;
const echecs = [];
function test(nom, fn) {
  try { fn(); ok++; }
  catch (e) { ko++; echecs.push({ nom, msg: e.message }); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function egal(a, b, msg) { if (a !== b) throw new Error(`${msg} — attendu ${b}, obtenu ${a}`); }

/* ── Fabrique d'entreprise ── */
function entreprise(n, options) {
  const o = options || {};
  const staff = [];
  for (let i = 1; i <= n; i++) {
    staff.push({ id: 's' + i, nom: 'S' + i, prenom: '', entree: '2015-01-05', sortie: '',
                 typeContrat: 'CDI', tempsTravail: 'Temps plein' });
  }
  ctx.RX = { staff, ent: {} };
  ctx.SOC = { duree: 35, sal: {}, idcc: o.idcc || '' };
  ctx.CSED = Object.assign({ situation: 'encours', dateElec: '2024-06-03', duree: '4', exercices: [] }, o.csed || {});
  ctx.MC = Object.assign({ tour1: '2024-06-03', duMandat: '4', elus: [] }, o.mc || {});
  ctx.CAL = Object.assign({ premiere: '2026-01-08', faites: [] }, o.cal || {});
  ctx.REU = Object.assign({ points: [], votes: [], presents: {} }, o.reu || {});
  ctx.RCL = Object.assign({ liste: [] }, o.rcl || {});
  ctx.CNS = Object.assign({ bdese: 'oui', c: {} }, o.cns || {});
  ctx.HUB = { classeur: {}, bdese: {}, faites: {} };
}
function effectif() {
  const s = ctx.socSerie(36);
  return s[s.length - 1].ent;
}
function titres(alertes) { return (alertes || []).map(a => a.titre || a.t || ''); }
/* Les libelles portent des accents et des apostrophes typographiques ;
   les motifs de test, non. On compare sur une forme neutre, sinon le test
   echoue pour une raison qui n'a rien a voir avec le code. */
function neutre(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'").toLowerCase();
}
function contient(alertes, motif) {
  const src = motif instanceof RegExp ? motif.source : String(motif);
  const re = new RegExp(neutre(src), 'i');
  return titres(alertes).some(t => re.test(neutre(t)));
}

/* ══════════════════════════════════════════════════════════════════
   1. LES BORNES DE SEUIL
   Un seuil se teste des deux cotes. C'est la seule facon de voir un
   « >= » ecrit a la place d'un « > ».
   ══════════════════════════════════════════════════════════════════ */
const BORNES = [
  { n: 10, sous: true, seuil: 11 }, { n: 11, sous: false, seuil: 11 },
  { n: 49, sous: true, seuil: 50 }, { n: 50, sous: false, seuil: 50 },
  { n: 299, sous: true, seuil: 300 }, { n: 300, sous: false, seuil: 300 },
  { n: 999, sous: true, seuil: 1000 }, { n: 1000, sous: false, seuil: 1000 },
  { n: 1999, sous: true, seuil: 2000 }, { n: 2000, sous: false, seuil: 2000 }
];

BORNES.forEach(b => {
  test(`effectif calcule exactement ${b.n}`, () => {
    entreprise(b.n);
    egal(effectif(), b.n, `effectif pour ${b.n} salaries a temps plein`);
  });
});

test('seuil de 11 : le comite n’est obligatoire qu’a partir de 11', () => {
  entreprise(10, { csed: { situation: 'aucun' } });
  const a10 = ctx.csedAnalyse().alertes;
  assert(!contient(a10, /doit etre mis en place|Engagez les elections/), '10 salaries : le comite ne doit pas etre exige');
  entreprise(11, { csed: { situation: 'aucun' } });
  const a11 = ctx.csedAnalyse().alertes;
  assert(contient(a11, /Engagez les elections|doit etre mis en place/), '11 salaries : le comite doit etre exige');
});

test('seuil de 50 : les consultations recurrentes ne s’appliquent qu’a partir de 50', () => {
  entreprise(49);
  assert(contient(ctx.cnsAnalyse().alertes, /Moins de cinquante/), '49 : les consultations ne s’appliquent pas');
  entreprise(50);
  assert(!contient(ctx.cnsAnalyse().alertes, /Moins de cinquante/), '50 : les consultations s’appliquent');
});

/* Un registre vide n'est pas une entreprise de zero salarie. Tant que rien
   n'a ete saisi, aucun module ne doit placer l'entreprise sous un seuil :
   il doit dire qu'il ne sait pas. */
test('registre vide : l’effectif est inconnu, pas nul', () => {
  entreprise(150);
  ctx.RX = { staff: [], ent: {} };
  ctx.CSED = Object.assign({}, ctx.CSED, { exercices: [] });
  assert(ctx.cseEffectif() === null, 'aucune donnee : l’effectif vaut null, obtenu ' + ctx.cseEffectif());
  assert(!contient(ctx.cnsAnalyse().alertes, /Moins de cinquante/),
    'aucune donnee : le module ne declare pas l’entreprise sous cinquante');
  assert(contient(ctx.cnsAnalyse().alertes, /inconnu|renseign/),
    'aucune donnee : le module dit que l’effectif manque');
});

/* L'effectif saisi a la main pour un exercice fait foi quand le registre du
   personnel n'est pas tenu : c'est la raison pour laquelle il est demande. */
test('registre vide mais effectif saisi par exercice : c’est lui qui fait foi', () => {
  entreprise(150);
  ctx.RX = { staff: [], ent: {} };
  ctx.CSED = Object.assign({}, ctx.CSED, { exercices: [
    { cloture: '2024-12-31', ent: '40' },
    { cloture: '2025-12-31', ent: '150' }
  ] });
  assert(ctx.cseEffectif() === 150, 'le dernier exercice clos fait foi, ici 150 — obtenu : ' + ctx.cseEffectif());
});

test('seuil de 300 : les commissions obligatoires', () => {
  entreprise(299, { csed: { siteRisque: 'non' } });
  assert(!contient(ctx.csedAnalyse().alertes, /Commissions obligatoires a trois cents/), '299 : pas de commissions');
  entreprise(300, { csed: { siteRisque: 'non' } });
  assert(contient(ctx.csedAnalyse().alertes, /Commissions obligatoires a trois cents/), '300 : commissions obligatoires');
});

test('seuil de 1000 : commission economique', () => {
  entreprise(999, { csed: { siteRisque: 'non' } });
  assert(!contient(ctx.csedAnalyse().alertes, /Commission economique/), '999 : pas de commission economique');
  entreprise(1000, { csed: { siteRisque: 'non' } });
  assert(contient(ctx.csedAnalyse().alertes, /Commission economique/), '1000 : commission economique');
});

/* Article L.2315-61 : « 0,22 % de la masse salariale brute dans les
   entreprises D'AU MOINS deux mille salaries ». Le seuil est atteint a
   2 000, il n'a pas a etre depasse. Ce test disait l'inverse, et le code
   du diagnostic et du guide le suivait : a 2 000 salaries pile,
   l'application annoncait 0,20 % au lieu de 0,22 %. */
test('seuil de 2000 : la subvention est a 0,22 % DES 2000, pas au-dela', () => {
  entreprise(1999, { csed: { siteRisque: 'non' } });
  assert(!contient(ctx.csedAnalyse().alertes, /0,22/), '1999 : encore 0,20 %');
  entreprise(2000, { csed: { siteRisque: 'non' } });
  assert(contient(ctx.csedAnalyse().alertes, /0,22/), '2000 pile : deja 0,22 %');
  entreprise(2001, { csed: { siteRisque: 'non' } });
  assert(contient(ctx.csedAnalyse().alertes, /0,22/), '2001 : 0,22 %');
});

test('periodicite des reunions selon l’effectif', () => {
  entreprise(30); egal(ctx.calRegime(30).n, 12, '11 a 49 : une reunion par mois');
  entreprise(120); egal(ctx.calRegime(120).n, 6, '50 a 299 : six par an');
  entreprise(300); egal(ctx.calRegime(300).n, 12, '300 et plus : une par mois');
});

test('formalisme des reclamations : uniquement sous 50 salaries', () => {
  entreprise(49); assert(ctx.rclRegime(49).formalise === true, '49 : formalisme de L.2315-22');
  entreprise(50); assert(ctx.rclRegime(50).formalise === false, '50 : plus de formalisme impose');
});

/* ══════════════════════════════════════════════════════════════════
   2. LE MESSAGE ET LE CALCUL DISENT-ILS LA MEME CHOSE ?
   C'est le defaut qui s'est repete. Chaque alerte qui annonce
   « la clause est ecartee » doit etre suivie d'un calcul qui l'ecarte.
   ══════════════════════════════════════════════════════════════════ */
test('accord sous six reunions : la clause annoncee ecartee l’est reellement', () => {
  entreprise(120, { cal: { premiere: '2026-01-08', accord: 'oui', nbAccord: '4' } });
  const r = ctx.calAnalyse();
  assert(contient(r.alertes, /clause de l’accord est ecartee|ecartee/i), 'l’alerte doit annoncer que la clause est ecartee');
  egal(r.n, 6, 'le calendrier doit revenir a la regle supletive');
  egal(r.seances.length, 6, 'et engendrer six seances, pas quatre');
});

/* Une clause de periodicite superieure a trois ans excede ce que l'accord
   pouvait stipuler (L.2312-19). Ce qu'il en advient se discute : plafonner a
   trois ans, ou tenir la clause pour non ecrite et revenir a l'annuel
   (L.2312-17). L'application retient l'annuel — la seule lecture qui n'expose
   pas celui qui la suit a l'entrave — et le DIT, en enoncant les deux. Ce test
   garde les trois choses : l'alerte, les deux lectures annoncees, et le calcul
   qui suit reellement celle qui est retenue. */
test('periodicite de consultation au-dela de trois ans : la clause est ecartee', () => {
  entreprise(120, { cns: { bdese: 'oui', accord: 'oui', periodicite: '5', c: {} } });
  const r = ctx.cnsAnalyse();
  assert(contient(r.alertes, /clause est ecartee/), 'le titre doit annoncer que la clause est ecartee');
  assert(contient(r.alertes, /annuelle/), 'et le retour a la regle suppletive annuelle');
  /* contient() ne lit que les titres : les deux lectures sont dans le corps. */
  const corps = r.alertes.map(a => neutre(String(a.texte || ''))).join(' ');
  assert(/trois ans/.test(corps), 'le corps doit rappeler le plafond de trois ans');
  assert(/se discute/.test(corps) && /non ecrite/.test(corps),
    'les deux lectures doivent etre enoncees, pas une seule');
  egal(ctx.cnsPeriodicite(), 1, 'et le calcul doit suivre : consultation annuelle');
});

/* En deca du plafond, la clause s'applique telle quelle : ecarter une clause
   licite serait le defaut symetrique. */
test('periodicite de trois ans ou moins : la clause de l’accord s’applique', () => {
  entreprise(120, { cns: { bdese: 'oui', accord: 'oui', periodicite: '3', c: {} } });
  egal(ctx.cnsPeriodicite(), 3, 'trois ans est licite : la clause tient');
  entreprise(120, { cns: { bdese: 'oui', accord: 'oui', periodicite: '2', c: {} } });
  egal(ctx.cnsPeriodicite(), 2, 'deux ans aussi');
});

test('sans base de donnees, aucune echeance d’avis n’est calculee', () => {
  entreprise(120, { cns: { bdese: 'non', c: { strat: { etat: 'encours', debut: '2026-01-05', exp: 'aucune' } } } });
  const r = ctx.cnsAnalyse();
  assert(contient(r.alertes, /Mettez en place la base|base de donn/i), 'l’absence de base doit etre signalee');
  assert(contient(r.alertes, /suspendu/i), 'le delai doit etre annonce suspendu');
  assert(!contient(r.alertes, /delai est passe|repute negatif/i),
    'aucun avis repute negatif ne doit etre annonce sans base de donnees');
});

test('decompte impossible : aucune issue de vote n’est declaree', () => {
  entreprise(120, {
    mc: { elus: [{ nom: 'A', q: 'tit' }, { nom: 'B', q: 'tit' }], secretaire: '0', tresorier: '1', referent: '0' },
    reu: { date: '2026-09-15', dateOdj: '2026-09-10', points: [{ t: 'X', o: 'conjoint' }],
           votes: [{ t: 'D', pour: '5', contre: '1', abst: '0' }], presents: { '0': true, '1': true } }
  });
  const a = ctx.reuAnalyse().alertes;
  assert(contient(a, /Corrigez le vote|plus de voix/i), 'le decompte impossible doit etre signale');
  assert(!contient(a, /^Adopt|^Rejet/i), 'aucune issue ne doit etre annoncee quand le decompte est impossible');
});

test('convention de branche : elle s’applique a defaut d’accord d’entreprise', () => {
  entreprise(120, { cal: { premiere: '2026-01-08', accord: 'ccn', nbCCN: '10' } });
  egal(ctx.calAnalyse().n, 10, 'la convention de branche doit fixer le nombre de reunions');
});
test('accord d’entreprise : il prime sur la convention de branche', () => {
  entreprise(120, { cal: { premiere: '2026-01-08', accord: 'deux', nbAccord: '6', nbCCN: '10' } });
  egal(ctx.calAnalyse().n, 6, 'l’accord d’entreprise prime (L.2253-3)');
});

/* ══════════════════════════════════════════════════════════════════
   3. LE BAREME DES SIEGES — R.2314-1
   ══════════════════════════════════════════════════════════════════ */
/* CE TABLEAU A DÉJÀ MENTI UNE FOIS, ET C'EST INSTRUCTIF.
   Il annonçait 3 titulaires à 50 salariés, 4 à 75, 5 à 100 : la colonne des
   sièges avait un cran de retard sur toute la plage 50-299. Le test passait
   au vert parce qu'il avait été écrit **d'après le code**, pas d'après le
   texte — il recopiait le défaut au lieu de le trouver. Le nombre de sièges
   est injecté dans le protocole préélectoral : un protocole qui en annonce
   un de moins expose l'élection à l'annulation.
   Les valeurs ci-dessous ont été confrontées à des sources extérieures :
   50-74 = 4 titulaires (18 h), 75-99 = 5 (19 h), 100-124 = 6 (21 h),
   125-149 = 7, 200-249 = 10, 250-299 = 11.
   Ne modifie JAMAIS une ligne de ce tableau pour faire passer le test :
   va d'abord lire R.2314-1. */
const BAREME = [
  [10, 0, 0], [11, 1, 10], [24, 1, 10], [25, 2, 10], [49, 2, 10],
  [50, 4, 18], [74, 4, 18], [75, 5, 19], [99, 5, 19], [100, 6, 21],
  [124, 6, 21], [125, 7, 21], [200, 10, 22], [249, 10, 22], [250, 11, 22], [299, 11, 22],
  [300, 11, 22], [500, 13, 24], [1500, 20, 26], [9999, 34, 32], [10000, 35, 34], [12000, 35, 34]
];
BAREME.forEach(([n, sieges, heures]) => {
  test(`bareme R.2314-1 a ${n} salaries`, () => {
    const b = ctx.mcBareme(n);
    egal(b.sieges, sieges, `sieges a ${n}`);
    egal(b.heures, heures, `heures a ${n}`);
  });
});

/* ══════════════════════════════════════════════════════════════════
   4. EXCLUSIONS DE L'EFFECTIF — L.1111-3
   ══════════════════════════════════════════════════════════════════ */
test('apprentis, contrats pro et remplacants sont exclus de l’effectif', () => {
  entreprise(100);
  const staff = ctx.RX.staff.slice();
  for (let i = 1; i <= 20; i++) staff.push({ id: 'a' + i, nom: 'A' + i, entree: '2025-09-01', sortie: '', typeContrat: 'Apprentissage', tempsTravail: 'Temps plein' });
  for (let i = 1; i <= 10; i++) staff.push({ id: 'p' + i, nom: 'P' + i, entree: '2025-09-01', sortie: '', typeContrat: 'Contrat de professionnalisation', tempsTravail: 'Temps plein' });
  ctx.RX = { staff, ent: {} };
  egal(effectif(), 100, 'ni les apprentis ni les contrats de professionnalisation ne comptent');
});

test('le temps partiel compte au prorata des heures', () => {
  entreprise(0);
  const staff = [];
  for (let i = 1; i <= 10; i++) staff.push({ id: 't' + i, nom: 'T' + i, entree: '2015-01-05', sortie: '', typeContrat: 'CDI', tempsTravail: 'Temps partiel 50%' });
  ctx.RX = { staff, ent: {} };
  egal(effectif(), 5, 'dix mi-temps comptent pour cinq');
});

/* ══════════════════════════════════════════════════════════════════
   5. IDENTIFIANTS DE TACHE — ils doivent survivre a une resaisie
   ══════════════════════════════════════════════════════════════════ */
test('les identifiants de tache sont stables et sans doublon', () => {
  entreprise(120, { csed: { situation: 'aucun', dateInfo: '2026-07-01', siteRisque: 'non' } });
  const t1 = ctx.hubTaches().map(x => x.id);
  const t2 = ctx.hubTaches().map(x => x.id);
  egal(t1.join('|'), t2.join('|'), 'deux appels doivent donner les memes identifiants');
  const vus = {}; let doublons = 0;
  t1.forEach(id => { if (vus[id]) doublons++; vus[id] = 1; });
  egal(doublons, 0, 'aucun identifiant en double');
});

/* ══════════════════════════════════════════════════════════════════
   6. LE GUIDE — il doit couvrir ce qu'il annonce
   ══════════════════════════════════════════════════════════════════ */
test('le guide ne pose pas de question d’election sous 11 salaries', () => {
  entreprise(6, { csed: { situation: 'aucun' } });
  const q = ctx.guideEtapes().map(e => e.titre).join(' | ');
  assert(!/vote allait avoir lieu/i.test(q), 'aucune question sur l’information du personnel sous 11 salaries');
});

test('le guide couvre les obligations d’un grand groupe', () => {
  entreprise(5000, { csed: { situation: 'encours', dateElec: '2023-05-15', etabs: '12', groupe: 'oui',
                             effEEE: '9200', effFR: '5300', effMonde: '9200', siteRisque: 'inb' } });
  const plan = ctx.guidePlan().map(p => p.q).join(' | ');
  ['commission securite|commission sécurité', 'trois commissions', 'commission economique|commission économique',
   '0,22', 'chaque site', 'groupe', 'europeenne|européenne', 'conseil d’administration'
  ].forEach(motif => {
    assert(new RegExp(motif, 'i').test(plan), `le plan d’un groupe de 5 000 doit mentionner : ${motif}`);
  });
});

/* ══════════════════════════════════════════════════════════════════
   7. AFFICHAGE — la premiere phrase doit rester courte
   ══════════════════════════════════════════════════════════════════ */
test('chaque alerte tient en une phrase lisible', () => {
  entreprise(120, { csed: { situation: 'aucun', dateInfo: '2026-01-10', siteRisque: 'non' } });
  const longues = [];
  ctx.hubAlertes().forEach(a => {
    const c = ctx.jxPremierePhrase(a.texte);
    if (c.length > 200) longues.push(a.titre + ' (' + c.length + ')');
  });
  egal(longues.length, 0, 'alertes dont la premiere phrase depasse 200 caracteres : ' + longues.join(', '));
});

test('aucune alerte sans titre', () => {
  entreprise(120, { csed: { situation: 'aucun', siteRisque: 'non' } });
  const sansTitre = ctx.hubAlertes().filter(a => !String(a.titre || '').trim());
  egal(sansTitre.length, 0, 'toute alerte doit porter un titre');
});

/* ── Verdict ── */
console.log('');
echecs.forEach(e => { console.log('  ECHEC  ' + e.nom + '\n         ' + e.msg); });
console.log('');
console.log(`  ${ok} test(s) reussi(s), ${ko} echec(s)`);
process.exit(ko ? 1 : 0);
