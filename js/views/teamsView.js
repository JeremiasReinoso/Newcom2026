import { AppState } from '../core/state.js';
import { DataManager } from '../data/dataManager.js';

const categoryTabs = (categories, activeId) => categories.map(category =>
    `<button class="nav-btn categoria-tab ${category.id === activeId ? 'active' : ''}" data-id="${category.id}">${category.nombre}</button>`).join('');

export const initEquiposView = () => {
    let tournamentId;
    try { tournamentId = AppState.getTournament(); } catch { tournamentId = null; }
    const selector = document.getElementById('selector-categorias');
    const panel = document.getElementById('panel-categoria-activa');
    const list = document.getElementById('equipos-list');
    if (!tournamentId) {
        selector.innerHTML = '<p>Seleccione un torneo desde Torneos.</p>';
        panel.style.display = 'none';
        return;
    }
    const categories = DataManager.getCategoriesByTournament(tournamentId);
    let categoryId = AppState.getCategory();
    if (!categories.some(category => category.id === categoryId)) {
        categoryId = categories[0]?.id || null;
        if (categoryId) AppState.setCategory(categoryId);
    }
    selector.innerHTML = categories.length ? categoryTabs(categories, categoryId) : '<p>Este torneo aún no tiene categorías.</p>';
    selector.querySelectorAll('.categoria-tab').forEach(tab => tab.addEventListener('click', () => {
        AppState.setCategory(tab.dataset.id);
        initEquiposView();
    }));
    panel.style.display = categoryId ? 'block' : 'none';
    if (categoryId) {
        const category = DataManager.getCategory(categoryId);
        const zones = DataManager.getZonesByTournamentAndCategory(tournamentId, categoryId);
        const teams = DataManager.getTeamsByTournamentAndCategory(tournamentId, categoryId);
        document.getElementById('titulo-categoria-activa').textContent = `Categoría: ${category.nombre}`;
        list.innerHTML = teams.length ? teams.map(team => {
            const zone = zones.find(item => item.id === team.zonaId);
            return `<article class="card"><strong>${team.nombre}</strong><p>${zone ? zone.nombre : 'Sin zona'}</p></article>`;
        }).join('') : '<p>No hay equipos en esta categoría.</p>';
    }

    const categoryButton = document.getElementById('btn-nueva-categoria');
    categoryButton.replaceWith(categoryButton.cloneNode(true));
    document.getElementById('btn-nueva-categoria').addEventListener('click', () => {
        const name = prompt('Nombre de categoría (ej.: +50, Femenino):');
        if (!name?.trim()) return;
        const category = DataManager.createCategory(name, tournamentId);
        AppState.setCategory(category.id);
        initEquiposView();
    });
    const teamButton = document.getElementById('btn-nuevo-equipo');
    teamButton.replaceWith(teamButton.cloneNode(true));
    document.getElementById('btn-nuevo-equipo').addEventListener('click', () => {
        if (!AppState.getCategory()) return;
        const name = prompt('Nombre del equipo:');
        if (!name?.trim()) return;
        DataManager.createTeam(name, AppState.getCategory(), tournamentId);
        initEquiposView();
    });
};
