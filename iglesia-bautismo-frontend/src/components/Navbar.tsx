import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import SyncStatus from "./SyncStatus";
import Logo from "../assets/BautismoLogo.svg";
import Button from "./ui/Button";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <nav className="bg-blue-600 text-white sticky top-0 z-50 shadow-md">
      <div className="w-full flex justify-between px-6 h-16 items-center">
        {/* Lado izquierdo (logo + opciones principales) */}
        <div className="flex items-center gap-6">
          <img src={Logo} alt="Logo" className="h-10 w-10 rounded-full" />

          {/* Botones en desktop */}
          <div
            className="hidden md:flex text-lg gap-2"
            style={{ fontFamily: "Inter" }}
          >
            <Link
              to="/"
              className="flex items-center gap-1 hover:bg-blue-500 rounded px-3 py-2"
            >
              {"\u{1F4C4}"} <span>Inicio</span>
            </Link>
            <Link
              to="/buscar"
              className="flex items-center gap-1 hover:bg-blue-500 rounded px-3 py-2"
            >
              {"\u{1F50D}"} <span>Buscar Certificados</span>
            </Link>
            <Link
              to="/estadisticas"
              className="flex items-center gap-1 hover:bg-blue-500 rounded px-3 py-2"
            >
              {"\u{1F4CA}"} <span>Estadísticas</span>
            </Link>
          </div>
        </div>

        {/* Estado compacto y opciones */}
        <div className="ml-auto flex items-center gap-2">
          <SyncStatus />
          <div className="relative" ref={dropdownRef}>
            <Button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1 hover:bg-blue-500 rounded px-3 py-2 text-lg transition-colors duration-200 border border-gray-200"
            >
              {"\u{2699}"} <span>Acerca de</span>
            </Button>

            {isOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white text-black rounded shadow-lg border border-gray-200">
                <Link
                  to="/acerca-de/app"
                  className="block px-4 py-2 hover:bg-blue-100 hover:text-blue-800 font-semibold transition-colors"
                >
                  Información App
                </Link>
                <Link
                  to="/acerca-de/desarrollador"
                  className="block px-4 py-2 hover:bg-blue-100 hover:text-blue-800 font-semibold transition-colors"
                >
                  Desarrollador
                </Link>
                <Link
                  to="/acerca-de/version"
                  className="block px-4 py-2 hover:bg-blue-100 hover:text-blue-800 font-semibold transition-colors"
                >
                  Versión
                </Link>
                <Link
                  to="/base-de-datos"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 hover:bg-blue-100 hover:text-blue-800 font-semibold transition-colors"
                >
                  Respaldo y migración
                </Link>
              </div>
            )}
          </div>
        </div>
        {/* Botón hamburguesa en móvil */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="focus:outline-none"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {isOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Menú móvil */}
      {isOpen && (
        <div className="md:hidden bg-blue-500">
          <Link
            to="/vista-previa"
            className="block px-4 py-2 hover:bg-blue-400"
            onClick={() => setIsOpen(false)}
          >
            Inicio
          </Link>
          <Link
            to="/buscar-certificados"
            className="block px-4 py-2 hover:bg-blue-400"
            onClick={() => setIsOpen(false)}
          >
            Buscar Certificados
          </Link>
          <Link
            to="/estadisticas"
            className="block px-4 py-2 hover:bg-blue-400"
            onClick={() => setIsOpen(false)}
          >
            Estadísticas
          </Link>
          <Link
            to="/acerca-de"
            className="block px-4 py-2 hover:bg-blue-400"
            onClick={() => setIsOpen(false)}
          >
            Acerca de
          </Link>
        </div>
      )}
    </nav>
  );
}
