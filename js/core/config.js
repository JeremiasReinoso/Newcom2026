// Configuración global de la aplicación
const runtimeConfig = globalThis.NEWCOM_CONFIG || {};

// En producción, publicar NEWCOM_CONFIG antes de los módulos con la URL y la
// anon key de Supabase. El código de licencia se activa en el dispositivo.
export const API_CONFIG = {
    SUPABASE_URL: runtimeConfig.SUPABASE_URL || '',
    SUPABASE_KEY: runtimeConfig.SUPABASE_KEY || ''
};

export const hasSupabaseConfig = () => /^https:\/\/.+\.supabase\.co$/i.test(API_CONFIG.SUPABASE_URL)
    && API_CONFIG.SUPABASE_KEY.length > 20;

export const TOURNAMENT_RULES = {
    POINTS_WIN_2_0: 3,
    POINTS_WIN_2_1: 2,
    POINTS_LOSS: 1
};
