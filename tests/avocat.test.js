/* LE SITE DU CABINET NE DOIT RIEN DEVOIR À JURIS EXPERT.
   C'est la seule promesse qui compte pour ce dossier : il a été construit pour
   être sorti du dépôt un jour, tel quel, sans rien réécrire. Un chemin qui
   remonte d'un cran (« ../vendor/… »), un lien vers l'application, un fichier
   oublié dans le service worker, et la promesse est fausse — mais elle reste
   invisible tant que le site vit ici, où tout est à portée de main.
   Ce test ouvre le site dans un vrai navigateur et vérifie les deux choses :
   qu'il fonctionne, et qu'il est déjà seul. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
  catch (e2) { console.log('Playwright absent — test avocat ignoré.'); process.exit(0); }
}

const fs = require('fs'), path = require('path');
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const DOSSIER = path.resolve(__dirname, '..', 'avocat-aj');
const PAGES = ['index.html', 'mentions-legales.html', 'confidentialite.html',
               'registre-traitements.html'];
const url = f => 'file://' + path.join(DOSSIER, f);

let echecs = 0;
const ok = (c, m, d) => {
  if (c) console.log('  ok    ' + m);
  else { echecs++; console.log('  ECHEC ' + m + (d !== undefined ? ' — ' + d : '')); }
};

(async () => {
  const nav = await chromium.launch(fs.existsSync(CHROME) ? { executablePath: CHROME } : {});
  const ctx = await nav.newContext({ viewport: { width: 1180, height: 900 } });

  /* ── 1. Le dossier est complet ──────────────────────────────────────── */
  console.log('\n— Les fichiers du dossier —');
  ['index.html', 'mentions-legales.html', 'confidentialite.html', 'pages.css',
   'manifest.json', 'sw.js', 'netlify.toml', 'robots.txt', 'sitemap.xml',
   'registre-traitements.html',
   'icone-192.png', 'icone-512.png', 'icone-180.png', 'portrait.png', 'README.md'
  ].forEach(f => ok(fs.existsSync(path.join(DOSSIER, f)), 'présent : ' + f));

  /* Le service worker promet des fichiers hors ligne : ils doivent exister,
     sinon l'application se dit « disponible hors ligne » et ne l'est pas. */
  const sw = fs.readFileSync(path.join(DOSSIER, 'sw.js'), 'utf8');
  (sw.match(/'\.\/[^']+'/g) || []).map(s => s.slice(3, -1)).filter(Boolean).forEach(f =>
    ok(fs.existsSync(path.join(DOSSIER, f)), 'mis en cache et présent : ' + f));

  /* Les icônes annoncées par le manifeste, de même. */
  const man = JSON.parse(fs.readFileSync(path.join(DOSSIER, 'manifest.json'), 'utf8'));
  man.icons.forEach(i => ok(fs.existsSync(path.join(DOSSIER, i.src.replace('./', ''))),
    'icône déclarée et présente : ' + i.src));

  /* ── 2. Aucune dépendance à Juris Expert ────────────────────────────── */
  console.log('\n— L\'indépendance vis-à-vis de Juris Expert —');
  for (const f of PAGES) {
    const src = fs.readFileSync(path.join(DOSSIER, f), 'utf8');
    /* Les commentaires sont exclus : ils EXPLIQUENT que le site est hébergé
       provisoirement dans le dépôt de Juris Expert. C'est le contenu servi au
       visiteur qui ne doit rien en dire, et rien en charger. */
    const vu = src.replace(/<!--[\s\S]*?-->/g, '');
    ok(!/(src|href)\s*=\s*["']\.\.\//.test(vu), f + ' : aucun chemin qui sort du dossier');
    ok(!/juris[- ]?expert/i.test(vu), f + ' : aucune mention de Juris Expert');
    ok(!/(src|href)\s*=\s*["']\/(?!\/)/.test(vu), f + ' : aucun chemin absolu (« /… »)');
    ok(/<meta name="robots" content="noindex/.test(src), f + ' : invisible pour les moteurs');
  }
  /* Et réciproquement : l'application ne mène au site que par UN seul accès,
     voulu — une ligne de pied de page sur l'accueil. Aucune autre page ne doit
     y renvoyer, et surtout aucune entrée de menu. */
  const racine = fs.readdirSync(path.resolve(__dirname, '..'))
    .filter(f => f.endsWith('.html'));
  racine.forEach(f => {
    const src = fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8');
    /* On compte les LIENS, pas les mentions : l'historique des versions cite
       le dossier en toutes lettres, et c'est du texte, pas un accès. */
    const liens = (src.replace(/<!--[\s\S]*?-->/g, '')
      .match(/href\s*=\s*["']\.\/avocat-aj\//g) || []).length;
    if (f === 'index.html')
      ok(liens === 1, 'un seul accès au site, et il est réservé à l\'administrateur',
        liens + ' occurrence(s)');
    else
      ok(liens === 0, 'aucun renvoi vers le site depuis : ' + f);
  });

  /* ── 3. Les pages s'ouvrent sans erreur, et on peut en revenir ──────── */
  console.log('\n— Les pages, ouvertes pour de vrai —');
  for (const f of PAGES) {
    const page = await ctx.newPage();
    const erreurs = [];
    page.on('pageerror', e => erreurs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
    await page.goto(url(f), { waitUntil: 'load' });
    await page.waitForTimeout(400);
    ok(erreurs.length === 0, f + ' : aucune erreur JavaScript', erreurs[0]);
    ok((await page.title()).length > 10, f + ' : la page a un titre');

    if (f !== 'index.html') {
      /* Consigne du dépôt : aucune page sans retour, visible sans défiler. */
      const retour = page.locator('a[href="./index.html"]').first();
      ok(await retour.isVisible(), f + ' : le retour est visible');
      const b = await retour.boundingBox();
      ok(b && b.y < 900, f + ' : le retour est dans le premier écran', b && b.y);
    }
    await page.close();
  }

  /* ── 4. L'accueil : ce qui doit s'y trouver ─────────────────────────── */
  console.log('\n— L\'accueil —');
  const p = await ctx.newPage();
  await p.goto(url('index.html'), { waitUntil: 'load' });
  await p.waitForTimeout(500);

  for (const id of ['cabinet', 'domaines', 'deroule', 'honoraires', 'avis', 'questions', 'contact'])
    ok(await p.locator('#' + id).count() === 1, 'section présente : #' + id);

  /* Chaque entrée du menu doit mener à une section qui existe. Les liens
     d'appel (tel:) et les pages de domaine sont vérifiés à part. */
  const liens = await p.$$eval('#nav a', a => a.map(x => x.getAttribute('href')));
  for (const h of liens)
    ok(await p.locator(h).count() === 1, 'le menu mène quelque part : ' + h);

  /* Les six fiches de domaine mènent chacune à une page qui existe vraiment. */
  const versDom = await p.$$eval('.dom .plus', a => a.map(x => x.getAttribute('href')));
  ok(versDom.length === 6, 'six fiches mènent à une page de domaine', versDom.length);
  versDom.forEach(h => ok(fs.existsSync(path.join(DOSSIER, h.replace('./', ''))),
    'la page existe : ' + h));

  /* Aucun lien d'appel ne doit rester vide ou mal formé : sur un téléphone,
     c'est le geste le plus utilisé du site. */
  const tels = await p.$$eval('a[href^="tel:"]', a => a.map(x => x.getAttribute('href')));
  ok(tels.length >= 3, 'le numéro est appelable depuis plusieurs endroits', tels.length);
  tels.forEach(t => ok(/^tel:\+?[0-9]{8,}$/.test(t.replace(/\s/g, '')),
    'lien d\'appel exploitable : ' + t));

  /* Les honoraires communiqués par le cabinet, au bon endroit. */
  const tarifs = await p.$$eval('.tar .tl:not(.hdr)', l => l.map(x => ({
    dom: x.querySelector('.dm').childNodes[0].textContent.trim(),
    taux: x.querySelector('.tx').textContent.replace(/\s+/g, ' ').trim(),
    aj: x.querySelector('.aj').textContent.trim()
  })));
  ok(tarifs.length === 4, 'quatre domaines tarifés', tarifs.length);
  const attendu = { 'Commercial': '160', 'Famille & personnes': '150', 'Immobilier': '160', 'Travail': '160' };
  tarifs.forEach(t => {
    ok(attendu[t.dom] !== undefined, 'domaine tarifé connu : ' + t.dom);
    ok(t.taux.indexOf(attendu[t.dom] + ' €') === 0, t.dom + ' : ' + attendu[t.dom] + ' € TTC/h', t.taux);
    ok(/Accept/.test(t.aj), t.dom + ' : aide juridictionnelle acceptée');
  });
  /* Ce que le cabinet a demandé de NE PAS afficher. */
  const texte = await p.textContent('body');
  ok(!/5 fois/.test(texte), 'aucun « paiement en 5 fois »');
  ok(!/[Rr]ecommandations d'avocats/.test(texte), 'aucune « recommandation d\'avocats »');

  /* Les années d'expérience se calculent, elles ne se périment pas. */
  const attenduAns = (() => {
    const s = new Date(2004, 5, 7), h = new Date();
    let a = h.getFullYear() - s.getFullYear();
    const m = h.getMonth() - s.getMonth();
    if (m < 0 || (m === 0 && h.getDate() < s.getDate())) a--;
    return a;
  })();
  ok(await p.textContent('#exp') === attenduAns + ' ans',
    'le bandeau annonce ' + attenduAns + ' ans d\'expérience', await p.textContent('#exp'));
  ok(await p.textContent('#exp2') === String(attenduAns), 'la présentation annonce le même nombre');

  /* Le portrait. Tant que la vraie photo n'est pas fournie, l'emplacement
     affiche le monogramme — jamais une image cassée ni un trou. Le jour où
     PORTRAIT est renseigné, le traitement noir et blanc doit être prêt : on
     vérifie donc la règle CSS, qu'il y ait une photo ou non. */
  const photoPosee = await p.locator('.pf.has').count() === 1;
  if (photoPosee) {
    ok(await p.locator('.cab .sig .av.has').count() === 1, 'le même portrait signe la présentation');
    /* Le fichier est bien lu : une image cassée laisserait .has posé sans que
       le navigateur ait la moindre pixel à peindre. */
    ok(await p.evaluate(() => new Promise(r => {
      const i = new Image();
      i.onload = () => r(i.naturalWidth > 100 && i.naturalWidth === i.naturalHeight);
      i.onerror = () => r(false);
      i.src = './portrait.png';
    })), 'la photo se charge, et elle est carrée — le cercle du cadre ne la déforme pas');
  } else {
    ok(await p.locator('.pf .mg').isVisible(), 'sans photo, le monogramme tient la place');
    ok(await p.locator('.pf').evaluate(e => !e.style.backgroundImage),
      'aucune image fantôme n\'est chargée');
  }
  const regleFiltre = await p.evaluate(() => {
    for (const f of document.styleSheets[0].cssRules)
      if (f.selectorText === '[data-photo].has::after') return f.style.filter;
    return '';
  });
  ok(/grayscale/.test(regleFiltre) && /sepia/.test(regleFiltre),
    'le traitement noir et blanc réchauffé attend la photo', regleFiltre);

  /* Le bandeau d'annonce n'existe que s'il y a quelque chose à annoncer. */
  ok(await p.locator('#annonce:not([hidden])').count() === 0,
    'aucun bandeau d\'annonce tant que le message est vide');

  /* ── 5. Les avis ────────────────────────────────────────────────────── */
  console.log('\n— Le carrousel d\'avis —');
  const cartes = await p.locator('.avis').count();
  ok(cartes >= 1, 'des avis sont affichés', cartes);
  /* Les avis sont desormais ceux de la fiche Google, recopies sans retouche :
     plus aucun exemple, et le bandeau qui les signalait doit avoir disparu. */
  ok(!(await p.locator('#warn-avis').isVisible()),
    'plus aucun avis d\'exemple : le bandeau d\'avertissement est retiré');
  ok(await p.locator('.avis .dem').count() === 0,
    'aucune étiquette « à remplacer » ne subsiste');
  ok(cartes >= 8, 'les avis de la fiche sont repris', cartes);
  /* Ni note moyenne, ni bouton vers Google : le cabinet ne veut afficher que
     les avis eux-memes. Aucun vestige ne doit subsister. */
  for (const id of ['#g-moy', '#g-nb', '#g-etoiles', '#g-lien'])
    ok(await p.locator(id).count() === 0, 'plus de bloc de note : ' + id);
  ok(!/note/i.test(await p.textContent('#avis .sub')),
    'le chapeau ne promet plus de note');

  /* Le carrousel défile, et la flèche de gauche est éteinte au départ. */
  ok(await p.locator('#av-pv').isDisabled(), 'flèche gauche inactive au départ');
  /* Sur un écran large, trois avis tiennent côte à côte : il n'y a rien à
     faire défiler, et la flèche droite doit donc être éteinte elle aussi.
     C'est sur un écran étroit que le défilement se vérifie. */
  ok(await p.locator('#av-nx').isDisabled() ===
     await p.evaluate(() => { const t = document.getElementById('av-track');
       return t.scrollWidth <= t.clientWidth + 6; }),
    'la flèche droite n\'est active que s\'il y a de quoi défiler');
  const etroit = await (await nav.newContext({ viewport: { width: 820, height: 900 } })).newPage();
  await etroit.goto(url('index.html'), { waitUntil: 'load' });
  await etroit.waitForTimeout(500);
  await etroit.locator('#av-nx').click();
  await etroit.waitForTimeout(700);
  ok(await etroit.evaluate(() => document.getElementById('av-track').scrollLeft > 100),
    'sur écran étroit, la flèche droite fait défiler les avis');
  ok(!(await etroit.locator('#av-pv').isDisabled()),
    'une fois défilé, la flèche gauche s\'allume');
  await etroit.close();


  /* ── 4 bis. L'accès au cabinet est réservé à l'administrateur ───────── */
  console.log('\n— L\'accès depuis Juris Expert —');
  {
    const app = 'file://' + path.resolve(__dirname, '..', 'index.html');
    for (const [role, admin] of [['un abonné', false], ['l\'administrateur', true]]) {
      const q = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage();
      await q.goto(app, { waitUntil: 'load' });
      await q.waitForTimeout(700);
      await q.evaluate(a => {
        sessionStorage.setItem('jte_ok', '1');
        if (a) sessionStorage.setItem('jte_admin', '1'); else sessionStorage.removeItem('jte_admin');
        document.getElementById('pg-inscription').style.display = 'none';
        document.getElementById('pg-app').style.display = 'block';
        document.getElementById('accueil-screen').style.display = 'none';
        if (typeof jxGardeAdmin === 'function') jxGardeAdmin();
        goPage('home');
      }, admin);
      await q.waitForTimeout(300);
      const vu = await q.locator('#lien-cabinet-admin').isVisible();
      ok(vu === admin, 'pour ' + role + ', l\'accès est ' + (admin ? 'visible' : 'masqué'));
      if (admin) {
        /* Le site du cabinet est public : il ne peut pas porter de lien de
           retour vers l'application. L'onglet separe EST le retour. */
        const cible = await q.locator('#lien-cabinet-admin').getAttribute('target');
        ok(cible === '_blank', 'le site s\'ouvre dans un onglet à part', cible);
        ok(/noopener/.test(await q.locator('#lien-cabinet-admin').getAttribute('rel') || ''),
          'l\'onglet ouvert ne garde pas la main sur l\'application');
      }
      await q.close();
    }
  }

  /* ── 5 bis. Le calculateur de délais ────────────────────────────────── */
  console.log('\n— Le délai qui court —');
  const nbSit = await p.locator('.sit').count();
  ok(nbSit >= 10, 'les situations courantes sont proposées', nbSit);
  await p.locator('.sit').first().click();
  await p.waitForTimeout(300);
  ok(await p.locator('#fiche.on').count() === 1, 'la fiche de situation s\'ouvre');
  ok((await p.textContent('#f-duree')).indexOf('12 mois') === 0,
    'le licenciement affiche bien 12 mois', await p.textContent('#f-duree'));
  ok(await p.locator('#f-pieces li').count() >= 3, 'les pièces à réunir sont listées');

  /* Une date récente : il doit rester du temps, et la jauge doit le montrer. */
  const recent = new Date(); recent.setMonth(recent.getMonth() - 1);
  await p.fill('#f-date', recent.toISOString().slice(0, 10));
  await p.waitForTimeout(300);
  ok(await p.locator('#f-verdict.vert').count() === 1, 'délai encore ouvert : verdict vert');
  ok(/reste \d+ jours/.test(await p.textContent('#f-verdict')), 'le nombre de jours restants est calculé');

  /* Une date ancienne : le site doit le dire — sans affirmer que tout est perdu. */
  const vieux = new Date(); vieux.setFullYear(vieux.getFullYear() - 3);
  await p.fill('#f-date', vieux.toISOString().slice(0, 10));
  await p.waitForTimeout(300);
  ok(await p.locator('#f-verdict.rouge').count() === 1, 'délai dépassé : verdict rouge');
  const dit = await p.textContent('#f-verdict');
  ok(/interrompu/.test(dit) && /vérifier/.test(dit),
    'le site nuance au lieu de condamner le dossier');

  /* Rien ne doit sortir du navigateur : aucune requête réseau au calcul. */
  ok(/Rien n'est envoyé/.test(await p.textContent('.prive')),
    'le visiteur est informé que le calcul reste chez lui');

  /* Le bouton emporte la situation jusqu'au formulaire. */
  await p.locator('#f-cta').click();
  await p.waitForTimeout(400);
  ok(await p.inputValue('#obj') === 'Droit du travail', 'le formulaire est pré-réglé sur le bon objet',
    await p.inputValue('#obj'));
  ok(/Situation : /.test(await p.inputValue('#txt')), 'la situation est reportée dans le message');
  await p.fill('#txt', '');
  await p.locator('#f-retour').click();
  await p.waitForTimeout(300);
  ok(await p.locator('#fiche.on').count() === 0, 'on revient à la liste des situations');


  /* ── 8 bis. Le volet RGPD & IA Act ──────────────────────────────────── */
  console.log('\n— RGPD et règlement sur l\'IA —');
  {
    const q = await ctx.newPage();
    await q.goto(url('confidentialite.html'), { waitUntil: 'load' });
    await q.waitForTimeout(300);
    const t = await q.textContent('body');
    /* Les deux règlements doivent être cités par leur numéro : c'est ce qui
       distingue une vraie mention légale d'une phrase de communication. */
    /* Les mentions obligatoires de l'article 13, une par une. Une politique
       de confidentialité qui en oublie une n'est pas conforme, meme si elle
       est longue. */
    ok(/2016\/679/.test(t), 'le RGPD est cité par son numéro');
    ok(/responsable du traitement/i.test(t), 'art. 13.1.a — le responsable est identifié');
    ok(/délégué à la protection des données/i.test(t), 'art. 13.1.b — le sort du DPO est tranché');
    ok(/6\.1\.b/.test(t) && /6\.1\.f/.test(t), 'art. 13.1.c — chaque base légale est nommée');
    ok(/intérêt légitime/i.test(t) && /mis(e)? en balance/i.test(t),
      'art. 13.1.d — l\'intérêt légitime est explicité et mis en balance');
    ok(/sous-trait/i.test(t) && /article 28|art\. 28/.test(t),
      'art. 13.1.e — les destinataires et leur qualité de sous-traitant');
    ok(/clauses contractuelles types/i.test(t) && /2021\/914/.test(t),
      'art. 13.1.f — le transfert hors UE et sa garantie');
    ok(/12 mois/.test(t) && /5 ans/.test(t) && /10 ans/.test(t),
      'art. 13.2.a — les durées de conservation, traitement par traitement');
    ok(/art\. 15|article 15/.test(t) && /art\. 20|article 20/.test(t) && /art\. 21|article 21/.test(t),
      'art. 13.2.b — accès, portabilité, opposition');
    ok(/CNIL/.test(t) && /réclamation/i.test(t), 'art. 13.2.d — la réclamation auprès de la CNIL');
    ok(/nécessaires|obligatoire/i.test(t) && /facultatif/i.test(t),
      'art. 13.2.e — ce qui est obligatoire et ce qui ne l\'est pas');
    ok(/9\.2\.f/.test(t), 'art. 9 — l\'exception judiciaire pour les données sensibles');
    ok(/72 heures/.test(t) && /(art\. 33|article 33)/.test(t),
      'art. 33 — la notification d\'une violation de données');
    ok(/article 82|art\. 82/.test(t), 'art. 82 loi de 1978 — le stockage sur l\'appareil');
    ok(/Dernière mise à jour/i.test(t), 'la politique est datée');
    ok(/reconnaissance de lecture/i.test(t),
      'la case du formulaire est qualifiée pour ce qu\'elle est');
    ok(/avis/i.test(t) && /retiré/i.test(t),
      'les avis de tiers peuvent être retirés sur demande');
    ok(/2024\/1689/.test(t), 'le règlement sur l\'IA est cité par son numéro');
    ok(/article 22|art\. 22/.test(t), 'la décision automatisée (art. 22) est traitée');
    ok(/article 50|art\. 50/.test(t), 'la transparence de l\'article 50 est prévue');
    ok(/aucun système d'intelligence artificielle/i.test(t),
      'l\'absence d\'IA est affirmée clairement');
    ok(/profilage/i.test(t), 'le profilage est traité');
    ok(/secret professionnel/i.test(t), 'le secret professionnel face aux outils d\'IA');
    await q.close();
  }
  /* Et l'accueil le dit là où ça compte : sous le calculateur. */
  ok(/aucune intelligence artificielle/i.test(await p.textContent('.prive')),
    'l\'accueil annonce l\'absence d\'IA sous le calculateur');
  {
    const lab = await p.textContent('label[for="rgpd"]');
    ok(/J'ai lu/.test(lab), 'la case atteste d\'une lecture, pas d\'un consentement', lab.trim());
    ok(!/J'accepte que ces informations soient utilisées/.test(lab),
      'la formulation « je consens au traitement » a disparu');
  }


  /* Le registre de l'article 30 : chaque traitement doit porter les huit
     rubriques exigees, sinon ce n'est pas un registre, c'est un resume. */
  {
    const r = await ctx.newPage();
    await r.goto(url('registre-traitements.html'), { waitUntil: 'load' });
    await r.waitForTimeout(300);
    const nb = await r.locator('h2').filter({ hasText: /Traitement n/ }).count();
    ok(nb === 3, 'trois traitements sont inscrits au registre', nb);
    for (const champ of ['Finalité', 'Base légale', 'Personnes concernées',
                         'Catégories de données', 'Destinataires', 'Transferts hors UE',
                         'Durée de conservation', 'Mesures de sécurité']) {
      const c = await r.locator('dt', { hasText: new RegExp('^' + champ + '$') }).count();
      ok(c === 3, 'rubrique présente dans les trois : ' + champ, c + ' fois');
    }
    ok(/article 30|art\. 30/i.test(await r.textContent('body')),
      'le registre cite son fondement');
    await r.close();
  }


  /* Les nuances : une precision qui ne change pas le nombre de mois mais qui
     change l'issue. Le tableau des situations vit dans la portee fermee du
     script — on passe donc par l'ecran, exactement comme un visiteur. */
  {
    const titres = await p.$$eval('.sit', l => l.map(x => x.textContent));
    const ouvrir = async motif => {
      const i = titres.findIndex(t => motif.test(t));
      ok(i >= 0, 'situation trouvée : ' + motif);
      await p.locator('.sit').nth(i).click();
      await p.waitForTimeout(250);
    };
    const fermer = async () => { await p.locator('#f-retour').click(); await p.waitForTimeout(250); };

    await ouvrir(/vice caché/i);
    ok(await p.locator('#f-nuance.on').count() === 1, 'la nuance s\'affiche');
    const nv = await p.textContent('#f-nuance');
    ok(/vingt ans/.test(nv) && /2232/.test(nv), 'vices cachés : le délai butoir de 20 ans');
    ok(/chambre mixte/i.test(nv) && /21 juillet 2023/.test(nv),
      'la formation et la date de l\'arrêt sont exactes');
    await fermer();

    await ouvrir(/assemblée générale/i);
    ok(/forclusion/i.test(await p.textContent('#f-nuance')),
      'copropriété : la forclusion est nommée, et distinguée de la prescription');
    await fermer();

    await ouvrir(/salaires/i);
    const ns = await p.textContent('#f-nuance');
    ok(/rupture/i.test(ns) && /saisine/i.test(ns),
      'salaires : les deux points de départ sont distingués');
    ok(/rappels de salaire/i.test(ns), 'salaires : la règle vaut au-delà des seules heures');
    await fermer();

    /* Une situation sans nuance ne doit rien afficher : un bloc vide est du bruit. */
    await ouvrir(/licencié/i);
    ok(await p.locator('#f-nuance.on').count() === 0,
      'sans nuance, le bloc disparaît au lieu de rester vide');
    await fermer();
  }

  /* ── 6. La prise de rendez-vous ─────────────────────────────────────── */
  console.log('\n— Les créneaux de rendez-vous —');
  ok(await p.locator('.jour').count() === 5, 'cinq journées sont proposées',
    await p.locator('.jour').count());
  /* Aucun créneau ne doit tomber un samedi ou un dimanche : le cabinet est
     fermé, et un rendez-vous demandé un dimanche est un rendez-vous perdu. */
  const jours = await p.$$eval('.jour .jd', l => l.map(x => x.childNodes[0].textContent.trim()));
  ok(!jours.some(j => /samedi|dimanche/i.test(j)), 'aucun créneau le week-end', jours.join(', '));
  /* Et ils doivent être à venir, pas aujourd'hui ni hier. */
  ok(await p.evaluate(() => {
    const h = new Date(); h.setHours(0, 0, 0, 0);
    return !document.querySelector('.jour .jd b').textContent.includes(
      h.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
  }), 'le premier créneau proposé n\'est pas aujourd\'hui');

  ok(await p.inputValue('#creneau') === 'Aucun créneau choisi', 'aucun créneau au départ');
  await p.locator('.cre').first().click();
  await p.waitForTimeout(200);
  ok(await p.locator('#choisi').isVisible(), 'le créneau choisi est confirmé à l\'écran');
  const choisi = await p.inputValue('#creneau');
  ok(/à \d{2}:\d{2}$/.test(choisi), 'le créneau part avec le formulaire', choisi);
  ok(await p.locator('.cre.on').count() === 1, 'un seul créneau sélectionné à la fois');
  /* Un deuxième créneau remplace le premier, il ne s'y ajoute pas. */
  await p.locator('.cre').nth(7).click();
  await p.waitForTimeout(200);
  ok(await p.locator('.cre.on').count() === 1, 'choisir un autre créneau remplace le premier');
  ok(await p.inputValue('#creneau') !== choisi, 'le champ suit le nouveau choix');
  await p.locator('.cre.on').click();
  await p.waitForTimeout(200);
  ok(await p.inputValue('#creneau') === 'Aucun créneau choisi', 'on peut annuler son créneau');
  ok(!(await p.locator('#choisi').isVisible()), 'la confirmation disparaît avec l\'annulation');

  /* ── 7. Le formulaire ───────────────────────────────────────────────── */
  console.log('\n— Le formulaire de contact —');
  await p.fill('#nom', 'Dupont Jean');
  await p.fill('#mail', 'jean.dupont@example.com');
  await p.selectOption('#obj', { index: 1 });
  await p.fill('#txt', 'Bonjour, je souhaite un rendez-vous.');
  await p.check('#rgpd');
  await p.click('#env');
  await p.waitForTimeout(400);
  /* Sans clé Web3Forms, la demande ne doit pas se perdre : le site propose la
     messagerie. C'est le comportement qui compte le jour de la mise en ligne,
     si quelqu'un oublie la clé. */
  const m = p.locator('#msg');
  ok(await m.isVisible(), 'un message est affiché après envoi');
  ok(/messagerie/i.test(await m.textContent()), 'sans clé, le site bascule sur la messagerie');
  ok(await p.locator('#msg a[href^="mailto:"]').count() === 1, 'le lien de secours est un mailto');

  /* La case RGPD est obligatoire : sans elle, rien ne part. */
  await p.reload({ waitUntil: 'load' });
  await p.fill('#nom', 'Dupont Jean');
  await p.fill('#mail', 'jean.dupont@example.com');
  await p.selectOption('#obj', { index: 1 });
  await p.fill('#txt', 'Test');
  await p.click('#env');
  await p.waitForTimeout(300);
  ok(!(await p.locator('#msg').isVisible()), 'sans consentement, l\'envoi est bloqué');

  /* ── 7. Le téléphone ────────────────────────────────────────────────── */
  console.log('\n— Sur un téléphone —');
  const mob = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await mob.goto(url('index.html'), { waitUntil: 'load' });
  await mob.waitForTimeout(400);
  ok(await mob.locator('#burger').isVisible(), 'le menu compact est proposé');
  ok(!(await mob.locator('#nav a[href="#contact"]').isVisible()), 'le menu est fermé au départ');
  await mob.click('#burger');
  await mob.waitForTimeout(300);
  ok(await mob.locator('#nav a[href="#contact"]').isVisible(), 'le menu s\'ouvre');
  await mob.click('#nav a[href="#contact"]');
  await mob.waitForTimeout(400);
  ok(!(await mob.locator('#nav a[href="#contact"]').isVisible()),
    'le menu se referme après le clic, au lieu de masquer la section visée');
  /* Rien ne doit déborder horizontalement sur un écran étroit. */
  const debord = await mob.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(debord <= 1, 'aucun débordement horizontal', debord + 'px');


  /* ── 9. Sur téléphone : les deux barres fixes, et le mot sur les cookies ── */
  console.log('\n— Les barres fixes du téléphone —');
  {
    const t = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await t.goto(url('index.html'), { waitUntil: 'load' });
    await t.waitForTimeout(1400);

    /* La barre d'appel est un <nav>, comme le menu : une regle ecrite pour
       l'un l'avait rendue invisible pendant des jours. On l'exige a l'ecran. */
    ok(await t.locator('.barre').isVisible(), 'la barre d\'appel est visible sur téléphone');
    const bb = await t.locator('.barre').boundingBox();
    ok(bb && bb.y + bb.height >= 840, 'elle est collée au bas de l\'écran', bb && Math.round(bb.y));
    ok(await t.locator('.barre a[href^="tel:"]').count() === 1, 'elle contient le bouton d\'appel');

    /* Le mot sur les cookies : aucune demande de consentement, puisqu'il n'y
       a rien a consentir — donc aucun bouton « J'accepte ». */
    ok(await t.locator('#cookies.on').isVisible(), 'le mot sur les cookies s\'affiche');
    const ct = await t.textContent('#cookies');
    ok(/Aucun cookie/i.test(ct), 'il annonce l\'absence de cookie');
    ok(!/j'accepte/i.test(ct), 'il ne demande aucun consentement');
    const cb = await t.locator('#cookies').boundingBox();
    ok(cb && bb && cb.y + cb.height <= bb.y + 1,
      'il se pose au-dessus de la barre d\'appel, sans la couvrir');

    await t.click('#cookies-ok');
    await t.waitForTimeout(600);
    ok(await t.locator('#cookies').count() === 0, 'il disparaît une fois lu');
    ok(await t.evaluate(() => sessionStorage.getItem('cj_cookies') === '1'),
      'le seul indicateur retenu vit dans la session, pas au-delà');
    ok(await t.evaluate(() => document.cookie === ''),
      'et le site n\'a effectivement déposé aucun cookie');
    await t.close();
  }

  await nav.close();
  console.log('\n' + (echecs ? echecs + ' ECHEC(S)' : 'Tout est vert.') + '\n');
  process.exit(echecs ? 1 : 0);
})();
