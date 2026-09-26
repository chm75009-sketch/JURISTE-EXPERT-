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

  ok(err.length === 0, 'aucune exception JavaScript', err.join(' | '));
  await nav.close();
  console.log(e ? '\n' + e + ' echec(s)' : '\ntout est vert');
  process.exit(e ? 1 : 0);
})();
