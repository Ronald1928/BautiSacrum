export default function Informacion() {
  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded shadow ">
      <h1 className="text-3xl font-bold mb-4">Acerca de BautiSacrum</h1>
      <p className="mb-4">
        <strong>BautiSacrum</strong> es una aplicación web diseñada para
        gestionar y buscar certificados de bautismo de manera eficiente y
        segura. Nuestro objetivo es facilitar el acceso a estos documentos
        importantes para las iglesias y sus miembros. La aplicación está
        desarrollada con tecnologías modernas que garantiza una experiencia de
        usuario intuitiva y responsiva.
      </p>
      <h2 className="text-2xl font-semibold mb-3">
        Características Principales
      </h2>
      <ul className="list-disc list-inside mb-4">
        <li className="mb-2">
          <strong>Gestión de Certificados:</strong> Permite a las iglesias
          registrar, actualizar y eliminar certificados de bautismo de manera
          sencilla.
        </li>
        <li className="mb-2">
          <strong>Búsqueda Avanzada:</strong> Los usuarios pueden buscar
          certificados utilizando el nombre de la persona bautizada.
        </li>
        <li className="mb-2">
          <strong>Estadísticas:</strong> Proporciona estadísticas detalladas
          sobre los bautismos registrados, ayudando a las iglesias a entender
          mejor sus comunidades.
        </li>
        <li className="mb-2">
          <strong>Respaldo:</strong> La aplicación implementa medidas de
          respaldo para garantizar la integridad de los datos.
        </li>
      </ul>
      <h2 className="text-2xl font-semibold mb-3">Tecnologías Utilizadas</h2>
      <ul className="list-disc list-inside mb-4">
        <li className="mb-2">
          <strong>Frontend:</strong> React, TypeScript, Vite y Tailwind CSS.
        </li>
        <li className="mb-2">
          <strong>Backend:</strong> Node.js y Express.
        </li>
        <li className="mb-2">
          <strong>Base de Datos:</strong> SQLite para el almacenamiento local y
          PostgreSQL en la nube mediante Neon.
        </li>

        <li className="mb-2">
          <strong>API y despliegue:</strong> API REST para la sincronización de
          datos, desplegada en Render.
        </li>

        <li className="mb-2">
          <strong>Aplicación de escritorio:</strong> Electron.
        </li>

        <li className="mb-2">
          <strong>Generación de documentos:</strong> Puppeteer para la creación
          de certificados en PDF.
        </li>

        <li className="mb-2">
          <strong>Control de Versiones:</strong> Git y GitHub.
        </li>
      </ul>
      <h2 className="text-2xl font-semibold mb-3">Créditos</h2>
      <ul className="list-disc list-inside mb-4">
        <li className="mb-2">
          <strong>Desarrollo de la aplicación:</strong> Ronald Saúl Hernández
          Aguasanta
        </li>
        <li className="mb-2">
          <strong>Logo de la app:</strong>{" "}
          <a
            href="https://www.flaticon.es/iconos-gratis/bautismo"
            title="bautismo iconos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            Bautismo iconos creados por Freepik - Flaticon
          </a>
        </li>
        <li className="mb-2">
          <strong>Librerías y herramientas:</strong> Axios, Puppeteer, CORS,
          Recharts, Lucide React, Framer Motion, html2canvas, jsPDF,
          html2pdf.js, React PDF Viewer, sqlite3, pg, dotenv, nspell y
          dictionary-es.
        </li>
        <li className="mb-2">
          <strong>Entorno de Desarrollo:</strong> Visual Studio Code.
        </li>
      </ul>

      {/* Derechos reservados */}
      <p className="text-gray-500 text-sm mt-4">
        © 2026 BautiSacrum. Todos los derechos reservados.
      </p>
    </div>
  );
}
