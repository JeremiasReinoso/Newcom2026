import { supabaseFetch } from './db.js';
import { LicenciaRepo } from './licenseRepo.js';

export const TorneoRepo = {
    obtenerTodos: async () => {
        const licencia = await LicenciaRepo.obtenerActiva();
        if (!licencia) throw new Error('Activá una licencia válida para consultar torneos.');
        const url = `torneos?licencia_id=eq.${encodeURIComponent(licencia.id)}&select=*`;
        return await supabaseFetch(url);
    },
    crear: async (nombre, partidosAsegurados) => {
        const licencia = await LicenciaRepo.obtenerActiva();
        if (!licencia) throw new Error('Activá una licencia válida para crear torneos.');

        const nuevoTorneo = {
            licencia_id: licencia.id,
            nombre,
            partidos_asegurados: partidosAsegurados,
            estado: 'activo'
        };

        await LicenciaRepo.consumirTorneo();
        await supabaseFetch('torneos', 'POST', nuevoTorneo);
    }
};
