import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "danger"
    | "eliminarBusqueda"
    | "descargaBusqueda"
    | "eliminarModal"
    | "conservarModal"
    | "buscar"
    | "cargar"
    | "editarBusqueda"
    | "guardarArchivo"
    | "cancelarArchivo"
    | "guardarBautismo";
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  className,
  ...props
}) => {
  const baseStyles =
    "px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2";

  const variants = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400 font-semibold px-6 py-2 rounded-xl shadow-md transition-all w-full md:w-auto",
    secondary:
      "focus:ring-slate-400 bg-slate-500 hover:bg-slate-600 text-white font-semibold px-6 py-2 rounded-xl shadow-md transition-all w-full md:w-auto",
    guardarBautismo:
      "bg-green-600 hover:bg-green-700 text-white focus:ring-green-400 font-semibold px-6 py-2 rounded-xl shadow-md transition-all w-full md:w-auto",
    danger:
      "bg-red-600 text-white hover:bg-red-700 focus:ring-red-400 font-semibold px-4 py-2 rounded shadow-md transition-all w-full md:w-auto",
    eliminarBusqueda:
      "bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg shadow-md",
    descargaBusqueda:
      "bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg shadow-md",
    eliminarModal: "bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600",
    conservarModal: "bg-gray-300 px-6 py-2 rounded hover:bg-gray-400",
    buscar:
      "bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg shadow-md px-8 py-2 mb-6 flex items-center gap-2",
    cargar:
      "bg-green-600 hover:bg-green-700 text-white rounded-lg text-lg shadow-md px-8 py-2 mb-6 flex items-center gap-2",
    editarBusqueda:
      "bg-stone-500 hover:bg-stone-600 text-white px-3 py-1 rounded-lg shadow-md",
    guardarArchivo:
      "bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-lg shadow-md px-8 py-2 mb-6 flex items-center gap-2",
    cancelarArchivo:
      "bg-gray-300 hover:bg-gray-400 text-black rounded-lg text-lg shadow-md px-8 py-2 mb-6 flex items-center gap-2",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
