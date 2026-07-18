/**
 * Relais France Travail — Cloudflare Worker
 * ------------------------------------------------------------------
 * Rôle : cacher le client_secret France Travail.
 *   Le navigateur (page offres.html) appelle CE worker,
 *   le worker s'authentifie auprès de France Travail et renvoie les offres.
 *   Le secret ne quitte JAMAIS le serveur.
 *
 * Secrets à définir dans Cloudflare (Settings > Variables and Secrets) :
 *   FT_CLIENT_ID       = l'identifiant client de ton application francetravail.io
 *   FT_CLIENT_SECRET   = la clé secrète (celle du fichier JSON téléchargé)
 *
 * Variable simple (facultative mais recommandée) :
 *   ALLOWED_ORIGIN     = https://chm75009-sketch.github.io
 *                        (limite qui peut appeler le relais ; sinon "*")
 *
 * Endpoints :
 *   GET /health   -> test de vie
 *   GET /offres   -> recherche d'offres (mêmes paramètres que l'API FT v2)
 *                    + paramètre "range" (ex. 0-149) pour la taille de l'échantillon
 * ------------------------------------------------------------------
 */

const TOKEN_URL =
  'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire';
const SEARCH_URL =
  'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search';
const METIERS_URL =
  'https://api.francetravail.io/partenaire/offresdemploi/v2/referentiel/metiers';
const SCOPE = 'api_offresdemploiv2 o2dsoffre';

// Cache mémoire du jeton (best-effort, par isolate)
let cachedToken = null;
let tokenExpiry = 0;

async function getToken(env) {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry - 60_000) return cachedToken;

  if (!env.FT_CLIENT_ID || !env.FT_CLIENT_SECRET) {
    throw new Error(
      'FT_CLIENT_ID / FT_CLIENT_SECRET manquants (à définir dans les secrets du Worker).'
    );
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.FT_CLIENT_ID,
    client_secret: env.FT_CLIENT_SECRET,
    scope: SCOPE,
  });

  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!r.ok) {
    throw new Error('Échec obtention du jeton (' + r.status + ') : ' + (await r.text()));
  }

  const j = await r.json();
  cachedToken = j.access_token;
  tokenExpiry = now + (Number(j.expires_in) || 1500) * 1000;
  return cachedToken;
}

function corsHeaders(env, origin) {
  const allowed = env.ALLOWED_ORIGIN || '*';
  // Si une origine précise est configurée, on ne renvoie que celle-là.
  const allowOrigin = allowed === '*' ? '*' : allowed;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status, extra) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(env, origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    if (url.pathname === '/health') {
      return json({ ok: true, service: 'france-travail-proxy' }, 200, cors);
    }

    if (url.pathname === '/metiers') {
      try {
        const token = await getToken(env);
        const r = await fetch(METIERS_URL, {
          headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
        });
        const text = await r.text();
        return new Response(text || '[]', {
          status: r.ok ? 200 : r.status,
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors },
        });
      } catch (e) {
        return json({ error: String(e && e.message ? e.message : e) }, 502, cors);
      }
    }

    if (url.pathname === '/offres' || url.pathname === '/') {
      if (request.method !== 'GET') {
        return json({ error: 'Méthode non autorisée' }, 405, cors);
      }
      try {
        const token = await getToken(env);

        // On transmet tels quels les paramètres de recherche à l'API FT,
        // sauf "range" qui devient l'en-tête Range (pagination FT).
        const params = new URLSearchParams(url.search);
        const range = params.get('range') || '0-149';
        params.delete('range');

        const ftUrl = SEARCH_URL + (params.toString() ? '?' + params.toString() : '');
        const r = await fetch(ftUrl, {
          headers: {
            Authorization: 'Bearer ' + token,
            Accept: 'application/json',
            Range: 'offres=' + range,
          },
        });

        const text = await r.text();
        // Statuts sans corps autorisé (204 = aucune offre, etc.) → liste vide en 200.
        // 206 = résultats partiels (normal avec Range) → 200.
        const noBody = r.status === 204 || r.status === 205 || r.status === 304 || r.status === 101;
        const status = (r.status === 206 || noBody) ? 200 : r.status;
        const outBody = noBody ? '{"resultats":[]}' : (text || '{"resultats":[]}');
        return new Response(outBody, {
          status,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'X-FT-Content-Range': r.headers.get('Content-Range') || '',
            ...cors,
          },
        });
      } catch (e) {
        return json({ error: String(e && e.message ? e.message : e) }, 502, cors);
      }
    }

    return json({ error: 'Endpoint inconnu' }, 404, cors);
  },
};
