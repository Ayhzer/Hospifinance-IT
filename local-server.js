/**
 * Serveur local de développement — Hospifinance-IT
 * Lit/écrit les données depuis hospifinance-it-data/data/*.json
 * Expose la même API REST qu'attend apiService.js
 * Aucune dépendance externe — Node.js built-ins uniquement.
 *
 * Usage : node local-server.js
 * Port  : 3001
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = path.resolve(__dirname, '../hospifinance-it-data/data');
const PORT      = 3001;
const JWT_SECRET = 'hospifinance-it-local-dev-secret';

// ─── JWT minimal (HMAC-SHA256, aucun package) ────────────────────────────────

function signToken(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body   = b64url(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 3600 * 1000 }));
  const sig    = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyToken(token) {
  if (!token) throw new Error('Token manquant');
  const [header, body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (sig !== expected) throw new Error('Token invalide');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (payload.exp < Date.now()) throw new Error('Token expiré');
  return payload;
}

function b64url(str) {
  return Buffer.from(str).toString('base64url');
}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// ─── Fichiers JSON ────────────────────────────────────────────────────────────

function readData(filename) {
  const filepath = path.join(DATA_DIR, filename);
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch {
    return [];
  }
}

function writeData(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
}

// Résolution du champ mot de passe — supporte base64 (héritage) et SHA-256
function checkPassword(stored, incoming) {
  const incomingHash = sha256(incoming);
  // Format SHA-256 (64 hex chars)
  if (/^[0-9a-f]{64}$/.test(stored.passwordHash || '')) {
    return stored.passwordHash === incomingHash;
  }
  // Format base64 hérité (champ "password")
  if (stored.password) {
    try {
      const plain = Buffer.from(stored.password, 'base64').toString('utf8');
      return plain === incoming;
    } catch { return false; }
  }
  return false;
}

// ─── Utilitaires HTTP ─────────────────────────────────────────────────────────

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function json(res, status, data) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error('JSON invalide')); }
    });
    req.on('error', reject);
  });
}

const DEV_BYPASS_TOKEN = 'dev-local-bypass-hospifinance-it';

function auth(req) {
  const header = req.headers['authorization'] || '';
  const token  = header.replace(/^Bearer\s+/i, '');
  // Bypass pour localhost — jamais valide en prod car signToken ne produit pas cette valeur
  if (token === DEV_BYPASS_TOKEN) {
    return { userId: 1, username: 'admin', role: 'superadmin' };
  }
  return verifyToken(token);
}

// ─── Serveur HTTP ─────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url    = req.url.replace(/\?.*$/, '');
  const method = req.method.toUpperCase();

  // Preflight CORS
  if (method === 'OPTIONS') { cors(res); res.writeHead(204); res.end(); return; }

  // Retire le préfixe /api
  const route = url.replace(/^\/api/, '');

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    if (route === '/auth/login' && method === 'POST') {
      const { username, password } = await readBody(req);
      if (!username || !password) return json(res, 400, { error: 'username et password requis' });

      const users = readData('users.json');
      const user  = users.find(u => u.username === username && !u.disabled);
      if (!user || !checkPassword(user, password)) {
        return json(res, 401, { error: 'Identifiants invalides' });
      }

      const token = signToken({ userId: user.id, username: user.username, role: user.role });
      return json(res, 200, { token, user: { id: user.id, username: user.username, role: user.role } });
    }

    if (route === '/auth/me' && method === 'GET') {
      const payload = auth(req);
      return json(res, 200, { user: payload });
    }

    if (route === '/auth/logout' && method === 'POST') {
      return json(res, 200, { message: 'Déconnexion réussie' });
    }

    // ── Users ─────────────────────────────────────────────────────────────────
    if (route === '/users' && method === 'GET') {
      auth(req);
      const users = readData('users.json').map(u => ({ ...u, password: undefined, passwordHash: undefined }));
      return json(res, 200, users);
    }

    if (route === '/users' && method === 'POST') {
      auth(req);
      const body  = await readBody(req);
      const users = readData('users.json');
      const newUser = {
        id: Date.now(),
        username: body.username,
        passwordHash: sha256(body.password || 'ChangeMe2024!'),
        role: body.role || 'user',
        disabled: false,
      };
      users.push(newUser);
      writeData('users.json', users);
      return json(res, 201, { ...newUser, passwordHash: undefined });
    }

    const userMatch = route.match(/^\/users\/(\d+)$/);
    if (userMatch) {
      const id    = Number(userMatch[1]);
      auth(req);

      if (method === 'PUT') {
        const body  = await readBody(req);
        const users = readData('users.json');
        const idx   = users.findIndex(u => u.id === id);
        if (idx === -1) return json(res, 404, { error: 'Utilisateur introuvable' });
        users[idx] = { ...users[idx], ...body, id, passwordHash: users[idx].passwordHash, password: users[idx].password };
        writeData('users.json', users);
        return json(res, 200, { ...users[idx], passwordHash: undefined, password: undefined });
      }

      if (method === 'DELETE') {
        const users = readData('users.json');
        const filtered = users.filter(u => u.id !== id);
        writeData('users.json', filtered);
        return json(res, 200, { message: 'Utilisateur supprimé' });
      }
    }

    const pwdMatch = route.match(/^\/users\/(\d+)\/password$/);
    if (pwdMatch && method === 'PUT') {
      const id    = Number(pwdMatch[1]);
      const body  = await readBody(req);
      const users = readData('users.json');
      const idx   = users.findIndex(u => u.id === id);
      if (idx === -1) return json(res, 404, { error: 'Utilisateur introuvable' });
      if (!checkPassword(users[idx], body.currentPassword)) {
        return json(res, 401, { error: 'Mot de passe actuel incorrect' });
      }
      users[idx].passwordHash = sha256(body.newPassword);
      delete users[idx].password;
      writeData('users.json', users);
      return json(res, 200, { message: 'Mot de passe mis à jour' });
    }

    // ── OPEX ──────────────────────────────────────────────────────────────────
    if (route === '/opex' && method === 'GET') {
      auth(req);
      return json(res, 200, readData('opex.json'));
    }

    if (route === '/opex' && method === 'PUT') {
      // Remplacement complet (bulk replace) — utilisé par l'import SAGE
      auth(req);
      const body = await readBody(req);
      if (!Array.isArray(body)) return json(res, 400, { error: 'Array attendu' });
      writeData('opex.json', body);
      return json(res, 200, { count: body.length });
    }

    if (route === '/opex' && method === 'POST') {
      auth(req);
      const body = await readBody(req);
      const list = readData('opex.json');
      const item = { ...body, id: body.id || `${Date.now()}-${Math.random().toString(36).slice(2)}` };
      list.push(item);
      writeData('opex.json', list);
      return json(res, 201, item);
    }

    const opexMatch = route.match(/^\/opex\/(.+)$/);
    if (opexMatch) {
      auth(req);
      const id   = opexMatch[1];
      const list = readData('opex.json');

      if (method === 'PUT') {
        const body = await readBody(req);
        const idx  = list.findIndex(i => String(i.id) === id);
        if (idx === -1) return json(res, 404, { error: 'Fournisseur introuvable' });
        list[idx] = { ...list[idx], ...body, id: list[idx].id };
        writeData('opex.json', list);
        return json(res, 200, list[idx]);
      }

      if (method === 'DELETE') {
        writeData('opex.json', list.filter(i => String(i.id) !== id));
        return json(res, 200, { message: 'Fournisseur supprimé' });
      }
    }

    // ── CAPEX ─────────────────────────────────────────────────────────────────
    if (route === '/capex' && method === 'GET') {
      auth(req);
      return json(res, 200, readData('capex.json'));
    }

    if (route === '/capex' && method === 'PUT') {
      // Remplacement complet (bulk replace) — utilisé par l'import SAGE
      auth(req);
      const body = await readBody(req);
      if (!Array.isArray(body)) return json(res, 400, { error: 'Array attendu' });
      writeData('capex.json', body);
      return json(res, 200, { count: body.length });
    }

    if (route === '/capex' && method === 'POST') {
      auth(req);
      const body = await readBody(req);
      const list = readData('capex.json');
      const item = { ...body, id: body.id || `${Date.now()}-${Math.random().toString(36).slice(2)}` };
      list.push(item);
      writeData('capex.json', list);
      return json(res, 201, item);
    }

    const capexMatch = route.match(/^\/capex\/(.+)$/);
    if (capexMatch) {
      auth(req);
      const id   = capexMatch[1];
      const list = readData('capex.json');

      if (method === 'PUT') {
        const body = await readBody(req);
        const idx  = list.findIndex(i => String(i.id) === id);
        if (idx === -1) return json(res, 404, { error: 'Projet introuvable' });
        list[idx] = { ...list[idx], ...body, id: list[idx].id };
        writeData('capex.json', list);
        return json(res, 200, list[idx]);
      }

      if (method === 'DELETE') {
        writeData('capex.json', list.filter(i => String(i.id) !== id));
        return json(res, 200, { message: 'Projet supprimé' });
      }
    }

    // ── Commandes OPEX ────────────────────────────────────────────────────────
    if (route === '/opex-orders' && method === 'GET') {
      auth(req);
      return json(res, 200, readData('opex-orders.json'));
    }

    if (route === '/opex-orders' && method === 'PUT') {
      // Remplacement complet (le hook envoie toujours le tableau entier)
      auth(req);
      const body = await readBody(req);
      if (!Array.isArray(body)) return json(res, 400, { error: 'Array attendu' });
      writeData('opex-orders.json', body);
      return json(res, 200, { count: body.length });
    }

    // ── Commandes CAPEX ───────────────────────────────────────────────────────
    if (route === '/capex-orders' && method === 'GET') {
      auth(req);
      return json(res, 200, readData('capex-orders.json'));
    }

    if (route === '/capex-orders' && method === 'PUT') {
      auth(req);
      const body = await readBody(req);
      if (!Array.isArray(body)) return json(res, 400, { error: 'Array attendu' });
      writeData('capex-orders.json', body);
      return json(res, 200, { count: body.length });
    }

    // ── EPRD ──────────────────────────────────────────────────────────────────
    if (route === '/eprd' && method === 'GET') {
      return json(res, 200, readData('eprd.json'));
    }

    const eprdMatch = route.match(/^\/eprd\/(.+)$/);
    if (eprdMatch && method === 'PUT') {
      auth(req);
      const compte = eprdMatch[1];
      const body   = await readBody(req);
      const list   = readData('eprd.json');
      const idx    = list.findIndex(e => e.compteOrdonnateur === compte);
      if (idx === -1) return json(res, 404, { error: 'Compte EPRD introuvable' });
      list[idx] = { ...list[idx], ...body, compteOrdonnateur: compte };
      writeData('eprd.json', list);
      return json(res, 200, list[idx]);
    }

    // ── Settings ──────────────────────────────────────────────────────────────
    if (route === '/settings' && method === 'GET') {
      auth(req);
      return json(res, 200, readData('settings.json'));
    }

    if (route === '/settings' && method === 'PUT') {
      auth(req);
      const body = await readBody(req);
      writeData('settings.json', body);
      return json(res, 200, body);
    }

    if (route === '/settings/custom-columns' && method === 'POST') {
      auth(req);
      const { type, column } = await readBody(req);
      const settings = readData('settings.json');
      if (!settings.customColumns) settings.customColumns = { opex: [], capex: [] };
      if (!settings.customColumns[type]) settings.customColumns[type] = [];
      settings.customColumns[type].push(column);
      writeData('settings.json', settings);
      return json(res, 201, column);
    }

    const customColMatch = route.match(/^\/settings\/custom-columns\/(opex|capex)\/(.+)$/);
    if (customColMatch && method === 'DELETE') {
      auth(req);
      const [, type, columnId] = customColMatch;
      const settings = readData('settings.json');
      if (settings.customColumns?.[type]) {
        settings.customColumns[type] = settings.customColumns[type].filter(c => c.id !== columnId);
      }
      writeData('settings.json', settings);
      return json(res, 200, { message: 'Colonne supprimée' });
    }

    // ── Reclassement ──────────────────────────────────────────────────────────
    if (route === '/reclassement' && method === 'GET') {
      return json(res, 200, readData('reclassement.json'));
    }

    if (route === '/reclassement' && method === 'PUT') {
      auth(req);
      const body = await readBody(req);
      writeData('reclassement.json', body);
      return json(res, 200, body);
    }

    // 404
    json(res, 404, { error: `Route inconnue: ${method} ${route}` });

  } catch (err) {
    if (err.message.includes('Token') || err.message.includes('expiré')) {
      return json(res, 401, { error: err.message });
    }
    console.error('[ERREUR]', err.message);
    json(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`\n✅ Serveur local Hospifinance-IT démarré sur http://localhost:${PORT}/api`);
  console.log(`📁 Données : ${DATA_DIR}`);
  console.log(`\n   Comptes disponibles (users.json) :`);
  try {
    const users = readData('users.json');
    users.forEach(u => console.log(`   - ${u.username} (${u.role})${u.disabled ? ' [désactivé]' : ''}`));
  } catch { /* ignore */ }
  console.log('\n   Ctrl+C pour arrêter\n');
});
