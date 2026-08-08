/* « Très mauvaise présentation. Brouillon. »
   Aucun test de structure n'aurait vu ça : le balisage etait correct, c'est
   la MISE EN PAGE qui l'etait pas. Ce test mesure donc des pixels, page par
   page, sur un ecran de telephone :
     — le titre de l'application disposait de 82 px et se cassait sur trois
       lignes, ecrase par le bouton de secteur pose a cote de lui ;
     — le sous-titre affichait « [ENTREPRISE] », un texte de remplacement ;
     — trois elements annoncaient le secteur, et ils se contredisaient ;
     — 41 pages sur 43 portaient DEUX barres de titre empilees, soit un tiers
       de la hauteur de l'ecran ;
     — le bouton flottant recouvrait le texte, et jusqu'au bouton
       « Générer le code ».
   Rien de tout cela ne peut plus revenir sans faire tomber ce test. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test presentation ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html');

let echecs = 0;
const ok = (c, m, d) => { if (c) console.log('  ok    ' + m); else { echecs++; console.log('  ECHEC ' + m + (d !== undefined ? ' — ' + d : '')); } };

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await (await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e)));
  page.on('dialog', d => d.dismiss());
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    sessionStorage.setItem('jte_ok', '1'); sessionStorage.setItem('jte_admin', '1');
    document.getElementById('pg-inscription').style.display = 'none';
    document.getElementById('pg-app').style.display = 'block';
    document.getElementById('accueil-screen').style.display = 'none';
    appSetSecteur('formation'); applyClientSector(); goPage('home');
    famRender(); secChipMaj(); updateHeroTop();
  });
  await page.waitForTimeout(400);

  // ══ 1. L'EN-TETE ════════════════════════════════════════════════
  console.log('\n— L’en-tête —');
  const h = await page.evaluate(() => {
    const t = document.querySelector('.home-top');
    const h1 = document.querySelector('.home-brand h1');
    const sm = document.getElementById('top-nom');
    const r = e => e.getBoundingClientRect();
    const li = parseFloat(getComputedStyle(h1).lineHeight);
    return { haut: Math.round(r(t).height), titreL: Math.round(r(h1).width),
             lignes: Math.round(r(h1).height / li), sous: sm.textContent,
             coupe: h1.scrollWidth > h1.clientWidth + 1 };
  });
  console.log('    en-tête ' + h.haut + ' px · titre ' + h.titreL + ' px sur ' + h.lignes + ' ligne(s)');
  ok(h.lignes === 1, 'le nom de l’application tient sur une seule ligne', h.lignes + ' lignes');
  ok(h.titreL >= 150, 'et il dispose d’au moins 150 px de large', h.titreL + ' px');
  ok(!h.coupe, 'sans être tronqué');
  ok(h.haut <= 80, 'l’en-tête ne mange pas l’écran', h.haut + ' px');

  // ══ 2. AUCUN TEXTE DE REMPLACEMENT A L'ECRAN ════════════════════
  console.log('\n— Les textes de remplacement —');
  ok(h.sous.indexOf('[ENTREPRISE]') < 0, 'l’en-tête n’affiche pas « [ENTREPRISE] »', h.sous);
  const brut = await page.evaluate(() => {
    // Une fiche sans raison sociale : l'en-tete ne doit rien inventer.
    E.nom = ''; updateHeroTop();
    const a = document.getElementById('top-nom').textContent;
    validerInscription();
    updateHeroTop();
    return { apres: document.getElementById('top-nom').textContent, stocke: E.nom, direct: a };
  });
  ok(brut.stocke === '', 'une raison sociale vide reste vide en base', JSON.stringify(brut.stocke));
  ok(brut.apres.indexOf('[') < 0, 'et l’en-tête reste propre après validation', brut.apres);

  // ══ 3. UNE SEULE ANNONCE DU SECTEUR ═════════════════════════════
  console.log('\n— Le secteur, annoncé une seule fois —');
  await page.evaluate(() => { goPage('home'); famRender(); secChipMaj(); updateHeroTop(); });
  await page.waitForTimeout(250);
  const sec = await page.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(); return r.height > 0 && r.width > 0; };
    const pg = document.getElementById('pg-home');
    const dedans = [...pg.querySelectorAll('select')].filter(vis).map(e => e.id);
    const chip = document.getElementById('sec-chip');
    return { selecteurs: dedans, chipTxt: (chip.textContent || '').trim(),
             chipTitre: chip.title,
             genCodes: !!pg.querySelector('#cg-client'),
             entete: document.getElementById('top-nom').textContent };
  });
  /* Depuis la porte (v155), l'accueil PEUT porter deux selecteurs — et
     seulement ceux-la : la question du secteur et celle de l'effectif,
     tant qu'il manque une reponse. Rien d'autre ne doit trainer. */
  ok(sec.selecteurs.every(id => id === 'fp-sec' || id === 'fp-eff'),
     'aucune liste déroulante ne traîne sur l’accueil, hors les deux questions de la porte',
     sec.selecteurs.join(', '));
  ok(sec.chipTxt.length <= 2, 'le bouton de secteur est une icône, il n’écrase plus le titre',
     '« ' + sec.chipTxt + ' »');
  ok(/formation/i.test(sec.chipTitre), 'mais il dit lequel, en toutes lettres', sec.chipTitre);
  ok(!sec.genCodes, 'le générateur de codes clients a quitté l’accueil');
  ok(/1516/.test(sec.entete), 'l’en-tête et le secteur choisi disent la même chose', sec.entete);

  // L'administrateur qui choisit un secteur : le badge le suit.
  const badge = await page.evaluate(() => {
    appSetSecteur('batiment'); applyClientSector(); goPage('admin');
    return document.getElementById('client-secteur-badge').textContent;
  });
  ok(/Bâtiment/i.test(badge), 'le badge administrateur suit le secteur choisi, il ne dit plus « tous secteurs »', badge);

  // ══ 4. UNE SEULE BARRE DE TITRE PAR PAGE ════════════════════════
  console.log('\n— Une seule barre de titre par page —');
  const pages = await page.evaluate(() => [...document.querySelectorAll('#pg-app .page')].map(e => e.id.slice(3)));
  const doubles = [];
  for (const p of pages) {
    const n = await page.evaluate(id => {
      goPage(id); window.scrollTo(0, 0);
      const vis = e => e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0;
      const glob = vis(document.querySelector('.home-top'));
      const pg = document.getElementById('pg-' + id);
      const loc = vis(pg.querySelector('.topbar'));
      return (glob ? 1 : 0) + (loc ? 1 : 0);
    }, p);
    if (n !== 1) doubles.push(p + ' (' + n + ')');
  }
  ok(doubles.length === 0, 'chaque page porte exactement une barre de titre', doubles.join(', '));

  // ══ 5. LE BOUTON FLOTTANT NE RECOUVRE RIEN ══════════════════════
  console.log('\n— Le bouton flottant —');
  const recouvre = [];
  for (const p of pages) {
    const r = await page.evaluate(id => {
      goPage(id);
      window.scrollTo(0, document.documentElement.scrollHeight);
      const b = document.getElementById('jx-retour');
      if (getComputedStyle(b).display === 'none') return null;
      const q = b.getBoundingClientRect();
      const pg = document.getElementById('pg-' + id);
      // Un bouton ou un titre sous le bouton flottant : c'est le defaut.
      const gene = [...pg.querySelectorAll('button,a,.fam-titre,.home-sec,.ct,.tt')].filter(e => {
        const c = e.getBoundingClientRect();
        if (c.height <= 0) return false;
        return !(c.right < q.left || c.left > q.right || c.bottom < q.top || c.top > q.bottom);
      });
      return gene.length ? gene.slice(0, 2).map(e => (e.textContent || '').trim().slice(0, 26)) : null;
    }, p);
    if (r) recouvre.push(p + ' → ' + r.join(' / '));
  }
  ok(recouvre.length === 0, 'il ne recouvre ni bouton ni titre, sur aucune page',
     recouvre.slice(0, 4).join(' | '));

  // ══ 6. RIEN NE DEBORDE DE L'ECRAN ═══════════════════════════════
  console.log('\n— La largeur de l’écran —');
  const larges = [];
  for (const p of pages) {
    const d = await page.evaluate(id => {
      goPage(id); window.scrollTo(0, 0);
      return Math.round(document.documentElement.scrollWidth - document.documentElement.clientWidth);
    }, p);
    if (d > 2) larges.push(p + ' (+' + d + 'px)');
  }
  ok(larges.length === 0, 'aucune page ne déborde en largeur', larges.slice(0, 6).join(', '));

  // ══ 7. LES CARTES D'UNE MEME RANGEE ═════════════════════════════
  console.log('\n— Les cartes de l’accueil —');
  const cartes = await page.evaluate(() => {
    goPage('home'); famRender(); famOuvrir('embauche');
    const L = [...document.querySelectorAll('#fam-zone .fam-carte')];
    // Regroupees par ordonnee : une rangee = meme « top »
    const rangs = {};
    L.forEach(e => { const r = e.getBoundingClientRect();
      const k = Math.round(r.top / 5) * 5; (rangs[k] = rangs[k] || []).push(Math.round(r.height)); });
    const mauvais = Object.keys(rangs).filter(k => new Set(rangs[k]).size > 1)
      .map(k => rangs[k].join('/'));
    // Une etiquette qui deborde de sa carte
    const debord = L.filter(e => { const q = e.querySelector('.cq'); if (!q) return false;
      const a = e.getBoundingClientRect(), b = q.getBoundingClientRect();
      return b.right > a.right + 1 || b.left < a.left - 1; })
      .map(e => (e.textContent || '').trim().slice(0, 24));
    return { mauvais, debord, n: L.length };
  });
  ok(cartes.mauvais.length === 0, 'les cartes d’une même rangée ont la même hauteur',
     cartes.mauvais.join(' · '));
  ok(cartes.debord.length === 0, 'aucune étiquette ne déborde de sa carte', cartes.debord.join(' · '));

  // La cinquieme tuile ne reste pas seule, a moitie de largeur.
  const tuiles = await page.evaluate(() => {
    const T = [...document.querySelectorAll('#fam-zone .fam-tuile')];
    const w = T.map(e => Math.round(e.getBoundingClientRect().width));
    const zone = Math.round(document.getElementById('fam-zone').getBoundingClientRect().width);
    return { n: T.length, derniere: w[w.length - 1], zone, w };
  });
  ok(tuiles.n % 2 === 0 || tuiles.derniere > tuiles.zone * 0.9,
     'une famille seule sur sa ligne prend toute la largeur',
     tuiles.derniere + ' px sur ' + tuiles.zone);

  // ══ 8. LE BANDEAU D'EFFECTIF SE LIT ═════════════════════════════
  console.log('\n— Le bandeau d’effectif —');
  const bande = await page.evaluate(() => {
    localStorage.removeItem('cse_diag_v1::' + jxCompte());
    if (typeof CSED !== 'undefined') CSED.exercices = [];
    if (typeof RX !== 'undefined') RX.staff = [];
    famRender();
    const b = document.querySelector('#fam-zone .eff-bandeau');
    const t = b.querySelector('.et'), d = b.querySelector('.ed');
    return { colle: Math.abs(t.getBoundingClientRect().top - d.getBoundingClientRect().top) < 4,
             txt: b.textContent.replace(/\s+/g, ' ').slice(0, 70) };
  });
  ok(!bande.colle, 'le titre et l’explication sont sur deux lignes distinctes', bande.txt);

  console.log('\nExceptions : ' + erreurs.length);
  erreurs.slice(0, 4).forEach(e => console.log('   ! ' + e.slice(0, 200)));
  ok(erreurs.length === 0, 'aucune exception JavaScript');

  await nav.close();
  console.log('\n' + (echecs ? echecs + ' ECHEC(S)' : 'tout est vert'));
  process.exit(echecs ? 1 : 0);
})();
