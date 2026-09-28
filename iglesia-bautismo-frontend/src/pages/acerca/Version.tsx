export default function Version() {
  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded shadow ">
      <h1 className="text-3xl font-bold mb-4">Versión de BautiSacrum</h1>
      <p className="mb-4">
        La versión actual de <strong>BautiSacrum</strong> es{" "}
        <strong>1.1.0</strong>. Esta versión amplía la gestión de certificados
        de bautismo incorporando almacenamiento local con SQLite, sincronización
        con PostgreSQL en la nube, funcionamiento sin conexión, copias de
        seguridad automáticas, estadísticas y mejoras generales de estabilidad.
      </p>
    </div>
  );
}
