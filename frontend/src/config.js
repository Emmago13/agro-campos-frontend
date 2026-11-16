// Configuración del front. Todo se puede cambiar con variables VITE_* (archivo .env.local).
const env = import.meta.env ?? {};

export const REALM = env.VITE_KEYCLOAK_REALM ?? 'bda-realm';
export const CLIENT_ID = env.VITE_KEYCLOAK_CLIENT ?? 'agro-campos-client';

// Prefijos que Vite reenvía en desarrollo (ver vite.config.js).
// '' significa "mismo origen": las llamadas salen como /api/v1/... y /kc/realms/...
export const API_BASE = env.VITE_API_URL ?? '';
export const KEYCLOAK_BASE = env.VITE_KEYCLOAK_URL ?? '/kc';

export const TOKEN_URL = `${KEYCLOAK_BASE}/realms/${REALM}/protocol/openid-connect/token`;
export const LOGOUT_URL = `${KEYCLOAK_BASE}/realms/${REALM}/protocol/openid-connect/logout`;
