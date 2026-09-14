import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const privateDirectory = resolve(process.env.NEWCOM_PRIVATE_DIR || resolve(root, 'private'));
const licensesPath = resolve(privateDirectory, 'licenses.json');
const adminPath = resolve(privateDirectory, 'admin.json');
const port = Number(process.env.PORT || 4173);
let mutationQueue = Promise.resolve();
const mimeTypes = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const initialLicenses = () => ({ version: '1.0', lastUpdated: null, licenses: [] });

const send = (response, status, body) => {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(body));
};
const readBody = request => new Promise((resolveBody, reject) => {
    let content = '';
    request.on('data', chunk => { content += chunk; if (content.length > 1_000_000) reject(new Error('REQUEST_TOO_LARGE')); });
    request.on('end', () => { try { resolveBody(JSON.parse(content || '{}')); } catch { reject(new Error('INVALID_BODY')); } });
    request.on('error', reject);
});
const normalizeCode = code => String(code || '').trim().toUpperCase();
const validCode = code => /^NWC-[A-Z0-9]{4,}(?:-[A-Z0-9]{2,})+$/.test(code);
const positiveInteger = value => Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= 10000;
const safeData = value => value && Array.isArray(value.licenses) ? { version: '1.0', lastUpdated: value.lastUpdated || null, licenses: value.licenses } : initialLicenses();
const ensureFiles = async () => {
    await mkdir(privateDirectory, { recursive: true });
    if (!existsSync(licensesPath)) await writeFile(licensesPath, `${JSON.stringify(initialLicenses(), null, 2)}\n`, 'utf8');
    if (!existsSync(adminPath)) await writeFile(adminPath, `${JSON.stringify({ version: '1.0', lastUpdated: null, admin: {} }, null, 2)}\n`, 'utf8');
};
const readLicenses = async () => safeData(JSON.parse(await readFile(licensesPath, 'utf8')));
const mutateLicenses = operation => {
    const next = mutationQueue.then(async () => {
        const data = await readLicenses();
        const result = await operation(data);
        data.lastUpdated = new Date().toISOString();
        await writeFile(licensesPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
        return result;
    });
    mutationQueue = next.catch(() => {});
    return next;
};
const nextId = licenses => `CLI-${String(Math.max(0, ...licenses.map(license => Number(String(license.id || '').replace(/^CLI-/, '')) || 0)) + 1).padStart(4, '0')}`;
const publicLicense = license => ({ ...license, license: { ...license.license, tournamentsRemaining: Math.max(0, Number(license.license.tournamentsRemaining || 0)) } });
const fail = (response, status, message) => send(response, status, { error: message });

const api = async (request, response, url) => {
    if (request.method === 'GET' && url.pathname === '/api/licenses') return send(response, 200, await readLicenses());
    if (request.method === 'POST' && url.pathname === '/api/licenses') {
        const body = await readBody(request); const code = normalizeCode(body.code); const client = body.client || {}; const credits = Number(body.tournamentsPurchased);
        if (!validCode(code) || !String(client.name || '').trim() || !positiveInteger(credits)) return fail(response, 400, 'Los datos de la licencia no son válidos.');
        const license = await mutateLicenses(data => {
            if (data.licenses.some(item => item.code === code)) throw new Error('LICENSE_EXISTS');
            const now = new Date().toISOString();
            const created = { id: nextId(data.licenses), code, client: { name: String(client.name).trim(), organization: String(client.organization || '').trim(), email: String(client.email || '').trim(), phone: String(client.phone || '').trim() }, license: { tournamentsPurchased: credits, tournamentsUsed: 0, tournamentsRemaining: credits, active: true, createdAt: now, activatedAt: null }, history: [{ at: now, type: 'LICENSE_CREATED', tournaments: credits }] };
            data.licenses.push(created); return created;
        });
        return send(response, 201, publicLicense(license));
    }
    if (request.method === 'POST' && url.pathname === '/api/licenses/activate') {
        const code = normalizeCode((await readBody(request)).code);
        const license = await mutateLicenses(data => {
            const found = data.licenses.find(item => item.code === code);
            if (!found || !found.license.active) throw new Error('LICENSE_INVALID');
            if (!found.license.activatedAt) { found.license.activatedAt = new Date().toISOString(); found.history.push({ at: found.license.activatedAt, type: 'LICENSE_ACTIVATED' }); }
            return found;
        });
        return send(response, 200, publicLicense(license));
    }
    if (request.method === 'POST' && url.pathname === '/api/licenses/consume') {
        const code = normalizeCode((await readBody(request)).code);
        const license = await mutateLicenses(data => {
            const found = data.licenses.find(item => item.code === code);
            if (!found || !found.license.active || found.license.tournamentsRemaining < 1) throw new Error('NO_CREDITS');
            found.license.tournamentsUsed += 1; found.license.tournamentsRemaining -= 1;
            found.history.push({ at: new Date().toISOString(), type: 'TOURNAMENT_CONSUMED', tournaments: 1 }); return found;
        });
        return send(response, 200, publicLicense(license));
    }
    const id = url.pathname.match(/^\/api\/licenses\/([^/]+)$/)?.[1];
    if (request.method === 'PATCH' && id) {
        const body = await readBody(request);
        const license = await mutateLicenses(data => {
            const found = data.licenses.find(item => item.id === decodeURIComponent(id)); if (!found) throw new Error('LICENSE_NOT_FOUND');
            if (body.action === 'add-credits') {
                const amount = Number(body.amount); if (!positiveInteger(amount)) throw new Error('INVALID_CREDITS');
                found.license.tournamentsPurchased += amount; found.license.tournamentsRemaining += amount;
                found.history.push({ at: new Date().toISOString(), type: 'CREDITS_ADDED', tournaments: amount }); return found;
            }
            const client = body.client || {};
            if (!String(client.name || '').trim()) throw new Error('INVALID_CLIENT');
            found.client = { name: String(client.name).trim(), organization: String(client.organization || '').trim(), email: String(client.email || '').trim(), phone: String(client.phone || '').trim() };
            found.license.active = Boolean(body.active); found.history.push({ at: new Date().toISOString(), type: 'LICENSE_UPDATED', active: found.license.active }); return found;
        });
        return send(response, 200, publicLicense(license));
    }
    return fail(response, 404, 'Recurso no encontrado.');
};
const serveStatic = async (request, response, url) => {
    const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    if (requested === '/private' || requested.startsWith('/private/')) { response.writeHead(404); response.end(); return; }
    const path = resolve(root, `.${requested}`);
    if (relative(root, path).startsWith('..') || path === privateDirectory || relative(privateDirectory, path) && !relative(privateDirectory, path).startsWith('..')) { response.writeHead(404); response.end(); return; }
    try { const content = await readFile(path); response.writeHead(200, { 'Content-Type': mimeTypes[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); response.end(content); }
    catch { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('No encontrado'); }
};

await ensureFiles();
createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
    try { if (url.pathname.startsWith('/api/')) await api(request, response, url); else await serveStatic(request, response, url); }
    catch (error) {
        const messages = { LICENSE_EXISTS: 'Ese código de licencia ya existe.', LICENSE_INVALID: 'El código de licencia no es válido o está deshabilitado.', NO_CREDITS: 'No tenés torneos disponibles. Contactá al administrador para adquirir más.', INVALID_CREDITS: 'Ingrese una cantidad de torneos válida.', INVALID_CLIENT: 'Ingrese los datos del cliente.', INVALID_BODY: 'Los datos enviados no son válidos.' };
        fail(response, 400, messages[error.message] || 'No se pudo actualizar la licencia.');
    }
}).listen(port, '127.0.0.1', () => console.log(`NEWCOM local: http://127.0.0.1:${port}`));
