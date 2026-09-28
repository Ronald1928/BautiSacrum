import { useState, useRef } from "react";
import axios from "axios";
import type { FormData } from "../types/form";
import API_URL from "../config";

export function useCertificado(
  initialForm: FormData,
  onSaved?: (certificado: FormData) => void,
) {
  const [form, setForm] = useState<FormData>(initialForm);
  const [mensaje, setMensaje] = useState<string>("");
  const [mensajeError, setMensajeError] = useState<string>("");
  const [mensajeValidarError, setMensajeValidarError] = useState<string>("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const checkIdTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    const newForm = { ...form, [name]: value }; // usa newForm en vez de form

    setForm(newForm);

    if (
      name === "numeroArchivo" ||
      name === "libroBautizo" ||
      name === "folioBautizo"
    ) {
      // Solo validar si los tres campos están completos
      if (
        !newForm.numeroArchivo ||
        !newForm.libroBautizo ||
        !newForm.folioBautizo
      ) {
        setMensajeValidarError("");
        return;
      }

      // Debounce de 300ms
      if (checkIdTimeout.current) clearTimeout(checkIdTimeout.current);
      checkIdTimeout.current = setTimeout(async () => {
        try {
          const response = await axios.get(
            `${API_URL}/api/certificados_bautismo/check-id`,
            {
              params: {
                libroBautizo: newForm.libroBautizo,
                folioBautizo: newForm.folioBautizo,
                numeroArchivo: newForm.numeroArchivo,
              },
            },
          );

          if (!response.data.available) {
            setMensajeValidarError(
              "⚠️ Ya existe un certificado con ese Número de Archivo, Libro y Folio",
            );
          } else {
            setMensajeValidarError(""); // ✅ Disponible
          }
        } catch (err) {
          console.error("Error validando ID:", err);
          setMensajeValidarError("❌ Error de conexión al validar ID");
        }
      }, 300);
    }
  };

  const handleVistaPrevia = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/api/certificados_bautismo/vista-previa`,
        form,
        { responseType: "blob" },
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      setPdfUrl(url);
      window.open(url); // Abrir en nueva pestaña
    } catch (error) {
      console.error("Error generando vista previa:", error);
    }
  };

  const guardarBautismoBD = async () => {
    try {
      await axios.post(`${API_URL}/api/certificados_bautismo`, form);
      onSaved?.(form);
      setPdfUrl(null);
      // reset form
      setForm(initialForm);

      setMensaje("✅ El bautismo se guardó correctamente.");
      setTimeout(() => setMensaje(""), 9000);
    } catch (error) {
      console.error("Error al guardar el bautismo:", error);
      setMensajeError("❌ Error al guardar el bautismo.");
      setTimeout(() => setMensajeError(""), 9000);
    }
  };

  const generarPdf = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/api/certificados_bautismo/generar-certificado`,
        form,
        { responseType: "blob" },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "certificado_bautismo.pdf");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onSaved?.(form);
      setPdfUrl(null);

      // reset form
      setForm(initialForm);

      setMensaje("✅ El certificado se descargó correctamente.");
      setTimeout(() => setMensaje(""), 9000);
    } catch (error) {
      console.error("Error al generar el certificado:", error);
      setMensajeError("❌ Error al generar el certificado.");
      setTimeout(() => setMensajeError(""), 9000);
    }
  };

  return {
    form,
    setForm,
    mensaje,
    setMensaje,
    mensajeError,
    setMensajeError,
    mensajeValidarError,
    setMensajeValidarError,
    pdfUrl,
    handleChange,
    handleVistaPrevia,
    generarPdf,
    guardarBautismoBD,
  };
}
