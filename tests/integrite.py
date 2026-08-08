# -*- coding: utf-8 -*-
"""Audit d'integrite technique — ce qui est mecaniquement verifiable."""
import io, re, sys, json

P='/home/user/JURISTE-EXPERT-/index.html'
d=io.open(P,encoding='utf-8').read()
# Le script vit desormais dans app.js : on le rattache au document sous la
# forme d'un bloc <script> ordinaire, pour que tous les controles le voient.
try:
    _js=io.open('/home/user/JURISTE-EXPERT-/app.js',encoding='utf-8').read()
    d=d+'\n<script>\n'+_js+'\n</script>\n'
except Exception:
    pass

def ligne(i): return d[:i].count('\n')+1

NATIF=set("""if for while switch catch return typeof function new delete void in of do else try
Math JSON Date Array Object String Number Boolean RegExp Set Map Promise parseInt parseFloat
isNaN isFinite alert confirm prompt console document window setTimeout setInterval clearTimeout
encodeURIComponent decodeURIComponent btoa atob fetch Error localStorage sessionStorage
Uint8Array TextEncoder TextDecoder FileReader Blob URL File Event crypto""".split())

print('='*74)
print('  AUDIT D INTEGRITE — %s (%.1f Mo)' % (P, len(d.encode())/1048576))
print('='*74)

# ── 1. Fonctions declarees deux fois ──────────────────────────────
blocs=[(m.start(1), m.end(1)) for m in re.finditer(r'<script(?![^>]*src=)[^>]*>(.*?)</script>', d, re.S)]
decl={}
pat=re.compile(r'(?:^|\n)\s*(?:window\.)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(')
for a,b in blocs:
    for m in pat.finditer(d[a:b]):
        n=m.group(1); decl.setdefault(n,[]).append(ligne(a+m.start(1)))
dbl={n:v for n,v in decl.items() if len(v)>1}
print('\n[1] FONCTIONS DECLAREES PLUSIEURS FOIS  (la derniere ecrase les precedentes)')
if dbl:
    for n,v in sorted(dbl.items(), key=lambda x:-len(x[1])):
        print('    %-34s x%d  lignes %s' % (n, len(v), ', '.join(map(str,v))))
else:
    print('    aucune')

# ── 2. Fonctions appelees depuis un attribut, mais inexistantes ───
definies=set(decl)
# formes « window.x = function » et « var x = function »
for m in re.finditer(r'(?:^|\n)\s*(?:window\.|var\s+|let\s+|const\s+)([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function', d):
    definies.add(m.group(1))
for m in re.finditer(r'window\.([A-Za-z_$][\w$]*)\s*=', d):
    definies.add(m.group(1))

appels={}
for m in re.finditer(r'\son(?:click|change|input|submit|load)\s*=\s*"([^"]*)"', d):
    for f in re.findall(r'\b([A-Za-z_$][\w$]*)\s*\(', m.group(1)):
        if f not in NATIF: appels.setdefault(f, []).append(ligne(m.start()))
manquantes={f:v for f,v in appels.items() if f not in definies}
print('\n[2] FONCTIONS APPELEES DEPUIS UN ATTRIBUT ET NON DEFINIES')
if manquantes:
    for f,v in sorted(manquantes.items()):
        print('    %-34s  lignes %s' % (f, ', '.join(map(str, sorted(set(v))[:6]))))
else:
    print('    aucune  (%d fonctions distinctes appelees, toutes definies)' % len(appels))

# ── 3. goPage vers une page inexistante ───────────────────────────
pages=set(re.findall(r'<div\s+id="pg-([\w-]+)"', d))
cibles={}
for m in re.finditer(r"goPage\(\s*'([\w-]+)'\s*\)", d):
    cibles.setdefault(m.group(1), []).append(ligne(m.start()))
casse={c:v for c,v in cibles.items() if c not in pages and c!='home'}
print('\n[3] goPage VERS UNE PAGE INEXISTANTE')
print('    %d pages declarees, %d cibles distinctes' % (len(pages), len(cibles)))
if casse:
    for c,v in sorted(casse.items()):
        print('    CASSE  %-22s  lignes %s' % (c, ', '.join(map(str, sorted(set(v))[:6]))))
else:
    print('    aucune')

# ── 4. getElementById sur un id absent du HTML ────────────────────
ids=set(re.findall(r'\bid="([\w-]+)"', d))
ids |= set(re.findall(r"\bid='([\w-]+)'", d))
# ids construits dynamiquement dans des chaines : id="..."+  -> on les ignore
dyn=set()
for m in re.finditer(r"getElementById\(\s*'([\w-]+)'\s*\)", d):
    dyn.setdefault if False else None
gets={}
for m in re.finditer(r"getElementById\(\s*'([\w-]+)'\s*\)", d):
    gets.setdefault(m.group(1), []).append(ligne(m.start()))
# un id peut etre cree par innerHTML : on cherche aussi id="x" a l'interieur des chaines JS
ids |= set(re.findall(r"id=\\?\"([\w-]+)\\?\"", d))
ids |= set(re.findall(r"id=\"'\+\w", d))  # ids concatenes : ignores
absents={k:v for k,v in gets.items() if k not in ids}
print('\n[4] getElementById SUR UN ID JAMAIS ECRIT DANS LE FICHIER')
print('    %d ids presents, %d ids interroges' % (len(ids), len(gets)))
if absents:
    for k,v in sorted(absents.items()):
        print('    ABSENT %-30s  lignes %s' % (k, ', '.join(map(str, sorted(set(v))[:5]))))
else:
    print('    aucun')

# ── 5. Valeurs en dur qui devraient etre variables ────────────────
print('\n[5] VALEURS EN DUR SUSPECTES')
sus=[
 (r"\|\|\s*'transport'", "repli sur le secteur transport"),
 (r"'CCN IDCC 0016'", "convention du transport ecrite en dur"),
 (r"idcc\s*:\s*'16'", "IDCC 16 par defaut"),
 (r"SMIC_H\s*=\s*[\d.]+", "SMIC en dur"),
]
for rx, lib in sus:
    hits=[ligne(m.start()) for m in re.finditer(rx, d)]
    if hits: print('    %-42s x%-3d lignes %s' % (lib, len(hits), ', '.join(map(str,hits[:8]))))

# ── 6. Attributs onclick construits avec une valeur utilisateur ───
print('\n[6] INJECTION POSSIBLE : onclick CONSTRUIT AVEC UNE VALEUR NON ECHAPPEE')
risque=[]
for m in re.finditer(r"onclick=\\?\"[^\"]{0,120}?\'\"\s*\+\s*([A-Za-z_$][\w$.]*)", d):
    v=m.group(1)
    if 'Esc' not in v and 'esc' not in v:
        risque.append((ligne(m.start()), v))
if risque:
    for ln,v in risque[:20]: print('    ligne %-7d valeur : %s' % (ln, v))
    print('    total : %d' % len(risque))
else:
    print('    aucun cas detecte par ce motif')

# ── 7. catch vides qui avalent une erreur d'ecriture ──────────────
print('\n[7] ECRITURES localStorage DANS UN catch VIDE')
n=0
for m in re.finditer(r"localStorage\.setItem\([^)]*\)\s*;?\s*\}catch\(e\)\{\s*\}", d):
    n+=1
print('    %d ecriture(s) dont l echec est avale en silence' % n)
print('    (un quota depasse ne remonte alors aucune erreur a l utilisateur)')
