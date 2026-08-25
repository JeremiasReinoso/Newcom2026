import { PosicionesService } from './standings.js';
import { CalendarRepo } from '../data/calendarRepo.js';
import { AppState } from '../core/state.js';

export const PlayoffsService = {
    generar: async () => {
        const posiciones = await PosicionesService.calcular();
        const fechasObj = await CalendarRepo.obtenerPorTorneo();
        
        if (!fechasObj || fechasObj.length === 0) {
            throw new Error("Falta configurar el calendario.");
        }

        const fechasOrdenadas = fechasObj.map(f => f.fecha).sort();
        const ultimoDia = fechasOrdenadas[fechasOrdenadas.length - 1];
        
        const zonasIds = [...new Set(posiciones.map(p => p.zona_id))];
        if (zonasIds.length < 2) {
            throw new Error("Se necesitan al menos 2 zonas.");
        }

        const zonaA = posiciones.filter(p => p.zona_id === zonasIds[0]).slice(0, 2);
        const zonaB = posiciones.filter(p => p.zona_id === zonasIds[1]).slice(0, 2);

        if (zonaA.length < 2 || zonaB.length < 2) {
            throw new Error("Faltan equipos para armar las semifinales.");
        }

        const torneoId = AppState.getTournament();
        const categoriaId = AppState.getCategory();

        return [
            {
                torneo_id: torneoId,
                categoria_id: categoriaId,
                zona_id: null,
                tipo: 'semifinal',
                equipo_local_id: zonaA[0].id,
                equipo_visitante_id: zonaB[1].id,
                local_nombre: zonaA[0].nombre,
                visitante_nombre: zonaB[1].nombre,
                zona_nombre: 'Semifinal 1',
                fecha: ultimoDia,
                hora: '10:00',
                cancha: 'Cancha 1',
                estado: 'pendiente'
            },
            {
                torneo_id: torneoId,
                categoria_id: categoriaId,
                zona_id: null,
                tipo: 'semifinal',
                equipo_local_id: zonaB[0].id,
                equipo_visitante_id: zonaA[1].id,
                local_nombre: zonaB[0].nombre,
                visitante_nombre: zonaA[1].nombre,
                zona_nombre: 'Semifinal 2',
                fecha: ultimoDia,
                hora: '11:00',
                cancha: 'Cancha 2',
                estado: 'pendiente'
            }
        ];
    }
};
