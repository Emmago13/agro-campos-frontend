# Agro Campos — Frontend

Interfaz web (React + Vite) para el backend de Agro Campos. Habla únicamente con el **API Gateway**
(`:8080`) y con **Keycloak** (`:8081`); no conoce a los microservicios por separado.

## Cómo correrlo

Requisitos: Node 20.19 o superior (o 22.12+) y el backend levantado.

```bash
# 1. Backend (desde la raíz del repo): MySQL, Keycloak, los 3 servicios y el gateway
docker compose up -d --build

# 2. Frontend (desde esta carpeta)
npm install
npm run dev
```

Abrí http://localhost:5173 e ingresá con alguno de los usuarios del realm importado
(la contraseña es igual al usuario):

| Usuario     | Rol        | Qué puede hacer                                                        |
|-------------|------------|------------------------------------------------------------------------|
| `admin1`    | ADMIN      | Todo: campos, lotes, catálogo, planes                                  |
| `agronomo1` | AGRONOMO   | Catálogo y planes de siembra; consulta campos y lotes                  |
| `operario1` | OPERARIO   | Consulta todo y registra labores; no crea ni modifica datos maestros   |

Si el backend corre en otras direcciones: `GATEWAY_URL=http://... KEYCLOAK_URL=http://... npm run dev`.

## Cómo se conecta con el backend

- **Proxy de Vite (`vite.config.js`).** El navegador solo habla con `localhost:5173`; Vite reenvía
  `/api/**` al gateway y `/kc/**` a Keycloak. Como el navegador nunca sale a otro origen, **no hace
  falta configurar CORS** en el backend (hoy ni el gateway ni los servicios lo tienen).
- **Login (`src/auth/session.js`).** Pide el token a Keycloak con el *password grant* del cliente
  `agro-campos-client` (el que ya usamos con `curl`). Guarda el access token (5 minutos) y el refresh
  token en `sessionStorage`, y lo renueva solo antes de que venza. Nunca guarda la contraseña.
- **Cliente HTTP (`src/api/http.js`).** Agrega `Authorization: Bearer ...` a cada pedido, reintenta una
  vez si el token venció justo en el viaje y convierte los errores del backend en mensajes legibles.
  Entiende los dos formatos de error que hoy conviven: `{mensaje, errores}` (agronomía y proyectos)
  y `{message, errors}` (campos).
- **Roles en la pantalla (`src/auth/AuthContext.jsx`).** Los botones se ocultan según el rol, igual que
  las reglas del backend. Es solo comodidad: la autorización real la hace cada servicio y responde
  `403` si el rol no alcanza (el front muestra "Tu rol no permite realizar esta acción").

## Pantallas

| Ruta                     | Qué hace                                                                              |
|--------------------------|---------------------------------------------------------------------------------------|
| `#/`                     | Resumen y planes activos con su avance                                                |
| `#/campos`               | Alta, edición y baja de campos                                                        |
| `#/campos/:id`           | Plano del campo (cada lote proporcional a sus hectáreas), alta/edición/baja de lotes  |
| `#/catalogo/:seccion`    | Cultivos, plagas, agroquímicos y tratamientos                                         |
| `#/planes`               | Planes con filtro por estado                                                          |
| `#/planes/nuevo`         | Crear un plan: campo, lote, cultivo y fecha (avisa si el suelo no es apto)            |
| `#/planes/:id`           | Labores en orden: iniciar, completar (fumigar pide el tratamiento) y cancelar el plan |

## Estructura

```
src/
  api/          un archivo por servicio (campos, agronomia, proyectos) y el cliente http.js
  auth/         session.js (Keycloak y tokens) y AuthContext.jsx (usuario y permisos)
  components/   FormDialog (formularios a partir de una descripción de campos), PlanoLotes, Layout, ui
  pages/        una pantalla por archivo; Catalogo.jsx dibuja las 4 secciones desde un objeto de config
  router.jsx    router mínimo por hash (#/campos/3), sin dependencias
  styles.css    estilos y variables de color
```

Para agregar una sección al catálogo alcanza con sumar un objeto en `SECCIONES` (`pages/Catalogo.jsx`).

## Producción y límites conocidos

- `npm run build` genera `dist/`. Para servirlo hay que reenviar `/api` y `/kc` como hace Vite
  (por ejemplo con nginx), o agregar CORS al gateway y a Keycloak y definir `VITE_API_URL` y
  `VITE_KEYCLOAK_URL`. También se puede cambiar `VITE_KEYCLOAK_REALM` y `VITE_KEYCLOAK_CLIENT`.
- El *password grant* es cómodo para desarrollo, pero en producción corresponde Authorization Code con
  PKCE (`keycloak-js`), que requiere habilitar *Standard flow* y las redirect URIs en el cliente.
- Los listados traen todo sin paginar: alcanza para el tamaño del TPI.
- Los planes no se pueden filtrar por lote o campo en el backend; la pantalla de planes muestra todos.
