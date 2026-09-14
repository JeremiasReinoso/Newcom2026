import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
globalThis.localStorage = {
    values: new Map(),
    getItem(key) { return this.values.get(key) || null; },
    setItem(key, value) { this.values.set(key, value); },
    removeItem(key) { this.values.delete(key); }
};

const source = readFileSync(resolve(root, 'js/data/licenseRepo.js'), 'utf8')
    .replace("import { supabaseFetch } from './db.js';", "const supabaseFetch = async () => { throw new Error('No debe usarse Supabase en esta prueba local.'); };")
    .replace("import { hasSupabaseConfig } from '../core/config.js';", 'const hasSupabaseConfig = () => false;')
    .replace('export const LicenciaRepo', 'const LicenciaRepo');

const scenario = `
    const created = await LicenciaRepo.crear({ codigo: 'NWC-TEST-2026-001', cliente: 'Club X', email: 'club@example.test', cupoTotal: 1 });
    if (created.codigo !== 'NWC-TEST-2026-001' || created.cupo_total !== 1 || created.cupo_utilizado !== 0) throw new Error('La licencia inicial no se creó correctamente.');
    const active = await LicenciaRepo.activar('nwc-test-2026-001');
    if (active.disponibles !== 1) throw new Error('La activación no mostró un torneo disponible.');
    const afterFirstTournament = await LicenciaRepo.consumirTorneo();
    if (afterFirstTournament.disponibles !== 0 || afterFirstTournament.cupo_utilizado !== 1) throw new Error('Crear un torneo no consumió el crédito.');
    let blocked = false;
    try { await LicenciaRepo.consumirTorneo(); } catch { blocked = true; }
    if (!blocked) throw new Error('Se permitió crear un torneo sin créditos.');
    const expanded = await LicenciaRepo.agregarTorneos(created.id, 5);
    if (expanded.codigo !== 'NWC-TEST-2026-001' || LicenciaRepo.disponible(expanded) !== 5) throw new Error('Agregar créditos cambió el código o calculó mal el saldo.');
    const refreshed = await LicenciaRepo.obtenerActiva();
    if (!refreshed || refreshed.codigo !== 'NWC-TEST-2026-001' || refreshed.disponibles !== 5) throw new Error('El cliente no leyó el saldo actualizado de la misma licencia.');
    const afterSecondTournament = await LicenciaRepo.consumirTorneo();
    if (afterSecondTournament.disponibles !== 4) throw new Error('El segundo torneo no actualizó el saldo a cuatro.');
    await LicenciaRepo.actualizar(created.id, { activa: false });
    if (await LicenciaRepo.obtenerActiva()) throw new Error('Una licencia deshabilitada siguió activa en el cliente.');
    console.log('El flujo de licencia mantiene código permanente y créditos sincronizados.');
`;

await import(`data:text/javascript;base64,${Buffer.from(`${source}\n${scenario}`).toString('base64')}`);
