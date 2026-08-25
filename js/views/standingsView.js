import { AppState } from '../core/state.js';
import { DataManager } from '../data/dataManager.js';
import { PosicionesService } from '../services/standings.js';

export const initStandingsView = () => {
    let tournamentId;
    try { tournamentId = AppState.getTournament(); } catch { tournamentId = null; }
    const container = document.getElementById('posiciones-list');
    const categoryId = AppState.getCategory();
    if (!tournamentId || !categoryId) { container.innerHTML = '<p>Seleccione un torneo y una categoría desde Equipos.</p>'; return; }
    const zones = DataManager.getZonesByTournamentAndCategory(tournamentId, categoryId);
    const rows = PosicionesService.calcularPosiciones(tournamentId, categoryId);
    container.innerHTML = zones.map(zone => {
        const tableRows = rows.filter(row => row.zonaId === zone.id).map((row, index) => `<tr><td>${index + 1}</td><td>${row.nombre}</td><td>${row.jugados}</td><td>${row.ganados}</td><td>${row.perdidos}</td><td>${row.setsFavor}</td><td>${row.setsContra}</td><td>${row.diferenciaSets}</td><td>${row.puntos}</td></tr>`).join('');
        return `<section class="card"><h3>${zone.nombre}</h3><table><thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>PG</th><th>PP</th><th>SF</th><th>SC</th><th>Dif.</th><th>Pts</th></tr></thead><tbody>${tableRows || '<tr><td colspan="9">Sin equipos</td></tr>'}</tbody></table></section>`;
    }).join('') || '<p>No hay zonas creadas para esta categoría.</p>';
};
