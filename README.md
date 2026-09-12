# BautiSacrum

**BautiSacrum** es una aplicación de escritorio desarrollada para la gestión de certificados de bautismo.

La aplicación permite registrar, buscar, actualizar, eliminar y generar certificados, además de consultar estadísticas y trabajar incluso sin conexión a Internet.

El proyecto integra un **frontend desarrollado con React + TypeScript + Vite**, un **backend desarrollado con Node.js + Express**, una base de datos **SQLite para almacenamiento local**, **PostgreSQL en Neon para almacenamiento en la nube** y **Electron** como capa de escritorio para ejecutar y empaquetar la aplicación.

La sincronización entre la base de datos local y PostgreSQL se realiza mediante una **API REST desplegada en Render**, permitiendo que la aplicación continúe funcionando sin conexión y sincronice posteriormente los cambios cuando Internet vuelva a estar disponible.

---

## Versión actual

**BautiSacrum 1.1.0**

Esta versión incorpora almacenamiento local y en la nube, sincronización de datos, funcionamiento offline, copias de seguridad automáticas, estadísticas y mejoras generales de estabilidad.

---

## Arquitectura

El proyecto está dividido principalmente en frontend, backend, integración con Electron y servicios de almacenamiento y sincronización.

```text
Carpeta principal/
│
├── iglesia-bautismo-frontend/    # Interfaz de usuario
│
├── bautismo-backend/             # Backend, SQLite y sincronización
│
├── bautismo-api/                 # API REST para sincronización con la nube
│
├── electron/                     # Integración con Electron
│
├── build/                        # Recursos para la aplicación
│
├── render.yaml                   # Configuración de despliegue en Render
│
├── package.json                  # Configuración principal
└── README.md
```

### Componentes principales

- **Frontend:** React, TypeScript, Vite y Tailwind CSS.
- **Backend:** Node.js y Express.
- **API REST:** Node.js y Express, con `pg` para la conexión a PostgreSQL y `dotenv` para la gestión de variables de entorno.
- **Base de datos local:** SQLite.
- **Base de datos en la nube:** PostgreSQL mediante Neon.
- **Sincronización:** API REST para sincronizar SQLite con PostgreSQL.
- **Despliegue de la API:** Render.
- **Electron:** Integra el frontend y el backend y permite ejecutar la aplicación como software de escritorio.
- **Electron Builder:** Genera el instalador de Windows.
- **NSIS:** Sistema utilizado para crear el instalador.
- **Generación de documentos:** Puppeteer y librerías relacionadas con PDF.
- **Corrección ortográfica:** nspell y dictionary-es.

---

## Arquitectura de datos

SQLite actúa como la base de datos principal disponible localmente en el equipo.

Cuando existe conexión a Internet, los cambios se sincronizan con PostgreSQL en Neon mediante una API REST desplegada en Render.

Esto permite que la aplicación continúe funcionando aunque no exista conexión a Internet.

---

## Funcionamiento offline y sincronización

Una de las características principales de BautiSacrum es que no depende permanentemente de Internet.

Cuando el equipo no tiene conexión:

```text
BautiSacrum
     ↓
SQLite
     ↓
Datos almacenados localmente
```

Los certificados pueden continuar siendo registrados, consultados y modificados.

Cuando la conexión vuelve a estar disponible:

```text
SQLite
   ↓
Sistema de sincronización
   ↓
API REST
   ↓
PostgreSQL / Neon
```

Los cambios pendientes son enviados automáticamente a la base de datos en la nube.

La aplicación utiliza también un sistema de **borrado lógico** para mantener la consistencia durante la sincronización. Los registros eliminados se identifican mediante el estado `sync_deleted`.

---

## Instalación para desarrollo

1. Clona el repositorio:

```bash
git clone https://github.com/Ronald1928/BautiSacrum.git
```

2. Entra a la carpeta principal:

```bash
cd BautiSacrum
```

3. Instala las dependencias del proyecto raíz:

```bash
npm install
```

4. Instala las dependencias del frontend:

```bash
cd iglesia-bautismo-frontend
npm install
cd ..
```

5. Instala las dependencias del backend si corresponde:

```bash
cd bautismo-backend
npm install
cd ..
```

6. Instala las dependencias de la API si corresponde:

```bash
cd bautismo-api
npm install
cd ..
```

---

## Variables de entorno

El sistema utiliza variables de entorno para determinar el proveedor de base de datos y los servicios de sincronización.

Ejemplo conceptual:

```env
DB_PROVIDER=sync

DATABASE_URL=postgresql://...

SYNC_API_URL=https://...

SYNC_API_TOKEN=...
```

Los valores reales de conexión no deben almacenarse públicamente en el repositorio.

El archivo `.env` debe mantenerse fuera del control de versiones cuando contenga credenciales o información privada.

---

## Modos de base de datos

BautiSacrum admite diferentes configuraciones mediante `DB_PROVIDER`.

### SQLite

```env
DB_PROVIDER=sqlite
```

Utiliza únicamente SQLite de manera local.

### PostgreSQL

```env
DB_PROVIDER=postgres
```

Utiliza PostgreSQL como proveedor de base de datos.

### Sincronización

```env
DB_PROVIDER=sync
```

Utiliza SQLite localmente y sincroniza los datos con PostgreSQL en la nube.

---

## Ejecutar en desarrollo

Para iniciar el frontend y Electron simultáneamente:

```bash
npm run dev
```

Este comando inicia el servidor de desarrollo de Vite y posteriormente abre Electron cuando el frontend está disponible.

Durante el desarrollo:

- El backend local utiliza el puerto **4000**.
- Vite utiliza el puerto **5173**.

---

## Funcionamiento de la aplicación

El flujo general de la aplicación es:

1. Se inicia el backend.
2. Node.js ejecuta `bautismo-backend/server.js`.
3. El backend queda disponible localmente.
4. Electron comprueba que el backend esté disponible.
5. Electron carga la interfaz desarrollada con React.
6. El frontend realiza solicitudes al backend mediante HTTP.
7. Los datos se almacenan primero en SQLite.
8. Cuando existe conexión a Internet, el sistema sincroniza los cambios con la API REST.
9. La API desplegada en Render comunica los cambios con PostgreSQL en Neon.

---

## Inicio automático del backend

BautiSacrum no requiere que el usuario inicie manualmente el backend.

Electron se encarga de iniciar el servidor Node.js automáticamente al abrir la aplicación.

Esto permite que la aplicación funcione como un programa de escritorio convencional, sin necesidad de abrir terminales o ejecutar comandos adicionales.

---

## Copias de seguridad

BautiSacrum incluye un sistema independiente de copias de seguridad automáticas para proteger los registros almacenados localmente en SQLite.

Las copias se almacenan en:

```text
BackupsBautiSacrum/
```

El sistema:

- Realiza una copia automática cada **6 horas**.
- Conserva un máximo de **10 copias**.
- Elimina automáticamente las copias más antiguas cuando se supera el límite.
- Registra la fecha de la última copia realizada.
- Genera copias consistentes de la base de datos mediante SQLite.
- Funciona independientemente de la conexión con Neon.

Los backups se generan como archivos:

```text
backup-YYYY-MM-DDTHH-mm-ss.sqlite
```

---

## Gestión de certificados

BautiSacrum permite:

- Registrar certificados de bautismo.
- Buscar certificados existentes.
- Actualizar información.
- Eliminar certificados.
- Generar certificados en PDF.
- Consultar información almacenada localmente.
- Sincronizar registros con PostgreSQL.
- Continuar trabajando sin conexión a Internet.

Los registros eliminados utilizan borrado lógico durante la sincronización mediante:

```text
sync_deleted
```

Esto permite mantener la consistencia entre SQLite y PostgreSQL.

---

## Estadísticas

La aplicación incluye un módulo de estadísticas que permite consultar información de los bautismos registrados.

Entre los datos disponibles se encuentran:

- Total de bautismos por año.
- Distribución mensual.
- Clasificación por género.
- Clasificación por grupos de edad.
- Resumen general anual.

La información se presenta mediante gráficos y tarjetas estadísticas.

---

## Generación de certificados PDF

BautiSacrum permite generar certificados en formato PDF utilizando los datos almacenados en la base de datos.

La generación de documentos utiliza principalmente **Puppeteer**, junto con herramientas complementarias para trabajar con documentos PDF desde el frontend.

---

## Corrección ortográfica

La aplicación incorpora herramientas de corrección ortográfica en español mediante:

- `nspell`
- `dictionary-es`

Estas librerías permiten detectar posibles errores ortográficos en determinados campos de texto antes de generar los certificados.

---

## Generar la aplicación

Para generar una versión de producción:

```bash
npm run dist
```

Este comando:

1. Compila el frontend con Vite.
2. Ejecuta **Electron Builder**.
3. Incluye el frontend, backend, Electron y los recursos necesarios.
4. Genera el instalador para Windows.

Los archivos generados se almacenan en:

```text
release/
```

La aplicación utiliza **NSIS** como sistema de instalación.

El instalador permite:

- Elegir el directorio de instalación.
- Crear un acceso directo en el escritorio.
- Crear un acceso directo en el menú Inicio.
- Desinstalar BautiSacrum desde Windows.

---

## Aplicación para Windows

La aplicación se distribuye mediante un instalador de Windows con el nombre:

**BautiSacrum**

El icono utilizado por la aplicación y el instalador se encuentra en:

```text
build/icon.ico
```

---

## Tecnologías principales

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

### Backend

- Node.js
- Express
- CORS
- dotenv
- Axios
- `sqlite3`

### API REST

- Node.js
- Express
- `pg`
- dotenv

### Bases de datos

- SQLite
- PostgreSQL
- Neon

### Nube y sincronización

- Neon
- Render
- API REST

### Escritorio

- Electron
- Electron Builder
- NSIS

### Documentos y PDF

- Puppeteer
- jsPDF
- html2pdf.js
- html2canvas
- React PDF Viewer

### Interfaz y visualización

- Recharts
- Lucide React
- Framer Motion

### Corrección ortográfica

- nspell
- dictionary-es

---

## Entorno de desarrollo

El proyecto ha sido desarrollado principalmente utilizando:

- Visual Studio Code
- Git
- GitHub
- npm

---

## Repositorios

### Repositorio principal

[BautiSacrum](https://github.com/Ronald1928/BautiSacrum)

### Frontend

[BautiSacrum Frontend](https://github.com/Ronald1928/bautismo-frontend-escritorio)

### Backend

[BautiSacrum Backend](https://github.com/Ronald1928/bautismo-backend-escritorio)

---

## Licencia

Este proyecto es de uso personal y educativo.

🚫 No está destinado para uso comercial sin autorización.
