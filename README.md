# BautiSacrum

**BautiSacrum** es una aplicación de escritorio desarrollada para la gestión de certificados de bautismo.

El proyecto integra un **frontend desarrollado con React + TypeScript + Vite**, un **backend desarrollado con Node.js + Express + SQLite** y **Electron** como capa de escritorio para ejecutar y empaquetar la aplicación.

---

## Arquitectura

El proyecto está dividido en tres partes principales:

```text
Carpeta principal/
│
├── iglesia-bautismo-frontend/   # Interfaz de usuario
├── bautismo-backend/            # API y base de datos
├── electron/                    # Integración con Electron
│   ├── main.js
│   └── preload.js
├── build/                       # Recursos para la aplicación
│   └── icon.ico
└── package.json                 # Configuración principal
```

### Componentes

- **Frontend:** React, TypeScript, Vite y Tailwind CSS.
- **Backend:** Node.js, Express y SQLite.
- **Electron:** Integra el frontend y backend y permite ejecutar la aplicación como software de escritorio.
- **Electron Builder:** Genera el instalador para Windows.

---

## Instalación para desarrollo

1. Clona el repositorio:

   ```bash
   git clone https://github.com/tu-usuario/bautisacrum.git
   ```

2. Entra a la carpeta principal:

   ```bash
   cd bautisacrum
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

---

## Ejecutar en desarrollo

Para iniciar el frontend y Electron simultáneamente:

```bash
npm run dev
```

Este comando inicia el servidor de desarrollo de Vite y posteriormente abre Electron cuando el frontend está disponible.

El backend puede iniciarse mediante:

```bash
npm run backend
```

Durante la ejecución, el backend utiliza el puerto **4000** y el frontend de desarrollo utiliza el puerto **5173**.

---

## Funcionamiento de Electron

Al iniciar la aplicación, Electron se encarga de:

1. Iniciar el servidor backend.
2. Esperar a que el backend esté disponible.
3. Crear la ventana principal de la aplicación.
4. Cargar el frontend de React.
5. Proporcionar al frontend la URL de la API.
6. Cerrar el proceso del backend cuando se cierra la aplicación.

En producción, Electron carga directamente el frontend compilado mediante Vite.

```text
Usuario
   ↓
BautiSacrum
   ↓
Electron
   ├── Inicia Backend
   │       ↓
   │   Express + SQLite
   │
   └── Carga Frontend
           ↓
       React + Vite
           ↓
      API localhost:4000
```

---

## Preload y comunicación

Electron utiliza un archivo `preload.js` para proporcionar al frontend acceso controlado a determinadas funciones de Electron.

La aplicación utiliza:

- `contextIsolation: true`
- `nodeIntegration: false`

Esto permite mantener separado el entorno de Node.js del código que se ejecuta en la interfaz.

---

## Generar la aplicación

Para generar una versión de producción:

```bash
npm run dist
```

Este comando:

1. Compila el frontend.
2. Ejecuta **Electron Builder**.
3. Incluye el frontend, backend, Electron y recursos necesarios.
4. Genera el instalador para Windows.

Los archivos generados se encuentran en:

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

La aplicación se distribuye como un instalador de Windows con el nombre:

**BautiSacrum**

El icono utilizado para la aplicación y el instalador se encuentra en:

```text
build/icon.ico
```

---

## Repositorios

### Frontend

👉 [BautiSacrum Frontend](https://github.com/tu-usuario/iglesia-bautismo-frontend)

### Backend

👉 [BautiSacrum Backend](https://github.com/tu-usuario/bautismo-backend)

---

## Tecnologías principales

- **Electron**
- **Electron Builder**
- **React**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Node.js**
- **Express**
- **SQLite**
- **NSIS**

---

## Licencia

Este proyecto es de uso personal y educativo. 🚫 No está destinado para uso comercial sin autorización.
