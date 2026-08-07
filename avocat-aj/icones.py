#!/usr/bin/env python3
"""Génère les icônes PWA du site avocat : balance de la justice, laiton sur
vert cabinet. Pur Python (zlib + struct) — aucune dépendance à installer,
donc l'icône se régénère partout, y compris dans un dépôt vide."""
import zlib, struct, math, sys, os

VERT_CLAIR = (0x33, 0x8A, 0x71)
VERT_FONCE = (0x11, 0x33, 0x2A)
LAITON     = (0xE2, 0xC6, 0x84)
LAITON_S   = (0xC0, 0x9A, 0x4E)

SS = 4            # suréchantillonnage (anti-crénelage)
GLYPHE = 0.80     # échelle du glyphe : reste dans la zone sûre "maskable"


def dist_seg(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    t = 0.0 if (dx == 0 and dy == 0) else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def dans_glyphe(x, y):
    """x, y en espace unitaire 0..1. Vrai si le pixel appartient à la balance."""
    # recentrage : le glyphe est dessiné plus petit que la tuile
    x = 0.5 + (x - 0.5) / GLYPHE
    y = 0.5 + (y - 0.5) / GLYPHE
    if not (0 <= x <= 1 and 0 <= y <= 1):
        return False

    # mât central
    if 0.484 <= x <= 0.516 and 0.235 <= y <= 0.745:
        return True
    # pommeau
    if math.hypot(x - 0.5, y - 0.222) <= 0.038:
        return True
    # fléau
    if 0.205 <= x <= 0.795 and 0.288 <= y <= 0.316:
        return True
    # embouts du fléau
    for cx in (0.212, 0.788):
        if math.hypot(x - cx, y - 0.302) <= 0.026:
            return True
    # socle : trapèze
    if 0.745 <= y <= 0.800:
        demi = 0.085 + (y - 0.745) / 0.055 * 0.115
        if abs(x - 0.5) <= demi:
            return True
    if 0.800 <= y <= 0.822 and abs(x - 0.5) <= 0.200:
        return True

    # plateaux + suspentes
    for cx in (0.212, 0.788):
        cy, r = 0.505, 0.132
        # coupelle : demi-anneau ouvert vers le haut
        if y >= cy:
            d = math.hypot(x - cx, y - cy)
            if r - 0.028 <= d <= r:
                return True
        # barre du plateau
        if 0.505 - 0.014 <= y <= 0.505 + 0.014 and abs(x - cx) <= r:
            return True
        # suspentes
        for sx in (cx - r, cx + r):
            if dist_seg(x, y, cx, 0.302, sx, cy) <= 0.007:
                return True
    return False


def png(path, taille):
    lignes = bytearray()
    r_coin = taille * 0.225
    for py in range(taille):
        lignes.append(0)                     # filtre "none"
        for px in range(taille):
            r = g = b = 0.0
            for sy in range(SS):
                for sx in range(SS):
                    fx = (px + (sx + 0.5) / SS)
                    fy = (py + (sy + 0.5) / SS)
                    # coin arrondi : hors tuile → noir transparent-like (fond opaque sombre)
                    cx = min(max(fx, r_coin), taille - r_coin)
                    cy = min(max(fy, r_coin), taille - r_coin)
                    dehors = math.hypot(fx - cx, fy - cy) > r_coin
                    if dehors:
                        pr, pg, pb = VERT_FONCE          # pas d'alpha : fond plein
                    else:
                        # dégradé diagonal vert clair → vert foncé
                        t = min(1.0, max(0.0, (fx / taille * 0.45 + fy / taille * 0.75)))
                        pr = VERT_CLAIR[0] + (VERT_FONCE[0] - VERT_CLAIR[0]) * t
                        pg = VERT_CLAIR[1] + (VERT_FONCE[1] - VERT_CLAIR[1]) * t
                        pb = VERT_CLAIR[2] + (VERT_FONCE[2] - VERT_CLAIR[2]) * t
                        if dans_glyphe(fx / taille, fy / taille):
                            u = fy / taille
                            pr = LAITON[0] + (LAITON_S[0] - LAITON[0]) * u
                            pg = LAITON[1] + (LAITON_S[1] - LAITON[1]) * u
                            pb = LAITON[2] + (LAITON_S[2] - LAITON[2]) * u
                    r += pr; g += pg; b += pb
            n = SS * SS
            lignes += bytes((int(r / n + 0.5), int(g / n + 0.5), int(b / n + 0.5)))

    def bloc(typ, data):
        c = typ + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)

    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(bloc(b'IHDR', struct.pack('>IIBBBBB', taille, taille, 8, 2, 0, 0, 0)))
        f.write(bloc(b'IDAT', zlib.compress(bytes(lignes), 9)))
        f.write(bloc(b'IEND', b''))
    print('  %s — %d×%d, %d octets' % (path, taille, taille, os.path.getsize(path)))


if __name__ == '__main__':
    dest = sys.argv[1] if len(sys.argv) > 1 else '.'
    png(os.path.join(dest, 'icone-192.png'), 192)
    png(os.path.join(dest, 'icone-512.png'), 512)
    png(os.path.join(dest, 'icone-180.png'), 180)   # apple-touch-icon
