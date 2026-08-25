import { DataManager } from '../data/dataManager.js';
import { PosicionesService } from './standings.js';

const winnerOf = match => match.setsLocal > match.setsVisitante ? match.equipoLocalId : match.equipoVisitanteId;

export const PlayoffsService = {
    generarSemifinales(torneoId, categoriaId) {
        const standings = PosicionesService.calcularPosiciones(torneoId, categoriaId);
        if (standings.length < 4) throw new Error('Se necesitan al menos cuatro equipos en la clasificación general.');
        const existing = DataManager.getMatchesByTournamentAndCategory(torneoId, categoriaId).filter(match => match.tipo === 'semifinal');
        if (existing.length) throw new Error('Las semifinales ya fueron generadas para esta categoría.');
        const dates = DataManager.getCalendarDates(torneoId);
        if (!dates.length) throw new Error('Defina el período del torneo antes de generar eliminatorias.');
        const date = dates[dates.length - 1];
        const [first, second, third, fourth] = standings;
        DataManager.addMatches([
            {
                torneoId, categoriaId, zonaId: null, tipo: 'semifinal', nombreEtapa: 'Semifinal 1',
                equipoLocalId: first.id, equipoVisitanteId: fourth.id,
                fecha: date, hora: '18:00', cancha: 'Cancha 1', estado: 'pendiente', confirmado: true, setsLocal: null, setsVisitante: null
            },
            {
                torneoId, categoriaId, zonaId: null, tipo: 'semifinal', nombreEtapa: 'Semifinal 2',
                equipoLocalId: second.id, equipoVisitanteId: third.id,
                fecha: date, hora: '19:00', cancha: 'Cancha 2', estado: 'pendiente', confirmado: true, setsLocal: null, setsVisitante: null
            }
        ]);
        return { first, second, third, fourth, date };
    },

    generarFinal(torneoId, categoriaId) {
        const matches = DataManager.getMatchesByTournamentAndCategory(torneoId, categoriaId);
        if (matches.some(match => match.tipo === 'final')) throw new Error('La final ya fue generada para esta categoría.');
        const semifinals = matches.filter(match => match.tipo === 'semifinal');
        if (semifinals.length !== 2 || semifinals.some(match => match.estado !== 'finalizado')) throw new Error('Registre los resultados de las dos semifinales antes de generar la final.');
        const dates = DataManager.getCalendarDates(torneoId);
        if (!dates.length) throw new Error('Defina el período del torneo antes de generar eliminatorias.');
        DataManager.addMatches([{
            torneoId, categoriaId, zonaId: null, tipo: 'final', nombreEtapa: 'Final',
            equipoLocalId: winnerOf(semifinals[0]), equipoVisitanteId: winnerOf(semifinals[1]),
            fecha: dates[dates.length - 1], hora: '20:00', cancha: 'Cancha 1', estado: 'pendiente', confirmado: true, setsLocal: null, setsVisitante: null
        }]);
    }
};
