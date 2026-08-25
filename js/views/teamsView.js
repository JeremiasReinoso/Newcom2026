import { DataManager } from '../data/dataManager.js';

export const initTeamsView = () => {
    const categoria = DataManager.getCurrentCategory();
    if (!categoria) {
        alert("Seleccione una categoría primero");
        return;
    }

    const equipos = DataManager.getTeamsByCategory(categoria);

    let html = `
    <div class="view-section" id="view-equipos">
        <div class="container">
            <h2>Equipos - Categoría +${categoria}</h2>
            
            <div class="form-group">
                <input type="text" id="equipo-nombre" placeholder="Nombre del equipo" required />
                <button class="btn-primary" onclick="createTeam()">Agregar Equipo</button>
            </div>

            ${equipos.length > 0 ? `
                <div class="equipos-list">
                    ${equipos.map(e => `
                        <div class="tarjeta equipo-card" data-id="${e.id}">
                            <div class="equipo-info">
                                <span>${e.nombre}</span>
                                <span class="zona-badge" id="zona-eq-${e.id}">Sin zona</span>
                            </div>
                            <button class="btn-zone btn-small" onclick="assignZone('${e.id}')">Asignar Zona</button>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <p>Aún no hay equipos en esta categoría.</p>
            `}

            <button class="btn-primary" onclick="openCreateTeam()">+ Nuevo Equipo</button>
        </div>
    </div>`;

    document.getElementById('app').innerHTML = html;

    // Actualizar badges de zona
    equipos.forEach(e => {
        const zona = DataManager.getZonesByCategory(categoria).find(z => z.id === e.zonaId);
        const badge = document.getElementById(`zona-eq-${e.id}`);
        if (badge) {
            badge.textContent = zona ? zona.nombre : "Sin zona";
        }
    });

    // Manejar asignar zona
    window.assignZone = (equipoId) => {
        const zones = DataManager.getZonesByCategory(categoria);
        if (zones.length === 0) {
            alert("Primero debe crear una zona");
            return;
        }
        if (zones.length === 1) {
            DataManager.assignTeamToZone(equipoId, zones[0].id);
            initTeamsView();
            return;
        }
        // Show zone selection
        let htmlZone = `<h3>Seleccionar zona para ${equipos.find(e => e.id === equipoId).nombre}</h3>`;
        htmlZone += `<div class="zones-selector">`;
        zones.forEach(z => {
            htmlZone += `<label><input type="radio" name="zone-select" value="${z.id}" /> ${z.nombre}</label><br>`;
        });
        htmlZone += `</div>`;
        htmlZone += `<button class="btn-primary" onclick="confirmAssignZone('${equipoId}')">Confirmar</button>`;
        htmlZone += `<button class="btn-cancelar" onclick="hideZoneSelector()">Cancelar</button>`;
        
        // This is a simplified approach - in a real app we'd use a proper modal
        document.body.innerHTML = htmlZone + '<button onclick="initTeamsView()">Volver</button>';
        confirmAssignZone = (eid) => {
            const radio = document.querySelector('input[name="zone-select"]:checked');
            if (radio) {
                DataManager.assignTeamToZone(eid, radio.value);
                initTeamsView();
            }
        };
    };
};

const createTeam = () => {
    const nombre = document.getElementById('equipo-nombre').value;
    if (!nombre) {
        alert("Ingrese un nombre de equipo");
        return;
    }
    DataManager.createTeam(nombre, DataManager.getCurrentCategory(), DataManager.getCurrentTournament().id);
    closeCreateTeam();
    initTeamsView();
};

const openCreateTeam = () => {
    document.getElementById('modal-create-team').style.display = 'block';
};

const closeCreateTeam = () => {
    document.getElementById('modal-create-team').style.display = 'none';
};