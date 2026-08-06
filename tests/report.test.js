/* CE QUI EST SAISI UNE FOIS N'EST PLUS REDEMANDE.
   Signale : « j'ai initialement choisi banque comme convention collective,
   pourquoi il me demande ici ? Toutes les infos renseignees a la creation du
   compte doivent etre reportees automatiquement dans toutes les rubriques ou
   elles sont demandees. »
   Le module Socle presentait un champ IDCC vide, avec « Ex : 16 » en
   exemple — le transport — alors que Banque etait choisi depuis la creation.
   Ce test ne verifie pas deux champs : il PARCOURT toutes les pages et
   signale tout champ vide qui redemande une information deja connue. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test report ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html');

let echecs = 0;
const ok = (c, m, d) => { if (c) console.log('  ok    ' + m); else { echecs++; console.log('  ECHEC ' + m + (d !== undefined ? ' — ' + d : '')); } };

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e)));
  page.on('dialog', d => d.dismiss());
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  const ouvrir = (sec) => page.evaluate(s => {
    sessionStorage.setItem('jte_ok', '1'); sessionStorage.setItem('jte_admin', '1');
    document.getElementById('pg-inscription').style.display = 'none';
    document.getElementById('pg-app').style.display = 'block';
    document.getElementById('accueil-screen').style.display = 'none';
    appSetSecteur(s); jxRechargerDossier(); applyClientSector(); goPage('home');
  }, sec);

  // ══ 1. LA CONVENTION, POUR CHAQUE SECTEUR ═══════════════════════
  console.log('\n— La convention, reprise du secteur choisi —');
  const secteurs = await page.evaluate(() => SEC_LISTE.map(x => x.v));
  const rates = [];
  for (const sec of secteurs) {
    await ouvrir(sec);
    const r = await page.evaluate(() => {
      goPage('socle'); socOnEnter(); socTab('ccn');
      const i = jxInfos();
      const multi = SEC_CONV_MULTI[i.secteur] || null;
      return { sec: i.secteur, attIdcc: i.idcc, attCcn: i.ccn, multi: !!multi,
               idcc: (document.getElementById('soc-idcc') || {}).value,
               ccn: (document.getElementById('soc-ccn') || {}).value,
               ph: (document.getElementById('soc-idcc') || {}).placeholder,
               repris: document.getElementById('pg-socle').textContent.indexOf('Repris du secteur choisi') >= 0 };
    });
    /* Un secteur a convention unique doit arriver rempli ; un secteur qui en
       compte plusieurs ne doit surtout pas en choisir une. */
    if (r.multi) {
      if (r.idcc !== '') rates.push(sec + ' : une convention choisie alors qu’il y en a plusieurs');
      console.log('    ' + sec.padEnd(13) + ' plusieurs conventions — aucune imposée');
    } else {
      if (!r.idcc || r.idcc !== r.attIdcc || r.ccn !== r.attCcn)
        rates.push(sec + ' : ' + JSON.stringify(r.idcc) + ' / ' + JSON.stringify(r.ccn));
      else console.log('    ' + sec.padEnd(13) + ' IDCC ' + r.idcc + ' — ' + r.ccn);
    }
    if (/Ex : 16$/.test(r.ph || '')) rates.push(sec + ' : l’exemple est resté celui du transport');
  }
  ok(rates.length === 0, 'chaque secteur retrouve sa convention, sans la ressaisir',
     rates.join(' | '));

  const bat = await page.evaluate(() => {
    appSetSecteur('batiment'); jxRechargerDossier();
    goPage('socle'); socOnEnter(); socTab('ccn');
    const t = document.getElementById('pg-socle').textContent;
    return { vus: ['1596', '1597', '2609', '2420'].filter(x => t.indexOf(x) >= 0),
             dit: /n’en choisit aucune à votre place/.test(t) };
  });
  ok(bat.vus.length === 4, 'le bâtiment voit ses quatre conventions énoncées', bat.vus.join(', '));
  ok(bat.dit, 'et l’application dit qu’elle n’en choisit aucune à sa place');

  // ══ 2. LA SAISIE DU CLIENT PRIME TOUJOURS ═══════════════════════
  console.log('\n— La saisie du client prime —');
  const prime = await page.evaluate(() => {
    appSetSecteur('banque'); jxRechargerDossier();
    goPage('socle'); socOnEnter(); socTab('ccn');
    document.getElementById('soc-idcc').value = '9999';
    document.getElementById('soc-ccn').value = 'Ma convention à moi';
    socSaveCCN();
    goPage('home'); goPage('socle'); socOnEnter(); socTab('ccn');
    return { idcc: document.getElementById('soc-idcc').value,
             ccn: document.getElementById('soc-ccn').value };
  });
  ok(prime.idcc === '9999' && prime.ccn === 'Ma convention à moi',
     'ce que le client a saisi n’est jamais écrasé par le report', JSON.stringify(prime));
  await page.evaluate(() => { SOC.idcc = ''; SOC.ccn = ''; socSave(); });

  // ══ 3. L'EFFECTIF ET LE SECTEUR, REPORTES AILLEURS ══════════════
  console.log('\n— L’effectif et le secteur, reportés —');
  const ailleurs = await page.evaluate(() => {
    appSetSecteur('banque'); jxRechargerDossier();
    RX.staff = Array.from({ length: 60 }, (_, k) =>
      ({ id: 'x' + k, nom: 'S' + k, entree: '2019-01-01',
         typeContrat: 'CDI', tempsTravail: 'Temps plein' }));
    rxSaveLocal(); socLoad();
    const out = { eff: cseEffectif() };
    goPage('cse');   out.cseSecteur = (document.getElementById('cse-secteur') || {}).value;
    goPage('ri');    out.riEffectif = (document.getElementById('ri-effectif') || {}).value;
    goPage('disciplinaire'); out.discSecteur = (document.getElementById('disc-secteur') || {}).value;
    return out;
  });
  await page.waitForTimeout(300);
  const ail2 = await page.evaluate(() => {
    goPage('ri'); jxReport();
    const o = { riEffectif: (document.getElementById('ri-effectif') || {}).value };
    goPage('cse'); jxReport(); o.cseSecteur = (document.getElementById('cse-secteur') || {}).value;
    goPage('disciplinaire'); jxReport(); o.discSecteur = (document.getElementById('disc-secteur') || {}).value;
    return o;
  });
  console.log('    effectif calculé : ' + ailleurs.eff);
  ok(ailleurs.eff >= 50, 'le registre donne bien un effectif au-dessus de cinquante', ailleurs.eff);
  ok(ail2.riEffectif === '50plus',
     'le module Règlement intérieur ne redemande pas l’effectif', ail2.riEffectif);
  ok(ail2.cseSecteur === 'banque', 'le module Élections ne redemande pas le secteur', ail2.cseSecteur);
  ok(ail2.discSecteur === 'banque', 'le module Mesures disciplinaires non plus', ail2.discSecteur);

  // ══ 4. LE BALAYAGE : aucun champ ne redemande ═══════════════════
  /* Le controle qui compte : on parcourt toutes les pages et on cherche un
     champ VIDE dont le libelle designe une information deja connue. */
  console.log('\n— Le balayage de toutes les pages —');
  const pages = await page.evaluate(() => [...document.querySelectorAll('#pg-app .page')].map(e => e.id.slice(3)));
  const redemandent = [];
  for (const p of pages) {
    const r = await page.evaluate(id => {
      goPage(id); jxReport();
      const CONNU = [
        [/\bIDCC\b/i, 'idcc'],
        [/intitul[ée] de la convention/i, 'ccn'],
        [/^secteur|secteur \/ convention|convention collective à mentionner/i, 'secteur'],
        [/effectif de l.entreprise|effectif \(nombre/i, 'effectif']
      ];
      const i = jxInfos();
      const dispo = { idcc: i.idcc, ccn: i.ccn, secteur: i.secteur,
                      effectif: (i.effectif === null ? '' : String(i.effectif)) };
      const out = [];
      [...document.querySelectorAll('#pg-' + id + ' input, #pg-' + id + ' select')].forEach(e => {
        if (!e.id || ['checkbox','radio','file'].indexOf(e.type) >= 0) return;
        const fg = e.closest('.fg') || e.parentElement;
        const l = fg && fg.querySelector('label,.fl');
        const lab = l ? l.textContent.trim() : '';
        CONNU.forEach(([re, cle]) => {
          if (!re.test(lab)) return;
          if (!dispo[cle]) return;                       // l'application ne sait pas : normal de demander
          if (String(e.value || '').trim() !== '') return;
          out.push(e.id + ' « ' + lab.slice(0, 34) + ' » (' + cle + ' = ' + dispo[cle] + ')');
        });
      });
      return out;
    }, p);
    r.forEach(x => redemandent.push(p + ' → ' + x));
  }
  redemandent.slice(0, 6).forEach(x => console.log('    ! ' + x));
  ok(redemandent.length === 0,
     'aucun champ vide ne redemande une information déjà connue',
     redemandent.length + ' champ(s)');

  /* Et l'inverse : sans secteur choisi, l'application ne remplit rien. */
  const vide = await page.evaluate(() => {
    appSetSecteur(''); jxRechargerDossier();
    goPage('socle'); socOnEnter(); socTab('ccn'); jxReport();
    return { idcc: document.getElementById('soc-idcc').value,
             ph: document.getElementById('soc-idcc').placeholder };
  });
  ok(vide.idcc === '', 'sans secteur choisi, aucune convention n’est inventée', vide.idcc);
  ok(!/Ex : 16/.test(vide.ph), 'et l’exemple n’est plus celui du transport', vide.ph);

  console.log('\nExceptions : ' + erreurs.length);
  erreurs.slice(0, 4).forEach(e => console.log('   ! ' + e.slice(0, 200)));
  ok(erreurs.length === 0, 'aucune exception JavaScript');

  await nav.close();
  console.log('\n' + (echecs ? echecs + ' ECHEC(S)' : 'tout est vert'));
  process.exit(echecs ? 1 : 0);
})();
