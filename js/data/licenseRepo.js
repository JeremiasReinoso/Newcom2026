import { supabaseFetch } from './db.js';
import { hasSupabaseConfig } from '../core/config.js';

const REGISTRY_KEY = 'newcom_license_registry_v1';
const ACTIVE_CODE_KEY = 'newcom_active_license_code_v1';
const codePattern = /^NWC-[A-Z0-9]{4,}(?:-[A-Z0-9]{2,})+$/;
const remoteEnabled = () => hasSupabaseConfig();
const normalizeCode = code => String(code || '').trim().toUpperCase();
const readRegistry = () => { try { const value = JSON.parse(localStorage.getItem(REGISTRY_KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
const writeRegistry = records => localStorage.setItem(REGISTRY_KEY, JSON.stringify(records));
const normalize = raw => raw && ({
    id: raw.id, codigo: normalizeCode(raw.codigo), cliente: String(raw.cliente || raw.clientName || '').trim(), email: String(raw.email || '').trim(),
    cupo_total: Number(raw.cupo_total ?? raw.torneos_comprados ?? 0), cupo_utilizado: Number(raw.cupo_utilizado ?? raw.torneos_usados ?? 0),
    activa: raw.activa ?? raw.active ?? true, creado: raw.creado || raw.created_at || null, actualizado: raw.actualizado || raw.updated_at || null
});
const available = license => Math.max(0, license.cupo_total - license.cupo_utilizado);
const publicLicense = license => ({ ...license, disponibles: available(license) });
const assertCredits = amount => { const value = Number(amount); if (!Number.isInteger(value) || value < 1 || value > 10000) throw new Error('Ingrese una cantidad de torneos válida.'); return value; };
const assertLicenseInput = ({ codigo, cliente, cupoTotal }) => {
    const code = normalizeCode(codigo);
    if (!codePattern.test(code)) throw new Error('El código debe tener formato NWC-XXXX-XXXX.');
    if (!String(cliente || '').trim()) throw new Error('Ingrese el nombre del cliente.');
    return { code, credits: assertCredits(cupoTotal) };
};
const getRemoteByCode = async code => {
    const rows = await supabaseFetch(`licencias?codigo=eq.${encodeURIComponent(code)}&select=*`);
    return rows?.[0] ? normalize(rows[0]) : null;
};

export const LicenciaRepo = {
    usaFuenteRemota: remoteEnabled,
    disponible: available,
    async obtenerTodas() {
        if (remoteEnabled()) return (await supabaseFetch('licencias?select=*&order=created_at.desc')).map(normalize);
        return readRegistry().map(normalize).sort((a, b) => String(b.creado || '').localeCompare(String(a.creado || '')));
    },
    async obtenerPorCodigo(codigo) {
        const code = normalizeCode(codigo); if (!code) return null;
        if (remoteEnabled()) return getRemoteByCode(code);
        return normalize(readRegistry().find(item => normalizeCode(item.codigo) === code));
    },
    async crear({ codigo, cliente, email = '', cupoTotal }) {
        const { code, credits } = assertLicenseInput({ codigo, cliente, cupoTotal });
        if (await this.obtenerPorCodigo(code)) throw new Error('Ese código de licencia ya existe.');
        const now = new Date().toISOString();
        if (remoteEnabled()) {
            const rows = await supabaseFetch('licencias', 'POST', { codigo: code, cliente: String(cliente).trim(), email: String(email).trim(), cupo_total: credits, cupo_utilizado: 0, activa: true });
            return normalize(rows?.[0]);
        }
        const record = { id: `lic_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, codigo: code, cliente: String(cliente).trim(), email: String(email).trim(), cupo_total: credits, cupo_utilizado: 0, activa: true, creado: now, actualizado: now };
        writeRegistry([...readRegistry(), record]); return normalize(record);
    },
    async actualizar(id, changes) {
        if (!id) throw new Error('No se encontró la licencia.');
        const safe = {};
        if (changes.cliente !== undefined) { if (!String(changes.cliente).trim()) throw new Error('Ingrese el nombre del cliente.'); safe.cliente = String(changes.cliente).trim(); }
        if (changes.email !== undefined) safe.email = String(changes.email).trim();
        if (changes.activa !== undefined) safe.activa = Boolean(changes.activa);
        if (remoteEnabled()) { const rows = await supabaseFetch(`licencias?id=eq.${encodeURIComponent(id)}`, 'PATCH', safe); return normalize(rows?.[0]); }
        const records = readRegistry(); const index = records.findIndex(record => record.id === id);
        if (index < 0) throw new Error('No se encontró la licencia.');
        records[index] = { ...records[index], ...safe, actualizado: new Date().toISOString() }; writeRegistry(records); return normalize(records[index]);
    },
    async agregarTorneos(id, cantidad) {
        const credits = assertCredits(cantidad);
        if (remoteEnabled()) {
            const rows = await supabaseFetch('rpc/agregar_creditos_licencia', 'POST', { p_licencia_id: id, p_cantidad: credits });
            if (!rows?.[0]) throw new Error('No se encontró la licencia.');
            return normalize(rows[0]);
        }
        const license = normalize(readRegistry().find(record => record.id === id));
        if (!license) throw new Error('No se encontró la licencia.');
        const newTotal = license.cupo_total + credits;
        const records = readRegistry().map(record => record.id === id ? { ...record, cupo_total: newTotal, actualizado: new Date().toISOString() } : record);
        writeRegistry(records); return normalize(records.find(record => record.id === id));
    },
    async activar(codigo) {
        const license = await this.obtenerPorCodigo(codigo);
        if (!license || !license.activa) throw new Error('El código de licencia no es válido o está deshabilitado.');
        localStorage.setItem(ACTIVE_CODE_KEY, license.codigo); return publicLicense(license);
    },
    async obtenerActiva() {
        const code = normalizeCode(localStorage.getItem(ACTIVE_CODE_KEY)); if (!code) return null;
        const license = await this.obtenerPorCodigo(code);
        if (!license || !license.activa) { localStorage.removeItem(ACTIVE_CODE_KEY); return null; }
        return publicLicense(license);
    },
    cerrarActivacion() { localStorage.removeItem(ACTIVE_CODE_KEY); },
    async consumirTorneo() {
        const active = await this.obtenerActiva();
        if (!active) throw new Error('Activá una licencia válida para crear torneos.');
        if (active.disponibles < 1) throw new Error('No tenés torneos disponibles. Contactá al administrador para adquirir más.');
        if (remoteEnabled()) {
            const rows = await supabaseFetch('rpc/consumir_credito_licencia', 'POST', { p_codigo: active.codigo });
            if (!rows?.[0]) throw new Error('No tenés torneos disponibles. Contactá al administrador para adquirir más.');
            return publicLicense(normalize(rows[0]));
        }
        const records = readRegistry(); const index = records.findIndex(record => record.id === active.id);
        if (index < 0 || !records[index].activa || Number(records[index].cupo_total) <= Number(records[index].cupo_utilizado)) throw new Error('No tenés torneos disponibles. Contactá al administrador para adquirir más.');
        records[index] = { ...records[index], cupo_utilizado: Number(records[index].cupo_utilizado) + 1, actualizado: new Date().toISOString() };
        writeRegistry(records); return publicLicense(normalize(records[index]));
    }
};
