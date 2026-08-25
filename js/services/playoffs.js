import { DataManager } from '../data/dataManager.js';
import { PosicionesService } from './standings.js';

const winnerOf = match => match.setsLocal > match.setsVisitante ? match.equipoLocalId : match.equipoVisitanteId;
const playoffMinutesFromTime = time => {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
};
const playoffTimeFromMinutes = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export const PlayoffsService = {
    generarSemifinales(torneoId, categoriaId) {
        const standings = PosicionesService.calcularPosiciones(torneoId, categoriaId);
        if (standings.length < 4) throw new Error('Se necesitan al menos cuatro equipos en la clasificación general.');
        const existing = DataManager.getMatchesByTournamentAndCategory(torneoId, categoriaId).filter(match => match.tipo === 'semifinal');
        if (existing.length) throw new Error('Las semifinales ya fueron generadas para esta categoría.');
        const day = DataManager.getDaySchedules(torneoId).at(-1);
        if (!day) throw new Error('Defina el período del torneo antes de generar eliminatorias.');
        const start = playoffMinutesFromTime(day.inicio);
        if (start + 120 > playoffMinutesFromTime(day.fin)) throw new Error('El último día no tiene dos horas disponibles para las semifinales.');
        const secondCourt = DataManager.getTournamentCourtCount(torneoId) > 1 ? 'Cancha 2' : 'Cancha 1';
        const [first, second, third, fourth] = standings;
        DataManager.addMatches([
            {
                torneoId, categoriaId, zonaId: null, tipo: 'semifinal', nombreEtapa: 'Semifinal 1',
                equipoLocalId: first.id, equipoVisitanteId: fourth.id,
                fecha: day.fecha, hora: playoffTimeFromMinutes(start), cancha: 'Cancha 1', estado: 'pendiente', confirmado: true, setsLocal: null, setsVisitante: null
            },
            {
                torneoId, categoriaId, zonaId: null, tipo: 'semifinal', nombreEtapa: 'Semifinal 2',
                equipoLocalId: second.id, equipoVisitanteId: third.id,
                fecha: day.fecha, hora: playoffTimeFromMinutes(start + 60), cancha: secondCourt, estado: 'pendiente', confirmado: true, setsLocal: null, setsVisitante: null
            }
        ]);
        return { first, second, third, fourth, date: day.fecha };
    },

    generarFinal(torneoId, categoriaId) {
        const matches = DataManager.getMatchesByTournamentAndCategory(torneoId, categoriaId);
        if (matches.some(match => match.tipo === 'final')) throw new Error('La final ya fue generada para esta categoría.');
        const semifinals = matches.filter(match => match.tipo === 'semifinal');
        if (semifinals.length !== 2 || semifinals.some(match => match.estado !== 'finalizado')) throw new Error('Registre los resultados de las dos semifinales antes de generar la final.');
        const day = DataManager.getDaySchedules(torneoId).at(-1);
        if (!day) throw new Error('Defina el período del torneo antes de generar eliminatorias.');
        const finalStart = playoffMinutesFromTime(day.inicio) + 120;
        if (finalStart + 60 > playoffMinutesFromTime(day.fin)) throw new Error('El último día no tiene una hora disponible para la final.');
        DataManager.addMatches([{
            torneoId, categoriaId, zonaId: null, tipo: 'final', nombreEtapa: 'Final',
            equipoLocalId: winnerOf(semifinals[0]), equipoVisitanteId: winnerOf(semifinals[1]),
            fecha: day.fecha, hora: playoffTimeFromMinutes(finalStart), cancha: 'Cancha 1', estado: 'pendiente', confirmado: true, setsLocal: null, setsVisitante: null
        }]);
    }
};
