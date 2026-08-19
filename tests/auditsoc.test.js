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
  ok(t.indexOf('Registre unique du personnel') >= 0, 'le registre y est (toute taille)');
  ok(t.indexOf('CSE élu') >= 0, 'le CSE y est (des 11)');
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
  ok(t.indexOf('hors de votre taille') >= 0, 'les obligations ecartees restent visibles avec leur seuil');

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
             cssct: t.indexOf('CSSCT créée') >= 0, redemande: /Établissements distincts \?/.test(t) };
  });
  ok(flux.lu && flux.max, 'les établissements viennent de la fiche, avec le plus grand', JSON.stringify(flux));
  ok(!flux.redemande, 'et l\'audit ne les redemande pas');
  ok(flux.cssct, 'un établissement de 310 impose la CSSCT alors que l\'entreprise est à 250-299 (L.2315-36, 2°)');
  const sansEtab = await page.evaluate(() => {
    E.etabsListe = 'Siège Lille, 120\nAgence Douai, 40';
    try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    ausRender();
    return document.getElementById('auditsoc-zone').innerText.indexOf('CSSCT créée') >= 0;
  });
  ok(!sansEtab, 'sans établissement de 300, la CSSCT sort de la liste à 250-299');

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

  console.log('\n— Les rapports —');
  const rp = await page.evaluate(() => { ausDocPlan(); const d = window._docCurrent; return d.html.indexOf('Réserves') >= 0 && d.html.indexOf('classées par gravité') >= 0 && d.html.indexOf('VÉRIFIER D’ABORD') >= 0; });
  ok(rp, 'rapport plan d\'action : manquants et reserves');
  const rg = await page.evaluate(() => { ausDocRapport(); const d = window._docCurrent; return /Synthèse/.test(d.html) && d.html.indexOf('Réserves') >= 0; });
  ok(rg, 'rapport general : synthese chiffree et reserves');

  ok(err.length === 0, 'aucune exception JavaScript', err.join(' | '));
  await nav.close();
  console.log(e ? '\n' + e + ' echec(s)' : '\ntout est vert');
  process.exit(e ? 1 : 0);
})();
