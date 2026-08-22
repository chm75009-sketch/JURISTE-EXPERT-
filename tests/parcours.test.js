/* LE PARCOURS GUIDE NE SUPPOSE RIEN ET N'OUBLIE RIEN.
   « Etes-vous pret ? » reprend nommement ce qui manque ; les dates du
   dossier commandent les echeances et rien d'autre ; une etape hors seuil
   sort de la liste au lieu d'etre affirmee ; l'avancement se retrouve d'une
   session a l'autre, avec sa date ; le retard se voit ; le recapitulatif
   dit l'etat exact. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test parcours ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let e = 0; const ok = (c, m, d) => { console.log((c ? '  ok    ' : '  ECHEC ') + m + (c ? '' : ' — ' + (d || ''))); if (!c) e++; };

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
    E.effectif = '50'; E.nom = 'SARL PARCOURS';
    try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    window.confirm = () => true;
    parcRAZ('cseinstall');
    parcOuvrir('cseinstall');
  });
  await page.waitForTimeout(700);

  console.log('\n— La page s\'ouvre sur « etes-vous pret ? » —');
  let t = await page.evaluate(() => document.getElementById('parcguide-zone').innerText);
  ok(/Êtes-vous prêt/.test(t), 'le prealable ouvre le parcours');
  ok(/0 \/ 8/.test(t), 'aucun element coche au depart', t.slice(0, 120));
  ok(/Il vous manque 8 élément/.test(t), 'et les huit manquants sont repris nommement');
  ok(/masse salariale brute de l’exercice/.test(t), 'chacun est nomme, pas compte', t.slice(0, 300));
  ok(/INFORMATION|DOCUMENT|PIÈCE/.test(t), 'chaque element dit sa nature');

  const coche = await page.evaluate(() => {
    ['pv', 'liste', 'eff', 'ms'].forEach(k => parcPre('cseinstall', k, true));
    return document.getElementById('parcguide-zone').innerText;
  });
  ok(/4 \/ 8/.test(coche), 'les coches sont comptees', coche.slice(0, 120));
  ok(/Il vous manque 4 élément/.test(coche), 'et le manque se reduit d\'autant');

  console.log('\n— Les dates commandent les echeances, et elles seules —');
  const sansDate = await page.evaluate(() => document.getElementById('parcguide-zone').innerText);
  ok(!/Échéance/.test(sansDate), 'sans date saisie, aucune echeance n\'est inventee');
  const avecDate = await page.evaluate(() => {
    parcDate('cseinstall', 'proc', '2026-09-01');
    return document.getElementById('parcguide-zone').innerText;
  });
  ok(/Échéance : 1er octobre 2026/.test(avecDate),
     'la documentation economique est due un mois apres la proclamation (L.2312-57)', (avecDate.match(/Échéance[^\n]*/g) || []).join(' | '));
  const quantieme = await page.evaluate(() => {
    /* Le 31 janvier + un mois : le 28 ou le 29 fevrier, pas le 3 mars. */
    return [parcMois('2026-01-31', 1), parcMois('2028-01-31', 1), parcJours('2026-09-01', 30)];
  });
  ok(quantieme[0] === '2026-02-28' && quantieme[1] === '2028-02-29',
     'le quantieme a defaut d\'existence tombe au dernier jour du mois', quantieme.join(','));

  console.log('\n— Une etape hors seuil sort de la liste —');
  const p50 = await page.evaluate(() => document.getElementById('parcguide-zone').innerText);
  ok(/10 à votre situation/.test(p50), 'a 50 salaries : dix etapes dues, les deux commissions attendant 300', (p50.match(/étapes — [^\n]*/) || [''])[0]);
  ok(!/Désigner les membres de la commission santé/.test(p50), 'la CSSCT n\'y est pas — elle attend 300');
  ok(/hors de votre effectif/.test(p50), 'mais elle reste visible avec son seuil');
  const p11 = await page.evaluate(() => {
    E.effectif = '11'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    parcRender(); return document.getElementById('parcguide-zone').innerText;
  });
  ok(!/Élire le secrétaire et le trésorier/.test(p11), 'a 11 : ni secretaire ni tresorier (regime des 50 et plus)');
  ok(/référent harcèlement/.test(p11), 'mais le referent harcelement est du des le premier comite (L.2314-1)');
  const p300 = await page.evaluate(() => {
    E.effectif = '300'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    parcRender(); return document.getElementById('parcguide-zone').innerText;
  });
  ok(/commission santé, sécurité/.test(p300), 'a 300 : la CSSCT entre dans le parcours (L.2315-36)');
  ok(/d’ordre public/.test(p300), 'et son regime d\'ordre public est rappele');
  const inconnu = await page.evaluate(() => {
    E.effectif = ''; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    parcRender(); return document.getElementById('parcguide-zone').innerText;
  });
  ok(/TOUTES les étapes sont affichées/.test(inconnu),
     'effectif non renseigne : rien n\'est ecarte sur une supposition');

  console.log('\n— L\'avancement se retient, se date, et se remet a zero —');
  const fait = await page.evaluate(() => {
    E.effectif = '50'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    parcFait('cseinstall', 'convoc', true);
    parcFait('cseinstall', 'referent', true);
    const p = parcP('cseinstall');
    return { txt: document.getElementById('parcguide-zone').innerText,
             horodate: !!(p.faitD && p.faitD.convoc) };
  });
  ok(fait.horodate, 'chaque etape faite est horodatee');
  ok(/fait le \d\d\/\d\d\/\d{4}/.test(fait.txt), 'et sa date s\'affiche');
  ok(/Étapes faites : 2/.test(fait.txt), 'le compteur suit', (fait.txt.match(/Étapes faites[^\n]*/) || [''])[0]);
  const persiste = await page.evaluate(() => {
    parcRender();
    return Object.keys(parcP('cseinstall').fait || {}).length;
  });
  ok(persiste === 2, 'l\'avancement survit au reaffichage', persiste);

  console.log('\n— Le retard se voit —');
  const retard = await page.evaluate(() => {
    parcDate('cseinstall', 'proc', '2020-01-01');   // echeance largement passee
    return document.getElementById('parcguide-zone').innerText;
  });
  ok(/EN RETARD/.test(retard), 'une echeance depassee et non faite est signalee en retard');
  ok(/étape\(s\) en retard/.test(retard), 'et reprise dans « ou vous en etes »');
  const plusRetard = await page.evaluate(() => {
    parcFait('cseinstall', 'docef', true);
    return document.getElementById('parcguide-zone').innerText;
  });
  ok(!/EN RETARD/.test(plusRetard), 'une fois faite, elle n\'est plus en retard');

  console.log('\n— Le recapitulatif dit l\'etat exact —');
  await page.evaluate(() => { window.partagerDocActuel = function () {}; });
  const recap = await page.evaluate(() => {
    const a = document.getElementById('doc-fullscreen-overlay'); if (a) a.remove();
    window._docCurrent = null;
    parcRecap();
    const d = window._docCurrent || {};
    const o = document.getElementById('doc-fullscreen-overlay');
    return { html: d.html || '', titre: d.titre || '',
             boutons: o ? [...o.querySelectorAll('button')].map(x => x.innerText.trim()).join('|') : '' };
  });
  ok(/OÙ EN EST CE PARCOURS/.test(recap.html), 'le recapitulatif s\'etablit');
  ok(/Préalable/.test(recap.html) && /Il manque 4 élément/.test(recap.html),
     'il reprend le prealable incomplet');
  ok(/FAIT/.test(recap.html) && /à faire/.test(recap.html), 'et l\'etat de chaque etape');
  ok(/Fondement/.test(recap.html) && /L\.2312-57/.test(recap.html), 'chaque ligne porte son article');
  ok(/Imprimer/.test(recap.boutons) && /Word/.test(recap.boutons),
     'il s\'imprime et s\'enregistre comme les autres documents', recap.boutons);
  await page.evaluate(() => { const o = document.getElementById('doc-fullscreen-overlay'); if (o) o.remove(); });

  console.log('\n— Chaque document du parcours s\'ouvre —');
  let creux = [];
  for (const d of ['convocation', 'odj', 'pvbureau', 'ricse', 'documentation',
                   'commissions', 'formelus', 'heuresdeleg', 'budgets']) {
    const r = await page.evaluate(k => {
      const a = document.getElementById('doc-fullscreen-overlay'); if (a) a.remove();
      window._docCurrent = null;
      try { parcDoc(k); } catch (x) { return { err: x.message }; }
      const c = window._docCurrent || {};
      return { ok: !!c.html && /PARTIE 2|EXEMPLE FICTIF|EXEMPLAIRE FICTIF/.test(c.html) };
    }, d);
    if (!r || r.err || !r.ok) creux.push(d + (r && r.err ? '(' + r.err + ')' : ''));
  }
  ok(creux.length === 0, 'aucun n\'est une coquille vide', creux.join(','));
  const budg = await page.evaluate(() => { parcDoc('budgets'); return window._docCurrent.html; });
  ok(/0,22 %/.test(budg) && /157 080/.test(budg),
     'le modele des budgets chiffre le passage a 2 000 salaries (L.2315-61)');
  ok(/le rapport qui est garanti, pas le montant/.test(budg),
     'et dit ce qui se trompe le plus souvent sur les activites sociales (L.2312-81)');
  await page.evaluate(() => { const o = document.getElementById('doc-fullscreen-overlay'); if (o) o.remove(); });

  console.log('\n— Ce qui n\'est pas fonde n\'est pas affirme —');
  const reserve = await page.evaluate(() => {
    E.effectif = '1000'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    parcRender(); return document.getElementById('parcguide-zone').innerText;
  });
  ok(/aucun texte du code du travail ne règle cette remise/.test(reserve),
     'la transition avec le comite sortant est donnee sans fondement affiche');
  ok(/facultatif/.test(reserve), 'et marquee facultative');
  ok(/Un accord d’entreprise peut réorganiser/.test(reserve),
     'le conventionnel est signale, jamais affirme');
  ok(/l’arrêt ne le dit pas/.test(reserve),
     'la portee exacte de l\'arret de 1991 est dite : il vise le secretaire');

  console.log('\n— Le parcours s\'ouvre depuis le module d\'installation —');
  const acces = await page.evaluate(() => {
    goPage('cseinst');
    const z = document.getElementById('cseinst-zone').innerText;
    return /parcours guidé/i.test(z);
  });
  ok(acces, 'le module porte le bouton d\'ouverture');

  console.log('\n— Le parcours du reglement interieur —');
  const ri = await page.evaluate(() => {
    E.effectif = '50'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    window.confirm = () => true; parcRAZ('ri'); parcOuvrir('ri');
    parcDate('ri', 'pub', '2026-03-02');
    return document.getElementById('parcguide-zone').innerText;
  });
  ok(/Quel parcours \?/.test(ri), 'le choix du parcours figure en tete');
  ok(/8 à votre situation/.test(ri), 'huit etapes au reglement interieur', (ri.match(/étapes — [^\n]*/) || [''])[0]);
  ok(/Échéance : 2 avril 2026/.test(ri),
     'l\'entree en vigueur tombe un mois apres la publicite (L.1321-4)', (ri.match(/Échéance[^\n]*/g) || []).join(' | '));
  ok(/EXCLUSIVEMENT/.test(ri), 'le contenu limitatif de L.1321-1 est dit');
  ok(/lanceurs d’alerte|lanceurs d\'alerte/.test(ri), 'le rappel des lanceurs d\'alerte y est (L.1321-2)');
  ok(/proportionnée au but recherché/.test(ri), 'et le test de proportionnalite de L.1321-3');
  ok(/greffe du conseil de prud’hommes/.test(ri), 'le depot au greffe est distingue de l\'affichage (R.1321-2)');
  const riPetit = await page.evaluate(() => {
    E.effectif = '11'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    parcRender(); return document.getElementById('parcguide-zone').innerText;
  });
  ok(/Hors de votre effectif/.test(riPetit),
     'a 11 salaries, le parcours est montre mais signale hors seuil (L.1311-2)');
  ok(/dès 50 salariés/.test(riPetit), 'et le bouton porte le seuil qui le declenche');
  await page.evaluate(() => { window.partagerDocActuel = function () {}; });
  let creuxRi = [];
  for (const d of ['ri', 'ridepot', 'pvri']) {
    const r = await page.evaluate(k => {
      const a = document.getElementById('doc-fullscreen-overlay'); if (a) a.remove();
      window._docCurrent = null;
      try { parcDoc(k); } catch (x) { return { err: x.message }; }
      const c = window._docCurrent || {};
      return { ok: !!c.html && /PARTIE 1/.test(c.html) && /PARTIE 2/.test(c.html) };
    }, d);
    if (!r || r.err || !r.ok) creuxRi.push(d + (r && r.err ? '(' + r.err + ')' : ''));
  }
  ok(creuxRi.length === 0, 'les trois modeles du reglement livrent structure et exemplaire', creuxRi.join(','));
  const riDoc = await page.evaluate(() => { parcDoc('ri'); return window._docCurrent.html; });
  ok(/Entrée en vigueur inscrite à l’article 21 : le 3 avril 2026/.test(riDoc),
     'l\'exemplaire chiffre porte une entree en vigueur licite');
  ok(/Aucune sanction pécuniaire/.test(riDoc), 'et rappelle l\'interdiction de la sanction pecuniaire (L.1331-2)');
  const dep = await page.evaluate(() => { parcDoc('ridepot'); return window._docCurrent.html; });
  ok(/treize jours après la publicité/.test(dep),
     'le bordereau montre l\'erreur de date la plus frequente et sa correction');
  await page.evaluate(() => { const o = document.getElementById('doc-fullscreen-overlay'); if (o) o.remove(); });

  console.log('\n— Le parcours disciplinaire —');
  const di = await page.evaluate(() => {
    E.effectif = '72'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    window.confirm = () => true; parcRAZ('discipline'); parcOuvrir('discipline');
    parcDate('discipline', 'conn', '2026-04-21');
    parcDate('discipline', 'conv', '2026-05-06');
    parcDate('discipline', 'entr', '2026-05-12');
    return document.getElementById('parcguide-zone').innerText;
  });
  ok(/8 à votre situation/.test(di), 'huit etapes au parcours disciplinaire', (di.match(/étapes — [^\n]*/) || [''])[0]);
  ok(/Échéance : 21 juin 2026/.test(di),
     'les deux mois de L.1332-4 courent de la CONNAISSANCE du fait', (di.match(/Échéance[^\n]*/g) || []).join(' | '));
  ok(/Échéance : 12 juin 2026/.test(di), 'et le mois pour notifier court de l\'entretien (L.1332-2)');
  ok(/12 mai 2026/.test(di), 'cinq jours ouvrables apres la presentation, dimanche exclu');
  ok(/observations verbales/i.test(di), 'la definition de la sanction est donnee (L.1331-1)');
  ok(/ne constitue pas une sanction|n’est pas une sanction/.test(di),
     'la mise a pied conservatoire est distinguee de la sanction (L.1332-3)');
  ok(/trois ans/.test(di), 'et l\'anteriorite de trois ans est rappelee (L.1332-5)');
  const ouvr = await page.evaluate(() => [parcJoursOuvr('2026-05-06', 5), parcJoursOuvr('2026-05-09', 1)]);
  ok(ouvr[0] === '2026-05-12', 'le compte des jours ouvrables saute le dimanche', ouvr.join(','));
  ok(ouvr[1] === '2026-05-11', 'un jour ouvrable apres un samedi tombe le lundi', ouvr.join(','));
  await page.evaluate(() => { window.partagerDocActuel = function () {}; });
  let creuxD = [];
  for (const d of ['convdisc', 'madconserv', 'pventretien', 'notifdisc']) {
    const r = await page.evaluate(k => {
      const a = document.getElementById('doc-fullscreen-overlay'); if (a) a.remove();
      window._docCurrent = null;
      try { parcDoc(k); } catch (x) { return { err: x.message }; }
      const c = window._docCurrent || {};
      return { ok: !!c.html && /PARTIE 1/.test(c.html) && /PARTIE 2/.test(c.html) };
    }, d);
    if (!r || r.err || !r.ok) creuxD.push(d + (r && r.err ? '(' + r.err + ')' : ''));
  }
  ok(creuxD.length === 0, 'les quatre modeles disciplinaires sont complets', creuxD.join(','));
  const nd = await page.evaluate(() => { parcDoc('notifdisc'); return window._docCurrent.html; });
  ok(/ce grief n’est pas retenu|n’est pas retenu au soutien/.test(nd),
     'l\'exemplaire montre un grief abandonne apres verification');
  ok(/moins d’un mois \(butée au 12\/06\)/.test(nd), 'et verifie les deux bornes de notification');
  const mad = await page.evaluate(() => { parcDoc('madconserv'); return window._docCurrent.html; });
  ok(/punirait alors une seconde fois les mêmes faits/.test(mad),
     'le modele de mise a pied dit le piege de la requalification');
  ok(/1 240 € brut non versés/.test(mad), 'et chiffre ce que la faute grave change sur le salaire');
  await page.evaluate(() => { const o = document.getElementById('doc-fullscreen-overlay'); if (o) o.remove(); });

  console.log('\n— Le parcours de la reunion du comite —');
  const re = await page.evaluate(() => {
    E.effectif = '72'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    window.confirm = () => true; parcRAZ('reunioncse'); parcOuvrir('reunioncse');
    parcDate('reunioncse', 'reu', '2026-06-12');
    parcDate('reunioncse', 'dispo', '2026-05-26');
    return document.getElementById('parcguide-zone').innerText;
  });
  ok(/8 à votre situation/.test(re), 'huit etapes a la reunion du comite', (re.match(/étapes — [^\n]*/) || [''])[0]);
  ok(/Échéance : 9 juin 2026/.test(re),
     'l\'ordre du jour part trois jours avant (L.2315-30)', (re.match(/Échéance[^\n]*/g) || []).join(' | '));
  ok(/Échéance : 27 juin 2026/.test(re), 'et le PV est du quinze jours apres (R.2315-25)');
  ok(/Échéance : 26 juin 2026/.test(re), 'l\'avis est repute rendu un mois apres la mise a disposition (R.2312-6)');
  ok(/président ET le secrétaire/.test(re), 'l\'ordre du jour s\'arrete a deux (L.2315-29)');
  ok(/de plein droit/.test(re), 'mais la consultation obligatoire s\'y inscrit de plein droit');
  ok(/CARSAT|services de prévention/.test(re), 'l\'inspection et la CARSAT sont destinataires');
  ok(/SECRÉTAIRE/.test(re), 'le PV est l\'oeuvre du secretaire, pas de l\'employeur');
  await page.evaluate(() => { window.partagerDocActuel = function () {}; });
  for (const d of ['odjcse', 'pvcse']) {
    const r = await page.evaluate(k => {
      const a = document.getElementById('doc-fullscreen-overlay'); if (a) a.remove();
      window._docCurrent = null;
      try { parcDoc(k); } catch (x) { return { err: x.message }; }
      const c = window._docCurrent || {};
      return { ok: !!c.html && /PARTIE 1/.test(c.html) && /PARTIE 2/.test(c.html), err: null };
    }, d);
    ok(r && !r.err && r.ok, 'modele « ' + d + ' » : structure et exemplaire', r && r.err);
  }
  const pv = await page.evaluate(() => { parcDoc('pvcse'); return window._docCurrent.html; });
  ok(/Vote : 4 pour, 0 contre, 0 abstention/.test(pv), 'le PV exemple porte un vote chiffre');
  ok(/n’a pas pris part au vote/.test(pv), 'et la non-participation du president (L.2315-32)');
  ok(/douze jours après la séance/.test(pv), 'et verifie le delai de quinze jours');
  const odj = await page.evaluate(() => { parcDoc('odjcse'); return window._docCurrent.html; });
  ok(/Réponses motivées de l’employeur/.test(odj),
     'l\'ordre du jour type porte les reponses motivees en point 2 (L.2315-34)');
  await page.evaluate(() => { const o = document.getElementById('doc-fullscreen-overlay'); if (o) o.remove(); });

  console.log('\n— Le parcours du document unique —');
  const du = await page.evaluate(() => {
    E.effectif = '72'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    window.confirm = () => true; parcRAZ('duerp'); parcOuvrir('duerp');
    parcDate('duerp', 'prec', '2025-09-12');
    return document.getElementById('parcguide-zone').innerText;
  });
  ok(/8 à votre situation/.test(du), 'huit etapes au document unique', (du.match(/étapes — [^\n]*/) || [''])[0]);
  ok(/Échéance : 12 septembre 2026/.test(du),
     'l\'echeance annuelle court de la version precedente (R.4121-2)', (du.match(/Échéance[^\n]*/g) || []).join(' | '));
  ok(/IMPACT DIFFÉRENCIÉ/.test(du), 'l\'impact differencie selon le sexe est exige (L.4121-3)');
  ok(/ambiances thermiques/.test(du), 'et les ambiances thermiques nommees (R.4121-1)');
  ok(/QUARANTE ANS/.test(du), 'la conservation quarante ans est dite (R.4121-4)');
  ok(/PROPORTION de salariés exposés/.test(du), 'l\'annexe des expositions est exigee (R.4121-1-1)');
  const duPetit = await page.evaluate(() => {
    E.effectif = '1'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    parcRender(); return document.getElementById('parcguide-zone').innerText;
  });
  ok(!/Établir le programme annuel de prévention/.test(duPetit),
     'a 1 salarie : pas de programme annuel, il attend 50 (L.4121-3-1)');
  ok(!/Consulter le comité sur le document/.test(duPetit), 'ni consultation du comite, il attend 11');
  ok(/Établir ou mettre à jour le document unique/.test(duPetit),
     'mais le document unique lui-meme est du des le premier salarie');
  const du50 = await page.evaluate(() => {
    E.effectif = '50'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    parcRender(); return document.getElementById('parcguide-zone').innerText;
  });
  ok(/programme annuel de prévention/.test(du50), 'a 50 : le programme annuel entre au parcours');
  ok(/indicateur de résultat/.test(du50), 'avec ses quatre colonnes obligatoires');

  console.log('\n— Le parcours des negociations obligatoires —');
  const na = await page.evaluate(() => {
    E.effectif = '300'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    ausSet('ds', 'oui');
    window.confirm = () => true; parcRAZ('nao'); parcOuvrir('nao');
    parcDate('nao', 'prec', '2025-11-04');
    return document.getElementById('parcguide-zone').innerText;
  });
  ok(/9 à votre situation/.test(na), 'neuf etapes aux negociations a 300 salaries', (na.match(/étapes — [^\n]*/) || [''])[0]);
  ok(/Échéance : 4 novembre 2026/.test(na),
     'l\'echeance annuelle court de la precedente (L.2242-13)', (na.match(/Échéance[^\n]*/g) || []).join(' | '));
  ok(/REPRÉSENTATIVES/.test(na), 'le declencheur est la section syndicale representative, pas l\'effectif');
  ok(/procès-verbal de désaccord/.test(na), 'et la negociation se clot par le PV de desaccord (L.2242-5)');
  ok(/gestion des emplois et des parcours/.test(na), 'la GEPP figure a 300 salaries');
  const na50 = await page.evaluate(() => {
    E.effectif = '50'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    parcRender(); return document.getElementById('parcguide-zone').innerText;
  });
  ok(!/Négocier la gestion des emplois/.test(na50), 'a 50 : la GEPP sort du parcours, elle attend 300');
  ok(/8 à votre situation/.test(na50), 'huit etapes restent', (na50.match(/étapes — [^\n]*/) || [''])[0]);
  const naSansDs = await page.evaluate(() => {
    ausSet('ds', 'non'); parcRender();
    return document.getElementById('parcguide-zone').innerText;
  });
  ok(/Aucun délégué syndical déclaré/.test(naSansDs),
     'sans delegue syndical, le parcours dit que les NAO ne s\'imposent pas');
  ok(/sans délégué syndical/.test(naSansDs), 'et le bouton le signale');
  await page.evaluate(() => { ausSet('ds', 'oui'); });
  await page.evaluate(() => { window.partagerDocActuel = function () {}; });
  let creuxN = [];
  for (const d of ['nego:invitation', 'nego:odj', 'nego:accord1', 'nego:accord2',
                   'nego:accordg', 'nego:plan', 'nego:pv', 'nego:bordereau']) {
    const r = await page.evaluate(k => {
      const a = document.getElementById('doc-fullscreen-overlay'); if (a) a.remove();
      window._docCurrent = null;
      try { parcDoc(k); } catch (x) { return { err: x.message }; }
      const c = window._docCurrent || {};
      return { ok: !!c.html && c.html.length > 900, t: c.titre || '' };
    }, d);
    if (!r || r.err || !r.ok) creuxN.push(d + (r && r.err ? '(' + r.err + ')' : ''));
  }
  ok(creuxN.length === 0, 'les huit modeles de negociation s\'ouvrent par leur prefixe', creuxN.join(','));
  const odjNego = await page.evaluate(() => { parcDoc('nego:odj'); return window._docCurrent.titre; });
  const odjInst = await page.evaluate(() => { parcDoc('odj'); return window._docCurrent.titre; });
  ok(odjNego !== odjInst,
     'le meme nom « odj » sert deux modeles distincts, et le prefixe les separe',
     odjNego + ' / ' + odjInst);
  await page.evaluate(() => { const o = document.getElementById('doc-fullscreen-overlay'); if (o) o.remove(); });

  console.log('\n— Le parcours d\'embauche —');
  const em = await page.evaluate(() => {
    E.effectif = '50'; try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    window.confirm = () => true; parcRAZ('embauche'); parcOuvrir('embauche');
    parcDate('embauche', 'emb', '2026-09-01');
    return document.getElementById('parcguide-zone').innerText;
  });
  ok(/9 à votre situation/.test(em), 'neuf etapes a l\'embauche', (em.match(/étapes — [^\n]*/) || [''])[0]);
  ok(/Échéance : 24 août 2026/.test(em),
     'la DPAE s\'adresse au plus tot huit jours avant (R.1221-4)', (em.match(/Échéance[^\n]*/g) || []).join(' | '));
  ok(/Échéance : 8 septembre 2026/.test(em),
     'le volet des sept jours calendaires (R.1221-35)');
  ok(/Échéance : 1er octobre 2026/.test(em),
     'le volet du mois, et « 1er » et non « 1 »');
  ok(/Échéance : 1er septembre 2026/.test(em),
     'le registre le jour meme de l\'embauche (L.1221-13)');
  ok(/Échéance : 1er décembre 2026/.test(em),
     'la visite d\'information dans les trois mois (R.4624-10)');
  ok(/INDÉLÉBILE/.test(em), 'le registre s\'ecrit de facon indelebile, la sortie n\'efface pas');
  ok(/Ouvrir le module/.test(em), 'une etape sans modele renvoie au module qui la porte');
  ok(/délai de prévenance/.test(em), 'et l\'essai porte son delai de prevenance (L.1221-25)');

  let creuxE = [];
  for (const d of ['cdi', 'cdd', 'dpae', 'infoemb', 'vip', 'mutuelle', 'essai',
                   'affichages', 'accueilsecu']) {
    const r = await page.evaluate(k => {
      const a = document.getElementById('doc-fullscreen-overlay'); if (a) a.remove();
      window._docCurrent = null;
      try { parcDoc(k); } catch (x) { return { err: x.message }; }
      const c = window._docCurrent || {};
      return { ok: !!c.html && c.html.length > 900, t: c.titre || '' };
    }, d);
    if (!r || r.err || !r.ok) creuxE.push(d + (r && r.err ? '(' + r.err + ')' : ''));
  }
  ok(creuxE.length === 0, 'les neuf modeles de l\'embauche s\'ouvrent et ne sont pas creux', creuxE.join(','));
  const sansTB = await page.evaluate(() => {
    let mauvais = [];
    ['cdi', 'dpae', 'vip', 'mutuelle', 'essai'].forEach(k => {
      window._docCurrent = null; try { parcDoc(k); } catch (x) { mauvais.push(k + '(' + x.message + ')'); return; }
      const h = (window._docCurrent || {}).html || '';
      if (/\bTB\b/.test(h) || /undefined/.test(h)) mauvais.push(k);
    });
    return mauvais;
  });
  ok(sansTB.length === 0, 'aucun modele ne laisse fuir une variable du script d\'insertion', sansTB.join(','));
  await page.evaluate(() => { const o = document.getElementById('doc-fullscreen-overlay'); if (o) o.remove(); });

  console.log('\n— La table audit → parcours ne renvoie nulle part —');
  const table = await page.evaluate(() => {
    const ids = AUS_OBLIG.map(o => o.id), bad = [];
    Object.keys(AUS_PARC).forEach(k => {
      const pk = AUS_PARC[k][0], ek = AUS_PARC[k][1];
      if (ids.indexOf(k) < 0) bad.push('obligation inconnue : ' + k);
      const P = PARCOURS[pk];
      if (!P) { bad.push('parcours inconnu : ' + pk); return; }
      if (!P.etapes.some(e => e.k === ek)) bad.push('étape inconnue : ' + pk + '/' + ek);
    });
    return { n: Object.keys(AUS_PARC).length, bad: bad };
  });
  ok(table.bad.length === 0, 'chaque renvoi vise une obligation et une etape qui existent ('
     + table.n + ' renvois)', table.bad.join(' | '));

  ok(err.length === 0, 'aucune exception JavaScript', err.join(' | '));
  await nav.close();
  console.log(e ? '\n' + e + ' echec(s)' : '\ntout est vert');
  process.exit(e ? 1 : 0);
})();
