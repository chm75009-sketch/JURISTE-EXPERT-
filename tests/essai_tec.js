/* Le cas reel de T.E.C passe dans l'application corrigee.
   Donnees : le registre des 85 salaries, l'information du personnel affichee
   le 16 septembre 2026, les cinq lettres recommandees parties le 28 septembre,
   aucune reponse, premier tour au 15 decembre 2026, aucune liste deposee. */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — essai T.E.C ignore.'); process.exit(0); }

const CSV = process.argv[2];
const APP = 'file://' + path.resolve(__dirname, '..', 'index.html');

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await nav.newPage();
  const err = [];
  page.on('pageerror', e => err.push(String(e)));
  await page.goto(APP);
  await page.waitForTimeout(1200);

  /* La fiche de l'entreprise, puis le registre. */
  await page.evaluate(() => {
    window.E = window.E || {};
    E.nom = 'SARL TEC'; E.adresse = '23 avenue du Château, 95100 Argenteuil';
    E.siret = '53845047900034'; E.dirigeant = 'Chadi EL SAFADI';
    E.ccn = 'Transports routiers et activités auxiliaires du transport';
    E.idcc = '16';
    window.confirm = () => true; window.alert = m => { window._alerte = String(m); };
  });
  await page.setInputFiles('#cse-nom-import', CSV);
  await page.waitForTimeout(2500);

  await page.evaluate(() => {
    document.getElementById('cse-nom-date-scrutin').value = '2026-12-15';
    refreshNomTable();
  });
  await page.waitForTimeout(1500);

  const r = await page.evaluate(() => {
    const JS = '2026-12-15';
    const l = (typeof salariesNom !== 'undefined' ? salariesNom : []);
    let elec = 0, elig = 0, vigil = 0;
    const horsElec = [];
    l.forEach(s => {
      const x = calcSalarieNom(s, JS);
      if (x.electeur) elec++; else horsElec.push((s.nom || '?') + ' — ' + (x.electeurRaison || ''));
      if (x.eligible) elig++;
    });
    /* L'effectif de L.1111-2 : la somme des quotites, arrondie par defaut,
       comme le fait le tableau justificatif. */
    let total = 0;
    l.forEach(s => { const x = calcSalarieNom(s, JS); total += (x.effectif || 0); });
    const eff = { somme: Math.round(total * 100) / 100, retenu: Math.floor(total) };
    const pan = (document.getElementById('cse-nom-vigilance') || {}).innerText || '';
    vigil = (pan.match(/\n/g) || []).length;
    return {
      lignes: l.length, electeurs: elec, eligibles: elig,
      effectif: eff, horsElec: horsElec.slice(0, 12),
      vigilance: pan.slice(0, 1400)
    };
  });

  console.log('— LE REGISTRE DE T.E.C DANS L\'APPLICATION —');
  console.log('  fiches importees  :', r.lignes);
  console.log('  effectif          :', JSON.stringify(r.effectif));
  console.log('  electeurs au 15/12:', r.electeurs);
  console.log('  eligibles au 15/12:', r.eligibles);
  console.log('\n  ecartes de l\'electorat :');
  r.horsElec.forEach(x => console.log('   -', x.slice(0, 150)));

  const bar = await page.evaluate(() => {
    let total = 0;
    (typeof salariesNom !== 'undefined' ? salariesNom : []).forEach(s => {
      const x = calcSalarieNom(s, '2026-12-15'); total += (x.effectif || 0);
    });
    const n = Math.floor(total);
    return { effectif: n, bareme: (typeof cseBareme === 'function') ? cseBareme(n) : null };
  });
  console.log('\n  bareme R.2314-1   :', JSON.stringify(bar));

  /* La bifurcation : aucune liste deposee au 1er tour. */
  const etape = await page.evaluate(() => {
    const sel = document.getElementById('cse-etape-scrutin');
    sel.value = 'aucune_liste'; cseEtapeMaj();
    const hors = (CSE_SITUATIONS.aucune_liste.hors || []);
    const tous = ['calendrier','note_info','invitations_osr','pv_absence_osr','pap_unilateral',
                  'convocations','emargement','bulletin','pv_1er',
                  'note_info_2eme','convocations_2eme','bulletin_2eme','pv_2eme',
                  'pv_carence_total','affichage_resultats'];
    return { hors: hors, retenus: tous.filter(t => hors.indexOf(t) < 0),
             note: (document.getElementById('cse-etape-note') || {}).innerText || '' };
  });
  console.log('\n— AUCUNE LISTE DEPOSEE : CE QUE LE DOSSIER PORTE —');
  console.log('  ecartes :', etape.hors.join(', '));
  console.log('  retenus :', etape.retenus.join(', '));

  /* Le calendrier produit, et ce qu'il dit. */
  const cal = await page.evaluate(() => {
    window._docCurrent = null;
    try { genDocElectionTEC('calendrier'); } catch (e) { return { err: String(e) }; }
    const h = ((window._docCurrent || {}).html || '');
    const txt = h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    return {
      ccnBanque: /banque/i.test(h), ccn16: /IDCC 16|IDCC 0016/.test(h),
      arret2012: /11-60\.231/.test(h), portage: /L\.2314-24/.test(h),
      an1993: /3 nov\. 1993/.test(h),
      repOuNon: /représentatives ou non/.test(h),
      limite2e: /DATE LIMITE/.test(h),
      convocCond: /seulement si une liste/.test(h),
      transmission: /L\.2314-9/.test(h),
      avertL23144: /L\.2314-4 EST ÉPUISÉ|DÉLAI DE L'ARTICLE L\.2314-4/.test(h),
      extraitConvoc: (txt.match(/Convocation individuelle des électeurs[^|]{0,170}/) || [''])[0]
    };
  });
  console.log('\n— LE CALENDRIER PRODUIT —');
  Object.keys(cal).forEach(k => console.log('  ' + k.padEnd(14), JSON.stringify(cal[k]).slice(0, 190)));

  console.log('\n  exceptions JavaScript :', err.length ? err.join(' | ') : 'aucune');
  await nav.close();
})();
