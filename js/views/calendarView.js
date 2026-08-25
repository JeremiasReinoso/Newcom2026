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
    const period = DataManager.getTournamentPeriod(tournamentId);
    const dates = DataManager.getCalendarDates(tournamentId);
    controls.innerHTML = `
        <p>Defina el período completo del torneo. La programación sólo podrá utilizar los días comprendidos entre ambas fechas.</p>
        <label>Fecha de inicio <input id="fecha-inicio" type="date" value="${period?.startDate || ''}"></label>
        <label>Fecha de finalización <input id="fecha-fin" type="date" value="${period?.endDate || ''}"></label>
        <button id="guardar-periodo" class="btn-primary">Guardar período</button>`;
    grid.innerHTML = dates.length
        ? `<p><strong>${dates.length} días disponibles:</strong></p>${dates.map(date => `<div class="calendar-day selected">${date}</div>`).join('')}`
        : '<p>Aún no hay período definido.</p>';
    document.getElementById('guardar-periodo').addEventListener('click', () => {
        try {
            DataManager.setTournamentPeriod(tournamentId, document.getElementById('fecha-inicio').value, document.getElementById('fecha-fin').value);
            initCalendarView();
        } catch (error) { alert(error.message); }
    });
    document.getElementById('btn-guardar-calendario').style.display = 'none';
}
