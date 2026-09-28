import Navbar from "../components/Navbar";
import { Outlet } from "react-router-dom";

function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-100 via-blue-200 to-blue-300">
      {/* Navbar */}
      <Navbar />

      {/* Contenido */}
      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
