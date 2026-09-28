/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from "react";

const AutocompleteContext = createContext<Record<string, string[]>>({});

export const AutocompleteSuggestionsProvider = AutocompleteContext.Provider;

export function useAutocompleteSuggestions(fieldName?: string) {
  const suggestions = useContext(AutocompleteContext);
  return fieldName ? (suggestions[fieldName] ?? []) : [];
}
