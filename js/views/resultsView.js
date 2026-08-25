import { AppState } from '../core/state.js';
import { DataManager } from '../data/dataManager.js';

export function initResultadosView() {
    let tournamentId;
    try { tournamentId = AppState.getTournament(); } catch { tournamentId = null; }
    const list = document.getElementById('resultados-list');
    const categoryId = AppState.getCategory();
    if (!tournamentId || !categoryId) { list.innerHTML = '<p>Seleccione un torneo y una categoría desde Equipos.</p>'; return; }
    const teams = DataManager.getTeamsByTournamentAndCategory(tournamentId, categoryId);
    const zones = DataManager.getZonesByTournamentAndCategory(tournamentId, categoryId);
    const matches = DataManager.getMatchesByTournamentAndCategory(tournamentId, categoryId).filter(match => match.estado !== 'emparejado');
    const team = id => teams.find(item => item.id === id)?.nombre || 'Equipo';
    const zone = id => zones.find(item => item.id === id)?.nombre || 'Sin zona';
    list.innerHTML = matches.length ? matches.map(match => `<article class="card"><strong>${match.fecha} · ${match.hora} · ${match.cancha}</strong><p>${zone(match.zonaId)}</p><h3>${team(match.equipoLocalId)} vs ${team(match.equipoVisitanteId)}</h3>${match.estado === 'finalizado' ? `<p>Finalizado: ${match.setsLocal}-${match.setsVisitante}</p>` : `<select class="resultado-select" data-id="${match.id}"><option value="">Resultado</option><option value="2-0">${team(match.equipoLocalId)} 2-0</option><option value="2-1">${team(match.equipoLocalId)} 2-1</option><option value="0-2">${team(match.equipoVisitanteId)} 2-0</option><option value="1-2">${team(match.equipoVisitanteId)} 2-1</option></select><button class="guardar-resultado btn-primary" data-id="${match.id}">Guardar</button>`}</article>`).join('') : '<p>No hay partidos programados para esta categoría.</p>';
    document.querySelectorAll('.guardar-resultado').forEach(button => button.addEventListener('click', () => {
        const value = document.querySelector(`.resultado-select[data-id="${button.dataset.id}"]`).value;
        if (!value) return alert('Seleccione un resultado válido.');
        const [local, visitante] = value.split('-').map(Number);
        DataManager.updateMatchResult(button.dataset.id, local, visitante);
        initResultadosView();
    }));
}
