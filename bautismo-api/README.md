# API privada de BautiSacrum

La aplicación de escritorio guarda en SQLite y se comunica por HTTPS con esta API. **DATABASE_URL de Neon se configura solo en este servidor.** Cada equipo se autoriza con una clave de activación independiente. No hay rutas que ejecuten SQL enviado por el cliente.

## Cambio desde la versión 1.0.3

1. En todos los computadores, sincroniza los pendientes con la versión anterior y guarda un respaldo. Cierra las versiones anteriores antes de activar la API.
2. Aloja esta API con una conexión a **la misma rama y base Neon**. Al iniciar incorpora el seguimiento incremental sin borrar certificados, IDs globales, operaciones ni la identidad de la base existente. La migración es transaccional y se hace al arrancar el servidor, no en cada sincronización.
3. Instala la versión 1.0.4 y actívala contra esta API. Conserva el SQLite del usuario y sus pendientes; no hay que volver a migrar ni importar los datos.
4. Deja de usar la versión 1.0.3 y las conexiones directas para escribir en esa base. Sus cambios no actualizan el seguimiento nuevo. Cuando todos los equipos estén actualizados, cambia la contraseña anterior de Neon y actualiza DATABASE_URL solo en el servidor para retirar el acceso directo distribuido anteriormente.

## Preparar Render

El despliegue necesita tu cuenta de Render y un repositorio que contenga los cambios. No se ha publicado una API ni creado servicios de pago automáticamente.

1. Sube la carpeta `bautismo-api` y el `render.yaml` de la raíz del proyecto a un repositorio accesible por Render. No subas `.env`, claves de activación ni bases SQLite.
2. En esta carpeta ejecuta `npm install`, luego `npm run device-token`. Genera **una clave por computador**. El comando muestra una clave privada y su hash SHA-256. Guarda la clave y entrega únicamente esa clave al equipo correspondiente.
3. En Render crea un Blueprint usando el `render.yaml` de la raíz. Alternativamente crea un Web Service Docker con Dockerfile `bautismo-api/Dockerfile` y contexto `bautismo-api`. Elige el plan de alojamiento que corresponda a tu uso.
4. Configura estas variables exclusivamente en el servicio:

```dotenv
DATABASE_URL=postgresql://USUARIO:CLAVE@HOST/neondb?sslmode=verify-full
SYNC_API_TOKEN_HASHES=["HASH_DEL_EQUIPO_1","HASH_DEL_EQUIPO_2"]
```

Usa la conexión real de Neon y los hashes generados. El arreglo debe ser JSON válido. La cuenta PostgreSQL necesita permisos para crear y alterar las tablas al iniciar. Las claves sin hash nunca se incluyen en el repositorio ni en el instalador.

5. Despliega. Comprueba que `https://TU-SERVICIO.onrender.com/healthz` responde `{"ok":true}`. Las rutas `/v1/*` deben devolver 401 sin clave. La comprobación `/healthz` verifica el proceso de la API y **no consulta Neon**, para no mantener su cómputo activo.
6. En cada escritorio abre **Respaldo y migración → Conexión a la API privada**, introduce la dirección HTTPS del servicio, la clave de ese equipo y tu contraseña de respaldo. Pulsa **Guardar conexión y reiniciar**.

La URL aún está vacía en `electron/cloud-public.json` porque depende de dónde publiques la API. Cuando tengas la dirección definitiva, puedes incluirla en ese archivo y generar nuevamente el instalador: los usuarios solo tendrán que introducir su clave de activación. No hay ninguna contraseña de Neon en ese archivo.

Para revocar un equipo elimina su hash de SYNC_API_TOKEN_HASHES y reinicia el servicio. Cada clave autoriza acceso a todos los certificados de esta instalación compartida; no implementa permisos por usuario o parroquia. Una clave filtrada debe revocarse.

## Sincronización y consumo

- Se sincroniza una vez al abrir la aplicación, después de crear/editar/eliminar certificados, cuando Windows/navegador informa una reconexión, al reanudar el computador y al pulsar el botón manual.
- **No existe un ciclo de sincronización cada 15 segundos ni otro sondeo periódico de la API.** Si un intento falla, conserva los pendientes hasta el próximo evento o una sincronización manual.
- Los eventos de red indican cambios de conectividad del sistema; no detectan todos los casos de caída del proveedor de Internet si el Wi-Fi sigue conectado. En ese caso usa el botón manual cuando vuelva el servicio. Un servidor que está arrancando puede requerir otro intento si tarda más de 20 segundos.
- La consulta visual del estado local cada 5 segundos y los respaldos locales no llaman a la API ni a Neon.
- Cada evento vacía todos los lotes pendientes, de hasta 50 operaciones por solicitud. Las descargas están paginadas en 200 certificados y usan un cursor que se guarda junto con los datos en SQLite.
- Solo se descargan cambios posteriores al cursor, incluidas las eliminaciones. Las transacciones ordenan los cursores para no omitir cambios concurrentes. Se conservan la detección de conflictos y los reintentos sin duplicados.
- Sin sondeo periódico, un computador que permanece abierto y sin actividad no recibe de inmediato las ediciones de otro. Pulsa **Sincronizar ahora** para recibirlas y recarga la lista.
- Neon puede suspender su cómputo cuando no hay consultas de esta API ni de otros clientes. Esto reduce actividad innecesaria, pero no garantiza una cantidad específica de CU-h y el alojamiento de la API se factura por separado según el servicio elegido.

## Desarrollo y pruebas

Desde el repositorio completo instala dependencias en `bautismo-backend` y en `bautismo-api`. Ejecuta `npm test` dentro de `bautismo-api` o `npm run test:sync` dentro de `bautismo-backend`.

Las pruebas ejecutan una API HTTP local autenticada con PostgreSQL mediante PGlite y varias copias SQLite. Verifican rechazo sin credenciales, aislamiento de la identidad de base, escritura offline, reconexión, conflictos, pérdida de confirmación, descarga incremental, paginación, múltiples lotes y ausencia de consultas durante más de 15 segundos de reposo. No utilizan tu base de Neon.

Para probar únicamente la API con PostgreSQL local/Neon, configura sus variables y ejecuta `npm start`. Para alojarla fuera de Render, usa el Dockerfile detrás de HTTPS y proporciona las mismas variables. `/healthz` no prueba la disponibilidad de PostgreSQL; los fallos reales de datos se devuelven como 503 en las rutas protegidas.

Referencias: [Docker en Render](https://render.com/docs/docker), [configuración de servicios](https://render.com/docs/web-services), [eventos de conexión de Electron](https://www.electronjs.org/docs/latest/tutorial/online-offline-events/).
