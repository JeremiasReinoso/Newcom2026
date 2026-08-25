import { DataManager } from '../data/dataManager.js';

export const initStandingsView = () => {
    const torneo = DataManager.getCurrentTournament();
    if (!torneo) {
        alert("No hay torneo activo");
        return;
    }

    const categoriaId = DataManager.getCurrentCategory();
    if (!categoriaId) {
        alert("Seleccione una categoría primero");
        return;
    }

    const posiciones = PosicionesService.calcularPosiciones();

    let html = `
    <div class="view-section" id="view-posiciones">
        <div class="container">
            <h2>Posiciones - ${torneo.nombre}</h2>
            
            ${posiciones.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Equipo</th>
                            <th>Zona</th>
                            <th>PJ</th>
                            <th>PG</th>
                            <th>PP</th>
                            <th>Puntos</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${posiciones.map(p => `
                            <tr>
                                <td>${p.nombre}</td>
                                <td>${p.zonaId ? 'Zona ' + p.zonaId : '—'}</td>
                                <td>${p.jugados}</td>
                                <td>${p.ganados}</td>
                                <td>${p.perdidos}</td>
                                <td>${p.puntos}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : `
                <p>Aún no hay resultados cargados. Genere la programación y cargue resultados.</p>
            `}

            <button class="btn-primary" onclick="initScheduleView()">Volver a Programación</button>
        </div>
    </div>`;

    document.getElementById('app').innerHTML = html;
};