import PdfPreview from "../components/PdfPreview";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useCertificado } from "../hooks/useCertificado";
import API_URL from "../config";
import Input from "./ui/Input";
import MonthSelect from "./ui/MonthSelect";
import { AutocompleteSuggestionsProvider } from "./ui/AutocompleteContext";
import Button from "./ui/Button";
import Card from "./ui/Card";
import type { FormData } from "../types/form";
import type { Certificado } from "../types/Certificado";

const initialForm: FormData = {
  nombreSuscribe: "",
  libroBautizo: "",
  folioBautizo: "",
  numeroArchivo: "",
  nombreBautizado: "",
  diaNacimiento: null as number | null,
  mesNacimiento: "",
  anoNacimiento: null as number | null,
  lugarNacimiento: "",
  nombrePadre: "",
  nombreMadre: "",
  libroNacimiento: "",
  folioNacimiento: "",
  archivoNacimiento: "",
  anoArchivo: "",
  oficialia: "",
  diaBautismo: null as number | null,
  mesBautismo: "",
  anoBautismo: null as number | null,
  padrino: "",
  madrina: "",
  ministroSacramento: "",
  notasMarginales: "",
  diaEmision: null as number | null,
  mesEmision: "",
  anoEmision: null as number | null,
  genero: "",
};

function FormBautismo() {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const addSuggestionsFromSavedCertificate = (certificado: FormData) => {
    setCertificados((current) => [
      { ...certificado, id: -Date.now() },
      ...current,
    ]);
  };
  const {
    form,
    mensaje,
    mensajeError,
    mensajeValidarError,
    handleChange,
    handleVistaPrevia,
    generarPdf,
    guardarBautismoBD,
    pdfUrl,
  } = useCertificado(initialForm, addSuggestionsFromSavedCertificate);

  useEffect(() => {
    axios
      .get<Certificado[]>(`${API_URL}/api/certificados_bautismo/all`)
      .then(({ data }) => setCertificados(data))
      .catch((error) =>
        console.error("No se pudieron cargar las sugerencias:", error),
      );
  }, []);

  const suggestions = useMemo(() => {
    const values: Record<string, string[]> = {};

    Object.keys(initialForm).forEach((field) => {
      values[field] = Array.from(
        new Set(
          certificados
            .map((certificado) => certificado[field as keyof Certificado])
            .filter(
              (value) => value !== null && value !== undefined && value !== "",
            )
            .map(String),
        ),
      ).sort((a, b) => a.localeCompare(b, "es"));
    });

    return values;
  }, [certificados]);

  return (
    <AutocompleteSuggestionsProvider value={suggestions}>
      <div className="flex flex-col justify-center min-h-screen bg-white/50 backdrop-blur-sm p-6">
        <Card title="Formulario de Bautismo">
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              generarPdf();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault(); // evita envío automático
                const form = e.currentTarget;
                const inputs = Array.from(
                  form.querySelectorAll("input, select, textarea"),
                );
                const index = inputs.indexOf(e.target as HTMLElement);
                if (index >= 0 && index < inputs.length - 1) {
                  (inputs[index + 1] as HTMLElement).focus(); // pasa al siguiente campo
                }
              }
            }}
          >
            <div>
              <Input
                label="Nombre del que Suscribe"
                type="text"
                name="nombreSuscribe"
                placeholder="Escriba el nombre completo aquí"
                value={form.nombreSuscribe}
                onChange={handleChange}
              />
            </div>

            <div>
              <Input
                label="Libro de Bautizo"
                type="text"
                name="libroBautizo"
                placeholder="Introduce el No. de Libro"
                value={form.libroBautizo}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Input
                label="Folio de Bautizo"
                type="text"
                name="folioBautizo"
                placeholder="Introduce el No. de Folio"
                value={form.folioBautizo}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Input
                label="Número de Archivo Parroquial"
                type="text"
                name="numeroArchivo"
                placeholder="Introduce el No. de Archivo"
                value={form.numeroArchivo}
                onChange={handleChange}
                className={`w-full border p-2 rounded ${
                  mensajeValidarError ? "border-red-500" : "border-gray-300"
                }`}
                required
              />
              {mensajeValidarError && (
                <p className="text-red-600 text-lg mt-1">
                  {mensajeValidarError}
                </p>
              )}
            </div>

            <div>
              <Input
                label="Nombre de la persona a Bautizar"
                type="text"
                name="nombreBautizado"
                placeholder="Escriba el nombre completo aquí"
                value={form.nombreBautizado}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Input
                label="Día de nacimiento"
                type="number"
                name="diaNacimiento"
                placeholder="Introduce el día aquí"
                value={form.diaNacimiento || ""}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <MonthSelect
                label="Mes de nacimiento"
                name="mesNacimiento"
                value={form.mesNacimiento || ""}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Input
                label="Año de nacimiento"
                type="number"
                name="anoNacimiento"
                placeholder="Introduce el año aquí"
                value={form.anoNacimiento || ""}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Input
                label="Lugar de nacimiento"
                type="text"
                name="lugarNacimiento"
                placeholder="Introduce el lugar aquí"
                value={form.lugarNacimiento}
                onChange={handleChange}
              />
            </div>

            <div>
              <Input
                label="Nombre del Padre"
                type="text"
                name="nombrePadre"
                placeholder="Escriba el nombre completo aquí"
                value={form.nombrePadre}
                onChange={handleChange}
              />
            </div>
            <div>
              <Input
                label="Nombre de la Madre"
                type="text"
                name="nombreMadre"
                placeholder="Escriba el nombre completo aquí"
                value={form.nombreMadre}
                onChange={handleChange}
              />
            </div>
            <div>
              <Input
                label="No. del Libro-Registro de Nacimiento"
                type="text"
                name="libroNacimiento"
                placeholder="Introduce el No. de Libro"
                value={form.libroNacimiento}
                onChange={handleChange}
              />
            </div>
            <div>
              <Input
                label="Folio del Libro-Registro de Nacimiento"
                type="text"
                name="folioNacimiento"
                placeholder="Introduce el No. de Folio"
                value={form.folioNacimiento}
                onChange={handleChange}
              />
            </div>
            <div>
              <Input
                label="No. del Archivo de Libro-Registro de Nacimiento"
                type="text"
                name="archivoNacimiento"
                placeholder="Introduce el No. del Archivo"
                value={form.archivoNacimiento}
                onChange={handleChange}
              />
            </div>
            <div>
              <Input
                label="Año del Archivo de Libro-Registro de Nacimiento"
                type="text"
                name="anoArchivo"
                placeholder="Introduce el año del Archivo"
                value={form.anoArchivo}
                onChange={handleChange}
              />
            </div>
            <div>
              <Input
                label="Oficialía"
                type="text"
                name="oficialia"
                placeholder="Escriba aquí la Oficialía"
                value={form.oficialia}
                onChange={handleChange}
              />
            </div>
            <div>
              <Input
                label="Día del Bautismo"
                type="number"
                name="diaBautismo"
                placeholder="Introduce el día aquí"
                value={form.diaBautismo || ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <MonthSelect
                label="Mes del Bautismo"
                name="mesBautismo"
                value={form.mesBautismo || ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <Input
                label="Año del Bautismo"
                type="number"
                name="anoBautismo"
                placeholder="Introduce el año aquí"
                value={form.anoBautismo || ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <Input
                label="Nombre del Padrino"
                type="text"
                name="padrino"
                placeholder="Escriba el nombre completo aquí"
                value={form.padrino}
                onChange={handleChange}
              />
            </div>
            <div>
              <Input
                label="Nombre de la Madrina"
                type="text"
                name="madrina"
                placeholder="Escriba el nombre completo aquí"
                value={form.madrina}
                onChange={handleChange}
              />
            </div>
            <div>
              <Input
                label="Ministro del Sacramento"
                type="text"
                name="ministroSacramento"
                placeholder="Escriba el nombre completo aquí"
                value={form.ministroSacramento}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-[18px] font-medium text-black">
                Notas Marginales
              </label>
              <textarea
                name="notasMarginales"
                placeholder="Escriba las notas aquí"
                value={form.notasMarginales}
                onChange={handleChange}
                className="w-full border p-2 rounded col-span-2"
                rows={3}
              />
            </div>
            <div>
              <Input
                label="Día de entrega"
                type="number"
                name="diaEmision"
                placeholder="Introduce el día aquí"
                value={form.diaEmision || ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <MonthSelect
                label="Mes de entrega"
                name="mesEmision"
                value={form.mesEmision || ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <Input
                label="Año de entrega"
                type="number"
                name="anoEmision"
                placeholder="Introduce el año aquí"
                value={form.anoEmision || ""}
                onChange={handleChange}
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block mb-1 text-[18px] font-medium text-black">
                Género de la persona a bautizar
              </label>
              <select
                name="genero"
                value={form.genero}
                onChange={handleChange}
                className="w-full border p-2 rounded font-semibold"
                required
              >
                <option className="font-semibold" value="">
                  Seleccione Género
                </option>
                <option className="font-semibold" value="Masculino">
                  Masculino
                </option>
                <option className="font-semibold" value="Femenino">
                  Femenino
                </option>
              </select>
            </div>

            <div className="col-span-1 md:col-span-2 flex flex-col md:flex-row gap-4 text-xl">
              <Button
                type="button"
                variant="secondary"
                onClick={handleVistaPrevia}
              >
                Vista previa del certificado
              </Button>

              <Button type="button" variant="primary" onClick={generarPdf}>
                Guardar y Generar PDF
              </Button>

              <Button
                type="button"
                variant="guardarBautismo"
                onClick={(e) => {
                  const formElement = (e.target as HTMLButtonElement).form;
                  if (formElement && formElement.checkValidity()) {
                    guardarBautismoBD();
                  } else {
                    formElement?.reportValidity(); // muestra los mensajes nativos del navegador
                  }
                }}
              >
                Guardar Bautismo
              </Button>
            </div>

            <div className="col-span-1 md:col-span-2 text-center">
              {mensaje && (
                <div className="bg-green-100 border border-green-400 text-black text-xl px-4 py-3 rounded relative shadow-md animate-fadeIn">
                  <p className="text-green-600 font-medium block sm:inline">
                    {mensaje}
                  </p>
                </div>
              )}
            </div>

            <div className="col-span-1 md:col-span-2 text-center">
              {mensajeError && (
                <div className="bg-red-100 border border-red-400 text-black text-xl px-4 py-3 rounded relative shadow-md animate-fadeIn">
                  <p className="text-red-600 font-medium block sm:inline">
                    {mensajeError}
                  </p>
                </div>
              )}
            </div>
          </form>
        </Card>

        {pdfUrl && (
          <div className="justify-center min-h-screen bg-gray-100 p-6 my-10">
            <Card title="Vista previa del PDF">
              <PdfPreview pdfUrl={pdfUrl} />
            </Card>
          </div>
        )}
      </div>
    </AutocompleteSuggestionsProvider>
  );
}

export default FormBautismo;
