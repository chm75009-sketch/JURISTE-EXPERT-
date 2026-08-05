/* Le module « harcèlement moral », éprouvé dans le navigateur.
   Ce module dit à un salarié si sa situation entre dans la qualification.
   Une réponse fausse l'envoie au conseil de prud'hommes pour rien, ou l'en
   dissuade à tort. Chaque assertion porte donc sur ce que dit le module,
   et sur l'arrêt qu'il cite. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test harcelement ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html');

let echecs = 0;
const ok = (c, m, d) => { if (c) console.log('  ok    ' + m); else { echecs++; console.log('  ECHEC ' + m + (d !== undefined ? ' — ' + d : '')); } };

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await (await nav.newContext()).newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e)));
  page.on('dialog', d => d.accept());
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  const analyse = (etat) => page.evaluate(e => {
    localStorage.setItem('harcelement_moral_v1::' + rxAccountId(), JSON.stringify(e));
    const r = hmAnalyse();
    return {
      titres: r.alertes.map(a => a.g + ' | ' + a.t),
      arrets: r.alertes.map(a => a.a).join(' | '),
      coherence: r.coherence
    };
  }, etat);

  // ── Le fait unique est exclu ─────────────────────────────────────
  console.log('\n— Un fait unique —');
  let r = await analyse({ repetition: 'unique', preuves: [] });
  ok(r.titres.some(t => /^stop \| Un fait unique ne suffit pas/.test(t)),
     'le fait unique est signalé comme exclu', r.titres.join(' / '));
  ok(/12-29\.131/.test(r.arrets), 'et l’arrêt du 22 janvier 2014 est cité');

  // ── Un même fait répété suffit ───────────────────────────────────
  console.log('\n— Un même fait répété —');
  r = await analyse({ repetition: 'memerep', preuves: [] });
  ok(r.titres.some(t => /Un même fait répété suffit/.test(t)), 'le même fait répété suffit');
  ok(/14-80\.455/.test(r.arrets), 'l’arrêt du 26 janvier 2016 est cité');
  ok(!r.titres.some(t => /Un fait unique ne suffit pas/.test(t)),
     'le module ne dit pas en même temps l’inverse');

  // ── Deux faits distincts ─────────────────────────────────────────
  console.log('\n— Deux faits distincts —');
  r = await analyse({ repetition: 'deux', preuves: [] });
  ok(r.titres.some(t => /Deux faits distincts suffisent/.test(t)), 'deux faits distincts suffisent');
  ok(/23-16\.415/.test(r.arrets), 'l’arrêt du 11 mars 2025 est cité');

  // ── L'atteinte n'a pas à être réalisée ───────────────────────────
  console.log('\n— L’atteinte n’est pas encore réalisée —');
  r = await analyse({ repetition: 'deux', atteinte: 'risque', preuves: [] });
  ok(r.titres.some(t => /L’atteinte n’a pas à être réalisée/.test(t)),
     'le module rappelle que le texte dit « susceptible »');

  // ── Aucun lien de subordination requis ───────────────────────────
  console.log('\n— L’auteur est un collègue —');
  r = await analyse({ repetition: 'memerep', auteur: 'collegue', preuves: [] });
  ok(r.titres.some(t => /Aucun lien de subordination n’est requis/.test(t)),
     'un collègue peut être auteur');
  ok(/09-69\.616/.test(r.arrets), 'l’arrêt Pont du Gard est cité');

  // ── Harcèlement institutionnel ───────────────────────────────────
  console.log('\n— Une politique d’entreprise —');
  r = await analyse({ repetition: 'plusieurs', politique: 'oui', preuves: [] });
  ok(r.titres.some(t => /institutionnel/i.test(t)), 'le harcèlement institutionnel est identifié');
  ok(/22-87\.145/.test(r.arrets), 'l’arrêt France Télécom est cité');

  // ── Rien de documenté ────────────────────────────────────────────
  console.log('\n— Rien de documenté —');
  r = await analyse({ repetition: 'plusieurs', preuves: ['rien'] });
  ok(r.titres.some(t => /^stop \| Sans élément de fait/.test(t)),
     'l’absence de pièces est signalée comme bloquante');
  ok(r.coherence.some(c => /rien n’est documenté/.test(c)),
     'et la contradiction faits répétés / rien d’écrit est relevée', JSON.stringify(r.coherence));

  // ── L'enregistrement clandestin ──────────────────────────────────
  console.log('\n— Un enregistrement fait à l’insu de son auteur —');
  r = await analyse({ repetition: 'deux', preuves: ['enregistrement'] });
  ok(r.titres.some(t => /enregistrement obtenu à l’insu/.test(t)), 'la recevabilité est traitée');
  ok(/20-20\.648/.test(r.arrets), 'l’arrêt d’assemblée plénière du 22 décembre 2023 est cité');

  // ── L'employeur ──────────────────────────────────────────────────
  console.log('\n— Ce que l’employeur a fait —');
  r = await analyse({ repetition: 'deux', prevention: 'non', reaction: 'immediate', preuves: ['courriers'] });
  ok(r.titres.some(t => /^stop \| L’employeur ne pourra pas s’exonérer/.test(t)),
     'sans prévention en amont, l’exonération est fermée');
  r = await analyse({ repetition: 'deux', prevention: 'oui', reaction: 'enquete', preuves: ['courriers'] });
  ok(r.titres.some(t => /Une enquête ne suffit pas/.test(t)), 'l’enquête seule ne suffit pas');
  ok(/23-13\.975/.test(r.arrets), 'l’arrêt du 12 juin 2024 est cité');
  r = await analyse({ repetition: 'deux', prevention: 'oui', reaction: 'immediate', preuves: ['courriers'] });
  ok(r.titres.some(t => /Les deux exigences de l’employeur semblent réunies/.test(t)),
     'les deux conditions cumulatives réunies sont reconnues');

  // ── La confrontation des réponses ────────────────────────────────
  console.log('\n— Des réponses qui ne concordent pas —');
  r = await analyse({ repetition: 'unique', duree: 'mois', preuves: ['courriers'] });
  ok(r.coherence.length > 0, 'fait unique + plusieurs mois : la contradiction est signalée',
     JSON.stringify(r.coherence));
  r = await analyse({ repetition: 'plusieurs', politique: 'oui', auteur: 'collegue', preuves: ['courriers'] });
  ok(r.coherence.some(c => /politique d’entreprise et un auteur sans lien hiérarchique/.test(c)),
     'politique d’entreprise + auteur sans hiérarchie : signalé');
  r = await analyse({ repetition: 'deux', prevention: 'oui', reaction: 'rien', preuves: ['courriers'] });
  ok(r.coherence.some(c => /cumulatives/.test(c)), 'prévention sans réaction : signalé');

  // ── L'appréciation d'ensemble est toujours rappelée ──────────────
  console.log('\n— Les constantes —');
  r = await analyse({ repetition: 'deux', preuves: ['courriers'] });
  ok(r.titres.some(t => /jamais un à un/.test(t)), 'l’appréciation d’ensemble est rappelée');
  ok(r.titres.some(t => /L’intention de nuire n’est pas à démontrer/.test(t)), 'l’intention n’est pas exigée');
  // C'est le contresens le plus frequent : il doit etre lu en premier, pas
  // trouve au milieu d'une liste que personne ne fait defiler.
  ok(/L’intention de nuire n’est pas à démontrer/.test(r.titres[0]),
     'et c’est la toute première chose que le module dit', r.titres[0]);
  ok(/08-41\.497/.test(r.arrets), 'l’arrêt du 10 novembre 2009 est cité');
  ok(r.titres.some(t => /n’a pas à prononcer le mot/.test(t)), 'le mot « harcèlement » n’est pas requis');
  ok(/24-21\.502/.test(r.arrets), 'l’arrêt du 11 mars 2026 est cité');

  // ── La page ──────────────────────────────────────────────────────
  console.log('\n— La page —');
  const av = erreurs.length;
  await page.evaluate(() => { goPage('harcmoral'); hmOnEnter(); });
  await page.waitForTimeout(400);
  ok(erreurs.length === av, 'la page s’ouvre sans exception', erreurs.slice(av).join(' | '));
  const txt = await page.evaluate(() => (document.getElementById('harcm-body') || {}).textContent || '');
  ok(/L\.1152-1/.test(txt), 'le texte de l’article est cité');
  ok(/L\.1154-1/.test(txt), 'le régime de la preuve est cité');
  ok(/Pressions exercées pour faire accepter une rupture conventionnelle/.test(txt),
     'les faits retenus sont affichés');
  ok(/mésentente/.test(txt), 'les faits écartés sont affichés');
  ok(!/undefined|NaN|\[object/.test(txt), 'aucun « undefined » à l’écran');
  ok(/pour objet <?b?>?ou pour effet|pour objet ou pour effet/.test(txt.replace(/\s+/g, ' ')),
     'le « pour objet ou pour effet » est rappelé sur la page');
  // Le chapeau est dans l'en-tete de la page, au-dessus de la zone calculee.
  const chapeau = await page.evaluate(() => (document.getElementById('pg-harcmoral') || {}).textContent || '');
  ok(/aucune intention de nuire à démontrer/i.test(chapeau),
     'la page annonce d’emblée qu’aucune intention n’est à démontrer');
  ok(/pas de harcèlement à prouver/i.test(chapeau),
     'et que le salarié n’a pas à prouver le harcèlement');

  // ── Les trois chemins d'accès ────────────────────────────────────
  console.log('\n— L’accueil et le menu —');
  const nav3 = await page.evaluate(() => {
    const compte = s => (document.body.innerHTML.match(new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    return compte("goPage('harcmoral')");
  });
  ok(nav3 >= 3, 'le module est atteignable depuis le menu, l’accueil et la page harcèlement', nav3);

  const cse = await page.evaluate(() => {
    const home = document.getElementById('pg-home');
    const pages = ['csehub','csediag','moncse','csecal','csereu','csercl','csecns','csebud','socle','cse','csefonc'];
    return pages.filter(p => home.innerHTML.indexOf("goPage('" + p + "')") >= 0);
  });
  ok(cse.length === 11, 'les onze entrées CSE du menu figurent sur l’accueil', cse.length + ' : ' + cse.join(','));

  // Toute carte de l'accueil doit mener à une page qui existe.
  const morts = await page.evaluate(() => {
    const home = document.getElementById('pg-home');
    const cibles = [...home.innerHTML.matchAll(/goPage\('([\w-]+)'\)/g)].map(m => m[1]);
    return [...new Set(cibles)].filter(c => c !== 'home' && !document.getElementById('pg-' + c));
  });
  ok(morts.length === 0, 'aucune carte de l’accueil ne mène à une page absente', morts.join(','));

  await nav.close();
  console.log('\n' + (echecs ? echecs + ' ECHEC(S)' : 'tout est vert'));
  process.exit(echecs ? 1 : 0);
})();
