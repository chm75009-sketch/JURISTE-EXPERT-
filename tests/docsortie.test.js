/* UN DOCUMENT S'OUVRE, PUIS ON CHOISIT.
   Signale : « Il faut option imprimer ou enregistrer en word ou pdf ».
   Les modeles de l'audit appelaient le partage directement : sur telephone,
   cela ouvrait la feuille de partage ou copiait le texte, sans jamais
   proposer d'imprimer ni d'enregistrer. Et l'apercu concurrent annoncait un
   bouton imprimante absent de sa propre barre.
   Ici on verifie qu'il n'y a plus qu'une porte, et qu'elle porte les
   quatre boutons -- Fermer, Imprimer/PDF, Word, Partager. */
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.log('Playwright absent — test docsortie ignore.'); process.exit(0); }
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
    window.E = window.E || {}; E.effectif = '250'; E.nom = 'SARL SORTIE';
    try { jxEcrire(jxEntKey(), JSON.stringify(E)); } catch (_) {}
    goPage('auditsoc');
  });
  await page.waitForTimeout(700);

  console.log('\n— Un modele ouvre l\'apercu, pas la feuille de partage —');
  /* On piege le partage : s'il est appele tout seul, le test doit le voir. */
  await page.evaluate(() => {
    window._partageAppele = 0;
    const vrai = window.partagerDocActuel;
    window.partagerDocActuel = function () { window._partageAppele++; };
    window._vraiPartage = vrai;
  });
  const vue = await page.evaluate(() => {
    ausDoc('infoemb');
    const o = document.getElementById('doc-fullscreen-overlay');
    if (!o) return { ouvert: false };
    const b = [...o.querySelectorAll('.doc-bar button')].map(x => x.innerText.trim());
    return { ouvert: true, boutons: b, partage: window._partageAppele,
             contenu: /R\.1221-34/.test(o.innerText), titre: /relation de travail/i.test(o.innerText) };
  });
  ok(vue.ouvert, 'le modele ouvre l\'apercu plein ecran');
  ok(vue.partage === 0, 'et n\'ouvre PAS la feuille de partage tout seul', 'appels : ' + vue.partage);
  ok(vue.contenu && vue.titre, 'le document lui-meme est affiche');
  ['Fermer', 'Imprimer', 'Word', 'Partager'].forEach(b =>
    ok((vue.boutons || []).some(x => x.indexOf(b) >= 0), 'la barre porte « ' + b + ' »', (vue.boutons || []).join(' | ')));

  console.log('\n— Aucun bandeau ne renvoie a un bouton absent —');
  const coherent = await page.evaluate(() => {
    const o = document.getElementById('doc-fullscreen-overlay');
    const t = o.innerText;
    const barre = [...o.querySelectorAll('.doc-bar button')].map(x => x.innerText).join(' ');
    /* Si l'aide parle d'imprimer, le bouton doit exister dans la barre. */
    return { parleImpression: /Imprimer|imprim/.test(t), boutonPresent: /Imprimer/.test(barre) };
  });
  ok(!coherent.parleImpression || coherent.boutonPresent,
     'ce que l\'aide annonce existe bien dans la barre');

  console.log('\n— Imprimer declenche l\'impression, Word produit un fichier —');
  const imp = await page.evaluate(() => {
    let appels = 0; const vrai = window.print; window.print = function () { appels++; };
    jxDocImprimer(); window.print = vrai; return appels;
  });
  ok(imp === 1, 'le bouton Imprimer / PDF appelle bien l\'impression', imp);
  const word = await page.evaluate(() => {
    let nom = null, href = null;
    const vraiCreate = document.createElement.bind(document);
    document.createElement = function (t) {
      const el = vraiCreate(t);
      if (t === 'a') { const c = el.click.bind(el); el.click = function () { nom = el.download; href = el.href; }; }
      return el;
    };
    try { jxDocWord(); } finally { document.createElement = vraiCreate; }
    return { nom: nom, blob: /^blob:/.test(href || '') };
  });
  ok(/\.doc$/.test(word.nom || ''), 'Word telecharge un fichier .doc', word.nom);
  ok(word.blob, 'construit depuis le document affiche');

  console.log('\n— La sortie est la meme pour tous les modules —');
  await page.evaluate(() => jxDocFermer());
  for (const g of [['negoDoc', 'accord1'], ['cseinstDoc', 'pvbureau'], ['ausDocRapport', null], ['ausDocPlan', null]]) {
    const r = await page.evaluate(([f, a]) => {
      jxDocFermer();
      try { a ? window[f](a) : window[f](); } catch (e) { return { err: e.message }; }
      const o = document.getElementById('doc-fullscreen-overlay');
      return { ouvert: !!o, n: o ? o.querySelectorAll('.doc-bar button').length : 0 };
    }, g);
    ok(!r.err && r.ouvert && r.n === 4, 'sortie identique pour ' + g[0] + (g[1] ? '(' + g[1] + ')' : ''), r.err || ('boutons : ' + r.n));
  }

  console.log('\n— Le bouton « Word » de la barre generale ouvre la meme porte —');
  const gen = await page.evaluate(() => {
    jxDocFermer(); telechargerWord();
    const o = document.getElementById('doc-fullscreen-overlay');
    return !!o && o.querySelectorAll('.doc-bar button').length === 4;
  });
  ok(gen, 'telechargerWord() n\'ouvre plus un apercu concurrent');

  ok(err.length === 0, 'aucune exception JavaScript', err.join(' | '));
  await nav.close();
  console.log(e ? '\n' + e + ' echec(s)' : '\ntout est vert');
  process.exit(e ? 1 : 0);
})();
