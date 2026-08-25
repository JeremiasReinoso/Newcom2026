import { AppState } from '../core/state.js';
import { DataManager } from '../data/dataManager.js';
import { SchedulerService } from '../services/scheduler.js';

export const initScheduleView = () => {
    let tournamentId;
    try { tournamentId = AppState.getTournament(); } catch { tournamentId = null; }
    const box = document.getElementById('programacion-list');
    const controls = document.querySelector('#view-programacion .panel-control');
    const categoryId = AppState.getCategory();
    if (!tournamentId || !categoryId) {
        controls.innerHTML = '<p>Seleccione un torneo y una categoría desde Equipos.</p>'; box.innerHTML = '';
        return;
    }
    const tournament = DataManager.getTournament(tournamentId);
    const category = DataManager.getCategory(categoryId);
    const teams = DataManager.getTeamsByTournamentAndCategory(tournamentId, categoryId);
    const zones = DataManager.getZonesByTournamentAndCategory(tournamentId, categoryId);
    const matches = DataManager.getMatchesByTournamentAndCategory(tournamentId, categoryId);
    const paired = matches.filter(match => match.estado === 'emparejado');
    const scheduled = matches.filter(match => match.estado === 'programado' || match.estado === 'finalizado');
    const teamName = id => teams.find(team => team.id === id)?.nombre || 'Equipo eliminado';
    const zoneName = id => zones.find(zone => zone.id === id)?.nombre || 'Sin zona';
    controls.innerHTML = `
        <h3>${tournament.nombre} · ${category.nombre}</h3>
        <p>${tournament.partidos_asegurados} partidos asegurados por equipo. ${teams.length} equipos en ${zones.length} zonas.</p>
        <button id="btn-generar-emparejamientos" class="btn-primary">1. Calcular emparejamientos</button>
        <button id="btn-programar-emparejamientos" class="btn-primary">2. Programar emparejamientos</button>`;
    const pairingHtml = paired.length ? paired.map(match => `<li>${zoneName(match.zonaId)} · ${teamName(match.equipoLocalId)} vs ${teamName(match.equipoVisitanteId)}</li>`).join('') : '<li>Sin emparejamientos pendientes.</li>';
    const scheduleHtml = scheduled.length ? scheduled.map(match => `<article class="card"><strong>${match.fecha} · ${match.hora} · ${match.cancha}</strong><p>${zoneName(match.zonaId)}</p><p>${teamName(match.equipoLocalId)} vs ${teamName(match.equipoVisitanteId)}</p>${match.estado === 'finalizado' ? `<p>Resultado: ${match.setsLocal}-${match.setsVisitante}</p>` : ''}</article>`).join('') : '<p>Sin partidos programados.</p>';
    box.innerHTML = `<h3>Emparejamientos (quién juega contra quién)</h3><ul>${pairingHtml}</ul><h3>Fixture programado (cuándo y dónde)</h3>${scheduleHtml}`;
    document.getElementById('btn-generar-emparejamientos').addEventListener('click', () => {
        try {
            const created = SchedulerService.generarEmparejamientos(tournamentId, categoryId);
            const check = SchedulerService.verificarPartidosAsegurados(tournamentId, categoryId);
            alert(`${created} emparejamientos creados. ${check.mensaje}`);
            initScheduleView();
        } catch (error) { alert(error.message); }
    });
    document.getElementById('btn-programar-emparejamientos').addEventListener('click', () => {
        try { alert(`${SchedulerService.programarEmparejamientos(tournamentId, categoryId)} partidos programados.`); initScheduleView(); } catch (error) { alert(error.message); }
    });
};
