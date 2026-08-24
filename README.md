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
├── package.json                 # Configuración principal
├── iniciar_backend.vbs          # Inicio del backend en segundo plano
└── README.md
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

---

## Ejecutar en desarrollo

Para iniciar el frontend y Electron simultáneamente:

```bash
npm run dev
```

Este comando inicia el servidor de desarrollo de Vite y posteriormente abre Electron cuando el frontend está disponible.

Antes de iniciar la aplicación, el backend debe estar disponible en el puerto 4000. Para ello, puede utilizarse el archivo:

```bash
iniciar_backend.vbs
```

Durante la ejecución, el backend utiliza el puerto **4000** y el frontend de desarrollo utiliza el puerto **5173**.

---

## Funcionamiento de la aplicación

El flujo de inicio es:

1. Se inicia el backend mediante iniciar_backend.vbs.
2. Node.js ejecuta bautismo-backend/server.js.
3. El backend queda disponible en el puerto 4000.
4. Electron comprueba que el backend esté disponible.
5. Una vez que responde, Electron carga la interfaz de React.
6. El frontend realiza las solicitudes a la API mediante HTTP.

En producción, Electron carga directamente el frontend compilado mediante Vite.

```text
                     Usuario
                        ↓
                    BautiSacrum
                         │
          ┌──────────────┴──────────────┐
          │                             │
          ↓                             ↓
iniciar_backend.vbs                 Electron
          │                             │
          ↓                             ↓
     Node.js                       Espera al
     server.js                   backend :4000
          │                             │
          └──────────────┬──────────────┘
                         ↓
                  localhost:4000
                         │
                         ↓
                  React Frontend
```

---

## Inicio del backend

El archivo:

```text
iniciar_backend.vbs
```

permite iniciar el servidor backend utilizando Windows Script Host (VBScript).

El script ejecuta server.js mediante Node.js y mantiene el proceso ejecutándose en segundo plano sin mostrar una ventana de consola.

Su función principal es permitir que el backend esté disponible antes de que Electron cargue completamente la aplicación.

---

## Copias de seguridad

BautiSacrum incluye un sistema de copias de seguridad automáticas para proteger los registros almacenados en la base de datos SQLite.

Las copias se almacenan en una carpeta independiente:

```text
BackupsBautiSacrum/
```

El sistema:

- Realiza copias de la base de datos cada 8 horas.
- Conserva un máximo de 10 copias.
- Elimina automáticamente las copias más antiguas cuando se supera el límite.
- Guarda la fecha de la última copia realizada.

Las copias se generan como archivos .sqlite.

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

[BautiSacrum Frontend](https://github.com/Ronald1928/bautismo-frontend-escritorio)

### Backend

[BautiSacrum Backend](https://github.com/Ronald1928/bautismo-backend-escritorio)

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
