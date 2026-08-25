import { AppState } from '../core/state.js';
import { DataManager } from '../data/dataManager.js';

const isOfficialMatch = match => match.confirmado || ['pendiente', 'programado', 'finalizado'].includes(match.estado);

export function initResultadosView() {
    let tournamentId;
    try { tournamentId = AppState.getTournament(); } catch { tournamentId = null; }
    const list = document.getElementById('resultados-list');
    const categoryId = AppState.getCategory();
    if (!tournamentId || !categoryId) { list.innerHTML = '<p>Seleccione un torneo y una categoría desde Equipos.</p>'; return; }
    const category = DataManager.getCategory(categoryId);
    const teams = DataManager.getTeamsByTournamentAndCategory(tournamentId, categoryId);
    const zones = DataManager.getZonesByTournamentAndCategory(tournamentId, categoryId);
    const matches = DataManager.getMatchesByTournamentAndCategory(tournamentId, categoryId).filter(isOfficialMatch);
    const team = id => teams.find(item => item.id === id)?.nombre || 'Equipo';
    const zone = id => zones.find(item => item.id === id)?.nombre || 'Sin zona';
    const options = (match) => [['2-0', `${team(match.equipoLocalId)} 2-0`], ['2-1', `${team(match.equipoLocalId)} 2-1`], ['0-2', `${team(match.equipoVisitanteId)} 2-0`], ['1-2', `${team(match.equipoVisitanteId)} 2-1`]]
        .map(([value, label]) => `<option value="${value}" ${value === `${match.setsLocal}-${match.setsVisitante}` ? 'selected' : ''}>${label}</option>`).join('');
    list.innerHTML = matches.length ? matches.map(match => {
        const finished = match.estado === 'finalizado';
        return `<article class="card"><strong>${finished ? 'FINALIZADO' : 'PENDIENTE'}</strong><p>${category.nombre} · ${zone(match.zonaId)}</p><h3>${team(match.equipoLocalId)} vs ${team(match.equipoVisitanteId)}</h3><p>${match.fecha ? `${match.fecha} · ${match.hora} · ${match.cancha}` : 'Aún sin programación'}</p>${finished ? `<p>Resultado actual: ${match.setsLocal}-${match.setsVisitante}</p>` : ''}<select class="resultado-select" data-id="${match.id}"><option value="">Seleccione resultado...</option>${options(match)}</select><button class="guardar-resultado btn-primary" data-id="${match.id}">${finished ? 'Editar resultado' : 'Registrar resultado'}</button></article>`;
    }).join('') : '<p>No hay partidos confirmados para esta categoría. Confirme los emparejamientos desde Programación.</p>';
    document.querySelectorAll('.guardar-resultado').forEach(button => button.addEventListener('click', () => {
        const value = document.querySelector(`.resultado-select[data-id="${button.dataset.id}"]`).value;
        if (!value) return alert('Seleccione un resultado válido.');
        const [local, visitante] = value.split('-').map(Number);
        try { DataManager.updateMatchResult(button.dataset.id, local, visitante); initResultadosView(); } catch (error) { alert(error.message); }
    }));
}
