/* QUI COMPTE, QUI VOTE, QUI PEUT ETRE ELU.
   Trois questions distinctes, et la loi ne les tranche pas ensemble.
   L.1111-2 dit qui entre au decompte de l'effectif et a quel poids ;
   L.2314-18 qui est electeur ; L.2314-19 et L.2314-23 qui est eligible.
   Un salarie mis a disposition peut compter a l'effectif, voter dans
   l'entreprise qui l'emploie, et n'etre eligible nulle part ici.
   Ce test tient les trois colonnes separees, cas par cas. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test electorat ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let e = 0; const ok = (c, m, d) => { console.log((c ? '  ok    ' : '  ECHEC ') + m + (c ? '' : ' — ' + (d || ''))); if (!c) e++; };

const SCRUTIN = '2026-12-15';

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const err = []; page.on('pageerror', x => err.push(String(x)));
  await page.goto('file://' + require('path').resolve(__dirname, '..', 'index.html'), { waitUntil: 'load' });
  await page.waitForTimeout(900);

  /* Un salarie type, que chaque cas modifie sur un seul point. */
  const calc = (o) => page.evaluate(([s, d]) => {
    const r = calcSalarieNom(s, d);
    return r ? { eff: r.effectif, el: r.electeur, elig: r.eligible,
                 rEl: r.electeurRaison, rEff: r.raisonEff } : null;
  }, [Object.assign({
    nom: 'ESSAI', dateNaissance: '1985-04-12', dateEntree: '2015-03-02',
    dateSortie: '', contrat: 'cdi_tp', statut: 'employe', sexe: 'F', heures: 35
  }, o), SCRUTIN]);

  console.log('\n— Les seuils se comptent en jours, jamais en heures —');
  /* Le defaut qui a coute cinq electeurs sur un fichier de 15 600 : les
     dates lues en temps universel, l'echeance calculee en heure locale.
     Entre l'heure d'ete et l'heure d'hiver elle tombait une heure trop
     tard, et « trois mois pile » devenait « moins de trois mois ». */
  const j3 = await calc({ dateEntree: '2026-09-15' });
  ok(j3.el === true, 'entre exactement trois mois avant le scrutin : ELECTEUR', j3.rEl);
  const j3m = await calc({ dateEntree: '2026-09-16' });
  ok(j3m.el === false, 'un jour de moins : pas encore electeur', j3m.rEl);
  const a1 = await calc({ dateEntree: '2025-12-15' });
  ok(a1.elig === true, 'un an pile d\'anciennete : ELIGIBLE');
  const a1m = await calc({ dateEntree: '2025-12-16' });
  ok(a1m.elig === false, 'un jour de moins : pas encore eligible');
  const s16 = await calc({ dateNaissance: '2010-12-15', dateEntree: '2026-01-05' });
  ok(s16.el === true && s16.elig === false, 'seize ans pile : electeur, jamais eligible');
  const s18 = await calc({ dateNaissance: '2008-12-15', dateEntree: '2020-01-05' });
  ok(s18.elig === true, 'dix-huit ans pile : eligible');
  const deb = await page.evaluate(() => [
    jxAjoute('2026-01-31', 0, 1), jxAjoute('2024-02-29', 1, 0), jxAjoute('2026-12-15', -1, 0)
  ]);
  ok(deb[0] === '2026-02-28', '31 janvier + 1 mois = 28 fevrier, jamais le 3 mars', deb[0]);
  ok(deb[1] === '2025-02-28', '29 fevrier + 1 an = 28 fevrier', deb[1]);
  ok(deb[2] === '2025-12-15', 'et l\'annee en arriere se calcule pareil', deb[2]);

  console.log('\n— Le salarie mis a disposition — L.2314-23 —');
  /* « Les salaries mis a disposition ne sont pas eligibles dans
     l'entreprise utilisatrice. » Electeurs seulement apres douze mois
     CONTINUS de presence, et seulement s'ils CHOISISSENT d'y voter. */
  const mad = await calc({ contrat: 'mad', dateEntree: '2020-01-06' });
  ok(mad.elig === false, 'jamais eligible dans l\'entreprise utilisatrice', mad.rEl);
  ok(mad.el === false && /CHOISIT/.test(mad.rEl),
     'ni electeur tant que son choix n\'est pas recueilli', mad.rEl);
  const madOpt = await calc({ contrat: 'mad', dateEntree: '2020-01-06', optionVoteMad: 1 });
  ok(madOpt.el === true && madOpt.elig === false,
     'son choix recueilli, il vote ici — et reste ineligible');
  const madCourt = await calc({ contrat: 'mad', dateEntree: '2026-06-01', optionVoteMad: 1 });
  ok(madCourt.el === false && /12 mois/.test(madCourt.rEl),
     'moins de douze mois dans les locaux : pas electeur', madCourt.rEl);
  ok(mad.eff > 0, 'il compte a l\'effectif, lui, des un an de presence (L.1111-2, 2°)', mad.eff);

  console.log('\n— Celui qui remplace un absent — L.1111-2, 2°, derniere phrase —');
  /* Le texte ecarte « les salaries titulaires d'un contrat a duree
     determinee et les salaries mis a disposition par une entreprise
     exterieure, Y COMPRIS LES SALARIES TEMPORAIRES », lorsqu'ils
     remplacent un salarie absent OU DONT LE CONTRAT EST SUSPENDU. */
  const lus = await page.evaluate(() => ({
    interimRempl: normaliseContrat('Intérim de remplacement'),
    madRempl: normaliseContrat('Mise à disposition en remplacement'),
    interim: normaliseContrat('Intérim'),
    mad: normaliseContrat('Mise à disposition'),
    madAccent: normaliseContrat('Mise à disposition'),
    cddRempl: normaliseContrat('CDD de remplacement')
  }));
  ok(lus.interimRempl === 'rempl_ext',
     'un interim DE REMPLACEMENT est lu comme un remplacant, pas comme un interim', lus.interimRempl);
  ok(lus.madRempl === 'rempl_ext', 'une mise a disposition en remplacement aussi', lus.madRempl);
  ok(lus.interim === 'interim' && lus.cddRempl === 'cdd_rempl',
     'les deux autres restent ce qu\'ils sont');
  /* L'accent : la regle cherchait « mis a disposition » sans accent et
     l'ecriture francaise ordinaire lui echappait. Trois cent cinquante
     salaries devenaient des contrats « non reconnus ». */
  ok(lus.mad === 'mad' && lus.madAccent === 'mad',
     '« Mise à disposition » est reconnu, accent compris', lus.mad + '/' + lus.madAccent);
  const rx = await calc({ contrat: 'rempl_ext', dateEntree: '2024-01-06' });
  ok(rx.eff === 0 && rx.el === false,
     'le remplacant venu de l\'exterieur ne compte pas et ne vote pas ici', rx.rEff);

  console.log('\n— Le bareme de R.2314-1 —');
  /* Les cinquante-trois tranches ont ete confrontees au tableau le
     07/09/2026. Celle-ci etait fausse : 34 heures, non 32. */
  const bar = await page.evaluate(() => [
    jxBareme(9749), jxBareme(9999), jxBareme(10000), jxBareme(11016)
  ]);
  ok(bar[0].sieges === 34 && bar[0].heures === 32, '9 500-9 749 : 34 sieges, 32 heures');
  ok(bar[1].sieges === 34 && bar[1].heures === 34,
     '9 750-9 999 : 34 sieges et 34 heures — total 1 156', JSON.stringify(bar[1]));
  ok(bar[2].sieges === 35 && bar[2].heures === 34, '10 000 et plus : 35 sieges, 34 heures');
  ok(bar[3].sieges === 35 && bar[3].heures === 34, 'et au-dela, la meme ligne vaut');
  const incert = await page.evaluate(() => jxBaremeIncertain(3000));
  ok(incert === false,
     'la reserve d\'incertitude au-dela de 2 500 n\'a plus d\'objet : le tableau a ete lu');

  console.log('\n— Trente-quatre mille salaries ne figent plus l\'ecran —');
  /* Chaque salarie produisait un bloc complet — champs de saisie, menus,
     boutons. A 34 560, le navigateur s'arretait avant d'avoir fini et la
     date du premier tour devenait inaccessible. Le calcul porte toujours
     sur la liste entiere ; seul l'affichage est borne, et l'ecran le dit. */
  const charge = await page.evaluate(() => {
    const L = [];
    for (let i = 0; i < 34560; i++) L.push({
      nom: 'N' + i, dateNaissance: '1985-04-12', dateEntree: '2015-03-02', dateSortie: '',
      contrat: (i % 9 === 0 ? 'cdi_tpartiel' : 'cdi_tp'),
      statut: (i % 7 === 0 ? 'cadre' : 'employe'), sexe: (i % 2 ? 'F' : 'M'),
      heures: (i % 9 === 0 ? 17.5 : 35) });
    salariesNom = L;
    document.getElementById('cse-nom-date-scrutin').value = '2026-12-15';
    const t0 = performance.now(); refreshNomTable(); const ms = performance.now() - t0;
    const zone = document.getElementById('cse-nom-liste').innerHTML;
    return { ms: Math.round(ms), dessinees: (zone.match(/Eff\. /g) || []).length,
             borne: /lignes affichées sur/.test(zone),
             synthese: document.getElementById('cse-nom-synthese').innerText };
  });
  ok(charge.ms < 5000, 'la liste se redessine en moins de cinq secondes', charge.ms + ' ms');
  ok(charge.dessinees === 200 && charge.borne,
     'deux cents lignes dessinees, et l\'ecran dit combien il en reste', charge.dessinees);
  ok(/32640/.test(charge.synthese),
     'mais le decompte porte sur la liste entiere — 30 720 temps pleins et 3 840 mi-temps',
     charge.synthese.slice(0, 160));
  ok(/35 titulaire/.test(charge.synthese),
     'et le bareme suit : 35 titulaires au-dela de 10 000 salaries');
  const vide = await page.evaluate(() => {
    salariesNom = []; window._cseVoirTout = 0; refreshNomTable();
    return document.getElementById('cse-nom-liste').innerText;
  });
  ok(/Aucun salarié saisi/.test(vide), 'et la liste vide se dit, sans rien calculer');

  console.log('\n— L\'invitation syndicale porte les DEUX branches de L.2314-5 —');
  /* « Sont informees [...] et INVITEES A NEGOCIER le protocole d'accord
     preelectoral ET A ETABLIR LES LISTES DE LEURS CANDIDATS aux fonctions
     de membre de la delegation du personnel ». Les deux courriers
     n'invitaient qu'a negocier : une invitation amputee de sa seconde
     branche expose le scrutin a l'annulation. */
  const inv = await page.evaluate(() => {
    const out = {};
    /* La fiche entreprise remplie, sinon le document demande confirmation
       de ses manques ; et « confirm » ne repond pas tout seul. */
    window.E = window.E || {};
    E.nom = 'T.E.C'; E.adresse = '23 avenue du Château, 95100 Argenteuil';
    E.siret = '53845047900034'; E.dirigeant = 'Chadi EL SAFADI';
    E.ccn = 'Transports routiers et activités auxiliaires du transport';
    E.idcc = '16';
    window.confirm = () => true; window.alert = () => {};
    document.getElementById('cse-nom-date-scrutin').value = '2026-12-15';
    try { genDocElectionTEC('invitations_osr'); } catch (e) { out.err1 = String(e); }
    out.osr = ((window._docCurrent || {}).html || '');
    try { genDocCSE('invitation_os'); } catch (e) { out.err2 = String(e); }
    out.type = ((window._docCurrent || {}).html || '');
    /* Fiche muette : la lettre doit reclamer la convention, pas en inventer
       une. C'est le defaut qui a fait sortir « IDCC 0016 » chez des clients
       du batiment et de la banque. */
    E.ccn = ''; E.idcc = '';
    out.muet = (typeof jxCCNPhrase === 'function') ? jxCCNPhrase() : '(absente)';
    return out;
  });
  [['aux cinq confédérations', inv.osr], ['au modèle type', inv.type]].forEach(([q, h]) => {
    ok(/négocier le Protocole d.Accord Préélectoral/i.test(h),
       'la première branche — négocier le protocole — est ' + q);
    ok(/établir les listes de vos candidats/i.test(h),
       'la seconde — établir les listes de candidats — aussi, ' + q,
       h.slice(0, 120));
    ok(/L\.2314-5/.test(h), 'et le fondement est cité, ' + q);
    /* L.2314-13, deuxieme alinea : « Cet accord mentionne la proportion de
       femmes et d'hommes composant chaque college electoral ». Une mention
       que l'accord DOIT porter ne peut pas manquer aux points a negocier. */
    ok(/[Pp]roportion de femmes et d.hommes composant chaque collège/.test(h)
       && /L\.2314-13/.test(h),
       'la proportion F/H par collège figure aux points à négocier, ' + q);
    /* La convention se remplit depuis la fiche du client, elle ne se tape
       pas dans la lettre. */
    ok(/Convention collective applicable/.test(h)
       && /Transports routiers et activités auxiliaires du transport \(IDCC 0016\)/.test(h),
       'et la convention de la fiche y est reportée, IDCC compris, ' + q);
  });
  ok(/à renseigner dans la fiche entreprise/.test(inv.muet) && !/IDCC/.test(inv.muet),
     'fiche muette : la lettre réclame la convention au lieu d\'en supposer une',
     inv.muet);

  console.log('\n— Le calendrier retroplanning ne porte plus six defauts —');
  /* Sorti le 9 septembre 2026 pour une entreprise de transport routier, il
     annoncait « la CCN de la banque (IDCC 2120) », attribuait a un arret de
     2012 une solution qu'il ne contient pas, citait L.2314-24 — le portage
     salarial — pour la date de depot des candidatures, reservait le premier
     tour aux seules organisations representatives, se contredisait sur
     l'affichage des listes et presentait la limite du second tour comme une
     date imposee. */
  const cal = await page.evaluate(() => {
    const out = {};
    window.E = window.E || {};
    E.nom = 'T.E.C'; E.adresse = '23 avenue du Château, 95100 Argenteuil';
    E.siret = '53845047900034'; E.dirigeant = 'Chadi EL SAFADI';
    E.ccn = 'Transports routiers et activités auxiliaires du transport';
    E.idcc = '16';
    /* Le selecteur du module laisse sur un AUTRE secteur : c'est la
       situation exacte qui a produit la convention de la banque. */
    try { window.cseSecteur = 'banque'; } catch (x) {}
    window.confirm = () => true; window.alert = () => {};
    document.getElementById('cse-nom-date-scrutin').value = '2026-12-15';
    try { genDocElectionTEC('calendrier'); } catch (x) { out.err = String(x); }
    out.html = ((window._docCurrent || {}).html || '');
    return out;
  });
  ok(!cal.err, 'le calendrier se produit sans exception', cal.err);
  ok(/Transports routiers et activités auxiliaires du transport \(IDCC 0016\)/.test(cal.html)
     && !/IDCC 2120/.test(cal.html) && !/CCN de la banque/i.test(cal.html),
     'la convention est celle du dossier, pas celle du sélecteur du module');
  ok(!/ne prévoit pas de délais spécifiques/.test(cal.html)
     && /l'application ne les a pas lus/.test(cal.html),
     'et il n\'affirme plus ce que la convention contient sans l\'avoir lue');
  ok(!/11-60\.231/.test(cal.html) && /L\.2314-13/.test(cal.html),
     'l\'arrêt de 2012 n\'est plus cité pour ce qu\'il ne dit pas');
  ok(!/L\.2314-24/.test(cal.html) && /76-60\.119/.test(cal.html),
     'le portage salarial ne fonde plus la date de dépôt des candidatures');
  ok(/représentatives ou non/.test(cal.html),
     'le 1er tour n\'est plus réservé aux seules organisations représentatives');
  ok(!/3 nov\. 1993/.test(cal.html) && /aucun texte ne le chiffre/i.test(cal.html),
     'la contradiction sur l\'affichage des listes est levée');
  ok(/2ᵉ TOUR — DATE LIMITE/.test(cal.html)
     && /C'est une <strong>limite<\/strong>, non une date impos/.test(cal.html),
     'le second tour est donné comme une limite, non comme une date');
  ok(/Transmission du procès-verbal/.test(cal.html)
     && /Fin du délai de contestation/.test(cal.html),
     'et les deux échéances d\'après-scrutin figurent au tableau');

  console.log('\n— Aucune liste au 1er tour : on ne convoque personne —');
  /* L'application sortait les dix-neuf documents d'un bloc, dont les
     convocations des electeurs, la feuille d'emargement et les bulletins
     vierges, sans jamais demander si une liste avait ete deposee. Sans
     liste, le 1er tour n'a rien a faire voter : 82 personnes etaient
     convoquees devant une urne vide. */
  const etape = await page.evaluate(() => {
    const out = {};
    const sel = document.getElementById('cse-etape-scrutin');
    out.existe = !!sel;
    out.choix = sel ? [].map.call(sel.options, o => o.value) : [];
    /* L'identifiant cse-situation etait deja pris par « premiere mise en
       place / renouvellement / carence » : les deux coexistent. */
    out.autreSelecteur = !!document.getElementById('cse-situation');
    if (sel) { sel.value = 'aucune_liste'; cseEtapeMaj(); }
    out.note = (document.getElementById('cse-etape-note') || {}).innerHTML || '';
    out.hors = ((window.CSE_SITUATIONS || {}).aucune_liste || {}).hors || [];
    /* Un document sans objet ne sort pas sans qu'on le dise. */
    let demande = null;
    window.confirm = (m) => { demande = m; return false; };
    window.alert = () => {};
    window.E = window.E || {};
    E.nom = 'T.E.C'; E.adresse = '23 avenue du Château, 95100 Argenteuil';
    E.siret = '53845047900034'; E.dirigeant = 'Chadi EL SAFADI';
    E.ccn = 'Transports routiers'; E.idcc = '16';
    document.getElementById('cse-nom-date-scrutin').value = '2026-12-15';
    window._docCurrent = null;
    try { genDocElectionTEC('convocations'); } catch (x) { out.err = String(x); }
    out.demande = demande;
    out.produit = !!window._docCurrent;
    /* Et les cas ou le 2e tour n'a pas lieu ecartent ses documents. */
    out.horsComplet = ((window.CSE_SITUATIONS || {}).liste_complet || {}).hors || [];
    out.horsPartiel = ((window.CSE_SITUATIONS || {}).liste_partiel || {}).hors || [];
    return out;
  });
  ok(etape.existe, 'la question « où en est le scrutin ? » est posée');
  ok(etape.autreSelecteur,
     'sans écraser le sélecteur « première mise en place / renouvellement / carence »');
  ok(etape.choix.length === 7 && etape.choix.indexOf('aucune_liste') >= 0
     && etape.choix.indexOf('autre') >= 0,
     'les sept cas sont couverts, « Autre » comprise', etape.choix.join(','));
  ok(/rien \u00e0 voter au 1er tour/.test(etape.note)
     && /[Nn]e convoquez pas les \u00e9lecteurs/.test(etape.note),
     'et sans liste, l\'écran dit de ne convoquer personne');
  ['convocations', 'emargement', 'bulletin'].forEach(d => {
    ok(etape.hors.indexOf(d) >= 0, 'sans liste, « ' + d + ' » est écarté du dossier');
  });
  ok(!etape.produit && /SANS OBJET/.test(String(etape.demande || '')),
     'et s\'il est demandé quand même, l\'application dit pourquoi avant de le produire',
     String(etape.demande).slice(0, 90));
  ok(etape.horsComplet.indexOf('pv_2eme') >= 0
     && etape.horsComplet.indexOf('convocations_2eme') >= 0,
     'tous les sièges pourvus au 1er tour : les documents du 2e tour sont écartés');
  ok(etape.horsPartiel.indexOf('pv_carence_total') >= 0
     && etape.horsPartiel.indexOf('convocations_2eme') < 0,
     'sièges restants : le 2e tour a lieu, mais la carence totale n\'a plus d\'objet');

  console.log('\n— La convocation du 2e tour ne sort plus le jour de Noel —');
  /* Les deux documents du 2e tour etaient dates a cinq jours du scrutin :
     la convocation tombait le 25 decembre, et la note qui OUVRE les
     candidatures libres arrivait elle aussi le 25, soit trois semaines
     apres le jour ou l'on savait qu'aucune liste syndicale n'avait ete
     deposee. La convocation invitait de surcroit a se porter candidat cinq
     jours avant le vote. */
  const conv = await page.evaluate(() => {
    const o = {};
    window.E = window.E || {};
    E.nom = 'SARL TEC'; E.adresse = '23 avenue du Château, 95100 Argenteuil';
    E.siret = '53845047900034'; E.dirigeant = 'Chadi EL SAFADI';
    E.ccn = 'Transports routiers'; E.idcc = '16';
    window.confirm = () => true; window.alert = () => {};
    const sel = document.getElementById('cse-etape-scrutin');
    if (sel) { sel.value = 'aucune_liste'; cseEtapeMaj(); }
    /* Les convocations sont nominatives : sans electeur, le document ne sort
       pas. Deux suffisent pour en lire la date et le texte. */
    salariesNom = [
      { nom: 'DUPONT Jean', dateNaissance: '1980-05-03', dateEntree: '2015-03-02',
        dateSortie: '', contrat: 'cdi_tp', statut: 'employe', sexe: 'M', heures: 35 },
      { nom: 'MARTIN Claire', dateNaissance: '1990-09-21', dateEntree: '2018-01-15',
        dateSortie: '', contrat: 'cdi_tp', statut: 'employe', sexe: 'F', heures: 35 }
    ];
    document.getElementById('cse-nom-date-scrutin').value = '2026-12-15';
    refreshNomTable();
    const c = calcCalendrierCSE('2026-12-15');
    o.limite = new Date(c.limiteCandidatures).toISOString().slice(0, 10);
    window._docCurrent = null;
    try { genDocElectionTEC('note_info_2eme'); } catch (e) { o.e1 = String(e); }
    o.dateNote = ((((window._docCurrent || {}).html) || '').match(/le (\d{2}\/\d{2}\/\d{4})/) || [])[1];
    window._docCurrent = null;
    try { genDocElectionTEC('convocations_2eme'); } catch (e) { o.e2 = String(e); }
    const h = ((window._docCurrent || {}).html || '');
    o.dateConvoc = (h.match(/le (\d{2}\/\d{2}\/\d{4})/) || [])[1];
    o.ouvre = /adressez votre demande/.test(h);
    o.convoque = /elle vous convoque \u00e0 voter/.test(h);
    o.corresp = /enveloppe ext\u00e9rieure pr\u00e9-adress\u00e9e/.test(h);
    /* Et le garde-fou lui-meme : un 25 decembre recule. */
    o.noel = _jxJourUtile(new Date(2026, 11, 25)).toISOString().slice(0, 10);
    o.dimanche = _jxJourUtile(new Date(2026, 11, 20)).toISOString().slice(0, 10);
    return o;
  });
  ok(conv.dateNote === '01/12/2026',
     'la note ouvrant les candidatures part le lendemain de la date limite',
     'notée le ' + conv.dateNote + ' (limite ' + conv.limite + ')');
  ok(conv.dateConvoc === '23/12/2026',
     'et la convocation sept jours avant le scrutin, pas le 25 décembre',
     'notée le ' + conv.dateConvoc);
  ok(!conv.ouvre && conv.convoque,
     'la convocation convoque à voter au lieu d\'ouvrir les candidatures');
  ok(conv.corresp,
     'et elle dit ce que contient l\'envoi du vote par correspondance');
  ok(conv.noel === '2026-12-24' && conv.dimanche === '2026-12-18',
     'le garde-fou recule sur le 25 décembre et sur le dimanche',
     conv.noel + ' / ' + conv.dimanche);

  ok(err.length === 0, 'aucune exception JavaScript', err.join(' | '));
  await nav.close();
  console.log(e ? '\n' + e + ' echec(s)' : '\ntout est vert');
  process.exit(e ? 1 : 0);
})();
