import React from "react";
import { useAutocompleteSuggestions } from "./AutocompleteContext";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  className,
  name,
  list,
  ...props
}) => {
  const suggestions = useAutocompleteSuggestions(name);
  const suggestionsId =
    name && suggestions.length > 0 ? `sugerencias-${name}` : undefined;

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="block mb-1 text-[18px] font-medium text-black">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 text-[18px] rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none ${className}`}
        name={name}
        list={suggestionsId ?? list}
        {...props}
      />
      {suggestionsId && (
        <datalist id={suggestionsId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
};

export default Input;
