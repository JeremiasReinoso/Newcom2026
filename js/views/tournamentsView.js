import { DataManager } from '../data/dataManager.js';

export const initTorneosView = () => {
    const storage = DataManager._getStorage();
    const torneoActual = DataManager.getCurrentTournament();
    const torneos = storage.tournaments;

    let html = `
    <div class="view-section active" id="view-torneos">
        <div class="container">
            <h2>Mis Torneos</h2>
            
            ${torneos.length > 0 ? `
                <div class="torneos-list">
                    ${torneos.map(t => `
                        <div class="tarjeta torneo-card" data-id="${t.id}">
                            <h3>${t.nombre}</h3>
                            <p>Partidos asegurados: ${t.partidos_asegurados}</p>
                            <button class="btn-ver btn-small" data-id="${t.id}">Ver</button>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <p>No hay torneos creados.</p>
                <button class="btn-primary" onclick="openCreateTorneo()">Crear Nuevo Torneo</button>
            `}

            <button class="btn-primary" onclick="openCreateTorneo()">+ Crear Torneo</button>
        </div>
    </div>

    <div id="modal-create-torneo" class="modal">
        <div class="modal-content">
            <h3>Crear Nuevo Torneo</h3>
            <input type="text" id="torneo-nombre" placeholder="Nombre del torneo" required />
            <input type="number" id="torneo-partidos" placeholder="Partidos asegurados" min="1" required />
            <div class="actions">
                <button class="btn-cancelar" onclick="closeCreateTorneo()">Cancelar</button>
                <button class="btn-primary" onclick="saveNewTorneo()">Crear</button>
            </div>
        </div>
    </div>`;

    document.getElementById('app').innerHTML = html;

    // Manejar ver torneo
    document.querySelectorAll('.btn-ver').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            DataManager.setCurrentTournament(id);
            initCategoriasView();
        });
    });
};

const openCreateTorneo = () => {
    document.getElementById('modal-create-torneo').style.display = 'block';
};

const closeCreateTorneo = () => {
    document.getElementById('modal-create-torneo').style.display = 'none';
};

const saveNewTorneo = () => {
    const nombre = document.getElementById('torneo-nombre').value;
    const partidos = parseInt(document.getElementById('torneo-partidos').value);

    if (!nombre || !partidos) {
        alert("Complete todos los campos");
        return;
    }

    const id = DataManager.createTournament(nombre, partidos);
    DataManager.setCurrentTournament(id);
    closeCreateTorneo();
    initCategoriasView();
};