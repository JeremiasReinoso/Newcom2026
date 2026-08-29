import { AppState } from '../core/state.js';
import { DataManager } from '../data/dataManager.js';

export const initTorneosVer = () => {
    const container = document.getElementById('torneos-list');
    const tournaments = DataManager.getTournaments();
    container.innerHTML = tournaments.length ? tournaments.map(tournament => `
        <article class="card torneo-card">
            <h3>${tournament.nombre}</h3>
            <p>${tournament.partidos_asegurados} partidos asegurados por equipo</p>
            <button class="btn-primary seleccionar-torneo" data-id="${tournament.id}">Seleccionar torneo</button>
        </article>`).join('') : '<p>No hay torneos creados todavía.</p>';

    container.querySelectorAll('.seleccionar-torneo').forEach(button => button.addEventListener('click', () => {
        AppState.setTournament(button.dataset.id);
        const categories = DataManager.getCategoriesByTournament(button.dataset.id);
        if (categories.length) AppState.setCategory(categories[0].id);
        document.getElementById('btn-nav-equipos').click();
    }));

    const create = () => {
        const name = prompt('Nombre del torneo:');
        if (!name?.trim()) return;
        const assured = Number(prompt('Partidos asegurados por equipo:', '4'));
        if (!Number.isInteger(assured) || assured < 1) return alert('Ingrese un número entero mayor que cero.');
        const tournament = DataManager.createTournament(name, assured);
        AppState.setTournament(tournament.id);
        initTorneosVer();
    };
    const button = document.getElementById('btn-nuevo-torneo');
    button.replaceWith(button.cloneNode(true));
    document.getElementById('btn-nuevo-torneo').addEventListener('click', create);
};
