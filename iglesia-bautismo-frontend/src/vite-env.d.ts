/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    cloudConfigured: () => Promise<boolean>;
    cloudPublicUrl: () => Promise<string>;
    configureCloud: (
      url: string,
      token: string,
      password: string,
    ) => Promise<{ ok: boolean }>;
    getConfig: (callback: (data: { API_URL: string }) => void) => void;
    tieneContrasenaRespaldo: () => Promise<boolean>;
    configurarContrasenaRespaldo: (
      password: string,
    ) => Promise<{ configured: boolean }>;
    verificarContrasenaRespaldo: (password: string) => Promise<boolean>;
    exportarBaseDatos: (
      password: string,
    ) => Promise<{ canceled: boolean; filePath?: string }>;
    importarBaseDatos: (password: string) => Promise<{ canceled: boolean }>;
  };
}
