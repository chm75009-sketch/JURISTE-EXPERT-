/* L'écran d'accueil public, éprouvé dans le navigateur.
   C'est la première chose qu'un client voit. Le diagnostic reprochait trois
   choses : les formulaires d'accès au milieu de la lecture, les actions
   métier reléguées après de longs blocs de texte, et du droit affiché
   d'emblée. Le test vérifie que ces trois défauts ne peuvent pas revenir. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test accueil ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html');

let echecs = 0;
const ok = (c, m, d) => { if (c) console.log('  ok    ' + m); else { echecs++; console.log('  ECHEC ' + m + (d !== undefined ? ' — ' + d : '')); } };

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e)));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  await page.evaluate(() => accueilShow());
  await page.waitForTimeout(200);

  ok(erreurs.length === 0, 'aucune exception au chargement', erreurs.slice(0, 3).join(' | '));

  // ── L'ordre de lecture ───────────────────────────────────────────
  console.log('\n— L’ordre de lecture —');
  const ordre = await page.evaluate(() => {
    const a = document.getElementById('accueil-screen');
    const t = a.innerText;
    const pos = s => t.indexOf(s);
    return {
      hero: pos('Votre assistant juridique RH'),
      essai: pos('Essai gratuit'),
      quoi: pos('QUE VOULEZ-VOUS FAIRE'),
      phares: pos('LES MODULES PHARES'),
      pied: pos('Mounir CHIKHAOUI'),
      maj: pos('Base juridique à jour')
    };
  });
  ok(ordre.hero >= 0 && ordre.essai > ordre.hero, 'la bannière et ses deux boutons ouvrent la page');
  ok(ordre.quoi > ordre.essai, '« Que voulez-vous faire ? » vient juste après');
  ok(ordre.phares > ordre.quoi, 'et les modules de démonstration passent après', JSON.stringify(ordre));
  ok(ordre.pied > ordre.phares && ordre.maj > 0, 'le pied de page ferme la lecture, avec la date de mise à jour');

  // ── Les six blocs métier ─────────────────────────────────────────
  console.log('\n— Les six blocs —');
  const blocs = await page.evaluate(() =>
    [...document.querySelectorAll('#accueil-screen .b6 .bc .bt')].map(e => e.textContent.trim()));
  blocs.forEach(b => console.log('    · ' + b));
  ok(blocs.length === 6, 'il y a exactement six blocs', blocs.length);
  ['Embauche', 'Discipline', 'Ruptures', 'Comité social', 'Analyse', 'Calculs']
    .forEach(m => ok(blocs.some(b => b.indexOf(m) >= 0), 'le bloc « ' + m + ' » est présent'));
  const puces = await page.evaluate(() =>
    [...document.querySelectorAll('#accueil-screen .b6 .bc')].map(c => c.querySelectorAll('.bpts li').length));
  ok(puces.every(n => n >= 3), 'chaque bloc annonce au moins trois choses concrètes', JSON.stringify(puces));
  // La classe .bl existe deja ailleurs, en capitales : reprendre un nom de
  // classe deja pris, c'est heriter d'un style qu'on n'a pas voulu.
  const casse = await page.evaluate(() =>
    [...document.querySelectorAll('#accueil-screen .b6 .bc .bpts li')]
      .map(e => getComputedStyle(e).textTransform));
  ok(casse.every(c => c === 'none'), 'les puces ne sont pas mises en capitales', [...new Set(casse)].join(','));

  /* Lisibilité réelle. Les six blocs avaient d'abord été écrits avec les
     couleurs du thème sombre, sur une page qui est claire : à l'écran, du
     crème pâle sur du crème. Aucun test de structure ne voit cela — celui-ci
     compare la luminosité du texte à celle de son fond. */
  const contraste = await page.evaluate(() => {
    const lum = c => {
      const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(Number).map(v => {
        v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const fond = c => {
      let e = c;
      while (e) {
        const b = getComputedStyle(e).backgroundColor;
        if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return b;
        e = e.parentElement;
      }
      return 'rgb(255,255,255)';
    };
    const rapport = e => {
      const a = lum(getComputedStyle(e).color), b = lum(fond(e));
      const [h, l] = a > b ? [a, b] : [b, a];
      return (h + 0.05) / (l + 0.05);
    };
    return [...document.querySelectorAll('#accueil-screen .b6 .bc .bt, #accueil-screen .b6 .bc .bpts li, #accueil-screen .cta1 .t, #accueil-screen .cta2 .t, #accueil-screen .cta1 .u, #accueil-screen .cta2 .u')]
      .map(e => ({ t: e.textContent.trim().slice(0, 30), r: +rapport(e).toFixed(2) }));
  });
  const faibles = contraste.filter(c => c.r < 4.5);
  ok(faibles.length === 0, 'tout le texte des blocs et des boutons est lisible sur son fond',
     faibles.map(f => f.t + ' (' + f.r + ':1)').join(' · '));
  console.log('    contraste le plus faible : ' +
    Math.min(...contraste.map(c => c.r)).toFixed(2) + ':1');

  // ── Plus de droit sur l'écran d'accueil ──────────────────────────
  console.log('\n— Le texte juridique —');
  const txt = await page.evaluate(() => document.getElementById('accueil-screen').innerText);
  const arts = txt.match(/[LRD]\.\s?\d{4}-\d+/g) || [];
  ok(arts.length === 0, 'aucune référence d’article sur l’écran d’accueil', arts.join(', '));

  // ── Les fenêtres d'accès ─────────────────────────────────────────
  console.log('\n— Les fenêtres d’accès —');
  const visible = id => page.evaluate(i => {
    const e = document.getElementById(i);
    return !!e && e.style.display !== 'none' && e.style.display !== '';
  }, id);

  ok(!(await visible('lock-screen')) && !(await visible('abo-screen')),
     'au repos, aucune fenêtre d’accès n’est ouverte');

  await page.evaluate(() => accueilShowAbo());
  await page.waitForTimeout(150);
  ok(await visible('abo-screen'), 'un clic sur un bloc réservé ouvre la fiche d’abonnement');
  ok(await page.evaluate(() => {
    const a = document.getElementById('accueil-screen');
    return a.style.display !== 'none';
  }), 'et l’accueil reste affiché derrière — on ne perd pas sa lecture');
  ok(await page.evaluate(() => !!document.querySelector('#abo-screen .jx-fermer')),
     'la fenêtre a une croix de fermeture');
  /* Signalé depuis un téléphone : « on fait comment pour revenir en arrière ? »
     La sortie doit rester atteignable une fois qu'on est descendu dans le
     formulaire — c'est-à-dire dès qu'on remplit le premier champ, clavier
     ouvert. Une croix en position:absolute défile avec le contenu ; et un
     conteneur qui porte backdrop-filter annule position:fixed sur ses
     descendants. Les deux pièges se voient ici, pas dans le code. */
  await page.evaluate(() => { document.getElementById('abo-screen').scrollTop = 600; });
  await page.waitForTimeout(200);
  const croix = await page.evaluate(() => {
    const b = document.querySelector('#abo-screen .jx-fermer');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { haut: r.top, gauche: r.left, l: r.width, h: r.height,
             dansEcran: r.top >= 0 && r.top < 120 && r.right <= innerWidth + 1 };
  });
  ok(croix && croix.dansEcran,
     'la croix reste visible en haut de l’écran même une fois le formulaire déroulé',
     JSON.stringify(croix));
  ok(croix && croix.l >= 44 && croix.h >= 44,
     'et sa cible tactile fait au moins 44 px', croix && (croix.l + '×' + croix.h));
  ok(await page.evaluate(() => {
    const t = document.getElementById('abo-screen').innerText;
    return t.indexOf('Revenir à l’accueil') >= 0;
  }), 'un lien de retour figure aussi en tête du formulaire');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  ok(!(await visible('abo-screen')), 'la touche Échap la referme');

  await page.evaluate(() => accueilShowLock());
  await page.waitForTimeout(150);
  ok(await visible('lock-screen'), '« Espace abonné » ouvre le déverrouillage');
  ok(await page.evaluate(() => !!document.querySelector('#lock-screen .jx-fermer')),
     'elle aussi a une croix');
  await page.evaluate(() => jxFermerFenetres());
  await page.waitForTimeout(150);
  ok(!(await visible('lock-screen')), 'et elle se referme');
  ok(await page.evaluate(() => document.body.style.overflow === ''),
     'le défilement de la page est rendu après fermeture');

  // ── L'en-tête ────────────────────────────────────────────────────
  console.log('\n— L’en-tête —');
  ok(await page.evaluate(() => !!document.getElementById('vit-secteur')),
     'le sélecteur de secteur est dans l’en-tête');
  ok(await page.evaluate(() => {
    const h = document.querySelector('#accueil-screen header');
    return h.innerText.indexOf('Espace abonné') >= 0;
  }), 'le bouton « Espace abonné » aussi');
  ok(await page.evaluate(() => {
    const h = document.querySelector('#accueil-screen header .menu');
    return h === null;
  }), 'le bouton ☰ qui ouvrait le formulaire de vente a disparu');

  const idcc = await page.evaluate(() => {
    vitSecteur('syntec');
    const a = document.getElementById('vit-idcc').textContent;
    vitSecteur('banque');
    const b = document.getElementById('vit-idcc').textContent;
    vitSecteur('');
    return { syntec: a, banque: b, vide: document.getElementById('vit-idcc').textContent,
             garde: sessionStorage.getItem('jx_sec_pref') };
  });
  ok(/1486/.test(idcc.syntec), 'choisir Syntec affiche IDCC 1486', idcc.syntec);
  ok(/2120/.test(idcc.banque), 'choisir Banque affiche IDCC 2120', idcc.banque);
  ok(idcc.vide === '', 'aucun secteur choisi : aucun IDCC affiché');
  ok(idcc.garde === null, 'et rien n’est retenu tant que rien n’est choisi');

  // Le choix suit le visiteur jusqu'à la fiche entreprise.
  const suivi = await page.evaluate(() => {
    vitSecteur('batiment');
    document.getElementById('ins-nom').value = 'ESSAI';
    document.getElementById('ins-secteur').value = '';
    validerInscription();
    return E.secteur;
  });
  ok(suivi === 'batiment', 'le secteur choisi sur l’accueil se retrouve dans la fiche', suivi);

  console.log('\nExceptions sur toute la session : ' + erreurs.length);
  erreurs.slice(0, 5).forEach(e => console.log('   ! ' + e.slice(0, 200)));
  ok(erreurs.length === 0, 'aucune exception JavaScript sur tout le parcours');

  await nav.close();
  console.log('\n' + (echecs ? echecs + ' ECHEC(S)' : 'tout est vert'));
  process.exit(echecs ? 1 : 0);
})();
