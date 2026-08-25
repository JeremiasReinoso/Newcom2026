import { AppState } from '../core/state.js';
import { DataManager } from '../data/dataManager.js';

export function initCalendarView() {
    let tournamentId;
    try { tournamentId = AppState.getTournament(); } catch { tournamentId = null; }
    const section = document.getElementById('view-calendario');
    const controls = section.querySelector('.panel-control');
    const grid = document.getElementById('calendario-grid');
    if (!tournamentId) {
        controls.innerHTML = '<p>Seleccione un torneo desde Torneos.</p>';
        grid.innerHTML = '';
        return;
    }
    const tournament = DataManager.getTournament(tournamentId);
    const period = DataManager.getTournamentPeriod(tournamentId);
    const defaultStart = tournament.horaInicio || '09:00';
    const defaultEnd = tournament.horaFin || '21:00';
    const daySchedules = DataManager.getDaySchedules(tournamentId);
    controls.innerHTML = `
        <p>Defina el período y el horario predeterminado. Luego puede cambiar libremente la franja de cada día.</p>
        <label>Fecha de inicio <input id="fecha-inicio" type="date" value="${period?.startDate || ''}"></label>
        <label>Fecha de finalización <input id="fecha-fin" type="date" value="${period?.endDate || ''}"></label>
        <label>Horario predeterminado: desde <input id="hora-inicio" type="time" value="${defaultStart}"></label>
        <label>hasta <input id="hora-fin" type="time" value="${defaultEnd}"></label>
        <button id="guardar-periodo" class="btn-primary">Guardar calendario y horarios</button>`;
    grid.innerHTML = daySchedules.length ? `
        <p><strong>Disponibilidad por día</strong></p>
        ${daySchedules.map(({ fecha, inicio, fin }) => `<article class="card"><strong>${fecha}</strong><label> Desde <input class="horario-dia-inicio" data-fecha="${fecha}" type="time" value="${inicio}"></label><label> Hasta <input class="horario-dia-fin" data-fecha="${fecha}" type="time" value="${fin}"></label></article>`).join('')}`
        : '<p>Guarde el período para configurar los horarios particulares de cada día.</p>';
    document.getElementById('guardar-periodo').addEventListener('click', () => {
        const schedules = daySchedules.map(({ fecha }) => ({
            fecha,
            inicio: document.querySelector(`.horario-dia-inicio[data-fecha="${fecha}"]`)?.value,
            fin: document.querySelector(`.horario-dia-fin[data-fecha="${fecha}"]`)?.value
        })).filter(schedule => schedule.inicio && schedule.fin);
        try {
            DataManager.setTournamentCalendar(
                tournamentId,
                document.getElementById('fecha-inicio').value,
                document.getElementById('fecha-fin').value,
                document.getElementById('hora-inicio').value,
                document.getElementById('hora-fin').value,
                schedules
            );
            initCalendarView();
        } catch (error) { alert(error.message); }
    });
    document.getElementById('btn-guardar-calendario').style.display = 'none';
}
