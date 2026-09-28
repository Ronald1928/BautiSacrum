import { useEffect, useState } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function BaseDatos() {
  const [cloud, setCloud] = useState(false);
  const [connection, setConnection] = useState("");
  const [activationKey, setActivationKey] = useState("");
  const [savingCloud, setSavingCloud] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    window.electronAPI?.cloudPublicUrl().then(setConnection);
    window.electronAPI?.cloudConfigured().then(setCloud);
    window.electronAPI?.tieneContrasenaRespaldo().then(setHasPassword);
  }, []);

  const setupPassword = async () => {
    setMessage("");
    setError("");
    if (!password.trim()) {
      setError("Debes ingresar una contraseña.");
      return;
    }

    if (!confirmation.trim()) {
      setError("Debes confirmar la contraseña.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      await window.electronAPI?.configurarContrasenaRespaldo(password);

      setHasPassword(true);
      setPassword("");
      setConfirmation("");
      setMessage("La contraseña de respaldo fue creada.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo crear la contraseña.",
      );
    }
  };

  const validatePassword = async () => {
    setError("");

    if (!password.trim()) {
      setError("Debes ingresar la contraseña de respaldo.");
      return false;
    }
    const valid =
      await window.electronAPI?.verificarContrasenaRespaldo(password);
    if (!valid) {
      setError("La contraseña no es correcta.");
      return false;
    }
    return true;
  };

  const saveCloud = async () => {
    setError("");
    setSavingCloud(true);
    try {
      if (!(await validatePassword())) return;
      if (!window.electronAPI)
        throw new Error("Configura la API desde la aplicación de escritorio.");
      await window.electronAPI.configureCloud(
        connection,
        activationKey,
        password,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message.replace(
              /^Error invoking remote method '[^']+': Error: /,
              "",
            )
          : "No se pudo verificar la conexión.",
      );
    } finally {
      setSavingCloud(false);
    }
  };

  const exportDatabase = async () => {
    setMessage("");
    setError("");
    try {
      if (!(await validatePassword())) return;
      const result = await window.electronAPI?.exportarBaseDatos(password);
      if (!result || result.canceled) return;
      setMessage(`Copia guardada en: ${result.filePath}`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo exportar la base de datos.",
      );
    }
  };

  const importDatabase = async () => {
    setMessage("");
    setError("");
    try {
      // 1. Verifica que no esté vacía
      // 2. Verifica que sea correcta
      if (!(await validatePassword())) return;

      // 3. Solo después muestra la advertencia
      const confirmed = window.confirm(
        "La base actual será reemplazada. La aplicación se reiniciará. ¿Deseas continuar?",
      );

      if (!confirmed) return;

      // 4. Importa
      await window.electronAPI?.importarBaseDatos(password);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo importar la base de datos.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-white/50 p-6 flex justify-center">
      <div className="w-full max-w-2xl">
        <Card title="Respaldo y migración">
          <div className="space-y-5 text-lg text-gray-800">
            <p>
              SQLite conserva los datos en este equipo. La API privada comparte
              los cambios con los otros computadores cuando guardas, recuperas
              la conexión o pulsas Sincronizar ahora.
            </p>
            {hasPassword === false && (
              <div className="space-y-3 rounded border border-blue-200 bg-blue-50 p-4">
                <p className="font-medium">
                  Crea una contraseña para proteger esta sección.
                </p>
                <input
                  className="w-full rounded border p-2"
                  type="password"
                  placeholder="Nueva contraseña (mínimo 6 caracteres)"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                />
                <input
                  className="w-full rounded border p-2"
                  type="password"
                  placeholder="Confirmar contraseña"
                  value={confirmation}
                  onChange={(event) => {
                    setConfirmation(event.target.value);
                    setError("");
                  }}
                />
                <Button variant="primary" onClick={setupPassword}>
                  Guardar contraseña
                </Button>
              </div>
            )}
            {hasPassword && (
              <>
                <input
                  className="w-full rounded border p-2"
                  type="password"
                  placeholder="Contraseña de respaldo"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                />
                <section className="rounded border border-blue-200 bg-blue-50 p-4 space-y-3">
                  <h2 className="font-semibold">Conexión a la API privada</h2>
                  <p className="text-sm">
                    {cloud
                      ? "Esta es la dirección guardada en este equipo. Para cambiar de servidor, edita la URL e introduce el token autorizado por la nueva API y tu contraseña de respaldo."
                      : "El servidor ya está configurado. Introduce tu clave de activación y la contraseña de respaldo."}
                  </p>
                  <input
                    aria-label="Dirección de la API"
                    type="url"
                    autoComplete="off"
                    className="w-full rounded border p-2"
                    placeholder="https://tu-api.onrender.com"
                    value={connection}
                    disabled={savingCloud}
                    onChange={(event) => { setConnection(event.target.value); setError(""); }}
                  />
                  <input
                    aria-label="Clave de activación"
                    type="password"
                    autoComplete="off"
                    className="w-full rounded border p-2"
                    placeholder="Clave de activación de este equipo"
                    value={activationKey}
                    onChange={(e) => setActivationKey(e.target.value)}
                  />
                  <button
                    type="button"
                    className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
                    disabled={
                      savingCloud || !connection.trim() || !activationKey.trim()
                    }
                    onClick={saveCloud}
                  >
                    {savingCloud
                      ? "Verificando Render y Neon…"
                      : "Verificar conexión y reiniciar"}
                  </button>
                  <p className="text-sm">
                    La clave se protege en este usuario de Windows. La
                    contraseña de Neon permanece únicamente en el servidor.
                    Guarda una copia antes del primer enlace y usa siempre la
                    misma API.
                  </p>
                </section>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="primary" onClick={exportDatabase}>
                    Exportar base de datos
                  </Button>
                  <Button variant="secondary" onClick={importDatabase}>
                    Importar base de datos
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Exportar reinicia la aplicación para guardar una copia
                  consistente. Importar recupera la copia local y sus
                  pendientes; no revierte la base compartida.
                </p>
              </>
            )}
            {message && (
              <p className="rounded bg-green-100 p-3 text-green-800">
                {message}
              </p>
            )}
            {error && (
              <p className="rounded bg-red-100 p-3 text-red-800">{error}</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
