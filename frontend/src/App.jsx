import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { EmptyState } from './components/ui.jsx';
import CampoDetalle from './pages/CampoDetalle.jsx';
import Campos from './pages/Campos.jsx';
import Catalogo from './pages/Catalogo.jsx';
import Inicio from './pages/Inicio.jsx';
import Login from './pages/Login.jsx';
import NuevoPlan from './pages/NuevoPlan.jsx';
import PlanDetalle from './pages/PlanDetalle.jsx';
import Planes from './pages/Planes.jsx';
import { Link, Router } from './router.jsx';

// La primera ruta que coincide gana: '/planes/nuevo' va antes que '/planes/:id'.
const RUTAS = [
  { path: '/', element: <Inicio /> },
  { path: '/campos', element: <Campos /> },
  { path: '/campos/:id', element: <CampoDetalle /> },
  { path: '/catalogo', element: <Catalogo /> },
  { path: '/catalogo/:seccion', element: <Catalogo /> },
  { path: '/planes', element: <Planes /> },
  { path: '/planes/nuevo', element: <NuevoPlan /> },
  { path: '/planes/:id', element: <PlanDetalle /> },
];

const NO_ENCONTRADA = (
  <EmptyState titulo="Esta página no existe" texto="Puede que el enlace esté mal escrito.">
    <Link to="/" className="btn">
      Ir al inicio
    </Link>
  </EmptyState>
);

function Pantallas() {
  const { user } = useAuth();
  if (!user) return <Login />;
  return (
    <Layout>
      <Router rutas={RUTAS} noEncontrada={NO_ENCONTRADA} />
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Pantallas />
      </ToastProvider>
    </AuthProvider>
  );
}
