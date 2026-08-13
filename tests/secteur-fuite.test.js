/* CE QUI NE CONCERNE QUE LE TRANSPORT NE DOIT PAS S'AFFICHER AILLEURS.

   Signale par le client, mot pour mot : « on fait une merde pour les
   clients, une banque, une assurance avec secteur et interface transport ? ».
   Il avait raison. L'application declare huit secteurs, mais elle est nee
   pour le transport et une partie n'en etait jamais sortie : le module
   Parcours ne regardait meme pas le secteur choisi — une banque y lisait
   qu'il fallait penser a la FIMO du conducteur, au chronotachygraphe et a la
   convention du transport routier, avec un petit camion devant chaque
   conseil. Le controle-minute posait ses questions sur la GAR et les
   decouchers. Le module Contrat proposait « GR qualifie — coeff. 150
   (longue distance : decouchers) » et une duree de 43 h d'equivalence.

   Ce test ouvre CHAQUE page sous plusieurs secteurs et cherche le
   vocabulaire du transport dans ce qui est REELLEMENT AFFICHE — pas dans le
   code. Une phrase cachee par display:none ne compte pas ; une phrase visible
   compte, ou qu'elle soit ecrite.

   Meme lecon que pour les cles de stockage : enumerer, ne pas lister. Un
   module ajoute demain sera verifie sans qu'on touche a ce test. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test secteur-fuite ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html');

let echecs = 0;
const ok = (c, m, d) => { if (c) console.log('  ok    ' + m); else { echecs++; console.log('  ECHEC ' + m + (d !== undefined ? ' — ' + d : '')); } };

/* Le vocabulaire qui ne peut appartenir qu'au transport routier. */
const MOTS = '\\bFIMO\\b|\\bFCO\\b|chronotachygraphe|tachygraphe|IDCC 0016|\\bconducteur|\\bcamion'
  + '|CARCEPT|licence communautaire|découcher|grand routier|lettre de voiture|\\bCQC\\b'
  + '|561/2006|gestionnaire de transport|FONGECFA|AGECFA|poids lourd|casse-croûte';

/* Ce qui a le DROIT d'en parler, et pourquoi. Toute autre page qui en parle
   fait tomber le test — c'est le but. */
const ADMIS = {
  temps:          'module transport, filtré par secteurs:[transport] sur sa carte',
  temps2:         'idem — fiche hebdomadaire de temps de service',
  'tableau-bord': 'module transport — échéances des conducteurs',
  parc:           'module transport — parc de véhicules',
  nouveautes:     'le journal des versions raconte l’histoire de l’application',
  parametrage:    'la fiche entreprise porte les autorisations de chaque secteur',
  inscription:    'le choix du secteur lui-même',
  admin:          'le tableau de bord du cabinet liste tous les secteurs de ses dossiers'
};

/* Le nom d'un secteur dans une liste deroulante n'est pas une fuite : c'est
   le choix qu'on propose. On l'ecarte avant de compter. */
const BRUIT = /Transport routier( de marchandises)?( \(IDCC 0016\))?/g;

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await nav.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e).slice(0, 160)));
  await page.goto(URL);
  await page.waitForTimeout(1200);

  const pages = await page.evaluate(() => {
    sessionStorage.setItem('jte_ok', '1'); sessionStorage.setItem('jte_admin', '1');
    document.getElementById('pg-inscription').style.display = 'none';
    document.getElementById('pg-app').style.display = 'block';
    document.getElementById('accueil-screen').style.display = 'none';
    return [...document.querySelectorAll('.page')].map(x => x.id.replace(/^pg-/, ''));
  });
  console.log('\n— ' + pages.length + ' pages, quatre secteurs —');

  const fuites = {};
  for (const sec of ['banque', 'assurances', 'batiment', 'syntec']) {
    for (const id of pages) {
      const t = await page.evaluate(([s, i]) => {
        appSetSecteur(s); goPage(i);
        const z = document.getElementById('pg-' + i);
        return z ? (z.innerText || '') : '';
      }, [sec, id]);
      const h = t.replace(BRUIT, '').match(new RegExp(MOTS, 'gi')) || [];
      if (h.length) {
        fuites[id] = fuites[id] || new Set();
        h.forEach(x => fuites[id].add(x.toLowerCase()));
      }
    }
  }

  const coupables = Object.keys(fuites).filter(id => !ADMIS[id]).sort();
  coupables.forEach(id => console.log('    ' + id + ' → ' + [...fuites[id]].slice(0, 8).join(', ')));
  ok(coupables.length === 0,
     'aucune page ne parle transport à une banque, une assurance, un bâtiment ou un Syntec',
     coupables.join(', '));

  /* Et le transport, lui, doit toujours l'avoir. Une correction qui viderait
     l'application de son secteur d'origine serait pire que le defaut. */
  const tr = await page.evaluate(m => {
    const rx = new RegExp(m, 'gi');
    const vus = {};
    for (const id of ['parcours', 'audit', 'contrat', 'temps']) {
      appSetSecteur('transport'); goPage(id);
      const z = document.getElementById('pg-' + id);
      const t = z ? (z.innerText || '') : '';
      vus[id] = (t.match(rx) || []).length;
    }
    return vus;
  }, MOTS);
  Object.keys(tr).forEach(id => console.log('    transport · ' + id + ' : ' + tr[id] + ' mention(s)'));
  ok(Object.keys(tr).every(id => tr[id] > 0),
     'et le secteur transport garde les siennes — on n’a rien vidé', JSON.stringify(tr));

  /* Le mecanisme lui-meme : un element marque data-sec ne survit qu'a son
     secteur, et rien n'est cache tant qu'aucun secteur n'est choisi. */
  console.log('\n— Le mécanisme data-sec —');
  const mec = await page.evaluate(() => {
    const n = document.querySelectorAll('[data-sec]').length;
    appSetSecteur('banque'); goPage('contrat');
    const cachesBanque = [...document.querySelectorAll('[data-sec="transport"]')].filter(x => x.style.display === 'none').length;
    appSetSecteur('transport'); goPage('contrat');
    const cachesTransport = [...document.querySelectorAll('[data-sec="transport"]')].filter(x => x.style.display === 'none').length;
    appSetSecteur(''); goPage('contrat');
    const cachesSansSecteur = [...document.querySelectorAll('[data-sec="transport"]')].filter(x => x.style.display === 'none').length;
    return { n, cachesBanque, cachesTransport, cachesSansSecteur };
  });
  ok(mec.n > 0, 'des éléments portent l’attribut', mec.n);
  ok(mec.cachesBanque === mec.n, 'sur Banque, tous les blocs transport sont retirés', JSON.stringify(mec));
  ok(mec.cachesTransport === 0, 'sur Transport, ils reviennent tous', JSON.stringify(mec));
  ok(mec.cachesSansSecteur === 0, 'et sans secteur choisi, on ne cache rien — on ne suppose pas', JSON.stringify(mec));

  console.log('\nExceptions : ' + erreurs.length);
  ok(erreurs.length === 0, 'aucune exception JavaScript', erreurs.slice(0, 3).join(' | '));

  await nav.close();
  console.log(echecs ? ('\n' + echecs + ' ECHEC(S)') : '\ntout est vert');
  process.exit(echecs ? 1 : 0);
})();
