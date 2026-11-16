import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo el navegador habla solo con Vite (http://localhost:5173) y Vite reenvía:
//   /api/**  ->  API Gateway  (http://localhost:8080)
//   /kc/**   ->  Keycloak     (http://localhost:8081)
// Así el navegador nunca hace una llamada "cross-origin" y no hace falta configurar CORS
// en el backend. Para apuntar a otras direcciones: GATEWAY_URL=... KEYCLOAK_URL=... npm run dev
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const gateway = env.GATEWAY_URL || 'http://localhost:8080';
  const keycloak = env.KEYCLOAK_URL || 'http://localhost:8081';

  const proxy = {
    '/api': { target: gateway, changeOrigin: true },
    '/kc': {
      target: keycloak,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/kc/, ''),
    },
  };

  return {
    plugins: [react()],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
  };
});
