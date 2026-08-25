import { DataManager } from '../data/dataManager.js';

export const PosicionesService = {
    calcularPosiciones(torneoId, categoriaId) {
        const teams = DataManager.getTeamsByTournamentAndCategory(torneoId, categoriaId);
        const rows = new Map(teams.map(team => [team.id, { ...team, jugados: 0, ganados: 0, perdidos: 0, puntos: 0, setsFavor: 0, setsContra: 0, diferenciaSets: 0 }]));
        DataManager.getMatchesByTournamentAndCategory(torneoId, categoriaId)
            .filter(match => match.estado === 'finalizado')
            .forEach(match => {
                const local = rows.get(match.equipoLocalId); const visitante = rows.get(match.equipoVisitanteId);
                if (!local || !visitante) return;
                local.jugados += 1; visitante.jugados += 1;
                local.setsFavor += match.setsLocal; local.setsContra += match.setsVisitante;
                visitante.setsFavor += match.setsVisitante; visitante.setsContra += match.setsLocal;
                const localWon = match.setsLocal > match.setsVisitante;
                const winner = localWon ? local : visitante;
                const loser = localWon ? visitante : local;
                winner.ganados += 1; loser.perdidos += 1;
                winner.puntos += (Math.max(match.setsLocal, match.setsVisitante) === 2 && Math.min(match.setsLocal, match.setsVisitante) === 0) ? 3 : 2;
                loser.puntos += 1;
            });
        return [...rows.values()]
            .map(row => ({ ...row, diferenciaSets: row.setsFavor - row.setsContra }))
            .sort((a, b) => b.puntos - a.puntos || b.ganados - a.ganados || b.diferenciaSets - a.diferenciaSets || a.nombre.localeCompare(b.nombre));
    }
};
