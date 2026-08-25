import { AppState } from '../core/state.js';
import { DataManager } from '../data/dataManager.js';

export function initCalendarView() {
    let tournamentId;
    try { tournamentId = AppState.getTournament(); } catch { tournamentId = null; }
    const section = document.getElementById('view-calendario');
    if (!tournamentId) {
        section.querySelector('.panel-control').innerHTML = '<p>Seleccione un torneo desde Torneos.</p>';
        document.getElementById('calendario-grid').innerHTML = '';
        return;
    }
    const saved = DataManager.getCalendarDates(tournamentId);
    section.querySelector('.panel-control').innerHTML = `
        <p>Agregue todos los días de competencia. Si hay más de uno, el último se reserva para eliminatorias.</p>
        <input id="fecha-calendario" type="date"> <button id="agregar-fecha" class="btn-primary">Agregar día</button>`;
    document.getElementById('calendario-grid').innerHTML = saved.length
        ? saved.map(date => `<div class="calendar-day selected">${date} <button class="quitar-fecha" data-date="${date}" aria-label="Quitar ${date}">×</button></div>`).join('')
        : '<p>Aún no hay días seleccionados.</p>';
    document.getElementById('agregar-fecha').addEventListener('click', () => {
        const date = document.getElementById('fecha-calendario').value;
        if (!date) return alert('Seleccione una fecha.');
        DataManager.setCalendarDates(tournamentId, [...new Set([...saved, date])]);
        initCalendarView();
    });
    document.querySelectorAll('.quitar-fecha').forEach(button => button.addEventListener('click', () => {
        DataManager.setCalendarDates(tournamentId, saved.filter(date => date !== button.dataset.date));
        initCalendarView();
    }));
    const save = document.getElementById('btn-guardar-calendario');
    save.style.display = 'none';
}
