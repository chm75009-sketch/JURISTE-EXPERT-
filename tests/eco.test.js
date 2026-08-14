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

  /* Ouvre la feuille de route economique pour un effectif et un nombre donnes. */
  const route = async (eff, nb) => {
    await page.evaluate(([eff, nb]) => {
      goPage('rupture'); wzrGo('eco-1');
      document.getElementById('eco-eff').value = eff;
      document.getElementById('eco-nb').value = nb;
      wzrEcoNext();
    }, [eff, nb]);
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

  console.log('\n— Aucune exception JavaScript —');
  ok(err.length === 0, 'aucune exception sur le parcours', err.join(' | '));

  await nav.close();
  console.log(e ? '\n' + e + ' echec(s)' : '\ntout est vert');
  process.exit(e ? 1 : 0);
})();
