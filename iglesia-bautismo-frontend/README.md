# BautiSacrum Frontend

Este es el **frontend** de **BautiSacrum**, una aplicación de escritorio para la gestión de certificados de bautismo.

Está desarrollado con **React + TypeScript + Vite** y utiliza **Tailwind CSS** para la interfaz.

El frontend se comunica mediante **Axios** con un backend desarrollado con **Node.js + Express**, encargado de gestionar los datos almacenados en **SQLite** y coordinar la sincronización con la nube.

La aplicación completa integra **frontend, backend local, API REST, Electron y almacenamiento en la nube**. Electron funciona como la capa de escritorio encargada de ejecutar y empaquetar la aplicación.

---

## Tecnologías utilizadas

- **React** – Biblioteca principal para la interfaz.
- **TypeScript** – Tipado estático y definición de tipos.
- **Vite** – Herramienta de desarrollo y construcción.
- **Tailwind CSS** – Diseño y estilos de la interfaz.
- **React Router** – Navegación entre las diferentes vistas.
- **Axios** – Comunicación con la API del backend.
- **Recharts** – Creación de gráficos y estadísticas.
- **Framer Motion** – Animaciones de la interfaz.
- **jsPDF / PDF.js** – Generación y visualización de documentos PDF.
- **Lucide React** – Iconos de la interfaz.
- **Electron** – Capa de escritorio utilizada para ejecutar y empaquetar la aplicación.

---

## Instalación y configuración

1. Clona este repositorio:

   ```bash
   git clone https://github.com/Ronald1928/iglesia-bautismo-frontend.git
   ```

2. Entra a la carpeta del proyecto:

   ```bash
   cd iglesia-bautismo-frontend
   ```

3. Instala las dependencias:

   ```bash
   npm install
   ```

---

## Ejecutar en desarrollo

Para iniciar el frontend en modo desarrollo:

```bash
npm run dev
```

---

## Construcción del proyecto

Para generar la versión de producción:

```bash
npm run build
```

Este comando verifica los tipos de TypeScript y genera la versión optimizada del proyecto mediante Vite.

Para ejecutar una vista previa de la versión de producción:

```bash
npm run preview
```

---

## Funcionalidades principales

- Registro y gestión de certificados de bautismo.
- Búsqueda de certificados.
- Vista previa de certificados.
- Generación y visualización de documentos PDF.
- Estadísticas de bautismos mediante gráficos.
- Navegación entre las diferentes secciones de la aplicación.
- Visualización del estado de sincronización de los datos.
- Información de la aplicación y del desarrollador.
- Componentes reutilizables para la interfaz.

---

## Estado de sincronización

El frontend muestra información relacionada con el estado de sincronización de los datos.

La aplicación puede continuar funcionando localmente mediante SQLite aunque no exista conexión a Internet.

Cuando la conexión vuelve a estar disponible, el backend sincroniza los cambios pendientes con PostgreSQL en la nube.

El frontend permite al usuario conocer visualmente el estado de este proceso.

La lógica de sincronización no se ejecuta directamente desde el frontend, sino desde el backend de BautiSacrum.

---

## Estructura del frontend

```text
src/
├── assets/           # Recursos estáticos
├── components/       # Componentes reutilizables
│   └── ui/           # Componentes básicos de interfaz
├── config/           # Configuración de la API
├── hooks/            # Hooks personalizados
├── layout/           # Estructura general de la aplicación
├── pages/            # Páginas y vistas
│   └── acerca/       # Información de la aplicación
├── types/            # Tipos e interfaces TypeScript
├── App.tsx
└── main.tsx
```

---

## Backend

[Ver repositorio del backend](https://github.com/Ronald1928/bautismo-backend-escritorio)

---

## Aplicación de escritorio

[Ver repositorio principal de BautiSacrum](https://github.com/Ronald1928/bautisacrum)

---

## Licencia

Este proyecto es de uso personal y educativo. 🚫 No está destinado para uso comercial sin autorización.
