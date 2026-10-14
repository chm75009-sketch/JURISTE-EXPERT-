/* Le dossier de T.E.C produit par l'application en v227, dans l'hypothese
   retenue : aucun candidat, ni syndical au premier tour, ni libre au second.
   Les documents sortent de l'application elle-meme — pas d'un fichier
   retouche a la main. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const CSV = process.argv[2];
const OUT = process.argv[3];
const APP = 'file://' + path.resolve(__dirname, '..', 'index.html');

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await nav.newPage();
  const err = [];
  page.on('pageerror', e => err.push(String(e)));
  await page.goto(APP);
  await page.waitForTimeout(1200);

  await page.evaluate(() => {
    window.E = window.E || {};
    E.nom = 'SARL TEC'; E.adresse = '23 avenue du Château, 95100 Argenteuil';
    E.siret = '53845047900034'; E.dirigeant = 'Chadi EL SAFADI';
    E.ccn = 'Transports routiers et activités auxiliaires du transport';
    E.idcc = '16';
    window.confirm = () => true; window.alert = () => {};
  });
  await page.setInputFiles('#cse-nom-import', CSV);
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    document.getElementById('cse-nom-date-scrutin').value = '2026-12-15';
    refreshNomTable();
    const sel = document.getElementById('cse-etape-scrutin');
    sel.value = 'aucune_liste'; cseEtapeMaj();
  });
  await page.waitForTimeout(1500);

  const docs = await page.evaluate(() => {
    const out = [];
    /* On intercepte showDoc, comme le fait le dossier complet de
       l'application, pour recolter les documents au lieu de les afficher. */
    const vrai = window.showDoc;
    window.showDoc = (titre, html) => {
      out.push({ titre: titre, html: _genererWordHTML(titre, html) });
    };
    const hors = (CSE_SITUATIONS[cseEtapeScrutin()] || {}).hors || [];
    const gen = (t) => { if (hors.indexOf(t) < 0) { try { genDocElectionTEC(t); } catch (e) {} } };

    gen('calendrier');
    ['synthese', 'electeurs', 'eligibles', 'justif'].forEach(k => {
      try { exportListeNom(k, 'word'); } catch (e) {}
    });
    gen('note_info');
    gen('invitations_osr');
    gen('pv_absence_osr');
    gen('pap_unilateral');
    gen('pv_1er');
    gen('note_info_2eme');
    gen('convocations_2eme');
    gen('bulletin_2eme');
    gen('pv_2eme');
    gen('pv_carence_total');
    gen('affichage_resultats');
    /* Et ceux qui ont ete ecartes, pour le dire dans le compte rendu. */
    window.showDoc = vrai;
    return { docs: out, ecartes: hors };
  });

  fs.mkdirSync(OUT, { recursive: true });
  const propre = s => String(s).replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, '_').slice(0, 95);
  docs.docs.forEach((d, i) => {
    const nom = String(i + 1).padStart(2, '0') + '_' + propre(d.titre) + '.doc';
    fs.writeFileSync(path.join(OUT, nom), '﻿' + d.html, 'utf8');
    console.log('  ' + nom);
  });
  console.log('\n  documents produits :', docs.docs.length);
  console.log('  ecartes            :', docs.ecartes.join(', '));
  console.log('  exceptions         :', err.length ? err.join(' | ') : 'aucune');
  await nav.close();
})();
