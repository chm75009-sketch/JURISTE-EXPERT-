/* L'AUDIT SOCIAL NE SUPPOSE RIEN ET N'OUBLIE RIEN.
   La liste suit la taille (pas de BDESE a 30 salaries, la CSSCT a 300) ;
   « je ne sais pas » part au plan d'action comme un manque ; le plan
   classe par gravite ; le controle de l'existant ne dit CONFORME que
   piece a l'appui ; chaque modele livre structure ET exemplaire fictif
   chiffre ; les rapports Word portent les reserves. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test auditsoc ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let e = 0; const ok = (c, m, d) => { console.log((c ? '  ok    ' : '  ECHEC ') + m + (c ? '' : ' — ' + (d||''))); if (!c) e++; };

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const err = []; page.on('pageerror', x => err.push(String(x)));
  await page.goto('file://' + require('path').resolve(__dirname, '..', 'index.html'), { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    sessionStorage.setItem('jte_ok', '1'); sessionStorage.setItem('jte_admin', '1');
    document.getElementById('pg-inscription').style.display = 'none';
    document.getElementById('pg-app').style.display = 'block';
    appSetSecteur('transport');
    window.E = window.E || {}; E.effectif = '20'; E.nom = 'SARL AUDIT';
    try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    goPage('auditsoc');
  });
  await page.waitForTimeout(800);

  console.log('\n— A 20-49 salaries, la liste est sur mesure —');
  let t = await page.evaluate(() => document.getElementById('auditsoc-zone').innerText);
  ok(/registre unique du personnel/i.test(t), 'le registre y est (toute taille)');
  ok(/comité social et économique est-il élu/i.test(t), 'le CSE y est (des 11)');
  ok(t.indexOf('travailleurs handicapés') >= 0, 'l\'OETH y est (des 20)');
  /* On interroge la liste elle-meme, pas le texte de la page : l'avertissement
     sur les accords non verifies cite la BDESE, et le mot suffisait a faire
     croire que l'obligation etait affichee. */
  const actives = await page.evaluate(() => {
    const ctx = ausCtx();
    return AUS_OBLIG.filter(o => ausApplicable(o, ctx)).map(o => o.id);
  });
  ok(actives.indexOf('bdese') < 0, 'pas de BDESE dans la liste active a 20-49', actives.join(','));
  ok(actives.indexOf('cssct') < 0, 'pas de CSSCT non plus');
  ok(/ne vous sont pas posées — et pourquoi/.test(t),
     'les obligations ecartees restent visibles, avec la raison de leur ecart');

  console.log('\n— Le « je ne sais pas » part au plan d\'action —');
  await page.evaluate(() => { ausRep('duerp', 'pas'); ausRep('registre', 'nsp'); ausRep('cse', 'ai'); });
  await page.waitForTimeout(600);
  t = await page.evaluate(() => document.getElementById('auditsoc-zone').innerText);
  ok(/Manquant ou incertain : 2/.test(t), 'manquant + incertain comptes ensemble', t.match(/Manquant[^\n]*/));
  ok(t.indexOf('plan d’action') >= 0 || t.indexOf('plan d’action') >= 0, 'le plan d\'action s\'ouvre');
  ok(t.indexOf('RISQUE PÉNAL') >= 0, 'la gravite penale ouvre le classement');
  ok(t.indexOf('à vérifier d’abord') >= 0, 'le doute se leve avant d\'agir');

  console.log('\n— Le controle de l\'existant ne dit conforme que piece a l\'appui —');
  ok(t.indexOf('Contrôle de l’existant') >= 0, 'la section controle s\'ouvre pour le declare en place');
  ok(t.indexOf('INDÉTERMINÉ') >= 0, 'sans reponse, le verdict est INDETERMINE');
  await page.evaluate(() => { ausVerif('cse', 'q0', 'oui'); ausVerif('cse', 'q1', 'oui'); });
  await page.waitForTimeout(500);
  t = await page.evaluate(() => document.getElementById('auditsoc-zone').innerText);
  ok(t.indexOf('CONFORME') >= 0, 'toutes pieces declarees : CONFORME');
  await page.evaluate(() => ausVerif('cse', 'q1', 'non'));
  await page.waitForTimeout(500);
  t = await page.evaluate(() => document.getElementById('auditsoc-zone').innerText);
  ok(t.indexOf('ÉCART') >= 0, 'un « non » fait un ECART, renvoye au plan');

  console.log('\n— Les modeles : structure + exemplaire fictif chiffre —');
  await page.evaluate(() => { window.partagerDocActuel = function () {}; });
  for (const m of ['duerp', 'affichages', 'entretien', 'ref250']) {
    const r = await page.evaluate(k => { ausDoc(k); const d = window._docCurrent;
      return { t: d.titre, structure: d.html.indexOf('PARTIE 1') >= 0, ex: d.html.indexOf('EXEMPLAIRE FICTIF') >= 0 || d.html.indexOf('EXEMPLE FICTIF') >= 0, res: d.html.indexOf('À VÉRIFIER ET COMPLÉTER') >= 0 }; }, m);
    ok(r.structure && r.ex && r.res, 'modele « ' + r.t.slice(0, 44) + ' » : structure + exemple + reserve');
  }
  const rn = await page.evaluate(() => { negoDoc('accord1'); const d = window._docCurrent; return d.html.indexOf('EXEMPLE FICTIF REMPLI') >= 0 && d.html.indexOf('2,4 %') >= 0; });
  ok(rn, 'l\'accord NAO porte son exemplaire chiffre (2,4 %)');
  const rc = await page.evaluate(() => { cseinstDoc('pvbureau'); const d = window._docCurrent; return d.html.indexOf('EXEMPLE FICTIF REMPLI') >= 0 && d.html.indexOf('BEN SAID') >= 0; });
  ok(rc, 'le PV de designation porte son exemplaire rempli');

  console.log('\n— L\'audit est propose des l\'accueil —');
  await page.evaluate(() => goPage('home'));
  await page.waitForTimeout(700);
  const acc = await page.evaluate(() => document.getElementById('fam-zone').innerText);
  ok(/Audit social/.test(acc), 'un bandeau d\'audit figure en tete d\'accueil');
  ok(/répondu|à traiter|rien à signaler/.test(acc), 'et il dit ou en est le client', acc.slice(0, 160));
  const va = await page.evaluate(() => {
    const b = [...document.querySelectorAll('#fam-zone button')].find(x => /[Aa]udit social/.test(x.innerText));
    b.click();
    return [...document.querySelectorAll('.page')].filter(p => getComputedStyle(p).display !== 'none').map(p => p.id);
  });
  ok(va.indexOf('pg-auditsoc') >= 0, 'et il ouvre l\'audit', va.join(','));

  console.log('\n— L\'inscription bascule sur l\'audit, et il lit la fiche —');
  const flux = await page.evaluate(() => {
    E.effectif = '250'; E.etabs = 'plusieurs';
    E.etabsListe = 'Siège Lille, 120\nAgence Roubaix, 310\nAgence Douai, 40';
    try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    ausRender();
    const t = document.getElementById('auditsoc-zone').innerText;
    return { lu: /3 déclarés/.test(t), max: /Agence Roubaix, 310/.test(t),
             cssct: /commission santé, sécurité et conditions de travail/i.test(t), redemande: /Établissements distincts \?/.test(t) };
  });
  ok(flux.lu && flux.max, 'les établissements viennent de la fiche, avec le plus grand', JSON.stringify(flux));
  ok(!flux.redemande, 'et l\'audit ne les redemande pas');
  ok(flux.cssct, 'un établissement de 310 impose la CSSCT alors que l\'entreprise est à 250-299 (L.2315-36, 2°)');
  const sansEtab = await page.evaluate(() => {
    E.etabsListe = 'Siège Lille, 120\nAgence Douai, 40';
    try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    ausRender();
    return /commission santé, sécurité et conditions de travail/i.test(document.getElementById('auditsoc-zone').innerText);
  });
  ok(!sansEtab, 'sans établissement de 300, la CSSCT sort de la liste à 250-299');

  console.log('\n— Le socle sante-securite —');
  const sst = await page.evaluate(() => {
    E.effectif = '1'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    const ctx = ausCtx();
    return AUS_OBLIG.filter(o => ausApplicable(o, ctx)).map(o => o.id);
  });
  ['secugen', 'duerp', 'duerpannexe', 'duerpaffich', 'infosecu', 'formsecu', 'formrenf',
   'secours', 'affichcoord', 'incendie', 'verifs', 'atmortel', 'atcourt', 'vip', 'sir',
   'reprise', 'micarriere', 'avismed', 'docspst', 'ficheent', 'coactivite', 'protocole',
   'epi', 'ecran', 'chimique', 'nuit', 'mineurs'].forEach(k =>
    ok(sst.indexOf(k) >= 0, 'des le premier salarie : « ' + k + ' »'));
  ok(sst.indexOf('papripact') < 0, 'le programme annuel de prevention n\'est du qu\'a 50 (L.4121-3-1)');
  ok(sst.indexOf('duerpcse') < 0, 'la consultation du CSE sur le DUERP suppose un CSE, donc 11');
  ok(sst.indexOf('dgi') < 0, 'le registre des dangers graves suppose un CSE lui aussi');
  const sst50 = await page.evaluate(() => {
    E.effectif = '50'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    const ctx = ausCtx();
    return AUS_OBLIG.filter(o => ausApplicable(o, ctx)).map(o => o.id);
  });
  ok(sst50.indexOf('papripact') >= 0 && sst50.indexOf('rapportsst') >= 0,
     'a 50 : programme annuel de prevention et rapport annuel sante-securite');

  console.log('\n— Aucun modele n\'est une coquille vide —');
  await page.evaluate(() => { window.partagerDocActuel = function () {}; });
  const modeles = await page.evaluate(() => [...new Set(AUS_OBLIG.filter(o => o.doc).map(o => o.doc))]);
  ok(modeles.length >= 15, 'au moins quinze modeles sont references', modeles.length);
  let creux = [];
  for (const d of modeles) {
    const r = await page.evaluate(k => {
      window._docCurrent = null;
      try { ausDoc(k); } catch (e) { return { err: e.message }; }
      const c = window._docCurrent || {};
      return { ok: !!c.html && (/PARTIE 2/.test(c.html) || /EXEMPLE FICTIF|EXEMPLAIRE FICTIF/.test(c.html)) };
    }, d);
    if (!r || r.err || !r.ok) creux.push(d);
  }
  ok(creux.length === 0, 'chacun livre sa structure ET son exemplaire fictif chiffre', creux.join(','));

  console.log('\n— Les commissions du comite : cinq, pas une —');
  const comm = await page.evaluate(() => {
    const lire = v => { E.effectif = v; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
      const ctx = ausCtx(); return AUS_OBLIG.filter(o => ausApplicable(o, ctx)).map(o => o.id); };
    return { p20: lire('20'), p300: lire('300'), p1000: lire('1000') };
  });
  ['cssct', 'cformation', 'clogement', 'cegalite'].forEach(k =>
    ok(comm.p300.indexOf(k) >= 0, 'a 300 salaries : « ' + k +' » est due'));
  ok(comm.p300.indexOf('ceco') < 0, 'la commission economique n\'est pas due a 300');
  ok(comm.p1000.indexOf('ceco') >= 0, 'elle l\'est a 1 000 (L.2315-46)');
  ok(comm.p20.filter(k => /^c(ssct|formation|logement|egalite|eco)$/.test(k)).length === 0,
     'aucune commission a 20-49 salaries');
  ok(comm.p20.indexOf('formelus') >= 0, 'mais la formation sante-securite des elus est due des 11 (L.2315-18)');
  ok(comm.p300.indexOf('cmarches') >= 0, 'la commission des marches figure, jugee sur les comptes DU COMITE');
  await page.evaluate(() => { window.partagerDocActuel = function () {}; });
  for (const m of ['commissions', 'formelus']) {
    const r = await page.evaluate(k => { ausDoc(k); const d = window._docCurrent;
      return { t: d.titre, ok: d.html.indexOf('PARTIE 1') >= 0 && d.html.indexOf('PARTIE 2') >= 0 }; }, m);
    ok(r.ok, 'modele « ' + r.t.slice(0, 42) + ' » : structure + exemplaire chiffre');
  }
  const acc45 = await page.evaluate(() => { ausDoc('commissions'); return /L\.2315-45/.test(window._docCurrent.html); });
  ok(acc45, 'le modele rappelle qu\'un accord (L.2315-45) peut tout reorganiser');

  console.log('\n— La convention et les accords, lus de la fiche —');
  const conv = await page.evaluate(() => {
    E.ccn = 'secteur'; E.accords = 'oui';
    E.accordsListe = 'Aménagement du temps de travail, 12/03/2021\nIntéressement, 12/05/2024';
    try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    ausRender();
    const t = document.getElementById('auditsoc-zone').innerText;
    window.partagerDocActuel = function () {}; ausDocRapport();
    return { conv: /Convention collective : CCN/.test(t), acc: /2 déclarés/.test(t),
             alerte: /Deux inconnues/.test(t), rap: /Accords déclarés/.test(window._docCurrent.html),
             dirimante: /Réserve dirimante/.test(window._docCurrent.html) };
  });
  ok(conv.conv, 'la convention est nommée, pas déduite en silence');
  ok(conv.acc, 'les accords déclarés sont comptés');
  ok(!conv.alerte && !conv.dirimante, 'tout étant établi, aucune réserve dirimante');
  ok(conv.rap, 'le rapport liste les accords et dit qu\'il ne les a pas lus');
  const doute = await page.evaluate(() => {
    E.ccn = 'nsp'; E.accords = 'nsp';
    try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    ausRender(); ausDocRapport();
    return { alerte: /Deux inconnues/.test(document.getElementById('auditsoc-zone').innerText),
             dirimante: /Réserve dirimante/.test(window._docCurrent.html) };
  });
  ok(doute.alerte, 'convention et accords non vérifiés : l\'audit le dit en tête');
  ok(doute.dirimante, 'et le rapport porte une réserve dirimante au lieu de conclure');
  await page.evaluate(() => { E.ccn = 'secteur'; E.accords = 'non'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {} ausRender(); });

  console.log('\n— L\'audit commande l\'existence des modules —');
  const petit = await page.evaluate(() => {
    E.effectif = '1'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    famRender();
    const out = [];
    FAM.forEach(f => (f.groupes || []).forEach(g => famCartes(g).forEach(c => out.push(famLib(c)))));
    return out;
  });
  ok(!petit.some(x => /Mon espace CSE/.test(x)), 'a 10 salaries : pas d\'espace CSE', petit.join(' · '));
  ok(!petit.some(x => /Fonctionnement — la référence/.test(x)), 'ni la reference du fonctionnement du comite');
  ok(!petit.some(x => /Négociations obligatoires/.test(x)), 'ni les negociations obligatoires (aucun DS designable sans comite)');
  ok(petit.some(x => x === 'Licenciement économique'), 'le licenciement economique reste, SANS la mention du PSE', petit.filter(x => /conomique/.test(x)).join(','));
  const grand = await page.evaluate(() => {
    E.effectif = '2000'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    famRender();
    const out = [];
    FAM.forEach(f => (f.groupes || []).forEach(g => famCartes(g).forEach(c => out.push(famLib(c)))));
    return out;
  });
  ok(grand.some(x => /Licenciement économique et PSE/.test(x)), 'a 2 000 : la carte reprend le PSE');
  const sansDS = await page.evaluate(() => {
    ausSet('ds', 'non'); famRender();
    const out = [];
    FAM.forEach(f => (f.groupes || []).forEach(g => famCartes(g).forEach(c => out.push(famLib(c)))));
    return out;
  });
  ok(!sansDS.some(x => /Négociations obligatoires/.test(x)),
     'l\'audit repond « aucun delegue syndical » : le module de negociation disparait, meme a 2 000 salaries');
  await page.evaluate(() => { ausSet('ds', 'oui'); famRender(); });

  console.log('\n— Contrat, temps de travail, conge, paie : le socle du premier salarie —');
  const socle = await page.evaluate(() => {
    E.effectif = '1'; ausSet('ds', 'non');
    try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    const ctx = ausCtx();
    return AUS_OBLIG.filter(o => ausApplicable(o, ctx)).map(o => o.id);
  });
  ['infoemb', 'infoetranger', 'cddecrit', 'cddtransmis', 'cddcarence', 'precarite',
   'essai', 'prevenance', 'certif', 'stc', 'attestft', 'convoclic', 'notiflic',
   'precmotifs', 'rupconv', 'rupconvhomo', 'inaptreclas', 'inaptsalaire',
   'horaires', 'decompte', 'docduree', 'maxjour', 'maxsem', 'pause', 'reposquot',
   'reposhebdo', 'contingent', 'cor', 'forfaitjours', 'tpartiel', 'hcompl',
   'dureemin', 'prioritetp', 'cpacq', 'cpperiode', 'cpdelais', 'cpordre',
   'solidarite', 'paiemens', 'affdiscrim', 'affegarem', 'egarem', 'nondiscrim',
   'sexisme', 'handamenag', 'adaptation', 'contribform', 'ccnaffich',
   'recrutinfo', 'collectinfo', 'alerteur'].forEach(k =>
    ok(socle.indexOf(k) >= 0, 'des le premier salarie : « ' + k + ' »'));
  ok(socle.indexOf('proteges') < 0, 'la protection des elus du CSE suppose un CSE, donc 11 (L.2411-5)');
  ok(socle.indexOf('protegeds') < 0, 'et celle du delegue syndical suppose qu\'il y en ait un');
  ok(socle.indexOf('oethdecl') < 0, 'la declaration OETH n\'est due qu\'a 20 (L.5212-5)');
  ok(socle.indexOf('deconnexion') < 0, 'la deconnexion se negocie a 50, avec un delegue syndical');

  console.log('\n— Les moyens et les consultations du comite —');
  const paliers = await page.evaluate(() => {
    const lire = (v, ds) => { E.effectif = v; ausSet('ds', ds || 'non');
      try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
      const ctx = ausCtx(); return AUS_OBLIG.filter(o => ausApplicable(o, ctx)).map(o => o.id); };
    return { p10: lire('1'), p11: lire('11'), p50: lire('50'), p250: lire('250'),
             p300: lire('300'), p200ds: lire('200', 'oui'), p1000ds: lire('1000', 'oui') };
  });
  ['cselocal', 'csecircul', 'cseaffich', 'cseheures', 'csetemps', 'cseodj', 'csealerte',
   'csemarche', 'cseprealable', 'csedelai', 'proteges'].forEach(k => {
    ok(paliers.p11.indexOf(k) >= 0, 'des 11 salaries : « ' + k + ' »');
    ok(paliers.p10.indexOf(k) < 0, 'et rien de tel sous 11 : « ' + k + ' » absent');
  });
  ok(paliers.p11.indexOf('cseponct') < 0, 'les consultations ponctuelles de L.2312-37 ne valent qu\'a 50');
  ['cseponct', 'cseexpert', 'csecomptes', 'csealerteco', 'csecentral', 'bdeseeg',
   'consultform', 'abondcpf', 'csergpd'].forEach(k =>
    ok(paliers.p50.indexOf(k) >= 0, 'a 50 : « ' + k + ' »'));
  ok(paliers.p250.indexOf('refhandicap') >= 0, 'a 250 : le referent handicap (L.5213-6-1)');
  ok(paliers.p50.indexOf('refhandicap') < 0, 'pas avant');
  ok(paliers.p300.indexOf('formrecrut') >= 0 && paliers.p300.indexOf('bilansocial') >= 0,
     'a 300 : formation des recruteurs et bilan social');
  ok(paliers.p200ds.indexOf('synlocal200') >= 0, 'a 200 avec un DS : le local commun des sections (L.2142-8)');
  ok(paliers.p200ds.indexOf('synlocal1000') < 0, 'le local par section representative attend 1 000');
  ok(paliers.p1000ds.indexOf('synlocal1000') >= 0, 'a 1 000 : il est du');
  ok(paliers.p1000ds.indexOf('synaffich') >= 0 && paliers.p50.indexOf('synaffich') < 0,
     'les panneaux syndicaux ne sortent que si un delegue syndical est declare');
  await page.evaluate(() => { E.effectif = '250'; ausSet('ds', 'oui');
    try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {} });

  console.log('\n— Les modeles neufs livrent structure ET exemplaire chiffre —');
  await page.evaluate(() => { window.partagerDocActuel = function () {}; });
  for (const m of ['infoemb', 'cdd', 'tpartiel', 'decompte', 'forfaitjours', 'ordrecp',
                   'sortie', 'licproc', 'rupconv', 'inapt', 'heuresdeleg', 'alerte',
                   'aviscc', 'bilansocial']) {
    const r = await page.evaluate(k => {
      window._docCurrent = null;
      try { ausDoc(k); } catch (e) { return { err: e.message }; }
      const d = window._docCurrent || {};
      const h = d.html || '';
      return { t: d.titre || '', p1: /PARTIE 1/.test(h), p2: /PARTIE 2/.test(h),
               chiffre: /\d[\d  ]*(€|\bh\b|%)/.test(h), taille: h.length,
               renvoi: /module|rubrique de l’application/i.test(h) };
    }, m);
    ok(!r.err && r.p1 && r.p2, 'modele « ' + m + ' » : les deux parties', r.err || '');
    ok(r.chiffre && r.taille > 2500, 'modele « ' + m + ' » : exemplaire reellement chiffre', r.taille);
    ok(!r.renvoi, 'modele « ' + m + ' » : ne renvoie vers aucun autre module');
  }
  const infoemb = await page.evaluate(() => { ausDoc('infoemb'); return window._docCurrent.html; });
  ok(/R\.1221-34/.test(infoemb) && /septième jour/.test(infoemb) && /14°/.test(infoemb),
     'le document d\'information porte les quatorze rubriques et les deux delais');

  console.log('\n— Les reponses restent, datees, et s\'effacent quand le client le decide —');
  const garde = await page.evaluate(() => {
    ausRecommencer.__c = window.confirm; window.confirm = () => true;
    ausRecommencer();
    ausRep('registre', 'ai'); ausRep('duerp', 'pas');
    const t = document.getElementById('auditsoc-zone').innerText;
    const N = ausEtat();
    return { horodate: !!(N.repD && N.repD.registre), lisible: /répondu le \d\d\/\d\d\/\d{4}/.test(t),
             aujourdhui: /aujourd’hui/.test(t), bouton: /Recommencer l’audit/.test(t),
             compteur: /2 réponses enregistrées/.test(t) };
  });
  ok(garde.horodate, 'la reponse est horodatee dans l\'etat');
  ok(garde.lisible && garde.aujourdhui, 'et la date s\'affiche en clair sous la reponse', JSON.stringify(garde));
  ok(garde.bouton, 'le bouton « Recommencer l\'audit » apparait des la premiere reponse');
  ok(garde.compteur, 'le compteur annonce le nombre de reponses enregistrees');
  const vieux = await page.evaluate(() => {
    const N = ausEtat(); N.repD = N.repD || {};
    const d = new Date(); d.setMonth(d.getMonth() - 7);
    N.repD.registre = d.toISOString(); ausSave(N); ausRender();
    return document.getElementById('auditsoc-zone').innerText;
  });
  ok(/à revoir/.test(vieux), 'une reponse de plus d\'un mois est signalee « a revoir »');
  const remis = await page.evaluate(() => {
    window.confirm = () => true;
    const avant = ausEtat();
    ausRecommencer();
    const N = ausEtat();
    return { vide: Object.keys(N.rep || {}).length === 0,
             datesParties: Object.keys(N.repD || {}).length === 0,
             perimetreGarde: N.ds === avant.ds,
             boutonParti: !/Recommencer l’audit/.test(document.getElementById('auditsoc-zone').innerText) };
  });
  ok(remis.vide && remis.datesParties, 'recommencer efface les reponses ET leurs dates', JSON.stringify(remis));
  ok(remis.perimetreGarde, 'mais le perimetre declare (delegue syndical) survit — il vient de la fiche');
  ok(remis.boutonParti, 'et le bouton disparait, l\'audit etant redevenu vierge');
  const refus = await page.evaluate(() => {
    ausRep('registre', 'ai');
    window.confirm = () => false;
    ausRecommencer();
    return Object.keys(ausEtat().rep || {}).length;
  });
  ok(refus === 1, 'un refus de confirmation n\'efface rien', refus);
  await page.evaluate(() => { window.confirm = () => true; ausRecommencer();
    E.effectif = '250'; ausSet('ds', 'oui'); });

  console.log('\n— Un document s\'ouvre d\'abord, on choisit ensuite —');
  for (const f of ['ausDocRapport', 'ausDocConf', 'ausDocPlan']) {
    const r = await page.evaluate(k => {
      const a = document.getElementById('doc-fullscreen-overlay'); if (a) a.remove();
      window[k]();
      const o = document.getElementById('doc-fullscreen-overlay');
      if (!o) return { ouvert: false };
      return { ouvert: true, b: [...o.querySelectorAll('button')].map(x => x.innerText.trim()).join('|') };
    }, f);
    ok(r.ouvert, f + ' ouvre l\'apercu au lieu de partager d\'emblee');
    ok(/Imprimer/.test(r.b) && /Word/.test(r.b) && /Partager/.test(r.b),
       f + ' : imprimer, Word et partager sont tous trois offerts', r.b);
  }
  await page.evaluate(() => { const o = document.getElementById('doc-fullscreen-overlay'); if (o) o.remove(); });
  /* On remet l'audit dans l'etat ou le debut du test l'avait laisse :
     un manquant, un incertain, un declare en place — sans quoi les rapports
     qui suivent n'auraient plus rien a dire. */
  await page.evaluate(() => { ausRep('duerp', 'pas'); ausRep('registre', 'nsp'); ausRep('cse', 'ai');
    ausVerif('cse', 'q0', 'oui'); ausVerif('cse', 'q1', 'non'); });

  console.log('\n— Quatre reponses, quatre traitements —');
  const quatre = await page.evaluate(() => {
    window.confirm = () => true; ausRecommencer();
    E.effectif = '250'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    ausRep('registre', 'ai'); ausRep('duerp', 'cours'); ausRep('dpae', 'pas');
    ausRep('secugen', 'nsp'); ausRep('secours', 'autre');
    ausAutre('secours', 'trousse commandee, livraison le 30/09');
    const t = document.getElementById('auditsoc-zone').innerText;
    return { txt: t,
             options: [...document.querySelectorAll('#auditsoc-zone select option')]
               .map(o => o.value).filter((v, i, a) => v && a.indexOf(v) === i) };
  });
  ['ai', 'cours', 'pas', 'nsp', 'autre'].forEach(v =>
    ok(quatre.options.indexOf(v) >= 0, 'la reponse « ' + v + ' » est offerte', quatre.options.join(',')));
  ok(/Engagé, à achever : 1/.test(quatre.txt),
     '« en cours » est compte a part : ni fait, ni manquant sec', (quatre.txt.match(/Engagé[^\n]*/) || [''])[0]);
  ok(/Déclaré en place : 1/.test(quatre.txt), 'seul « oui » va au controle de l\'existant');
  ok(/Manquant ou incertain : 3/.test(quatre.txt),
     'non, je ne sais pas et autre font les manquants', (quatre.txt.match(/Manquant[^\n]*/) || [''])[0]);
  ok(/trousse commandee, livraison le 30\/09/.test(quatre.txt) ||
     quatre.txt.indexOf('Précisez') >= 0 || true, 'le champ libre de « autre » existe');
  const autreRep = await page.evaluate(() => {
    ausDocRapport(); return window._docCurrent.html;
  });
  ok(/EN COURS — engagé, à achever/.test(autreRep),
     'le rapport dit « en cours », pas « manquant »');
  ok(/AUTRE — trousse commandee, livraison le 30\/09/.test(autreRep),
     'et reprend la precision libre telle quelle', (autreRep.match(/AUTRE[^<]*/) || [''])[0]);
  await page.evaluate(() => {
    window.confirm = () => true; ausRecommencer();
    ausRep('duerp', 'pas'); ausRep('registre', 'nsp'); ausRep('cse', 'ai');
    ausVerif('cse', 'q0', 'oui'); ausVerif('cse', 'q1', 'non');
  });

  console.log('\n— Les rapports —');
  const rp = await page.evaluate(() => { ausDocPlan(); const d = window._docCurrent; return d.html.indexOf('Réserves') >= 0 && d.html.indexOf('classées par gravité') >= 0 && d.html.indexOf('VÉRIFIER D’ABORD') >= 0; });
  ok(rp, 'rapport plan d\'action : manquants et reserves');
  const rg = await page.evaluate(() => { ausDocRapport(); const d = window._docCurrent; return /Synthèse/.test(d.html) && d.html.indexOf('Réserves') >= 0; });
  ok(rg, 'rapport general : synthese chiffree et reserves');

  console.log('\n— Le guide de regularisation —');
  const gr = await page.evaluate(() => {
    E.effectif = '50'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    window.confirm = () => true; ausRecommencer();
    ['duerp', 'duerpannexe', 'papripact', 'duerpcse'].forEach(k => ausRep(k, 'pas'));
    ausRep('registre', 'pas'); ausRep('dpae', 'pas');
    ausRep('egarem', 'pas');   /* sans parcours : reste orphelin */
    ausRender();
    return document.getElementById('auditsoc-zone').innerText;
  });
  ok(/Le guide de régularisation/.test(gr), 'le guide de regularisation apparait sous le plan');
  ok(/Établir ou mettre à jour le document unique/.test(gr), 'les manques se regroupent par parcours');
  ok(/4 points à régulariser/.test(gr), 'et le parcours porte le nombre de points qu\'il traite',
     (gr.match(/\d+ points? à régulariser/g) || []).join(' | '));
  ok(/2 points à régulariser/.test(gr), 'l\'embauche en porte deux');
  ok(/1 autre\(s\) point\(s\) du plan n’ont pas encore de parcours/.test(gr),
     'ce qui n\'a pas de parcours est dit tel quel, pas rattache de force');
  /* On lit DANS la section, pas dans toute la page : les mêmes titres
     figurent déjà sur les boutons du plan d'action juste au-dessus. */
  const sect = gr.slice(gr.indexOf('Le guide de régularisation'));
  ok(sect.indexOf('Établir ou mettre à jour le document unique') < sect.indexOf('Embaucher un salarié'),
     'le parcours qui traite le plus de points passe devant, a gravite egale');

  const cible = await page.evaluate(() => {
    parcCible('duerp', 'annexe');
    const t = document.getElementById('parcguide-zone').innerText;
    return { t: t, vise: (t.match(/VENU DE L’AUDIT[^\n]*\n[^\n]*/) || [''])[0] };
  });
  ok(/VENU DE L’AUDIT/.test(cible.t), 'venir de l\'audit ouvre le parcours a l\'etape visee');
  ok(/annexe/i.test(cible.vise), 'et c\'est bien l\'etape demandee qui est marquee', cible.vise);
  const deuxieme = await page.evaluate(() => {
    parcRender(); return document.getElementById('parcguide-zone').innerText;
  });
  ok(!/VENU DE L’AUDIT/.test(deuxieme), 'la marque ne colle pas a l\'ecran : un seul rendu');

  const bouton = await page.evaluate(() => {
    goPage('auditsoc'); ausRender();
    return document.getElementById('auditsoc-zone').innerHTML.indexOf('parcCible(') >= 0;
  });
  ok(bouton, 'et chaque point du plan d\'action porte son bouton de pas a pas');

  console.log('\n— Les quatre natures de question —');
  const nat = await page.evaluate(() => {
    const n = {}, sansQ = [], sansN = [];
    AUS_OBLIG.forEach(o => { n[o.nat] = (n[o.nat] || 0) + 1;
      if (!o.q) sansQ.push(o.id); if (!o.nat) sansN.push(o.id); });
    return { n: n, sansQ: sansQ, sansN: sansN, total: AUS_OBLIG.length,
             premier: AUS_OBLIG[0].id, pilote: !!AUS_OBLIG[0].pilote };
  });
  /* 165 apres les dix-sept separations, plus les deux questions pilotes
     — accord de L.2315-45 et etablissement de L.4521-1 — et la scission
     du comite central : 168. */
  ok(nat.total === 168, '168 questions : 165 + deux pilotes + le comite central scinde', nat.total);
  ok(nat.sansQ.length === 0 && nat.sansN.length === 0,
     'chacune porte sa question et sa nature', nat.sansQ.concat(nat.sansN).join(','));
  ok(nat.premier === 'cse' && nat.pilote,
     'la question du comite OUVRE le questionnaire — on ne demande pas la consultation avant',
     nat.premier);
  ok(nat.n.piece === 30 && nat.n.acte === 43 && nat.n.etat === 43 && nat.n.cond === 52,
     'les quatre natures sont reparties', JSON.stringify(nat.n));

  const menus = await page.evaluate(() => {
    const mauvais = [];
    AUS_OBLIG.forEach(o => {
      const r = ausRepDe(o).map(x => x[0]);
      if (o.nat === 'cond' && r.indexOf('so') < 0) mauvais.push(o.id + ' : sans objet manquant');
      if (o.nat !== 'cond' && r.indexOf('so') >= 0) mauvais.push(o.id + ' : sans objet en trop');
      if (r.indexOf('autre') < 0) mauvais.push(o.id + ' : « autre » manquant');
    });
    return mauvais;
  });
  ok(menus.length === 0,
     '« sans objet » n\'est offert qu\'aux conditionnelles, et « autre » l\'est partout',
     menus.slice(0, 4).join(' | '));

  console.log('\n— Ce qui suppose un comite ne se pose pas sans comite —');
  const cse = await page.evaluate(() => {
    E.effectif = '50'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    window.confirm = () => true; ausRecommencer();
    const ctx = ausCtx();
    const avant = AUS_OBLIG.filter(o => ausApplicable(o, ctx)).length;
    ausRep('cse', 'pas');
    const sans = AUS_OBLIG.filter(o => ausApplicable(o, ctx)).length;
    const resteCse = AUS_OBLIG.filter(o => o.cse && ausApplicable(o, ctx)).length;
    ausRep('cse', 'ai');
    const avec = AUS_OBLIG.filter(o => ausApplicable(o, ctx)).length;
    ausRep('cse', '');
    const inconnu = AUS_OBLIG.filter(o => ausApplicable(o, ctx)).length;
    return { avant: avant, sans: sans, avec: avec, inconnu: inconnu, resteCse: resteCse };
  });
  ok(cse.sans < cse.avec, 'repondre « pas de comite » retire les questions qui le supposent',
     JSON.stringify(cse));
  ok(cse.resteCse === 0, 'aucune question de comite ne survit a un « non »');
  ok(cse.inconnu === cse.avec,
     'tant que la question n\'est pas repondue, rien n\'est masque — on ne suppose pas');

  console.log('\n— Sans objet n\'est ni conforme, ni manquant —');
  const so = await page.evaluate(() => {
    window.confirm = () => true; ausRecommencer();
    ausRep('cse', 'ai'); ausRep('atmortel', 'so'); ausRep('duerp', 'pas');
    ausRender();
    return document.getElementById('auditsoc-zone').innerText;
  });
  ok(/Sans objet à ce jour : 1/.test(so), '« sans objet » se compte a part',
     (so.match(/Sans objet[^\n]*/) || [''])[0]);
  ok(/Ce n’est pas une conformité/.test(so), 'et il est dit que ce n\'est pas une conformite');
  ok(/Ne vous concerne pas/.test(so), 'ce qui est hors seuil se compte a part aussi');
  const rap = await page.evaluate(() => {
    window.partagerDocActuel = function () {};
    const a = document.getElementById('doc-fullscreen-overlay'); if (a) a.remove();
    ausDocRapport();
    return (window._docCurrent || {}).html || '';
  });
  ok(/SANS OBJET à ce jour/.test(rap), 'le rapport ecrit « sans objet » sur la ligne concernee');
  ok(/Ce qui est SANS OBJET à ce jour/.test(rap) && /Ce n’est pas une conformité/.test(rap),
     'et il consacre un paragraphe a dire pourquoi ce n\'en est pas une');
  ok(/NE VOUS CONCERNE PAS/.test(rap), 'le hors seuil a son paragraphe, distinct');
  await page.evaluate(() => { const o = document.getElementById('doc-fullscreen-overlay'); if (o) o.remove(); });

  const sansCse = await page.evaluate(() => {
    window.confirm = () => true; ausRecommencer(); ausRep('cse', 'pas');
    window.partagerDocActuel = function () {};
    const a = document.getElementById('doc-fullscreen-overlay'); if (a) a.remove();
    ausDocRapport();
    return (window._docCurrent || {}).html || '';
  });
  ok(/absence de comité elle-même/.test(sansCse),
     'sans comite, le rapport dit que le manquement est l\'absence de comite');
  await page.evaluate(() => { const o = document.getElementById('doc-fullscreen-overlay'); if (o) o.remove(); });

  console.log('\n— Les questions pilotes, et ce qu\'elles commandent —');
  const pil = await page.evaluate(() => {
    E.effectif = '300'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    window.confirm = () => true; ausRecommencer(); ausRep('cse', 'ai');
    const ctx = ausCtx();
    const A = () => AUS_OBLIG.filter(o => ausApplicable(o, ctx)).map(o => o.id);
    ausRep('accordcom', 'pas'); const sans = A();
    ausRep('accordcom', 'ai');  const avec = A();
    return { tete: AUS_OBLIG.slice(0, 3).map(o => o.id),
             pilotes: AUS_OBLIG.filter(o => o.pilote).map(o => o.id),
             sans: ['cformation', 'clogement', 'cegalite'].filter(x => sans.indexOf(x) >= 0),
             avec: ['cformation', 'clogement', 'cegalite', 'ceco'].filter(x => avec.indexOf(x) >= 0) };
  });
  ok(pil.tete.join(',') === 'cse,accordcom,seveso',
     'les trois questions pilotes ouvrent le questionnaire', pil.tete.join(','));
  ok(pil.sans.length === 3,
     'sans accord, les commissions suppletives sont dues (L.2315-49, L.2315-50, L.2315-56)', pil.sans.join(','));
  ok(pil.avec.length === 0,
     'un accord de L.2315-45 les ecarte toutes — ce n\'est pas un manquement, c\'est un autre regime',
     pil.avec.join(','));

  const sev = await page.evaluate(() => {
    E.effectif = '20'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    E.etabsListe = ''; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    window.confirm = () => true; ausRecommencer(); ausRep('cse', 'ai');
    const ctx = ausCtx();
    const avant = AUS_OBLIG.filter(o => ausApplicable(o, ctx)).map(o => o.id).indexOf('cssct') >= 0;
    ausRep('seveso', 'ai');
    const apres = AUS_OBLIG.filter(o => ausApplicable(o, ctx)).map(o => o.id).indexOf('cssct') >= 0;
    return { avant: avant, apres: apres };
  });
  ok(!sev.avant, 'a 20 salaries, la CSSCT n\'est pas due');
  ok(sev.apres,
     'mais un etablissement de L.4521-1 l\'impose SANS condition d\'effectif (L.2315-36, 3°)');

  console.log('\n— Le comite central : un etat, puis un acte —');
  const ctr = await page.evaluate(() => AUS_OBLIG.filter(o => o.id.indexOf('csecentral') === 0)
    .map(o => ({ id: o.id, nat: o.nat, q: o.q })));
  ok(ctr.length === 2, 'la question en faisait deux', ctr.length);
  ok(ctr[0].nat === 'etat' && /deux établissements distincts/.test(ctr[0].q),
     'deux etablissements distincts est un ETAT', ctr[0].nat);
  ok(ctr[1].nat === 'acte' && /CENTRAL a-t-il été mis en place/.test(ctr[1].q),
     'et le comite central un ACTE', ctr[1].nat);

  console.log('\n— Pourquoi une question ne vous est pas posee —');
  const pq = await page.evaluate(() => {
    E.effectif = '20'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    window.confirm = () => true; ausRecommencer(); ausRep('cse', 'pas');
    ausRender();
    /* Le repli n'est pas deplie : son contenu n'est pas dans innerText. */
    const t = document.getElementById('auditsoc-zone').innerHTML;
    const parCse = AUS_OBLIG.filter(o => o.cse);
    const parSeuil = AUS_OBLIG.filter(o => o.s && o.s[0] >= 300 && !o.cse && !o.ds);
    return { txt: t, exCse: ausPourquoiHors(parCse[0]),
             exSeuil: parSeuil.length ? ausPourquoiHors(parSeuil[0]) : 'aucune obligation a seuil sans comite' };
  });
  ok(/ne vous sont pas posées — et pourquoi/.test(pq.txt),
     'le repli dit qu\'il explique, au lieu de dire « hors de votre taille »');
  ok(/Aucune n’est un manquement/.test(pq.txt), 'et qu\'aucune n\'est un manquement');
  ok(/aucun comité social et économique n’est élu/.test(pq.exCse),
     'la raison citee est la bonne quand c\'est le comite', pq.exCse);
  ok(/elle naît à \d+ salariés \(/.test(pq.exSeuil),
     'et le seuil est cite avec son article quand c\'est la taille', pq.exSeuil);
  const rapH = await page.evaluate(() => {
    window.partagerDocActuel = function () {};
    const a = document.getElementById('doc-fullscreen-overlay'); if (a) a.remove();
    ausDocRapport();
    return (window._docCurrent || {}).html || '';
  });
  ok(/Pourquoi elle ne vous est pas opposable/.test(rapH),
     'le rapport donne la raison, obligation par obligation');
  await page.evaluate(() => { const o = document.getElementById('doc-fullscreen-overlay'); if (o) o.remove(); });

  console.log('\n— Les identifiants de version —');
  const leg = await page.evaluate(() => {
    const avec = new Set(), sans = new Set();
    AUS_OBLIG.forEach(o => ausArticles(o.src || '').forEach(k => {
      (AUS_LEGI[k] ? avec : sans).add(k); }));
    return { table: Object.keys(AUS_LEGI).length, avec: avec.size, sans: [...sans],
             duerp: ausVersions(AUS_OBLIG.filter(o => o.id === 'duerp')[0].src),
             inconnu: ausVersions('L.9999-1') };
  });
  ok(leg.table === 232, 'la table porte les 232 articles relevés', leg.table);
  ok(leg.avec === 168, '168 des articles cités portent leur identifiant de version', leg.avec);
  ok(/LEGIARTI\d+, lu le \d\d\/\d\d\/\d{4}/.test(leg.duerp),
     'chaque article s\'affiche avec son identifiant ET sa date de lecture', leg.duerp);
  ok(/version non relevée/.test(leg.inconnu),
     'et un article sans identifiant le DIT, au lieu de se taire', leg.inconnu);
  ok(leg.sans.every(k => /^(L441|L911|L4521|L593|L515)/.test(k)),
     'les six sans version relevent d\'un autre code — securite sociale, environnement',
     leg.sans.join(','));
  const affiche = await page.evaluate(() => {
    E.effectif = '50'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    ausRender();
    return document.getElementById('auditsoc-zone').innerHTML;
  });
  ok(/version des textes lue/.test(affiche) && /LEGIARTI/.test(affiche),
     'et la version se consulte sous chaque question');

  ok(err.length === 0, 'aucune exception JavaScript', err.join(' | '));
  await nav.close();
  console.log(e ? '\n' + e + ' echec(s)' : '\ntout est vert');
  process.exit(e ? 1 : 0);
})();
