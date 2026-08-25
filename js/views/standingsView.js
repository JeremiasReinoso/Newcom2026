import { AppState } from '../core/state.js';
import { DataManager } from '../data/dataManager.js';
import { PosicionesService } from '../services/standings.js';

export const initStandingsView = () => {
    let tournamentId;
    try { tournamentId = AppState.getTournament(); } catch { tournamentId = null; }
    const container = document.getElementById('posiciones-list');
    const categoryId = AppState.getCategory();
    if (!tournamentId || !categoryId) { container.innerHTML = '<p>Seleccione un torneo y una categoría desde Equipos.</p>'; return; }
    const rows = PosicionesService.calcularPosiciones(tournamentId, categoryId);
    const tableRows = rows.map((row, index) => `<tr><td>${index + 1}</td><td>${row.nombre}</td><td>${row.jugados}</td><td>${row.ganados}</td><td>${row.perdidos}</td><td>${row.setsFavor}</td><td>${row.setsContra}</td><td>${row.diferenciaSets}</td><td>${row.puntos}</td></tr>`).join('');
    container.innerHTML = `<section class="card"><h3>Clasificación general</h3><p>Los cuatro primeros clasifican a semifinales.</p><table><thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>PG</th><th>PP</th><th>SF</th><th>SC</th><th>Dif.</th><th>Pts</th></tr></thead><tbody>${tableRows || '<tr><td colspan="9">Aún no hay equipos en esta categoría.</td></tr>'}</tbody></table></section>`;
};
