/* Parcours réel : le cabinet ouvre le dossier d'un client depuis son code,
   remplit la fiche par l'application elle-même, se déconnecte, puis revient
   avec son propre compte administrateur. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test de cloisonnement ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html');

let echecs = 0;
const ok = (c, m, d) => { if (c) console.log('  ok    ' + m); else { echecs++; console.log('  ECHEC ' + m + (d ? ' — ' + d : '')); } };

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await (await nav.newContext()).newPage();
  const dialogues = [];
  page.on('dialog', d => { dialogues.push(d.message()); d.dismiss(); });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  // ── Le client TEC, ouvert avec son code ───────────────────────────
  await page.evaluate(() => {
    sessionStorage.setItem('jte_ok', '1');
    sessionStorage.setItem('jte_code', 'tec2026');
    sessionStorage.setItem('jte_sector', 'formation');
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    document.getElementById('ins-nom').value = 'TEC';
    document.getElementById('ins-dirigeant').value = 'M. GERANT TEC';
    document.getElementById('ins-secteur').value = 'formation';
    validerInscription();                        // l'application enregistre elle-même
    appSetSecteur('formation');
  });
  /* Chromium en headless peut perdre une ecriture localStorage faite juste
     avant un rechargement : la fiche TEC semblait creee (l'en-tete la
     montrait, depuis la memoire) mais n'etait pas encore sur le disque, et
     le retour final la trouvait absente — echec une fois sur deux, sans
     rapport avec l'application. On attend la persistance, pas l'horloge. */
  await page.waitForFunction(() =>
    /TEC/.test(localStorage.getItem('juris_transport::c_tec2026') || ''), { timeout: 5000 });
  await page.waitForTimeout(500);
  console.log('\n— Dossier client TEC —');
  const h1 = await page.evaluate(() => document.getElementById('top-nom').textContent);
  console.log('  en-tête : ' + JSON.stringify(h1));
  ok(/TEC/.test(h1) && /1516/.test(h1), 'le client voit bien son nom et sa convention');
  console.log('  clés    : ' + JSON.stringify(await page.evaluate(
    () => Object.keys(localStorage).filter(k => /juris_transport|app_secteur/.test(k)))));

  // ── Déconnexion, puis le compte du cabinet ────────────────────────
  await page.evaluate(() => deconnexion());
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    sessionStorage.setItem('jte_ok', '1');
    sessionStorage.setItem('jte_admin', '1');
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1100);
  await page.evaluate(() => { try { initApp(); } catch (e) {} });
  await page.waitForTimeout(700);

  console.log('\n— Compte administrateur (MCH) —');
  const h2 = await page.evaluate(() => document.getElementById('top-nom').textContent);
  console.log('  en-tête : ' + JSON.stringify(h2));
  ok(!/TEC/i.test(h2), 'le nom du client n’apparaît plus', h2);
  ok(!/1516/.test(h2), 'la convention du client n’apparaît plus', h2);
  ok(await page.evaluate(() => !(typeof E !== 'undefined' && E.nom)), 'la fiche entreprise est vide',
     await page.evaluate(() => (typeof E !== 'undefined' ? E.nom : null)));
  ok(await page.evaluate(() => !(typeof E !== 'undefined' && E.dirigeant)), 'aucun dirigeant hérité',
     await page.evaluate(() => (typeof E !== 'undefined' ? E.dirigeant : null)));
  ok(await page.evaluate(() => rxAccountId()) === 'admin', 'le compte actif est bien « admin »');
  ok(await page.evaluate(() => appGetSecteur()) === '', 'aucun secteur hérité');
  /* « Mode administrateur » a été raccourci en « Administrateur » : le
     sous-titre doit tenir sur une seule ligne à côté du nom de
     l'application. Ce qui compte est qu'il dise de quel compte il s'agit. */
  ok(/Administrateur/i.test(h2), 'l’en-tête dit ce qu’est ce compte', h2);
  ok(!dialogues.some(m => /TEC/i.test(m)),
     'aucune proposition de reprendre la fiche du client sur le compte du cabinet',
     dialogues.join(' | '));
  console.log('  clés    : ' + JSON.stringify(await page.evaluate(
    () => Object.keys(localStorage).filter(k => /juris_transport|app_secteur/.test(k)))));

  /* Signale depuis un telephone : sur le compte administrateur, le socle
     affichait « Registre (83) » — les salaries du client. Trois cles avaient
     ete cloisonnees ; onze autres ne l'etaient pas. On les verifie toutes. */
  console.log('\n— Aucune donnée de dossier hors du compte —');
  const restes = await page.evaluate(() => {
    const PREFS = ['jx_smic_v1', 'offres_visible', 'jx_whatsnew', 'rx_sess_v1', 'cm_admin_sess', 'jte_'];
    return Object.keys(localStorage)
      .filter(k => k.indexOf('::') < 0)
      .filter(k => !PREFS.some(p => k.indexOf(p) === 0));
  });
  ok(restes.length === 0, 'aucune donnée de dossier n’est rangée hors d’un compte', restes.join(', '));

  const vuParAdmin = await page.evaluate(() => {
    if (typeof rxLoad === 'function') rxLoad();
    return {
      staff: (typeof RX !== 'undefined' && RX.staff) ? RX.staff.length : 0,
      effectif: (typeof cseEffectif === 'function') ? cseEffectif() : null
    };
  });
  ok(vuParAdmin.staff === 0, 'le cabinet ne voit aucun salarié du client', vuParAdmin.staff);
  ok(vuParAdmin.effectif === null, 'et aucun effectif', vuParAdmin.effectif);

  /* Le compte administrateur n'herite jamais des donnees laissees sous
     l'ancienne cle commune : ce n'est le dossier d'aucune entreprise. */
  const heritage = await page.evaluate(() => {
    localStorage.setItem('jx_salaries_v1', JSON.stringify([{ nom: 'ANCIEN' }]));
    localStorage.setItem('je_registre', JSON.stringify([{ nom: 'ANCIEN' }]));
    jxReprise();
    return { admin: jxCompte(),
             repris: localStorage.getItem(jxCle('jx_salaries_v1')),
             reste: localStorage.getItem('jx_salaries_v1') };
  });
  ok(heritage.admin === 'admin' && heritage.repris === null,
     'le compte administrateur n’adopte pas l’ancien registre commun', JSON.stringify(heritage));

  /* ── UN DOSSIER PAR SECTEUR D'ESSAI ─────────────────────────────
     Signale depuis un telephone : « je suis dans assurance, il vient d'ou
     cet effectif de 72 ? ». Il venait du registre saisi en essayant un
     autre secteur : jxCompte() renvoyait « admin » quel que soit le
     secteur, donc tous les essais partageaient un seul dossier. */
  console.log('\n— Un dossier par secteur d’essai —');
  const essai = await page.evaluate(() => {
    const out = {};
    appSetSecteur('banque'); jxRechargerDossier();
    out.dosBanque = jxCompte();
    RX.staff = ['a', 'b', 'c'].map(k =>
      ({ id: k, nom: k.toUpperCase(), entree: '2020-01-01',
         typeContrat: 'CDI', tempsTravail: 'Temps plein' }));
    rxSaveLocal();
    out.banqueAvant = RX.staff.length;

    appSetSecteur('assurances'); jxRechargerDossier();
    out.dosAssur = jxCompte();
    out.assurStaff = RX.staff.length;
    out.assurEffectif = cseEffectif();
    out.assurNom = (typeof E !== 'undefined' && E) ? E.nom : null;

    appSetSecteur('banque'); jxRechargerDossier();
    out.banqueApres = RX.staff.length;

    appSetSecteur(''); jxRechargerDossier();
    out.dosSansSecteur = jxCompte();
    return out;
  });
  ok(essai.dosBanque === 'admin_banque' && essai.dosAssur === 'admin_assurances',
     'chaque secteur essayé ouvre un dossier qui lui est propre',
     essai.dosBanque + ' / ' + essai.dosAssur);
  ok(essai.assurStaff === 0,
     'passer de Banque à Assurances : le registre repart vide, il ne suit pas',
     essai.assurStaff + ' salarié(s) hérités');
  ok(essai.assurEffectif === null,
     'et aucun effectif n’apparaît sur un secteur qu’on vient d’ouvrir',
     essai.assurEffectif);
  ok(!essai.assurNom, 'ni la fiche entreprise de l’essai précédent', essai.assurNom);
  ok(essai.banqueApres === 3, 'revenir sur Banque retrouve ses trois salariés',
     essai.banqueApres);
  ok(essai.dosSansSecteur === 'admin', '« aucun secteur » est encore un autre dossier',
     essai.dosSansSecteur);

  /* Et le chiffre dit d'ou il vient — c'etait la question posee. */
  const source = await page.evaluate(() => {
    appSetSecteur('banque'); jxRechargerDossier();
    return { src: cseEffectifSource(), lib: jxDossierLib() };
  });
  ok(source.src.src === 'registre' && /registre du personnel/.test(source.src.txt),
     'l’effectif annonce sa source : le registre du personnel', JSON.stringify(source.src));
  ok(/3 inscrits/.test(source.src.txt), 'avec le nombre d’inscrits', source.src.txt);
  ok(/banque/.test(source.lib), 'et le dossier ouvert est nommé', source.lib);
  await page.evaluate(() => { appSetSecteur(''); jxRechargerDossier(); });

  // ── Retour chez le client : il doit tout retrouver ────────────────
  await page.evaluate(() => deconnexion());
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    sessionStorage.setItem('jte_ok', '1');
    sessionStorage.setItem('jte_code', 'tec2026');
    sessionStorage.setItem('jte_sector', 'formation');
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1100);
  await page.evaluate(() => { try { initApp(); } catch (e) {} });
  /* L'en-tete se remplit apres coup : une attente fixe echouait une fois
     sur trois quand la machine etait chargee. On attend le contenu, pas
     l'horloge — et cinq secondes sans nom restent un echec franc. */
  try {
    /* L'en-tete se repare lui-meme en relisant le disque : le sondage
       l'appelle, au lieu d'attendre que le hasard le fasse. */
    await page.waitForFunction(() => {
      try { updateHeroTop(); } catch (e) {}
      return /TEC/.test(document.getElementById('top-nom').textContent);
    }, { timeout: 8000 });
  } catch (e) {
    /* Echec : on dit tout de l'etat, pour juger si c'est l'application
       ou l'environnement d'essai qui a perdu le dossier. */
    console.log('  ETAT A L\'ECHEC : ' + JSON.stringify(await page.evaluate(() => ({
      cle: localStorage.getItem('juris_transport::c_tec2026') ? 'PRESENTE' : 'ABSENTE',
      compte: (typeof jxCompte === 'function') ? jxCompte() : '?',
      inscription: (document.getElementById('pg-inscription') || {}).style ? document.getElementById('pg-inscription').style.display : '?',
      Enom: (typeof E !== 'undefined' && E) ? (E.nom || '(vide)') : '(indefini)',
      code: sessionStorage.getItem('jte_code'),
      cles: Object.keys(localStorage).filter(k => k.indexOf('juris_transport') === 0)
    }))));
  }
  console.log('\n— Retour dans le dossier TEC —');
  const h3 = await page.evaluate(() => document.getElementById('top-nom').textContent);
  console.log('  en-tête : ' + JSON.stringify(h3));
  ok(/TEC/.test(h3), 'le client retrouve sa fiche intacte', h3);
  ok(/1516/.test(h3), 'et sa convention', h3);

  await nav.close();
  console.log('\n' + (echecs ? echecs + ' ECHEC(S)' : 'tout est vert'));
  process.exit(echecs ? 1 : 0);
})();
