import { useCallback, useEffect, useState, useRef, useId } from "react";
import { Cloud, CloudOff, RefreshCw, AlertTriangle, ChevronDown, X } from "lucide-react";
import { syncBeforeRead } from "../services/syncBeforeRead";
import axios from "axios";
import API_URL from "../config";

type Status = {
  mode: string;
  pending: number;
  lastSync: string | null;
  error?: string;
  conflicts: { id: number; name: string; deleted: boolean; message: string }[];
};
export default function SyncStatus() {
  const lastNotifiedSync = useRef<string | null>(null);
  useEffect(() => {
    const focus = () => { if (document.visibilityState === 'visible') void syncBeforeRead('focus'); };
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    return () => { window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus); };
  }, []);
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => {
    if (status?.lastSync && status.lastSync !== lastNotifiedSync.current) {
      lastNotifiedSync.current = status.lastSync;
      window.dispatchEvent(new Event('bautisacrum-data-updated'));
    }
  }, [status?.lastSync]);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setExpanded(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setExpanded(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [expanded]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      setStatus(
        (
          await axios.get<Status>(`${API_URL}/api/sync/status`, {
            timeout: 15000,
          })
        ).data,
      );
    } catch {
      setStatus(null);
    }
  }, []);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      await refresh();
      if (active) timer = setTimeout(poll, 5000);
    };
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [refresh]);
  useEffect(() => {
    let reconnect: ReturnType<typeof setTimeout>;
    const online = () => {
      clearTimeout(reconnect);
      reconnect = setTimeout(() => {
        void axios
          .post(API_URL + "/api/sync/network", { online: true })
          .then(refresh)
          .catch(() => {});
      }, 1000);
    };
    const offline = () => {
      clearTimeout(reconnect);
      void axios
        .post(API_URL + "/api/sync/network", { online: false })
        .then(refresh)
        .catch(() => {});
    };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      clearTimeout(reconnect);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [refresh]);
  const act = async (id?: number, choice?: string) => {
    if (
      id !== undefined &&
      !window.confirm(
        choice === "cloud"
          ? "¿Descartar el cambio pendiente de este equipo y conservar la versión de la nube?"
          : "¿Enviar la versión de este equipo para reemplazar la versión actual de la nube?",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await axios.post(
        `${API_URL}/api/sync/${id === undefined ? "retry" : "resolve"}`,
        id === undefined ? {} : { id, choice },
      );
      await refresh();
    } catch {
      setError(
        "No se pudo completar. Revisa la conexión o corrige la ficha y vuelve a intentarlo.",
      );
    } finally {
      setBusy(false);
    }
  };
  const label = !status
    ? "Comprobando conexión con la aplicación…"
    : status.mode === "unconfigured"
      ? "Guardado en este equipo · configura la API en Respaldo y migración para compartir"
      : status.mode === "offline"
        ? "Sin conexión con la nube · puedes seguir trabajando en este equipo"
        : status.mode === "configuration-error"
          ? "Revisa la configuración de la nube · tus cambios están guardados en este equipo"
          : status.mode === "syncing"
            ? "Sincronizando con la base compartida…"
            : status.mode === "online"
              ? status.pending
                ? "Conectado a la nube · hay cambios pendientes"
                : "Sincronización completada · sin cambios locales pendientes"
              : status.mode === "sqlite"
                ? "Solo SQLite local"
                : "Conexión directa PostgreSQL";
  const working = busy || status?.mode === 'syncing';
  const attention = !!error || !!status?.error || !!status?.conflicts.length || status?.mode === 'configuration-error';
  const local = status?.mode === 'offline' || status?.mode === 'unconfigured' || status?.mode === 'sqlite';
  const compact = working ? 'Sincronizando' : attention ? 'Revisar' : !status ? 'Comprobando' : local ? 'Sin conexión' : status.pending ? 'Pendientes' : 'Sincronizado';
  const Icon = working || !status ? RefreshCw : attention ? AlertTriangle : local ? CloudOff : Cloud;
  const tone = attention ? 'text-amber-200' : local || !status ? 'text-blue-100' : 'text-emerald-200';
  return (
    <div ref={containerRef} className="relative" onBlur={event => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setExpanded(false);
    }}>
      <button ref={triggerRef} type="button" aria-expanded={expanded} aria-controls={panelId}
        aria-label={`Sincronización: ${compact}. Ver detalles`}
        onClick={() => setExpanded(value => !value)}
        className="flex h-10 items-center gap-2 rounded-full border border-white/25 px-3 text-sm hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        <Icon aria-hidden="true" size={18} className={tone + (working ? ' motion-safe:animate-spin' : '')} />
        <span role="status" className="hidden lg:inline">{compact}</span>
        {!!status?.pending && <span className="rounded-full bg-white/20 px-1.5 text-xs" aria-label={`${status.pending} cambios pendientes`}>{status.pending}</span>}
        <ChevronDown aria-hidden="true" size={14} className={expanded ? 'rotate-180' : ''} />
      </button>
      {expanded && <section id={panelId} aria-label="Detalles de sincronización"
        className="fixed left-3 right-3 top-[4.5rem] max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-96">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-base">Sincronización</h2>
          <button type="button" aria-label="Cerrar detalles" className="rounded p-1 hover:bg-slate-100" onClick={() => { setExpanded(false); triggerRef.current?.focus(); }}><X size={18} /></button>
        </div>
        <p>{label}</p>
        <div className="my-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-slate-100 px-2 py-1">{status?.pending ?? '—'} cambios pendientes</span>
          {!!status?.conflicts.length && <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-900">{status.conflicts.length} conflicto(s): revisar abajo</span>}
        </div>
        <button type="button" className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50" disabled={working || !status} onClick={() => void act()}>
          <RefreshCw size={16} aria-hidden="true" className={working ? 'motion-safe:animate-spin' : ''} />
          {working ? 'Sincronizando…' : 'Sincronizar ahora'}
        </button>
      {status?.lastSync && (
        <p className="mt-1 text-xs text-slate-500">
          Última actualización: {new Date(status.lastSync).toLocaleString()}.
          La lista se actualiza al sincronizar. También comprobamos la nube al volver a la app, buscar o cargar todos.
        </p>
      )}
      {status?.error && (
        <p role="alert" className="mt-2 text-red-700">
          {status.error}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-red-700">
          {error}
        </p>
      )}
      {expanded &&
        status?.conflicts.map((c) => (
          <div
            className="mt-3 rounded border border-amber-300 bg-amber-50 p-3"
            key={c.id}
          >
            <p>
              <strong>{c.name}</strong>{" "}
              {c.deleted ? "(eliminación pendiente)" : ""}: {c.message}
            </p>
            <p className="my-2">
              Revisa las versiones en ambos equipos antes de elegir. Puedes
              corregir la ficha local desde el buscador.
            </p>
            <button
              disabled={busy}
              className="mr-4 text-blue-800 underline disabled:opacity-50"
              onClick={() => void act(c.id, "cloud")}
            >
              Conservar versión de la nube
            </button>
            <button
              disabled={busy}
              className="text-blue-800 underline disabled:opacity-50"
              onClick={() => void act(c.id, "local")}
            >
              Conservar versión de este equipo
            </button>
          </div>
        ))}
      </section>}
    </div>
  );
}
