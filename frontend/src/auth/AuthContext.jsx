import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as sesionKc from './session.js';

// Roles del realm bda-realm, del que más permisos tiene al que menos.
const ROLES = ['ADMIN', 'AGRONOMO', 'OPERARIO'];

const DESCRIPCION_ROL = {
  ADMIN: 'Administrás campos, catálogo y planes de siembra.',
  AGRONOMO: 'Gestionás el catálogo agronómico y los planes de siembra.',
  OPERARIO: 'Consultás la información y registrás las labores.',
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(sesionKc.getSesion());

  useEffect(() => sesionKc.suscribir(setSesion), []);

  const valor = useMemo(() => {
    const acciones = { login: sesionKc.iniciarSesion, logout: sesionKc.cerrarSesion };
    if (!sesion) {
      return {
        ...acciones,
        user: null,
        can: { editarCampos: false, editarCatalogo: false, gestionarPlanes: false, operarLabores: false },
      };
    }
    const roles = ROLES.filter((r) => sesion.roles.includes(r));
    const tiene = (...candidatos) => candidatos.some((r) => roles.includes(r));
    return {
      ...acciones,
      user: {
        username: sesion.username,
        nombre: sesion.nombre,
        roles,
        rol: roles[0] ?? null,
        descripcion: DESCRIPCION_ROL[roles[0]] ?? 'Tu usuario no tiene un rol de Agro Campos asignado.',
      },
      // Espejo de las reglas del backend. Solo sirve para mostrar u ocultar botones:
      // la autorización real la hace cada servicio y responde 403 si el rol no alcanza.
      can: {
        editarCampos: tiene('ADMIN'),
        editarCatalogo: tiene('ADMIN', 'AGRONOMO'),
        gestionarPlanes: tiene('ADMIN', 'AGRONOMO'),
        operarLabores: tiene('ADMIN', 'AGRONOMO', 'OPERARIO'),
      },
    };
  }, [sesion]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
