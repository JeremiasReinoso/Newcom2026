import { DataManager } from '../data/dataManager.js';

export const PosicionesService = {
    calcularPosiciones: () => {
        const torneo = DataManager.getCurrentTournament();
        if (!torneo) return [];

        const categoriaId = DataManager.getCurrentCategory();
        if (!categoriaId) return [];

        const matches = DataManager.getMatchesByTournament(torneo.id).filter(
            m => m.estado === 'finalizado' && m.categoriaId === categoriaId
        );

        const equipos = DataManager.getTeamsByCategory(categoriaId);
        const standings = {};

        equipos.forEach(t => {
            standings[t.id] = {
                equipoId: t.id,
                nombre: t.nombre,
                zonaId: t.zonaId,
                jugados: 0,
                ganados: 0,
                perdidos: 0,
                puntos: 0
            };
        });

        matches.forEach(m => {
            const local = standings[m.equipoLocalId];
            const visitante = standings[m.equipoVisitanteId];
            if (!local || !visitante) return;

            local.jugados++;
            visitante.jugados++;

            if (m.setsLocal === 2 && m.setsVisitante === 0) {
                local.ganados++; local.puntos += 3;
                visitante.perdidos++;
            } else if (m.setsLocal === 2 && m.setsVisitante === 1) {
                local.ganados++; local.puntos += 2;
                visitante.perdidos++;
            } else if (m.setsLocal === 0 && m.setsVisitante === 2) {
                visitante.ganados++; visitante.puntos += 3;
                local.perdidos++;
            } else if (m.setsLocal === 1 && m.setsVisitante === 2) {
                visitante.ganados++; visitante.puntos += 2;
                local.perdidos++;
            }
        });

        return Object.values(standings)
            .sort((a, b) => b.puntos - a.puntos || b.ganados - a.ganados);
    }
};