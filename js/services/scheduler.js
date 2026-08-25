import { DataManager } from './data/dataManager.js';

export const SchedulerService = {
    generarPartidos: () => {
        const torneo = DataManager.getCurrentTournament();
        if (!torneo) throw new Error("No hay torneo activo.");

        const torneoId = torneo.id;
        const asegurados = torneo.partidos_asegurados;
        const categoriaId = DataManager.getCurrentCategory();
        if (!categoriaId) throw new Error("Seleccione una categoría.");

        const zones = DataManager.getZonesByCategory(categoriaId);
        const allTeams = DataManager.getTeamsByCategory(categoriaId);

        // Group teams by zone
        const zoneTeams = {};
        zones.forEach(zona => {
            zoneTeams[zona.id] = allTeams.filter(t => t.zonaId === zona.id);
        });

        let totalGenerated = 0;
        let errorZonas = [];

        // For each zone, generate matches respecting the assured matches rule
        zones.forEach(zona => {
            const equiposZona = zoneTeams[zona.id] || [];
            const zonaNombre = zona.nombre;

            if (equiposZona.length < 2) {
                errorZonas.push(`${zonaNombre}: menos de 2 equipos`);
                return;
            }

            // Calculate how many matches each team needs to play
            // We need to generate enough matches so each team plays 'asegurados' matches
            // within their zone first, then if not possible, we note the issue

            // Generate round-robin within zone first
            const matchesGenerated = [];

            // Double round-robin: each team plays every other team twice (home/away concept not needed, just count)
            for (let i = 0; i < equiposZona.length; i++) {
                for (let j = i + 1; j < equiposZona.length; j++) {
                    // Check if we still need more matches for assured count
                    const teamAStats = SchedulerService._getTeamMatchCount(allTeams, equiposZona[i].id, tournamentId);
                    const teamBStats = SchedulerService._getTeamMatchCount(allTeams, equiposZona[j].id, tournamentId);

                    // Only generate if we haven't reached the assured count for both teams yet, 
                    // or if we need to generate more matches overall
                    matchesGenerated.push({
                        id: `match_${totalGenerated++}`,
                        equipoLocalId: equiposZona[i].id,
                        equipoVisitanteId: equiposZona[j].id,
                        zonaId: zona.id,
                        categoriaId,
                        torneoId,
                        zonaNombre,
                        fecha: null,
                        hora: null,
                        cancha: null,
                        estado: 'pendiente'
                    });
                }
            }

            // If we haven't generated enough matches for assured count, generate cross-zone matches within the limit
            // But the rule says: teams from different zones CANNOT face each other in initial phase
            // So we just generate within zone and check if assured count is met

            matchesGenerated.forEach(m => {
                DataManager.createMatch(
                    m.equipoLocalId,
                    m.equipoVisitanteId,
                    m.zonaId,
                    m.categoriaId,
                    m.torneoId
                );
            });
        });

        // Verify assured matches count
        const verification = SchedulerService.verificarPartesAseguradas();
        if (!verification.ok) {
            throw new Error(verification.mensaje);
        }

        return { success: true, message: `Generados ${matchesGenerated.length} partidos` };
    },

    _getTeamMatchCount: (allTeams, teamId, tournamentId) => {
        const matches = DataManager.getMatchesByTournament(tournamentId);
        let count = 0;
        matches.forEach(m => {
            if (m.estado === 'pendiente' || m.estado === 'programado') {
                if (m.equipoLocalId === teamId || m.equipoVisitanteId === teamId) {
                    count++;
                }
            }
        });
        return count;
    },

    verificarPartesAseguradas: () => {
        const torneo = DataManager.getCurrentTournament();
        if (!torneo) return { ok: false, mensaje: "No hay torneo activo" };

        const asegurados = torneo.partidos_asegurados;
        const categoriaId = DataManager.getCurrentCategory();
        if (!categoriaId) return { ok: false, mensaje: "No hay categoría activa" };

        const equipos = DataManager.getTeamsByCategory(categoriaId);
        
        for (const equipo of equipos) {
            const matches = DataManager.getMatchesByTournament(torneo.id).filter(m =>
                (m.equipoLocalId === equipo.id || m.equipoVisitanteId === equipo.id) &&
                m.estado !== 'finalizado'
            );
            if (matches.length < asegurados) {
                return {
                    ok: false,
                    mensaje: `Equipo ${equipo.nombre} solo ha jugado ${matches.length} de ${asegurados} partidos asegurados`
                };
            }
        }
        return { ok: true, mensaje: "Todos los equipos cumplen con los partidos asegurados" };
    }
};