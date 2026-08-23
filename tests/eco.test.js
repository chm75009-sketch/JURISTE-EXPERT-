/* LE LICENCIEMENT ECONOMIQUE DE 2 A 9 SALARIES, ET LE SEUIL DE ONZE.
   L'article L.1233-8 ne fait reunir et consulter le comite social et economique
   que « dans les entreprises d'au moins onze salaries ». Le parcours demandait
   l'effectif puis ne s'en servait pas : il prescrivait la consultation d'un CSE
   a une entreprise de six salaries, qui ne peut pas en avoir.
   Trois autres regles manquaient dans la meme branche :
     — le delai d'avis d'un mois, et l'avis repute rendu a defaut (L.1233-8 al. 2) ;
     — les cinq jours ouvrables entre la presentation de la convocation et
       l'entretien (L.1233-11) ;
     — le conseiller du salarie, et l'adresse des services ou la liste est tenue,
       quand l'entreprise n'a pas d'institution representative (L.1233-13).
   Les quinze jours ouvrables de l'encadrement ne valent, eux, que pour un
   licenciement INDIVIDUEL (L.1233-15) : le test verifie qu'ils ne sont pas
   promis a la tranche 2 a 9. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test eco ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let e = 0; const ok = (c, m, d) => { console.log((c ? '  ok    ' : '  ECHEC ') + m + (c ? '' : ' — ' + d)); if (!c) e++; };

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await (await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  const err = []; page.on('pageerror', x => err.push(String(x)));
  await page.goto('file://' + require('path').resolve(__dirname, '..', 'index.html'), { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    sessionStorage.setItem('jte_ok', '1'); sessionStorage.setItem('jte_admin', '1');
    document.getElementById('pg-inscription').style.display = 'none';
    document.getElementById('pg-app').style.display = 'block';
    document.getElementById('accueil-screen').style.display = 'none';
    appSetSecteur('transport'); goPage('home');
  });

  /* Ouvre la feuille de route economique. `mille` repond a la question du seuil
     de L.1233-71 : elle ne se lit pas dans l'effectif de l'entreprise seule. */
  const route = async (eff, nb, mille) => {
    await page.evaluate(([eff, nb, mille]) => {
      goPage('rupture'); wzrGo('eco-1');
      document.getElementById('eco-eff').value = eff;
      document.getElementById('eco-nb').value = nb;
      document.getElementById('eco-mille').value = mille || 'non';
      wzrEcoNext();
    }, [eff, nb, mille]);
    await page.waitForTimeout(200);
    return page.evaluate(() => document.querySelector('#pg-rupture .wz-box, #pg-rupture').innerText);
  };

  console.log('\n— Moins de onze salaries, 2 a 9 licenciements : aucune consultation —');
  let t = await route('moins11', '2-9');
  ok(/au moins onze salari/i.test(t), 'le seuil de onze salaries est enonce');
  ok(/Pas de consultation/i.test(t), 'le parcours dit qu’il n’y a pas de consultation');
  ok(t.indexOf('L.1233-8') >= 0, 'et il donne son article');
  ok(!/Consultation du CSE en UNE réunion/i.test(t), 'il ne prescrit pas la reunion d’un CSE inexistant');

  console.log('\n— Onze a quarante-neuf, 2 a 9 : consultation, avis d’un mois —');
  t = await route('11-49', '2-9');
  ok(/Consultation du CSE en UNE réunion/i.test(t), 'une seule reunion');
  ok(/ne peut excéder un mois/i.test(t), 'le delai d’avis d’un mois est donne');
  ok(/réputé avoir été consulté/i.test(t), 'et l’avis repute rendu a defaut');
  ok(/carence/i.test(t), 'le cas du proces-verbal de carence est traite');

  console.log('\n— Les deux cas partagent la procedure individuelle —');
  for (const eff of ['moins11', '11-49']) {
    t = await route(eff, '2-9');
    ok(/moins de 5 jours ouvrables/i.test(t) && t.indexOf('L.1233-11') >= 0,
       'effectif ' + eff + ' : les 5 jours ouvrables de la convocation (L.1233-11)');
    ok(/7 jours ouvrables/i.test(t) && t.indexOf('L.1233-15') >= 0,
       'effectif ' + eff + ' : les 7 jours ouvrables de la notification (L.1233-15)');
    ok(/conseiller du salarié/i.test(t) && t.indexOf('L.1233-13') >= 0,
       'effectif ' + eff + ' : le conseiller du salarie et son article');
    ok(/adresse des services/i.test(t),
       'effectif ' + eff + ' : l’adresse ou la liste est tenue a disposition');
  }

  console.log('\n— Les quinze jours de l’encadrement ne valent que pour l’individuel —');
  t = await route('11-49', '2-9');
  ok(/ne valent que pour un licenciement/i.test(t), 'la reserve est ecrite dans la tranche 2 a 9');
  t = await route('11-49', '1');
  ok(/15 jours ouvrables/i.test(t), 'et les 15 jours figurent bien pour le licenciement individuel');

  console.log('\n— Le suivi de procedure connait le licenciement economique —');
  const pas = await page.evaluate(() => rxProcSteps({
    type: 'Licenciement économique (individuel ou moins de 10 sur 30 jours)',
    dateConn: '2026-03-02', dateRecep: '2026-03-02', dateEntretien: '2026-03-10'
  }).map(x => x.art + ' | ' + x.label));
  ok(pas.some(x => x.indexOf('L.1233-11') === 0), 'l’entretien est cale sur L.1233-11', pas.join(' / '));
  ok(pas.some(x => x.indexOf('L.1233-15') === 0), 'la notification sur L.1233-15');
  ok(pas.some(x => /L\.1233-19/.test(x)), 'l’information de la DREETS est calculee');
  ok(!pas.some(x => /L\.1332-4/.test(x)), 'la prescription disciplinaire de deux mois n’est pas appliquee');
  /* Le jalon de prescription ne s'affiche qu'avant l'entretien : on rejoue les
     deux cas sans date d'entretien, sinon la comparaison ne prouve rien. */
  const presc = t => page.evaluate(ty => rxProcSteps({ type: ty, dateConn: '2026-03-02', dateRecep: '2026-03-02' })
    .map(x => x.art).join(' '), t);
  ok(!/L\.1332-4/.test(await presc('Licenciement économique (individuel ou moins de 10 sur 30 jours)')),
     'economique : pas de prescription disciplinaire, meme avant l’entretien');
  ok(/L\.1332-4/.test(await presc('Sanction disciplinaire (avertissement, mise à pied…)')),
     'la sanction disciplinaire, elle, garde la prescription de deux mois');
  ok(!/L\.1332-4/.test(await presc('Licenciement pour motif personnel')),
     'le motif personnel non disciplinaire ne la porte pas non plus');

  console.log('\n— Le dispositif d’accompagnement suit le seuil de mille, pas l’effectif —');
  /* Une entreprise de trois cents salaries dans un groupe de mille deux cents
     releve du conge de reclassement, pas du CSP : c'est ce que le parcours
     refusait de voir, puisqu'il ne posait jamais la question. */
  t = await route('50plus', '2-9', 'oui');
  ok(/congé de reclassement/i.test(t) && t.indexOf('L.1233-71') >= 0,
     'au-dessus du seuil : conge de reclassement');
  ok(/pas de CSP/i.test(t), 'et il est dit qu’il n’y a pas de CSP');
  ok(/quatre et douze mois/i.test(t) && /vingt-quatre/i.test(t),
     'sa duree : quatre a douze mois, vingt-quatre en reconversion (R.1233-31)');
  ok(/65 ?%/.test(t) && /85 ?%/.test(t), 'sa remuneration : 65 %, plancher 85 % du SMIC (R.1233-32)');
  ok(t.indexOf('L.1233-75') >= 0, 'et son exclusion en redressement ou liquidation');

  t = await route('50plus', '2-9', 'non');
  ok(/sécurisation professionnelle/i.test(t) && t.indexOf('L.1233-66') >= 0,
     'en dessous du seuil : contrat de securisation professionnelle');
  ok(/dernière réunion des représentants/i.test(t),
     'le moment de la proposition est donne en entier');
  ok(/deux mois de salaire brut/i.test(t) && /trois mois/i.test(t),
     'la contribution due a defaut : deux mois, trois si adhesion sur proposition');
  ok(/douze mois/i.test(t) && t.indexOf('L.1233-67') >= 0,
     'la prescription de douze mois et sa mention obligatoire');
  /* LE CODE DIT LUI-MEME POURQUOI LES VINGT ET UN JOURS N'Y SONT PAS.
     L.1233-68, 2° renvoie a l'accord agree le soin de definir « les delais de
     reponse du salarie a la proposition de l'employeur ». Le delai est fixe
     par la convention du 26 janvier 2015 relative au CSP, article 4. */
  ok(/vingt et un jours/i.test(t), 'le delai de vingt et un jours est donne');
  ok(t.indexOf('L.1233-68') >= 0 && /accord agréé/i.test(t),
     'et le renvoi du code a l’accord agree est enonce');
  ok(/26 janvier 2015/.test(t) && /16 avril 2015/.test(t),
     'la convention et son arrete d’agrement sont nommes');
  ok(/salarié protégé/i.test(t), 'la prolongation pour le salarie protege figure');
  ok(/vaut refus/i.test(t), 'et l’absence de reponse vaut refus');

  t = await route('50plus', '2-9', 'nsp');
  ok(/à trancher/i.test(t), 'sans reponse sur le seuil, le parcours ne choisit pas');
  ok(/comité de groupe/i.test(t) && /européen/i.test(t),
     'et il rappelle que le seuil s’apprecie aussi au niveau du groupe');

  console.log('\n— Les quatre motifs de L.1233-3 —');
  const m = await page.evaluate(() => {
    window.partagerDocActuel = function () {};
    ausDoc('motifeco');
    const d = window._docCurrent || {};
    return { t: d.titre || '', h: d.html || '' };
  });
  ok(/quatre motifs/.test(m.t), 'le modele s\'ouvre', m.t);
  ok(!/\bTB\b/.test(m.h) && !/undefined/.test(m.h), 'et ne laisse rien fuir');
  ['Difficultés économiques', 'Mutations technologiques', 'Réorganisation', 'Cessation d’activité']
    .forEach(x => ok(m.h.indexOf(x) >= 0, 'le motif « ' + x + ' » y figure'));
  ['20-19.661', '22-18.852', '17-17.929', '18-23.029', '22-13.485', '23-15.503', '15-11.046']
    .forEach(n => ok(m.h.indexOf(n) >= 0, 'l\'arret n° ' + n + ' est cite'));
  ok(/MOTIF ADMIS/.test(m.h) && /MOTIF ÉCARTÉ/.test(m.h),
     'chaque decision dit le sort du MOTIF, non celui de l\'arret');
  ok(/sort du MOTIF ÉCONOMIQUE dans l’affaire, non le sort de l’arrêt/.test(m.h),
     'et l\'ambiguite est levee en toutes lettres');
  ok(/Un trimestre/.test(m.h) && /Quatre trimestres consécutifs/.test(m.h),
     'les quatre durees de baisse par effectif y sont');
  ok(/Aucun arrêt récent publié isolant ce seul motif n’a été trouvé/.test(m.h),
     'ce qui n\'a pas ete trouve est dit, pas comble');
  ok(/ne traite ni de l’obligation de reclassement/.test(m.h),
     'et le document dit ce qu\'il ne traite pas');
  await page.evaluate(() => { const o = document.getElementById('doc-fullscreen-overlay'); if (o) o.remove(); });

  console.log('\n— Aucune exception JavaScript —');
  ok(err.length === 0, 'aucune exception sur le parcours', err.join(' | '));

  await nav.close();
  console.log(e ? '\n' + e + ' echec(s)' : '\ntout est vert');
  process.exit(e ? 1 : 0);
})();
