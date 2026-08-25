import { DataManager } from '../data/dataManager.js';

export const initZonasView = () => {
    const categoria = DataManager.getCurrentCategory();
    if (!categoria) {
        alert("Seleccione una categoría primero");
        return;
    }

    const zones = DataManager.getZonesByCategory(categoria);
    const equipos = DataManager.getTeamsByCategory(categoria);

    let html = `
    <div class="view-section" id="view-zonas">
        <div class="container">
            <h2>Zonas - Categoría +${categoria}</h2>
            
            <div class="form-group">
                <input type="text" id="zona-nombre" placeholder="Nombre de zona" required />
                <button class="btn-primary" onclick="createZone()">Crear Zona</button>
            </div>

            ${zones.length > 0 ? `
                <div class="zonas-list">
                    ${zones.map(z => `
                        <div class="tarjeta zona-card" data-id="${z.id}">
                            <h3>${z.nombre}</h3>
                            <p>Equipos: ${z.equipos ? z.equipos.length : 0}</p>
                            <button class="btn-ver btn-small" data-id="${z.id}">Ver</button>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <p>Aún no hay zonas en esta categoría.</p>
            `}

            <button class="btn-primary" onclick="openCreateZone()">+ Nueva Zona</button>
        </div>
    </div>`;

    document.getElementById('app').innerHTML = html;

    // Manejar ver zona
    document.querySelectorAll('.btn-ver').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const zona = DataManager.getZonesByCategory(categoria).find(z => z.id === id);
            if (zona) {
                // Show teams in this zone
                const zonaEquipos = equipos.filter(e => e.zonaId === zona.id);
                let equiposHtml = `<p>Equipos en ${zona.nombre}:</p><ul>`;
                zonaEquipos.forEach(e => {
                    equiposHtml += `<li>${e.nombre}</li>`;
                });
                equiposHtml += `</ul><button onclick="initZonasView()">Volver</button>`;
                document.getElementById('app').innerHTML = equiposHtml;
            }
        });
    });

    window.createZone = () => {
        const nombre = document.getElementById('zona-nombre').value;
        if (!nombre) {
            alert("Ingrese un nombre de zona");
            return;
        }
        DataManager.createZone(nombre, categoria);
        closeCreateZone();
        initZonasView();
    };
};

const openCreateZone = () => {
    document.getElementById('modal-create-zone').style.display = 'block';
};

const closeCreateZone = () => {
    document.getElementById('modal-create-zone').style.display = 'none';
};