import { DataManager } from '../data/dataManager.js';

export const initScheduleView = () => {
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

    const zones = DataManager.getZonesByCategory(categoriaId);
    const equipos = DataManager.getTeamsByCategory(categoriaId);

    let html = `
    <div class="view-section" id="view-programacion">
        <div class="container">
            <h2>Programación - ${torneo.nombre}</h2>
            
            <div-card>
                <h3>Configuración</h3>
                <p>Partidos asegurados por equipo: ${torneo.partidos_asegurados}</p>
                <p>Total de equipos: ${equipos.length}</p>
                <p>Total de zonas: ${zones.length}</p>
            </div-card>

            ${zones.length === 0 ? `
                <p>Primero debe crear al menos una zona.</p>
                <button class="btn-primary" onclick="openCreateZone()">Crear Zona</button>
            ` : `
                <div class="programacion-area">
                    <button class="btn-primary" onclick="generarProgramacion()">Generar Programación</button>
                    <p id="programacion-estado" style="margin-top:10px; color: #666;"></p>
                </div>
            `}

            ${DataManager.getMatchesByTournament(torneo.id).length > 0 ? `
                <div class="resultados-area" style="margin-top: 20px;">
                    <h3>Partidos Generados</h3>
                    <div id="lista-partidos"></div>
                </div>
            ` : ''}
        </div>
    </div>`;

    document.getElementById('app').innerHTML = html;

    // Cargar partidos existentes si los hay
    const existingMatches = DataManager.getMatchesByTournament(torneo.id);
    if (existingMatches.length > 0) {
        document.getElementById('lista-partidos').innerHTML = existingMatches.map(m => `
            <div class="tarjeta partido-card">
                <h4>${m.zonaNombre || 'Zona'} - ${equipos.find(e => e.id === m.equipoLocalId)?.nombre} vs ${equipos.find(e => e.id === m.equipoVisitanteId)?.nombre}</h4>
                <p>Estado: ${m.estado}</p>
                ${m.estado === 'finalizado' ? `
                    <p>Sets: ${m.setsLocal} - ${m.setsVisitante}</p>
                ` : `
                    <button class="btn-resultado" onclick="cargarResultado('${m.id}')">Cargar Resultado</button>
                `}
            </div>
        `).join('');
    }
};

window.generarProgramacion = () => {
    try {
        SchedulerService.generarPartidos();
        initScheduleView();
    } catch (e) {
        alert(e.message);
    }
};

window.cargarResultado = (matchId) => {
    const setsLocal = parseInt(prompt("Sets local (0, 1 o 2):"));
    const setsVisitante = parseInt(prompt("Sets visitante (0, 1 o 2):"));
    
    if (isNaN(setsLocal) || isNaN(setsVisitante)) {
        alert("Ingrese valores válidos");
        return;
    }

    DataManager.updateMatchResult(matchId, setsLocal, setsVisitante);
    initScheduleView();
};