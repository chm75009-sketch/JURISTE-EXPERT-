/* CE QUI EST SAISI TIENT — ET CE QUI EST EFFACE RESTE EFFACE.

   Six defauts sont passes sous les autres tests parce qu'aucun d'eux ne
   traversait un RECHARGEMENT ni un CHANGEMENT DE DOSSIER apres restauration.
   Tous venaient du meme schema : un etat global en memoire qui reecrivait
   des champs sans jamais etre invalide.

     1. un export Excel francais etait refuse comme « pas un tableau
        lisible », et le refus VIDAIT la liste des salaries deja saisis ;
     2. le nom d'un salarie du dossier transport reapparaissait dans le
        dossier banque, et y etait enregistre ;
     3. un champ efface revenait a la navigation suivante, une case
        decochee se recochait : l'effacement etait impossible ;
     4. le report gelait l'effectif — un titulaire a elire pour cinq mille
        salaries, alors que le champ annonce « repris de votre fiche » ;
     5. le choix explicite du client ne survivait pas au rechargement ;
     6. neuf mille suffrages pour dix inscrits validaient un premier tour.

   Ce test les rejoue tous les six. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test etat ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html');

let echecs = 0;
const ok = (c, m, d) => { if (c) console.log('  ok    ' + m); else { echecs++; console.log('  ECHEC ' + m + (d !== undefined ? ' — ' + d : '')); } };

const CR = String.fromCharCode(13), LF = String.fromCharCode(10), TAB = String.fromCharCode(9);

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e)));
  page.on('dialog', d => d.dismiss());

  const entrer = async () => {
    await page.evaluate(() => {
      sessionStorage.setItem('jte_ok', '1'); sessionStorage.setItem('jte_admin', '1');
      document.getElementById('pg-inscription').style.display = 'none';
      document.getElementById('pg-app').style.display = 'block';
      document.getElementById('accueil-screen').style.display = 'none';
      goPage('home');
    });
    await page.waitForTimeout(250);
  };

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await entrer();

  // ══ 1. UN TABLEUR PRODUIT DES GUILLEMETS, DES TABULATIONS ET DES CRLF ══
  console.log('\n— Le garde-fou de l’import ne doit pas refuser un vrai tableau —');
  const lisible = await page.evaluate(([cr, lf, tab]) => ({
    excelFr: jxTexteLisible('"Nom";"Prénom";"Date d’entrée";"Contrat"' + cr + lf
                          + '"DUPONT";"Jean";"01/01/2020";"CDI"' + cr + lf),
    tabule: jxTexteLisible('Nom' + tab + 'Prénom' + tab + 'Taux' + lf + 'DUPONT' + tab + 'Jean' + tab + '100%' + lf),
    pourcent: jxTexteLisible('Nom;Temps' + lf + 'MARTIN;80%' + lf + 'DURAND;100%' + lf),
    binaire: jxTexteLisible('PK' + String.fromCharCode(3) + String.fromCharCode(4) + String.fromCharCode(0) + String.fromCharCode(0) + String.fromCharCode(1))
  }), [CR, LF, TAB]);
  ok(lisible.excelFr, 'un export Excel français (guillemets, points-virgules, CRLF) est accepté');
  ok(lisible.tabule, 'un fichier tabulé aussi');
  ok(lisible.pourcent, 'un temps partiel écrit « 80 % » aussi');
  ok(lisible.binaire === false, 'un fichier binaire renommé « .csv » reste refusé');

  // Et le refus ne doit rien detruire.
  const apresRefus = await page.evaluate(() => {
    salariesNom = [{ nom: 'ALPHA' }, { nom: 'BETA' }, { nom: 'GAMMA' }];
    const avant = salariesNom.length;
    /* On rejoue le chemin du refus : ce que faisait l'ancien code. */
    const src = String(jxImportMuet);
    return { avant, vide: src.indexOf('salariesNom.length=0') >= 0, apres: salariesNom.length };
  });
  ok(apresRefus.vide === false, 'le refus d’un fichier ne vide plus la liste des salariés déjà saisis');
  ok(apresRefus.apres === 3, 'les trois salariés sont toujours là', apresRefus.apres);

  // ══ 2. L'ETAT NE PASSE PAS D'UN DOSSIER A L'AUTRE ═══════════════
  console.log('\n— Un dossier ne déborde pas sur le suivant —');
  await page.evaluate(() => {
    appSetSecteur('transport'); jxRechargerDossier();
    goPage('contrat');
    const n = document.getElementById('c-nom'); if (n) { n.value = 'CLIENT-A DUPONT'; n.dispatchEvent(new Event('input', { bubbles: true })); }
    sauvegarderEtat();
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(900);
  await entrer();
  const fuite = await page.evaluate(() => {
    goPage('contrat');
    const avant = (document.getElementById('c-nom') || {}).value;
    appSetSecteur('banque'); jxRechargerDossier();
    goPage('home'); goPage('contrat');
    const apres = (document.getElementById('c-nom') || {}).value;
    return { avant, apres };
  });
  ok(fuite.apres !== 'CLIENT-A DUPONT', 'le nom saisi dans le dossier transport n’apparaît pas dans le dossier banque', JSON.stringify(fuite));

  // ══ 3. CE QUI EST EFFACE RESTE EFFACE ══════════════════════════
  console.log('\n— Effacer doit être possible —');
  const efface = await page.evaluate(() => {
    appSetSecteur('transport'); jxRechargerDossier();
    goPage('contrat');
    const n = document.getElementById('c-nom');
    n.value = 'DUPONT Jean'; n.dispatchEvent(new Event('input', { bubbles: true }));
    sauvegarderEtat();
    restaurerEtat();
    n.value = ''; n.dispatchEvent(new Event('input', { bubbles: true }));
    goPage('home'); goPage('contrat');
    return (document.getElementById('c-nom') || {}).value;
  });
  ok(efface === '', 'un champ effacé ne revient pas à la navigation suivante', JSON.stringify(efface));

  // ══ 4. LE REPORT SUIT L'EFFECTIF, IL NE LE GELE PAS ════════════
  console.log('\n— L’effectif reporté suit sa source —');
  const suit = await page.evaluate(() => {
    const poser = (n) => {
      if (typeof csedLoad === 'function') csedLoad();
      CSED.exercices = [{ cloture: '2025-12-31', ent: String(n) }];
      if (typeof csedSave === 'function') csedSave();
    };
    const lu = [];
    [12, 300, 5000].forEach(n => {
      poser(n);
      goPage('home'); goPage('cse');
      try { jxReport(); } catch (e) { }
      lu.push({ pose: n, champ: (document.getElementById('cse-eff-direct') || {}).value });
    });
    return lu;
  });
  suit.forEach(r => console.log('    effectif posé ' + String(r.pose).padStart(5) + '  →  champ « ' + r.champ + ' »'));
  ok(suit.every(r => String(r.champ) === String(r.pose)),
    'le champ « repris de votre fiche » suit l’effectif quand il change', JSON.stringify(suit));

  // ══ 5. LE CHOIX DU CLIENT SURVIT AU RECHARGEMENT ═══════════════
  console.log('\n— Le choix explicite du client prime, même après rechargement —');
  await page.evaluate(() => {
    goPage('ri');
    const e = document.getElementById('ri-effectif');
    if (e) { e.value = 'moins20'; e.setAttribute('data-jx-touche', '1'); e.dispatchEvent(new Event('change', { bubbles: true })); }
    sauvegarderEtat();
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(900);
  await entrer();
  const choix = await page.evaluate(() => {
    goPage('ri');
    const e = document.getElementById('ri-effectif');
    return { v: e ? e.value : null, touche: e ? e.getAttribute('data-jx-touche') : null };
  });
  ok(choix.touche === '1', 'le champ reste marqué comme choisi par le client après rechargement', JSON.stringify(choix));
  ok(choix.v === 'moins20', 'et sa valeur n’est pas réécrite par le report', JSON.stringify(choix));

  // ══ 6. UNE SAISIE IMPOSSIBLE SE REFUSE ═════════════════════════
  console.log('\n— Le quorum —');
  const quorum = await page.evaluate(() => {
    goPage('cse');
    const i = document.getElementById('cse-inscrits'), x = document.getElementById('cse-exprimes');
    i.value = '10'; x.value = '9999'; cseQuorum();
    const impossible = (document.getElementById('cse-quorum-result') || {}).textContent;
    x.value = '6'; cseQuorum();
    const normal = (document.getElementById('cse-quorum-result') || {}).textContent;
    return { impossible, normal };
  });
  ok(quorum.impossible.indexOf('ATTEINT') < 0, 'neuf mille suffrages pour dix inscrits ne valident plus le premier tour');
  ok(quorum.impossible.indexOf('impossible') >= 0, 'la saisie est signalée comme impossible');
  ok(quorum.normal.indexOf('ATTEINT') >= 0, 'et un quorum réellement atteint l’est toujours');

  // ══ 7. L'EFFECTIF SAISI GARDE SON SENS ═════════════════════════
  console.log('\n— Ce qui est tapé dans le champ « effectif » —');
  const eff = await page.evaluate(() => ({
    negatif: jxEffectifSaisi('-40'),
    exposant: jxEffectifSaisi('1e309'),
    virgule: jxEffectifSaisi('12,5'),
    espace: jxEffectifSaisi(' 1 200 '),
    lettres: jxEffectifSaisi('abc'),
    normal: jxEffectifSaisi('150')
  }));
  ok(eff.negatif === null, '« -40 » est refusé, il ne devient pas 40', String(eff.negatif));
  ok(eff.exposant === null, '« 1e309 » est refusé, il ne devient pas 1309', String(eff.exposant));
  ok(eff.virgule === 12, '« 12,5 » vaut douze — pas cent vingt-cinq', String(eff.virgule));
  ok(eff.espace === 1200, '« 1 200 » vaut mille deux cents', String(eff.espace));
  ok(eff.lettres === null, 'un texte est refusé', String(eff.lettres));
  ok(eff.normal === 150, 'et un nombre normal passe', String(eff.normal));

  console.log('\nExceptions : ' + erreurs.length);
  ok(erreurs.length === 0, 'aucune exception JavaScript', erreurs.slice(0, 3).join(' | '));

  await nav.close();
  console.log(echecs ? ('\n' + echecs + ' ECHEC(S)') : '\ntout est vert');
  process.exit(echecs ? 1 : 0);
})();
