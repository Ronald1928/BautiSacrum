// frontend/src/App.tsx
import { HashRouter, Routes, Route } from "react-router-dom";
import VistaPrevia from "./pages/VistaPrevia";
import BuscarCertificados from "./pages/buscador";
import EstadisticasBautismos from "./pages/EstadisticasBautismos";
import InfoApp from "./pages/acerca/InfoApp";
import Desarrollador from "./pages/acerca/Desarrollador";
import Version from "./pages/acerca/Version";
import BaseDatos from "./pages/BaseDatos";
import Layout from "./layout/Layout";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<VistaPrevia />} />
          <Route path="buscar" element={<BuscarCertificados />} />
          <Route path="estadisticas" element={<EstadisticasBautismos />} />
          <Route path="base-de-datos" element={<BaseDatos />} />
          <Route path="acerca-de/app" element={<InfoApp />} />
          <Route path="acerca-de/desarrollador" element={<Desarrollador />} />
          <Route path="acerca-de/version" element={<Version />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
