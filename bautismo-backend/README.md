# BautiSacrum Backend

Este es el **backend** de BautiSacrum, una aplicación de escritorio para la gestión de certificados de bautismo.

Está desarrollado con **Node.js + Express** y utiliza **SQLite** como base de datos.

El backend permite que BautiSacrum funcione incluso sin conexión a Internet. Los cambios realizados localmente se almacenan primero en SQLite y, cuando existe conexión, pueden sincronizarse con PostgreSQL en Neon mediante una API REST remota.

El sistema soporta diferentes modos de conexión mediante DB_PROVIDER, permitiendo trabajar únicamente con SQLite, utilizar PostgreSQL o combinar almacenamiento local y sincronización con la nube.

---

## Estructura del proyecto

```text
bautismo-backend/
│
├── controllers/
│   └── bautismoController.js   # Lógica de las operaciones de bautismo
│
├── database/
│   └── databaseBautismo.sqlite # Base de datos SQLite
│
├── models/
│   └── bautismoModel.js        # Acceso y operaciones con los datos
│
├── pdf/
│   └── generarPdf.js            # Generación de certificados en PDF
│
├── public/
│   └── logo/                    # Recursos utilizados en los certificados
│
├── routes/
│   └── bautismoRoutes.js        # Rutas de la API
│
├── scripts/
│   └── migrate-to-neon.js       # Scripts de migración y preparación de datos
│
├── services/
│   └── backupService.js         # Servicio de copias de seguridad
│
├── .env                         # Variables de entorno
├── .gitignore
├── dbConnection.js              # Configuración de SQLite, PostgreSQL y Sync
├── postgresAdapter.js           # Adaptador para PostgreSQL
├── syncApiClient.js             # Comunicación con la API REST remota
├── syncDataClient.js            # Gestión de la sincronización de datos
├── schema.js                    # Esquemas para SQLite y PostgreSQL
├── server.js                    # Punto de entrada del servidor
├── package.json
└── README.md
```

---

## Funcionamiento

Las diferentes partes del backend cumplen las siguientes funciones:

- **Routes:** Define los endpoints disponibles para el frontend.
- **Controllers:** Gestiona la lógica de las solicitudes recibidas.
- **Models:** Se encarga de las operaciones relacionadas con los datos.
- **Database:** Almacena los registros de bautismo utilizando SQLite.
- **PDF:** Genera los certificados en formato PDF.
- **Services:** Contiene servicios adicionales, como el sistema de copias de seguridad.
- **Scripts:** contiene utilidades para migración y preparación de datos.
- **Public:** almacena recursos utilizados por el backend, como el logo.
- **dbConnection.js:** determina qué proveedor de datos utilizar.
- **postgresAdapter.js:** adapta las operaciones del backend para trabajar con PostgreSQL.
- **syncApiClient.js:** realiza la comunicación con la API REST remota.
- **syncDataClient.js:** administra el proceso de sincronización entre los datos locales y la nube.
- **schema.js:** contiene las estructuras necesarias para SQLite y PostgreSQL.

---

## Base de datos

BautiSacrum utiliza **SQLite**, para mantener una copia local de los certificados.

Esto permite que la aplicación continúe funcionando aunque el equipo no tenga conexión a Internet.

La base de datos inicial se encuentra en:

database/databaseBautismo.sqlite

Durante la ejecución de la aplicación puede utilizarse una ubicación externa configurada mediante las variables de entorno correspondientes.

La conexión es gestionada desde:

dbConnection.js

SQLite utiliza además:

PRAGMA busy_timeout = 5000

para esperar temporalmente cuando la base de datos se encuentra bloqueada por otra operación.

---

## Generación de certificados

El backend incluye un módulo encargado de generar los certificados de bautismo en formato PDF:

```text
pdf/generarPdf.js
```

Este módulo utiliza los datos almacenados en la base de datos y los recursos disponibles en `public/` para generar los documentos correspondientes.

---

## Configuración de la conexión

dbConnection.js permite utilizar diferentes proveedores mediante:

DB_PROVIDER=

Actualmente se admiten tres modos:

sqlite
postgres
sync

---

## Modo SQLite

DB_PROVIDER=sqlite

Utiliza únicamente SQLite.

Frontend
↓
Backend
↓
SQLite

Este modo no requiere conexión a Internet.

---

## Modo PostgreSQL

DB_PROVIDER=postgres

Permite trabajar con PostgreSQL utilizando la variable:

DATABASE_URL=postgresql://...

La comunicación se realiza mediante el paquete:

pg

y las operaciones se adaptan utilizando:

postgresAdapter.js

---

## Modo Sync

DB_PROVIDER=sync

Este es el modo que combina almacenamiento local y sincronización con la nube.

Los certificados se almacenan primero en SQLite.

Cuando existe conexión a Internet, el sistema sincroniza los cambios pendientes con la API REST.

De esta manera, la aplicación puede continuar funcionando sin conexión y actualizar posteriormente la base de datos remota.

---

## Sincronización de datos

El backend contiene la lógica necesaria para coordinar el almacenamiento local con PostgreSQL.

Los componentes principales involucrados son:

dbConnection.js
│
↓
SQLite local
│
↓
syncDataClient.js
│
↓
syncApiClient.js
│
↓
API REST
│
↓
PostgreSQL / Neon

**syncApiClient.js**

Se encarga de realizar las solicitudes hacia la API REST remota.

Utiliza la configuración definida mediante variables como:

SYNC_API_URL=
SYNC_API_TOKEN=

La aplicación de escritorio no necesita conectarse directamente a PostgreSQL utilizando las credenciales de Neon.

**syncDataClient.js**

Gestiona la lógica relacionada con la sincronización de los registros.

Su función permite conservar los datos localmente y enviar posteriormente los cambios pendientes cuando la conexión remota vuelve a estar disponible.

Esto permite un funcionamiento del tipo:

Sin Internet
↓
Registrar o modificar certificado
↓
SQLite local
↓
Cambio pendiente
↓
Internet disponible
↓
Sincronización
↓
API REST
↓
PostgreSQL Neon

**Borrado lógico y sincronización**

Los registros sincronizados utilizan un sistema de borrado lógico.

En lugar de eliminar inmediatamente el registro remoto de PostgreSQL, se utiliza un estado como:

sync_deleted = false

para registros activos y:

sync_deleted = true

para registros eliminados.

Este mecanismo permite que el sistema de sincronización conozca que un registro existió y posteriormente fue eliminado.

Es especialmente importante para evitar que registros borrados vuelvan a aparecer durante sincronizaciones posteriores.

**Adaptador PostgreSQL**

El archivo:

postgresAdapter.js

permite adaptar las operaciones utilizadas por el backend para trabajar con PostgreSQL.

Esto ayuda a mantener una interfaz de acceso a datos similar independientemente del proveedor configurado.

De esta manera, el resto de la aplicación no necesita implementar una lógica completamente distinta para cada motor de base de datos.

**Esquemas de base de datos**

El archivo:

schema.js

contiene las definiciones necesarias para inicializar las estructuras utilizadas por SQLite y PostgreSQL.

Esto permite mantener separadas las diferencias entre ambos motores:

sqliteSchema
postgresSchema

y evita mantener toda la definición de tablas directamente dentro de dbConnection.js.

**Scripts de migración**

La carpeta:

scripts/

contiene las herramientas utilizadas para procesos relacionados con la migración de los datos existentes hacia PostgreSQL en Neon.

El objetivo de estos scripts es permitir trasladar los registros almacenados inicialmente en SQLite a la nueva infraestructura PostgreSQL.

Estos scripts están destinados principalmente a tareas de preparación, migración y mantenimiento y no forman parte del flujo habitual utilizado por el usuario final.

**API REST remota**

La sincronización con PostgreSQL no se realiza conectando directamente el backend local con las credenciales de Neon.

La arquitectura utiliza una API REST independiente:

BautiSacrum Backend
↓
syncApiClient.js
↓
API REST
↓
Render
↓
PostgreSQL Neon

La API se encuentra en el componente:

bautismo-api/

del proyecto principal.

Esto permite separar:

bautismo-backend/
→ Backend local de la aplicación

bautismo-api/
→ Servicio remoto de sincronización

**Funcionamiento offline**

Una de las principales características del backend es que la disponibilidad de Internet no impide utilizar BautiSacrum.

Los cambios permanecen almacenados localmente.

Cuando vuelve Internet:

SQLite
↓
Sistema Sync
↓
API REST
↓
PostgreSQL Neon

Los registros pendientes pueden sincronizarse automáticamente con la nube.

## Copias de seguridad

BautiSacrum cuenta con un sistema de copias de seguridad automáticas independiente de la sincronización con Neon.

El servicio se encuentra en:

services/backupService.js

Las copias se almacenan en una carpeta independiente:

BackupsBautiSacrum/

El sistema:

- Crea la carpeta automáticamente si no existe.
- Realiza copias de SQLite cada 6 horas.
- Guarda la fecha de la última copia realizada.
- Conserva un máximo de 10 copias.
- Elimina automáticamente las copias más antiguas cuando se supera
  el límite establecido.

Las copias se generan como archivos `.sqlite`, por lo que pueden
utilizarse como respaldo de la base de datos de la aplicación.

---

## Instalación

1. Clona este repositorio:

   ```bash
   git clone https://github.com/tu-usuario/bautismo-backend.git
   ```

2. Entra a la carpeta:

   ```bash
   cd bautismo-backend
   ```

3. Instala las dependencias:

   ```bash
   npm install
   ```

Las dependencias necesarias se encuentran definidas en `package.json`.

---

## Ejecutar el servidor

Para iniciar el backend:

```bash
node server.js
```

El servidor se ejecuta localmente y proporciona la API utilizada por el frontend.

En la aplicación de escritorio, **Electron se encarga de iniciar el backend automáticamente** al ejecutar BautiSacrum.

---

## Frontend

[Ver repositorio del frontend](https://github.com/Ronald1928/iglesia-bautismo-frontend)

---

## Aplicación de escritorio

[Ver repositorio principal de BautiSacrum](https://github.com/Ronald1928/BautiSacrum)

---

## Licencia

Este proyecto es de uso personal y educativo. 🚫 No está destinado para uso comercial sin autorización.
