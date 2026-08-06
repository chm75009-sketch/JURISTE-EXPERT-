/* UN CDD DOIT ETRE UN CDD, DANS TOUS LES SECTEURS.

   Les generateurs Batiment et tertiaire titraient « CONTRAT DE TRAVAIL A
   DUREE DETERMINEE » et ne produisaient aucune clause de CDD : le type de
   contrat ne servait qu'a ecrire le titre. Le CDD et le CDI du batiment ne
   differaient que de deux caracteres.

   Manquaient les mentions dont l'omission emporte REQUALIFICATION EN CDI
   (L.1242-12) : motif precis, nom et qualification du remplace, terme ou
   duree minimale, periode d'essai, institution de retraite complementaire,
   indemnite de fin de contrat.

   Et les documents affirmaient le faux : « la rupture est precedee d'un
   preavis conventionnel » — un CDD ne se rompt pas moyennant preavis
   (L.1243-1, L.1243-4) — et une periode d'essai de 2 a 4 mois renouvelable,
   alors que L.1242-10 la plafonne a deux semaines ou un mois, sans
   renouvellement.

   Ce test produit le contrat dans trois secteurs et relit le document. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test cdd ignore.'); process.exit(0); }
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const URL = 'file://' + require('path').resolve(__dirname, '..', 'index.html');

let echecs = 0;
const ok = (c, m, d) => { if (c) console.log('  ok    ' + m); else { echecs++; console.log('  ECHEC ' + m + (d !== undefined ? ' — ' + d : '')); } };

/* Les mentions de L.1242-12, une par une. */
const MENTIONS = [
  ['le motif precis du recours', /congé maternité|remplacement d’un salarié absent/],
  ['le nom du salarie remplace', /BERNARD Alice/],
  ['sa qualification', /Assistante/],
  ['le terme du contrat', /31\/01\/2027/],
  ['la periode d’essai propre au CDD', /L\.1242-10/],
  ['l’indemnite de fin de contrat', /L\.1243-8/],
  ['l’institution de retraite complementaire', /L\.1242-12, 7°/],
  ['les cas de rupture anticipee', /L\.1243-4/],
  ['la transmission sous deux jours ouvrables', /L\.1242-13/]
];

(async () => {
  const nav = await chromium.launch(require('fs').existsSync(CHROME) ? { executablePath: CHROME } : {});
  const page = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(String(e)));
  page.on('dialog', d => d.dismiss());
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    sessionStorage.setItem('jte_ok', '1'); sessionStorage.setItem('jte_admin', '1');
    document.getElementById('pg-inscription').style.display = 'none';
    document.getElementById('pg-app').style.display = 'block';
    document.getElementById('accueil-screen').style.display = 'none';
    const m = document.getElementById('admin-sec-modal'); if (m) m.style.display = 'none';
    goPage('home');
  });
  await page.waitForTimeout(1200);

  const produire = (sec, type) => page.evaluate(([s, t]) => {
    appSetSecteur(s); jxRechargerDossier();
    E.nom = 'ACME'; E.siret = '12345678900011'; E.adresse = '1 rue X, 69100 Villeurbanne'; E.dirigeant = 'Jean D';
    goPage('contrat'); setContratType(t);
    const set = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); } };
    set('c-nom', 'DUPONT Jean'); set('c-poste', 'Agent'); set('c-salaire', '2200');
    set('c-debut', '2026-09-01'); set('c-cdd-motif', 'remplacement');
    set('c-remplace-nom', 'BERNARD Alice'); set('c-remplace-motif', 'congé maternité');
    set('c-remplace-qualif', 'Assistante');
    set('c-cdd-debut', '2026-09-01'); set('c-cdd-fin', '2027-01-31');
    let html = null; const old = window.showDoc; window.showDoc = (ti, h) => { html = h; };
    let err = null; try { genContrat(); } catch (e) { err = String(e); }
    window.showDoc = old;
    return { err, txt: html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') : null };
  }, [sec, type]);

  for (const sec of ['transport', 'batiment', 'syntec', 'banque', 'enseignement']) {
    console.log('\n— ' + sec + ', contrat à durée déterminée —');
    const r = await produire(sec, 'cdd');
    if (!r.txt) { ok(false, 'le document est produit', r.err); continue; }
    const manque = MENTIONS.filter(([, re]) => !re.test(r.txt)).map(([n]) => n);
    ok(manque.length === 0, 'les mentions de L.1242-12 y sont toutes', manque.join(' · '));
    ok(!/rupture (du contrat )?est précédée d’un préavis|précédée d'un préavis conventionnel/.test(r.txt),
      'le document ne promet pas un préavis de rupture — un CDD n’en a pas');
    ok(!/Période d’essai de (2|3|4) mois/.test(r.txt),
      'ni une période d’essai de plusieurs mois renouvelable');
    ok(/DURÉE DÉTERMINÉE/.test(r.txt), 'et il est bien titré « durée déterminée »');
  }

  /* Le CDI ne doit pas avoir herite des clauses du CDD. */
  console.log('\n— Et le CDI reste un CDI —');
  for (const sec of ['batiment', 'syntec']) {
    const r = await produire(sec, 'cdi');
    ok(r.txt && !/L\.1243-8|L\.1242-12/.test(r.txt), sec + ' : aucune clause de CDD dans le contrat à durée indéterminée');
    ok(r.txt && /préavis/.test(r.txt), sec + ' : et son préavis conventionnel y est');
  }

  console.log('\nExceptions : ' + erreurs.length);
  ok(erreurs.length === 0, 'aucune exception JavaScript', erreurs.slice(0, 3).join(' | '));
  await nav.close();
  console.log(echecs ? ('\n' + echecs + ' ECHEC(S)') : '\ntout est vert');
  process.exit(echecs ? 1 : 0);
})();
