export const DataManager = {
    _getStorage() {
        const raw = localStorage.getItem('newcom_data');
        return raw ? JSON.parse(raw) : {
            tournaments: [],
            categories: [],
            teams: [],
            zones: [],
            matches: [],
            results: []
        };
    },

    _setStorage(data) {
        localStorage.setItem('newcom_data', JSON.stringify(data));
    },

    // TOURNAMENTS
    getTournaments: () => DataManager._getStorage().tournaments,
    getTournament: (id) => {
        const data = DataManager._getStorage();
        return data.tournaments.find(t => t.id === id);
    },
    createTournament: (name, partidosAsegurados) => {
        const data = DataManager._getStorage();
        const id = `torneo_${Date.now()}`;
        const torneo = {
            id,
            nombre: name,
            partidos_asegurados: partidosAsegurados,
            creado: new Date().toISOString()
        };
        data.tournaments.push(torneo);
        DataManager._setStorage(data);
        return id;
    },
    getCurrentTournament: () => {
        const data = DataManager._getStorage();
        // Return the most recently active tournament
        const active = data.tournaments.find(t => t.estado === 'activo');
        return active || data.tournaments[data.tournaments.length - 1];
    },

    // CATEGORIES
    getCategories: () => DataManager._getStorage().categories,
    getCategoriesByTournament: (torneoId) => {
        return DataManager._getStorage().categories.filter(c => c.torneoId === torneoId);
    },
    createCategory: (nombre, torneoId) => {
        const data = DataManager._getStorage();
        const id = `categoria_${Date.now()}`;
        const categoria = {
            id,
            nombre,
            torneoId
        };
        data.categories.push(categoria);
        DataManager._setStorage(data);
        return id;
    },

    // TEAMS
    getTeams: () => DataManager._getStorage().teams,
    getTeamsByCategory: (categoriaId) => {
        return DataManager._getStorage().teams.filter(t => t.categoriaId === categoriaId);
    },
    getTeamsByZone: (zonaId) => {
        return DataManager._getStorage().teams.filter(t => t.zonaId === zonaId);
    },
    createTeam: (nombre, categoriaId, torneoId) => {
        const data = DataManager._getStorage();
        const id = `equipo_${Date.now()}`;
        const equipo = {
            id,
            nombre,
            categoriaId,
            torneoId,
            zonaId: null
        };
        data.teams.push(equipo);
        DataManager._setStorage(data);
        return id;
    },
    updateTeamZone: (equipoId, zonaId) => {
        const data = DataManager._getStorage();
        const equipo = data.teams.find(t => t.id === equipoId);
        if (equipo) {
            equipo.zonaId = zonaId;
            DataManager._setStorage(data);
        }
    },

    // ZONES
    getZones: () => DataManager._getStorage().zones,
    getZonesByCategory: (categoriaId) => {
        return DataManager._getStorage().zones.filter(z => z.categoriaId === categoriaId);
    },
    createZone: (nombre, categoriaId) => {
        const data = DataManager._getStorage();
        const id = `zona_${Date.now()}`;
        const zona = {
            id,
            nombre,
            categoriaId
        };
        data.zones.push(zona);
        DataManager._setStorage(data);
        return id;
    },
    assignTeamToZone: (equipoId, zonaId) => {
        const data = DataManager._getStorage();
        const equipo = data.teams.find(t => t.id === equipoId);
        if (equipo) {
            equipo.zonaId = zonaId;
            DataManager._setStorage(data);
        }
    },

    // MATCHES
    getMatches: () => DataManager._getStorage().matches,
    getMatchesByTournament: (torneoId) => {
        return DataManager._getStorage().matches.filter(m => m.torneoId === torneoId);
    },
    getMatchesByCategory: (categoriaId) => {
        return DataManager._getStorage().matches.filter(m => m.categoriaId === categoriaId);
    },
    getMatchesByZone: (zonaId) => {
        return DataManager._getStorage().matches.filter(m => m.zonaId === zonaId);
    },
    createMatch: (equipoLocalId, equipoVisitanteId, zonaId, categoriaId, torneoId) => {
        const data = DataManager._getStorage();
        const id = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const match = {
            id,
            equipoLocalId,
            equipoVisitanteId,
            zonaId,
            categoriaId,
            torneoId,
            fecha: null,
            hora: null,
            cancha: null,
            estado: 'pendiente',
            setsLocal: null,
            setsVisitante: null
        };
        data.matches.push(match);
        DataManager._setStorage(data);
        return id;
    },
    updateMatchResult: (matchId, setsLocal, setsVisitante) => {
        const data = DataManager._getStorage();
        const match = data.matches.find(m => m.id === matchId);
        if (match) {
            match.estado = 'finalizado';
            match.setsLocal = setsLocal;
            match.setsVisitante = setsVisitante;
            DataManager._setStorage(data);
        }
    },

    // RESULTS/CALCULATIONS
    getResultsByTournament: (torneoId) => {
        const matches = DataManager.getMatchesByTournament(torneoId);
        const standings = {};
        
        const teams = DataManager.getTeamsByCategory(matches[0]?.categoriaId);
        teams.forEach(t => {
            standings[t.id] = {
                equipoId: t.id,
                nombre: t.nombre,
                jugados: 0,
                ganados: 0,
                perdidos: 0,
                puntos: 0
            };
        });

        matches.forEach(m => {
            if (m.estado !== 'finalizado') return;

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

        return Object.values(standings).sort((a, b) => b.puntos - a.puntos || b.ganados - a.ganados);
    }
};