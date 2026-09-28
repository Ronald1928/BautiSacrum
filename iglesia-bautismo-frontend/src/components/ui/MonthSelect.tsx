import React from "react";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

interface MonthSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

const MonthSelect: React.FC<MonthSelectProps> = ({
  label,
  className,
  ...props
}) => (
  <div className="flex flex-col gap-1 w-full">
    <label className="block mb-1 text-[18px] font-medium text-black">
      {label}
    </label>
    <select
      className={`w-full px-3 py-2 text-[18px] rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none ${className ?? ""}`}
      {...props}
    >
      <option value="">Seleccione un mes</option>
      {MONTHS.map((month) => (
        <option key={month} value={month}>
          {month}
        </option>
      ))}
    </select>
  </div>
);

export default MonthSelect;
