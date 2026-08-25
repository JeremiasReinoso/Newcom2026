import { DataManager } from '../data/dataManager.js';

const roundRobinRounds = (teams) => {
    const slots = teams.slice();
    if (slots.length % 2) slots.push(null);
    const rounds = [];
    for (let round = 0; round < slots.length - 1; round += 1) {
        const pairs = [];
        for (let index = 0; index < slots.length / 2; index += 1) {
            const local = slots[index];
            const visitante = slots[slots.length - 1 - index];
            if (local && visitante) pairs.push([local, visitante]);
        }
        rounds.push(pairs);
        slots.splice(1, 0, slots.pop());
    }
    return rounds;
};
const pairKey = (a, b) => [a, b].sort().join(':');
const isOfficialMatch = match => match.confirmado || ['pendiente', 'programado', 'finalizado'].includes(match.estado);
const schedulerMinutesFromTime = time => {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
};
const schedulerTimeFromMinutes = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export const SchedulerService = {
    // Emparejamiento: determina únicamente quién juega contra quién, por zona.
    generarEmparejamientos(torneoId, categoriaId) {
        const tournament = DataManager.getTournament(torneoId);
        if (!tournament) throw new Error('Seleccione un torneo válido.');
        const assured = Number(tournament.partidos_asegurados);
        const teams = DataManager.getTeamsByTournamentAndCategory(torneoId, categoriaId);
        const zones = DataManager.getZonesByTournamentAndCategory(torneoId, categoriaId);
        if (!teams.length) throw new Error('La categoría seleccionada no tiene equipos.');
        if (teams.some(team => !team.zonaId)) throw new Error('Asigne una zona a todos los equipos antes de emparejar.');

        const pending = [];
        for (const zone of zones) {
            const zoneTeams = teams.filter(team => team.zonaId === zone.id);
            if (!zoneTeams.length) continue;
            if (zoneTeams.length < 2) throw new Error(`${zone.nombre} necesita al menos dos equipos.`);
            const existing = DataManager.getMatchesByScope(torneoId, categoriaId, zone.id);
            const counts = new Map(zoneTeams.map(team => [team.id, 0]));
            existing.forEach(match => {
                counts.set(match.equipoLocalId, (counts.get(match.equipoLocalId) || 0) + 1);
                counts.set(match.equipoVisitanteId, (counts.get(match.equipoVisitanteId) || 0) + 1);
            });
            const pairsSeen = new Set(existing.map(match => pairKey(match.equipoLocalId, match.equipoVisitanteId)));
            const rounds = roundRobinRounds(zoneTeams);
            let cursor = 0;
            let safety = 0;
            while ([...counts.values()].some(count => count < assured)) {
                const round = rounds[cursor % rounds.length];
                const isFirstCycle = cursor < rounds.length;
                round.forEach(([local, visitante]) => {
                    // Con una cantidad impar de equipos puede haber una fecha de
                    // descanso; se permite que el rival ya cubierto juegue una
                    // vez más para que ningún equipo quede por debajo del mínimo.
                    if (counts.get(local.id) >= assured && counts.get(visitante.id) >= assured) return;
                    const key = pairKey(local.id, visitante.id);
                    // Las repeticiones sólo se habilitan tras agotar cruces únicos.
                    if (isFirstCycle && pairsSeen.has(key)) return;
                    pending.push({ torneoId, categoriaId, zonaId: zone.id, tipo: 'fase_zonas', equipoLocalId: local.id, equipoVisitanteId: visitante.id, fecha: null, hora: null, cancha: null, estado: 'borrador', confirmado: false, setsLocal: null, setsVisitante: null });
                    counts.set(local.id, counts.get(local.id) + 1);
                    counts.set(visitante.id, counts.get(visitante.id) + 1);
                    pairsSeen.add(key);
                });
                cursor += 1;
                if (++safety > assured * rounds.length * 4 + 20) throw new Error(`No se pudo completar ${zone.nombre}.`);
            }
        }
        if (pending.length) DataManager.addMatches(pending);
        return pending.length;
    },

    confirmarEmparejamientos(torneoId, categoriaId) {
        const drafts = DataManager.getMatchesByTournamentAndCategory(torneoId, categoriaId)
            .filter(match => match.estado === 'borrador' || match.estado === 'emparejado');
        if (!drafts.length) return 0;
        DataManager.updateMatches(drafts.map(match => ({ ...match, estado: 'pendiente', confirmado: true })));
        return drafts.length;
    },

    verificarPartidosAsegurados(torneoId, categoriaId, onlyOfficial = false) {
        const tournament = DataManager.getTournament(torneoId);
        const teams = DataManager.getTeamsByTournamentAndCategory(torneoId, categoriaId);
        const matches = DataManager.getMatchesByTournamentAndCategory(torneoId, categoriaId)
            .filter(match => !onlyOfficial || isOfficialMatch(match));
        const missing = teams.filter(team => matches.filter(match => match.equipoLocalId === team.id || match.equipoVisitanteId === team.id).length < tournament.partidos_asegurados);
        return missing.length ? { ok: false, mensaje: `Faltan partidos asegurados para: ${missing.map(team => team.nombre).join(', ')}.` } : { ok: true, mensaje: 'Todos los equipos cumplen los partidos asegurados.' };
    },

    // Programación: asigna fecha, hora y cancha a emparejamientos ya calculados.
    programarEmparejamientos(torneoId, categoriaId) {
        const daySchedules = DataManager.getDaySchedules(torneoId);
        if (!daySchedules.length) throw new Error('Configure al menos un día en Calendario.');
        const allMatches = DataManager.getMatchesByTournamentAndCategory(torneoId, categoriaId);
        if (allMatches.some(match => !isOfficialMatch(match))) throw new Error('Confirme los emparejamientos antes de programarlos.');
        const verification = this.verificarPartidosAsegurados(torneoId, categoriaId, true);
        if (!verification.ok) throw new Error(verification.mensaje);
        const toSchedule = allMatches.filter(match => isOfficialMatch(match) && !match.fecha && match.estado !== 'finalizado');
        if (!toSchedule.length) return 0;
        // Con varios días, el último queda reservado para las eliminatorias.
        const groupDays = daySchedules.length > 1 ? daySchedules.slice(0, -1) : daySchedules;
        const slots = [];
        groupDays.forEach(({ fecha, inicio, fin }) => {
            for (let minute = schedulerMinutesFromTime(inicio); minute + 60 <= schedulerMinutesFromTime(fin); minute += 60) {
                ['Cancha 1', 'Cancha 2'].forEach(cancha => slots.push({ fecha, hora: schedulerTimeFromMinutes(minute), cancha }));
            }
        });
        if (slots.length < toSchedule.length) throw new Error('No hay franjas suficientes en los días disponibles.');
        const scheduled = [];
        let slotIndex = 0;
        for (const match of toSchedule) {
            let assigned = false;
            while (slotIndex < slots.length) {
                const slot = slots[slotIndex++];
                const conflict = scheduled.some(other => other.fecha === slot.fecha && other.hora === slot.hora && [other.equipoLocalId, other.equipoVisitanteId].some(id => id === match.equipoLocalId || id === match.equipoVisitanteId));
                if (!conflict) { scheduled.push({ ...match, ...slot, estado: 'pendiente', confirmado: true }); assigned = true; break; }
            }
            if (!assigned) throw new Error('No se pudieron programar todos los emparejamientos sin superponer equipos.');
        }
        DataManager.updateMatches(scheduled);
        return scheduled.length;
    }
};
