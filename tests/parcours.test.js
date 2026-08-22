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

  ok(err.length === 0, 'aucune exception JavaScript', err.join(' | '));
  await nav.close();
  console.log(e ? '\n' + e + ' echec(s)' : '\ntout est vert');
  process.exit(e ? 1 : 0);
})();
