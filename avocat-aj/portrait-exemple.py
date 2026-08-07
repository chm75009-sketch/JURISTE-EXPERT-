#!/usr/bin/env python3
"""Portrait d'attente : une silhouette devant une rangée d'ouvrages, en noir et
blanc. Il n'est là que pour montrer le cadrage et le traitement du bandeau ;
il se remplace par la vraie photo (même nom de fichier, rien d'autre à
changer). Pur Python — aucune bibliothèque à installer."""
import zlib, struct, math, os, sys

T = 720          # côté de l'image
SS = 2           # suréchantillonnage


def fond(x, y):
    """Rayonnage sombre : bandes verticales irrégulières, dégradé du haut."""
    # bandes = dos de livres, largeurs variables obtenues par une somme de sinus
    b = math.sin(x * 47.0) * 0.5 + math.sin(x * 13.3 + 1.7) * 0.3 + math.sin(x * 29.1 + 4.2) * 0.2
    v = 46 + b * 16
    # étagère horizontale
    if 0.40 < y < 0.435:
        v = 26
    # vignette : les bords s'assombrissent
    d = math.hypot(x - 0.5, y - 0.45)
    v *= max(0.35, 1.0 - d * 0.85)
    return v


def silhouette(x, y):
    """Buste centré : tête, épaules, col clair. Renvoie None hors du buste."""
    # tête
    tx, ty, rx, ry = 0.5, 0.34, 0.135, 0.175
    dt = ((x - tx) / rx) ** 2 + ((y - ty) / ry) ** 2
    if dt <= 1.0:
        # modelé doux : plus clair au centre haut, plus sombre sur les bords
        ombre = 1.0 - 0.45 * math.sqrt(dt)
        return 104 * ombre + 24

    # épaules : parabole qui s'ouvre vers le bas
    if y > 0.50:
        demi = 0.20 + (y - 0.50) * 1.25
        if abs(x - 0.5) <= demi:
            # col de chemise, clair, en V
            v = abs(x - 0.5)
            if y < 0.70 and v < 0.085 and (y - 0.52) > v * 1.5:
                return 196 - (y - 0.52) * 60
            # cravate
            if y > 0.60 and v < 0.028:
                return 96
            # veste sombre
            return 40 + (0.5 - abs(x - 0.5)) * 22
    # cou
    if 0.47 < y <= 0.56 and abs(x - 0.5) < 0.062:
        return 88
    return None


def png(chemin):
    lignes = bytearray()
    for py in range(T):
        lignes.append(0)
        for px in range(T):
            acc = 0.0
            for sy in range(SS):
                for sx in range(SS):
                    x = (px + (sx + 0.5) / SS) / T
                    y = (py + (sy + 0.5) / SS) / T
                    s = silhouette(x, y)
                    acc += s if s is not None else fond(x, y)
            g = int(max(0, min(255, acc / (SS * SS))))
            lignes += bytes((g, g, g))

    def bloc(t, d):
        c = t + d
        return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)

    with open(chemin, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(bloc(b'IHDR', struct.pack('>IIBBBBB', T, T, 8, 2, 0, 0, 0)))
        f.write(bloc(b'IDAT', zlib.compress(bytes(lignes), 9)))
        f.write(bloc(b'IEND', b''))
    print('  %s — %d×%d, %d octets' % (chemin, T, T, os.path.getsize(chemin)))


if __name__ == '__main__':
    png(os.path.join(sys.argv[1] if len(sys.argv) > 1 else '.', 'portrait.png'))
