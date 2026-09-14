import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = 4800 + Math.floor(Math.random() * 300);
const dataDir = await mkdtemp(join(tmpdir(), 'newcom-license-test-'));
const server = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: String(port), NEWCOM_PRIVATE_DIR: dataDir }, stdio: 'ignore' });
const origin = `http://127.0.0.1:${port}`;
const nativeFetch = globalThis.fetch;

try {
    for (let attempt = 0; attempt < 30; attempt += 1) {
        try { if ((await nativeFetch(`${origin}/api/licenses`)).ok) break; } catch {}
        await new Promise(resolveWait => setTimeout(resolveWait, 50));
        if (attempt === 29) throw new Error('El servidor local no inició.');
    }
    if ((await nativeFetch(`${origin}/private/licenses.json`)).status !== 404) throw new Error('Los archivos privados quedaron expuestos por el servidor local.');
    globalThis.localStorage = {
        values: new Map(),
        getItem(key) { return this.values.get(key) || null; },
        setItem(key, value) { this.values.set(key, value); },
        removeItem(key) { this.values.delete(key); }
    };
    globalThis.fetch = (path, options) => nativeFetch(`${origin}${path}`, options);
    const module = await import(`${pathToFileURL(resolve(root, 'js/data/licenseRepo.js')).href}?local-license-test=1`);
    const { LicenciaRepo } = module;

    const created = await LicenciaRepo.crear({ codigo: 'NWC-TEST-2026-001', cliente: 'Club X', organization: 'Club X', email: 'club@example.test', phone: '1234', cupoTotal: 1 });
    if (created.id !== 'CLI-0001' || created.codigo !== 'NWC-TEST-2026-001' || created.disponibles !== 1 || !created.history.length) throw new Error('La licencia inicial no se creó con la estructura local requerida.');
    const active = await LicenciaRepo.activar('nwc-test-2026-001');
    if (active.disponibles !== 1) throw new Error('La activación no mostró un torneo disponible.');
    const afterFirstTournament = await LicenciaRepo.consumirTorneo();
    if (afterFirstTournament.disponibles !== 0 || afterFirstTournament.cupo_utilizado !== 1) throw new Error('Crear un torneo no consumió el crédito local.');
    let blocked = false;
    try { await LicenciaRepo.consumirTorneo(); } catch { blocked = true; }
    if (!blocked) throw new Error('Se permitió crear un torneo sin créditos.');
    const expanded = await LicenciaRepo.agregarTorneos(created.id, 5);
    if (expanded.codigo !== 'NWC-TEST-2026-001' || expanded.disponibles !== 5 || expanded.cupo_total !== 6) throw new Error('Agregar créditos cambió el código o calculó mal el saldo.');
    const refreshed = await LicenciaRepo.obtenerActiva();
    if (!refreshed || refreshed.codigo !== 'NWC-TEST-2026-001' || refreshed.disponibles !== 5) throw new Error('El cliente no leyó el saldo actualizado de la misma licencia local.');
    const afterSecondTournament = await LicenciaRepo.consumirTorneo();
    if (afterSecondTournament.disponibles !== 4) throw new Error('El segundo torneo no actualizó el saldo a cuatro.');
    await LicenciaRepo.actualizar(created.id, { cliente: 'Club X', organizacion: 'Club X', email: 'club@example.test', telefono: '1234', activa: false });
    if (await LicenciaRepo.obtenerActiva()) throw new Error('Una licencia deshabilitada siguió activa en el cliente.');
    console.log('El flujo local de licencia conserva código permanente y créditos correctos.');
} finally {
    globalThis.fetch = nativeFetch;
    server.kill();
    await rm(dataDir, { recursive: true, force: true });
}
