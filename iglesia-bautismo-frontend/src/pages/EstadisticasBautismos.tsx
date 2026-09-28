import { useEffect, useState } from "react";
import axios from "axios";
import API_URL from "../config";
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Estadistica {
  mes: string;
  total: number;
  hombres: number;
  mujeres: number;
  ninos: number;
}

interface ResumenGeneral {
  ninos: number;
  hombres: number;
  mujeres: number;
  total: number;
}

interface TotalPorGrupo {
  grupo0a1: number;
  grupo1a7: number;
  grupoMayor7: number;
}

export default function EstadisticasBautismos() {
  const [data, setData] = useState<Estadistica[]>([]);
  const [anio, setAnio] = useState<number>(new Date().getFullYear());
  const [resumenGeneral, setResumenGeneral] = useState<ResumenGeneral>({
    ninos: 0,
    hombres: 0,
    mujeres: 0,
    total: 0,
  });

  const [totalPorGrupo, setTotalPorGrupo] = useState<TotalPorGrupo>({
    grupo0a1: 0,
    grupo1a7: 0,
    grupoMayor7: 0,
  });
  const noHayDatos = data.every((item) => item.total === 0);
  const hayDatos = resumenGeneral.total > 0;

  useEffect(() => {
    axios
      .get(
        `${API_URL}/api/certificados_bautismo/estadisticas-bautismos/${anio}`,
      )
      .then((res) => {
        setData(res.data.meses);
        setResumenGeneral(res.data.resumenGeneral);
        setTotalPorGrupo(
          res.data.totalPorGrupo || {
            grupo0a1: 0,
            grupo1a7: 0,
            grupoMayor7: 0,
          },
        );
      })
      .catch((err) => {
        console.error("Error al obtener estadísticas:", err);
      });
  }, [anio]);

  return (
    <div className="p-6 bg-gray-100">
      <div className="flex flex-col items-center mb-6">
        <h2 className="text-2xl font-bold text-center">
          Estadísticas de Bautismos {anio}
        </h2>

        {/* Selector de año */}
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded shadow mt-4">
          <label className="text-sm text-gray-600">Año:</label>

          <input
            type="number"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="w-24 p-1 border rounded text-center 
                 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {hayDatos && (
          <div className="w-full max-w-4xl p-6 rounded shadow mt-6 text-center bg-white">
            <h3 className="text-lg font-semibold mb-4">Resumen general</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 ">
              <div className="bg-green-100 p-3 rounded">
                <p>Niños</p>
                <p className="font-bold">{resumenGeneral.ninos}</p>
              </div>

              <div className="bg-blue-100 p-3 rounded">
                <p>Hombres</p>
                <p className="font-bold">{resumenGeneral.hombres}</p>
              </div>

              <div className="bg-pink-100 p-3 rounded">
                <p>Mujeres</p>
                <p className="font-bold">{resumenGeneral.mujeres}</p>
              </div>

              <div className="bg-gray-200 p-3 rounded">
                <p>Total</p>
                <p className="font-bold">{resumenGeneral.total}</p>
              </div>
            </div>
          </div>
        )}

        {hayDatos && (
          <div className="w-full max-w-4xl p-6 rounded shadow mt-6 text-center bg-white">
            <h3 className="text-lg font-semibold mb-4">
              Bautismos por grupo de edad
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-green-100 p-3 rounded">
                <p>0-1 año</p>
                <p className="font-bold">{totalPorGrupo.grupo0a1}</p>
              </div>
              <div className="bg-green-200 p-3 rounded">
                <p>1-7 años</p>
                <p className="font-bold">{totalPorGrupo.grupo1a7}</p>
              </div>
              <div className="bg-green-300 p-3 rounded">
                <p>Más de 7 años</p>
                <p className="font-bold">{totalPorGrupo.grupoMayor7}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gráfico */}
      <ResponsiveContainer width="100%" height={400}>
        {noHayDatos ? (
          <div className="bg-white p-8 rounded shadow text-center">
            <p className="text-2xl mb-2">📊</p>
            <p className="text-gray-600 text-lg">
              No hay registros de bautismos para el año
            </p>
            <p className="font-bold text-xl">{anio}</p>
          </div>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis allowDecimals={false} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;

                  return (
                    <div className="bg-white p-2 border rounded shadow">
                      <p className="font-bold">{label}</p>
                      <p>Cantidad de bautismos: {data.total}</p>
                      <p>Niños: {data.ninos}</p>
                      <p>Hombres: {data.hombres}</p>
                      <p>Mujeres: {data.mujeres}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              content={() => (
                <div className="flex justify-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-green-500 inline-block"></span>
                    Niños
                  </span>

                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-blue-500 inline-block"></span>
                    Hombres
                  </span>

                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-pink-500 inline-block"></span>
                    Mujeres
                  </span>
                </div>
              )}
            />

            <Bar dataKey="ninos" name="Niños" stackId="a" fill="#10b981" />
            <Bar dataKey="hombres" name="Hombres" stackId="a" fill="#3b82f6" />
            <Bar dataKey="mujeres" name="Mujeres" stackId="a" fill="#ec4899" />

            <Line
              type="monotone"
              dataKey="total"
              stroke="#000"
              strokeWidth={2}
              dot={{ r: 4, fill: "#000" }}
              legendType="none"
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
