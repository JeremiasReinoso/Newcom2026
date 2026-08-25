import { PlayoffsService } from '../services/playoffs.js';
import { MatchRepo } from '../data/matchRepo.js';

const contenedor = document.getElementById('eliminatorias-list');

export async function initPlayoffsView() {
    await cargarCruces();
    configurarEventos();
}

async function cargarCruces() {
    contenedor.innerHTML = '<p>Cargando eliminatorias...</p>';

    try {
        const partidos = await MatchRepo.obtenerPorTorneo();
        const cruces = partidos.filter(partido => partido.tipo !== 'grupo');
        renderizar(cruces);
    } catch (error) {
        contenedor.innerHTML = '<p>No hay eliminatorias generadas.</p>';
    }
}

function renderizar(cruces) {
    if (!cruces.length) {
        contenedor.innerHTML = '<p>No hay cruces generados.</p>';
        return;
    }

    contenedor.innerHTML = cruces.map(cruce => `
        <div class="card">
            <p><strong>${cruce.zona_nombre}</strong></p>
            <h4>${cruce.local_nombre} vs ${cruce.visitante_nombre}</h4>
            <p>${cruce.fecha} · ${cruce.hora} · ${cruce.cancha}</p>
        </div>
    `).join('');
}

function configurarEventos() {
    const btnActual = document.getElementById('btn-generar-eliminatorias');
    const botonLimpio = btnActual.cloneNode(true);
    btnActual.replaceWith(botonLimpio);

    botonLimpio.addEventListener('click', async () => {
        try {
            botonLimpio.disabled = true;
            botonLimpio.textContent = 'Generando...';
            const cruces = await PlayoffsService.generar();
            await MatchRepo.agregarMultiples(cruces);
            await cargarCruces();
        } catch (error) {
            alert(error.message);
        } finally {
            botonLimpio.disabled = false;
            botonLimpio.textContent = 'Generar Cruces';
        }
    });
}
