import { MatchRepo } from '../data/matchRepo.js';

const contenedorResultados = document.getElementById('resultados-list');

export async function initResultadosView() {
    await cargarPartidos();
}

async function cargarPartidos() {
    contenedorResultados.innerHTML = '<p>Cargando partidos...</p>';
    try {
        const partidos = await MatchRepo.obtenerPorTorneo();
        renderizarPartidos(partidos);
    } catch (error) {
        contenedorResultados.innerHTML = '<p style="color:red;">Error al cargar resultados.</p>';
    }
}

function renderizarPartidos(partidos) {
    if (!partidos || partidos.length === 0) {
        contenedorResultados.innerHTML = '<p>No hay partidos programados. Vaya a Programación.</p>';
        return;
    }

    contenedorResultados.innerHTML = partidos.map(p => {
        if (p.estado === 'finalizado') {
            return `
                <div class="card" style="background: #e8f5e9;">
                    <p><strong>${p.fecha} - ${p.hora}</strong></p>
                    <p>${p.zona_nombre}</p>
                    <h4>${p.local_nombre} ${p.sets_local} - ${p.sets_visitante} ${p.visitante_nombre}</h4>
                    <p>Finalizado</p>
                </div>
            `;
        }

        return `
            <div class="card">
                <p><strong>${p.fecha} - ${p.hora}</strong></p>
                <p>${p.zona_nombre}</p>
                <h4 style="margin: 10px 0;">${p.local_nombre} vs ${p.visitante_nombre}</h4>
                
                <select id="res-${p.id}" style="width: 100%; padding: 10px; margin-bottom: 10px;">
                    <option value="">Seleccione resultado...</option>
                    <option value="2-0">Ganó ${p.local_nombre} (2-0)</option>
                    <option value="2-1">Ganó ${p.local_nombre} (2-1)</option>
                    <option value="0-2">Ganó ${p.visitante_nombre} (2-0)</option>
                    <option value="1-2">Ganó ${p.visitante_nombre} (2-1)</option>
                </select>
                
                <button class="btn-guardar-res btn-primary" data-id="${p.id}">Guardar</button>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.btn-guardar-res').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const partidoId = e.target.dataset.id;
            const select = document.getElementById(`res-${partidoId}`);
            const valor = select.value;

            if (!valor) {
                alert("Seleccione un resultado válido.");
                return;
            }

            const [setsLocal, setsVisitante] = valor.split('-').map(Number);

            try {
                e.target.disabled = true;
                e.target.textContent = "Guardando...";
                await MatchRepo.actualizarResultado(partidoId, setsLocal, setsVisitante);
                await cargarPartidos();
            } catch (error) {
                alert("Error al guardar el resultado.");
                e.target.disabled = false;
                e.target.textContent = "Guardar";
            }
        });
    });
}
