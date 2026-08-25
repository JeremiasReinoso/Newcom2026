// Prueba de regresión del flujo obligatorio: categoría +50, una zona de
// cuatro equipos, cuatro partidos asegurados, fixture y posiciones.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
globalThis.localStorage = {
    values: new Map(),
    getItem(key) { return this.values.get(key) || null; },
    setItem(key, value) { this.values.set(key, value); }
};

const load = path => readFileSync(resolve(root, path), 'utf8');
const dataManager = load('js/data/dataManager.js').replace('export const DataManager', 'const DataManager');
const scheduler = load('js/services/scheduler.js')
    .replace("import { DataManager } from '../data/dataManager.js';", '')
    .replace('export const SchedulerService', 'const SchedulerService');
const standings = load('js/services/standings.js')
    .replace("import { DataManager } from '../data/dataManager.js';", '')
    .replace('export const PosicionesService', 'const PosicionesService');

const scenario = `
    const tournament = DataManager.createTournament('Prueba +50', 4);
    const category = DataManager.createCategory('+50', tournament.id);
    const zone = DataManager.createZone('Zona A', category.id, tournament.id);
    for (const name of ['A', 'B', 'C', 'D']) {
        const team = DataManager.createTeam('Equipo ' + name, category.id, tournament.id);
        DataManager.assignTeamToZone(team.id, zone.id);
    }
    const created = SchedulerService.generarEmparejamientos(tournament.id, category.id);
    let matches = DataManager.getMatchesByTournamentAndCategory(tournament.id, category.id);
    if (created !== 8 || matches.length !== 8) throw new Error('Se esperaban 8 partidos.');
    const counts = {};
    const uniquePairs = new Set();
    for (const match of matches) {
        if (match.zonaId !== zone.id) throw new Error('Se generó un cruce entre zonas.');
        uniquePairs.add([match.equipoLocalId, match.equipoVisitanteId].sort().join(':'));
        counts[match.equipoLocalId] = (counts[match.equipoLocalId] || 0) + 1;
        counts[match.equipoVisitanteId] = (counts[match.equipoVisitanteId] || 0) + 1;
    }
    if (!Object.values(counts).every(count => count === 4)) throw new Error('No hay cuatro partidos por equipo.');
    if (uniquePairs.size !== 6) throw new Error('Se repitieron cruces antes de agotar los seis cruces únicos.');
    if (!matches.every(match => match.estado === 'borrador' && !match.confirmado)) throw new Error('Los emparejamientos no quedaron como borradores.');
    let blocked = false;
    try { DataManager.updateMatchResult(matches[0].id, 2, 0); } catch { blocked = true; }
    if (!blocked) throw new Error('Se permitió un resultado sin confirmar el partido.');
    const confirmed = SchedulerService.confirmarEmparejamientos(tournament.id, category.id);
    matches = DataManager.getMatchesByTournamentAndCategory(tournament.id, category.id);
    if (confirmed !== 8 || !matches.every(match => match.confirmado && match.estado === 'pendiente')) throw new Error('La confirmación no oficializó los mismos partidos.');
    DataManager.setTournamentPeriod(tournament.id, '2026-09-12', '2026-09-14');
    const dates = DataManager.getCalendarDates(tournament.id);
    if (dates.join(',') !== '2026-09-12,2026-09-13,2026-09-14') throw new Error('El período del torneo no generó sus tres días.');
    const scheduled = SchedulerService.programarEmparejamientos(tournament.id, category.id);
    matches = DataManager.getMatchesByTournamentAndCategory(tournament.id, category.id);
    if (scheduled !== 8 || matches.some(match => !match.fecha || !match.hora || !match.cancha || match.estado !== 'pendiente' || !dates.includes(match.fecha))) throw new Error('La programación está incompleta o sale del período.');
    blocked = false;
    try { DataManager.updateMatchResult(matches[0].id, 1, 0); } catch { blocked = true; }
    if (!blocked) throw new Error('Se permitió un resultado distinto de 2-0 o 2-1.');
    DataManager.updateMatchResult(matches[0].id, 2, 0);
    DataManager.updateMatchResult(matches[1].id, 2, 1);
    const table = PosicionesService.calcularPosiciones(tournament.id, category.id);
    if (!table.some(row => row.puntos === 3) || !table.some(row => row.puntos === 2) || !table.some(row => row.puntos === 1)) throw new Error('No se aplicó el puntaje 2-0 / 2-1.');
    if (!table.every(row => Number.isInteger(row.setsFavor) && Number.isInteger(row.setsContra) && Number.isInteger(row.diferenciaSets))) throw new Error('No se calcularon los sets.');
    DataManager.updateMatchResult(matches[0].id, 2, 1);
    const updatedTable = PosicionesService.calcularPosiciones(tournament.id, category.id);
    if (updatedTable.reduce((total, row) => total + row.puntos, 0) !== 6) throw new Error('La edición duplicó puntos en la tabla.');
    console.log(JSON.stringify({ created, confirmed, scheduled, matchesPerTeam: Object.values(counts), dates }));
`;

await import(`data:text/javascript;base64,${Buffer.from(`${dataManager}\n${scheduler}\n${standings}\n${scenario}`).toString('base64')}`);
