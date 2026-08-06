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
const PAGES = ['index.html', 'mentions-legales.html', 'confidentialite.html'];
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
    const liens = (src.replace(/<!--[\s\S]*?-->/g, '').match(/avocat-aj/g) || []).length;
    if (f === 'index.html')
      ok(liens === 2, 'deux accès voulus : l\'accueil avant connexion, et l\'accueil de l\'application',
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
  ok(await p.locator('#warn-avis').isVisible(),
    'les avis d\'exemple sont signalés comme tels');
  ok(await p.locator('.avis .dem').count() === cartes,
    'chaque exemple porte son étiquette « à remplacer »');
  ok(await p.locator('#g-lien').count() === 0,
    'le lien Google non renseigné est retiré, pas affiché mort');
  ok(/^[0-9],[0-9]$/.test((await p.textContent('#g-moy')).trim()),
    'la note moyenne est calculée', await p.textContent('#g-moy'));

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

  await nav.close();
  console.log('\n' + (echecs ? echecs + ' ECHEC(S)' : 'Tout est vert.') + '\n');
  process.exit(echecs ? 1 : 0);
})();
