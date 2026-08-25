import { CalendarRepo } from '../data/calendarRepo.js';

const grid = document.getElementById('calendario-grid');
const labelMes = document.getElementById('mes-actual-label');

let fechaActual = new Date();
let fechasSeleccionadas = new Set();

export async function initCalendarView() {
    await cargarFechas();
    renderizarMes();
    configurarEventos();
}

async function cargarFechas() {
    fechasSeleccionadas.clear();
    try {
        const guardadas = await CalendarRepo.obtenerPorTorneo();
        guardadas.forEach(g => fechasSeleccionadas.add(g.fecha));
    } catch (error) {
        console.error("Error al cargar fechas.");
    }
}

function renderizarMes() {
    grid.innerHTML = '';
    const año = fechaActual.getFullYear();
    const mes = fechaActual.getMonth();
    
    const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    labelMes.textContent = `${nombresMeses[mes]} ${año}`;

    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    
    for (let i = 0; i < primerDia.getDay(); i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day disabled';
        grid.appendChild(empty);
    }

    for (let i = 1; i <= ultimoDia.getDate(); i++) {
        const mesStr = String(mes + 1).padStart(2, '0');
        const diaStr = String(i).padStart(2, '0');
        const fechaStr = `${año}-${mesStr}-${diaStr}`;
        
        const div = document.createElement('div');
        div.className = 'calendar-day';
        div.textContent = i;
        
        if (fechasSeleccionadas.has(fechaStr)) {
            div.classList.add('selected');
        }

        div.addEventListener('click', () => {
            div.classList.toggle('selected');
            if (div.classList.contains('selected')) {
                fechasSeleccionadas.add(fechaStr);
            } else {
                fechasSeleccionadas.delete(fechaStr);
            }
        });

        grid.appendChild(div);
    }
}

function configurarEventos() {
    const btnAnt = document.getElementById('btn-mes-ant');
    const btnSig = document.getElementById('btn-mes-sig');
    const btnGuardar = document.getElementById('btn-guardar-calendario');

    btnAnt.replaceWith(btnAnt.cloneNode(true));
    btnSig.replaceWith(btnSig.cloneNode(true));
    btnGuardar.replaceWith(btnGuardar.cloneNode(true));

    document.getElementById('btn-mes-ant').addEventListener('click', () => {
        fechaActual.setMonth(fechaActual.getMonth() - 1);
        renderizarMes();
    });

    document.getElementById('btn-mes-sig').addEventListener('click', () => {
        fechaActual.setMonth(fechaActual.getMonth() + 1);
        renderizarMes();
    });

    document.getElementById('btn-guardar-calendario').addEventListener('click', async () => {
        if (fechasSeleccionadas.size === 0) {
            alert("Seleccione al menos un día.");
            return;
        }
        const arrayFechas = Array.from(fechasSeleccionadas).sort();
        await CalendarRepo.guardarFechas(arrayFechas);
        alert("Calendario guardado correctamente.");
    });
}
