/* LA FICHE ENTREPRISE SUIT LE SECTEUR CHOISI.
   Defaut signale depuis un telephone : secteur « Batiment » choisi, et
   l'application affichait « Activite principale : Transport routier de
   marchandises ». Ce n'etait pas une etiquette : toute la fiche etait
   ecrite pour le transport — exemples, listes, licences, caisses.
   Ce test n'a pas de liste ecrite a la main : il ENUMERE les secteurs
   declares dans SEC_LISTE, choisit chacun, et exige qu'aucun mot propre a
   un autre secteur ne subsiste a l'ecran. Un secteur ajoute demain sera
   verifie sans toucher au test. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test fiche ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html');

let echecs = 0;
const ok = (c, m, d) => { if (c) console.log('  ok    ' + m); else { echecs++; console.log('  ECHEC ' + m + (d !== undefined ? ' — ' + d : '')); } };

/* Les mots qui trahissent un secteur. Si l'un apparait alors qu'on a choisi
   un autre secteur, c'est le defaut signale. */
const MARQUEURS = {
  transport: [/transport routier/i, /marchandises/i, /tachygraphe/i, /FNTR/, /OTRE/, /UNOSTRA/,
              /CARCEPT/i, /DREAL/, /gestionnaire de transport/i, /CMR/, /licence communautaire/i],
  batiment:  [/carte BTP/i, /CIBTP/i, /d[ée]cennale/i, /CAPEB/, /\bFFB\b/, /PRO BTP/i, /gros œuvre/i],
  banque:    [/\bAFB\b/, /banque de d[ée]tail/i],
  assurances:[/France Assureurs/i, /\bIARD\b/, /r[ée]assurance/i],
  syntec:    [/Numeum/i, /CINOV/, /Syntec/i],
  formation: [/Acteurs de la Comp[ée]tence/i, /SYNOFDES/, /\bSYCFI\b/],
  enseignement: [/FNOGEC/, /UNETP/, /SYNADIC/, /SNCEEL/],
  ensindep:  [/FNEPL/, /hors contrat/i]
};

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await (await nav.newContext({ viewport: { width: 390, height: 900 } })).newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e)));
  page.on('dialog', d => d.dismiss());
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  const secteurs = await page.evaluate(() => SEC_LISTE.map(s => s.v));
  console.log('\n— ' + secteurs.length + ' secteurs déclarés : ' + secteurs.join(', ') + ' —');

  // ══ 1. L'ECRAN D'INSCRIPTION ════════════════════════════════════
  console.log('\n— L’écran d’inscription, secteur par secteur —');
  for (const sec of secteurs) {
    const vu = await page.evaluate(s => {
      const sel = document.getElementById('ins-secteur');
      sel.value = s; insProfilMaj();
      const f = document.getElementById('pg-inscription');
      /* Le choix du secteur les nomme tous, forcement : c'est le selecteur.
         On regarde tout le reste. */
      const txt = [...f.querySelectorAll('option')]
          .filter(o => o.parentElement.id !== 'ins-secteur')
          .map(o => o.textContent).join(' | ')
        + ' | ' + [...f.querySelectorAll('input')].map(i => i.placeholder || '').join(' | ')
        + ' | ' + (document.getElementById('ins-sub').textContent)
        + ' | ' + (document.getElementById('ins-idcc').textContent);
      return {
        txt,
        sub: document.getElementById('ins-sub').textContent,
        idcc: document.getElementById('ins-idcc').textContent,
        act: [...document.getElementById('ins-activite').options].map(o => o.value),
        org: [...document.getElementById('ins-org').options].map(o => o.value)
      };
    }, sec);

    const intrus = Object.keys(MARQUEURS)
      .filter(k => k !== sec)
      .flatMap(k => MARQUEURS[k].filter(r => r.test(vu.txt)).map(r => k + ':' + r));
    ok(intrus.length === 0, sec.padEnd(13) + ' — aucun mot d’un autre secteur sur la fiche',
       intrus.join(', '));
    ok(vu.act.indexOf('autre') >= 0, sec.padEnd(13) + ' — « Autre » proposé sur l’activité');
    ok(vu.org.indexOf('autre') >= 0, sec.padEnd(13) + ' — « Autre » proposé sur l’organisation patronale');
    console.log('        ' + vu.sub + ' · ' + vu.idcc);
  }

  // Aucun secteur : rien n'est decide a la place du client.
  console.log('\n— Aucun secteur choisi —');
  const vide = await page.evaluate(() => {
    document.getElementById('ins-secteur').value = ''; insProfilMaj();
    return {
      act: [...document.getElementById('ins-activite').options].map(o => o.value).filter(v => v && v !== 'autre'),
      org: [...document.getElementById('ins-org').options].map(o => o.value).filter(v => v && v !== 'autre'),
      idcc: document.getElementById('ins-idcc').textContent
    };
  });
  ok(vide.act.length === 0 && vide.org.length === 0,
     'sans secteur, aucune activité ni organisation n’est proposée d’office',
     vide.act.concat(vide.org).join(', '));
  ok(/non renseign/i.test(vide.idcc), 'et la convention est annoncée « non renseignée »', vide.idcc);

  // ══ 2. LA VALEUR ENREGISTREE ════════════════════════════════════
  console.log('\n— Ce qui est enregistré —');
  const enr = await page.evaluate(() => {
    sessionStorage.setItem('jte_ok', '1'); sessionStorage.setItem('jte_admin', '1');
    document.getElementById('ins-secteur').value = 'batiment'; insProfilMaj();
    document.getElementById('ins-nom').value = 'SARL ESSAI';
    validerInscription();
    return { secteur: E.secteur, activite: E.activite, org: E.org, effectif: E.effectif };
  });
  ok(enr.secteur === 'batiment', 'le secteur choisi est celui qui est retenu', enr.secteur);
  ok(enr.activite === '', 'une activité non choisie reste vide — aucune n’est supposée', JSON.stringify(enr.activite));
  ok(enr.org === '', 'une organisation patronale non choisie reste vide', JSON.stringify(enr.org));
  ok(enr.effectif === '', 'un effectif non renseigné reste vide — pas « moins de 11 »', JSON.stringify(enr.effectif));

  // ══ 3. LA PAGE PARAMETRAGE ══════════════════════════════════════
  console.log('\n— La page Paramétrage, secteur par secteur —');
  for (const sec of secteurs) {
    const vu = await page.evaluate(s => {
      if (typeof appSetSecteur === 'function') appSetSecteur(s);
      goPage('parametrage');
      const p = document.getElementById('pg-parametrage');
      const visible = e => { const r = e.getBoundingClientRect(); return r.height > 0 || r.width > 0; };
      const txt = [...p.querySelectorAll('.card')].filter(visible).map(c => c.textContent).join(' ')
        + ' ' + [...p.querySelectorAll('input')].filter(visible).map(i => i.placeholder || '').join(' ')
        + ' ' + [...p.querySelectorAll('option')].map(o => o.textContent).join(' ');
      return {
        txt,
        cartes: ['p-autor-transport', 'p-autor-batiment', 'p-autor-note']
          .filter(id => getComputedStyle(document.getElementById(id)).display !== 'none'),
        act: [...document.getElementById('p-activite').options].map(o => o.value),
        org: [...document.getElementById('p-org').options].map(o => o.value)
      };
    }, sec);

    const intrus = Object.keys(MARQUEURS)
      .filter(k => k !== sec)
      .flatMap(k => MARQUEURS[k].filter(r => r.test(vu.txt)).map(r => k + ':' + r));
    ok(intrus.length === 0, sec.padEnd(13) + ' — le paramétrage ne parle que de ce secteur',
       intrus.join(', '));
    ok(vu.cartes.length === 1, sec.padEnd(13) + ' — une seule carte d’autorisations est montrée',
       vu.cartes.join(', '));
    ok(vu.act.indexOf('autre') >= 0 && vu.org.indexOf('autre') >= 0,
       sec.padEnd(13) + ' — « Autre » y est proposé aussi');
    console.log('        carte : ' + vu.cartes[0]);
  }

  // La carte de licences transport n'apparait QUE pour le transport.
  const tr = await page.evaluate(() => {
    appSetSecteur('transport'); goPage('parametrage');
    return getComputedStyle(document.getElementById('p-autor-transport')).display !== 'none';
  });
  ok(tr, 'le transporteur retrouve sa licence et son gestionnaire de transport');
  const bt = await page.evaluate(() => {
    appSetSecteur('batiment'); goPage('parametrage');
    return { bat: getComputedStyle(document.getElementById('p-autor-batiment')).display !== 'none',
             tra: getComputedStyle(document.getElementById('p-autor-transport')).display !== 'none' };
  });
  ok(bt.bat && !bt.tra, 'le bâtiment reçoit la carte BTP, et plus la licence de transport',
     JSON.stringify(bt));

  // ══ 4. CE QUI EST SAISI EST CONSERVE ════════════════════════════
  console.log('\n— La saisie survit au changement de page —');
  const survit = await page.evaluate(() => {
    appSetSecteur('batiment'); goPage('parametrage');
    document.getElementById('p-activite').value = 'grosoeuvre';
    document.getElementById('p-org').value = 'capeb';
    document.getElementById('p-cartebtp').value = 'CIBTP-2024-000123';
    sauvegarderParametres();
    goPage('home'); goPage('parametrage');
    return { act: document.getElementById('p-activite').value,
             org: document.getElementById('p-org').value,
             btp: document.getElementById('p-cartebtp').value,
             eAct: E.activite, eOrg: E.org, eBtp: E.cartebtp };
  });
  ok(survit.act === 'grosoeuvre' && survit.org === 'capeb' && survit.btp === 'CIBTP-2024-000123',
     'activité, organisation et carte BTP sont retrouvées telles quelles', JSON.stringify(survit));

  /* Une valeur d'un autre secteur ne peut pas rester affirmee : elle bascule
     sur « Autre », visiblement, plutot que de disparaitre en silence. */
  const bascule = await page.evaluate(() => {
    E.activite = 'grosoeuvre'; E.org = 'capeb';
    appSetSecteur('banque'); goPage('parametrage');
    return { act: document.getElementById('p-activite').value,
             org: document.getElementById('p-org').value,
             champ: getComputedStyle(document.getElementById('p-activite-autre')).display };
  });
  ok(bascule.act === 'autre' && bascule.org === 'autre',
     'changer de secteur bascule une activité devenue étrangère sur « Autre »', JSON.stringify(bascule));
  ok(bascule.champ !== 'none', 'et ouvre le champ libre pour la préciser', bascule.champ);

  console.log('\nExceptions : ' + erreurs.length);
  erreurs.slice(0, 4).forEach(e => console.log('   ! ' + e.slice(0, 200)));
  ok(erreurs.length === 0, 'aucune exception JavaScript');

  await nav.close();
  console.log('\n' + (echecs ? echecs + ' ECHEC(S)' : 'tout est vert'));
  process.exit(echecs ? 1 : 0);
})();
