import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, MapPin, Globe } from "lucide-react";
import { searchPlacesCombined } from "@/services/geocodingService";
import { useMapStore } from "@/store/mapStore";
import type { PlaceSearchResult } from "@/types/dataset";

const DEBOUNCE_MS = 280;

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flyTo = useMapStore((s) => s.flyTo);
  const viewport = useMapStore((s) => s.viewport);
  const incidents = useMapStore((s) => s.incidents);

  const runSearch = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (trimmed.length < 2) {
        setResults([]);
        setIsOpen(false);
        setError(null);
        setHighlightIndex(-1);
        return;
      }

      setIsSearching(true);
      setError(null);
      try {
        const places = await searchPlacesCombined(trimmed, incidents, {
          near: viewport.center,
        });
        setResults(places);
        setIsOpen(true);
        setHighlightIndex(places.length > 0 ? 0 : -1);
        if (places.length === 0) {
          setError("No places found — try a city, landmark, or address");
        }
      } catch {
        setResults([]);
        setError("Search failed — check your connection and try again");
        setIsOpen(true);
      } finally {
        setIsSearching(false);
      }
    },
    [incidents, viewport.center],
  );

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), DEBOUNCE_MS);
  };

  const handleSelect = (place: PlaceSearchResult) => {
    setQuery(place.name);
    setIsOpen(false);
    setResults([]);
    setHighlightIndex(-1);
    setError(null);
    const zoom =
      place.type === "city" || place.type === "administrative" ? 11 : 15;
    flyTo(place.location, zoom);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) {
      if (e.key === "Enter" && query.trim().length >= 2) {
        runSearch(query);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightIndex >= 0 && results[highlightIndex]) {
          handleSelect(results[highlightIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightIndex(-1);
        break;
    }
  };

  return (
    <div className="relative w-full max-w-xl">
      <div
        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/85 px-4 py-3 shadow-2xl backdrop-blur-xl transition focus-within:border-white/25"
      >
        <Search className="h-5 w-5 shrink-0 text-white/40" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (results.length > 0 || error) setIsOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search any city, landmark, or address…"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/35 outline-none"
          aria-label="Search places"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-activedescendant={
            highlightIndex >= 0 ? `search-result-${highlightIndex}` : undefined
          }
          role="combobox"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
              setError(null);
              setHighlightIndex(-1);
            }}
            className="rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {isSearching && (
          <div
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/70"
            aria-hidden="true"
          />
        )}
      </div>

      {isOpen && (results.length > 0 || error) && (
        <ul
          ref={listRef}
          className="absolute top-full z-[1001] mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-black/95 shadow-2xl backdrop-blur-xl"
          role="listbox"
        >
          {error && results.length === 0 && (
            <li className="px-4 py-3 text-sm text-white/45">{error}</li>
          )}
          {results.map((place, index) => (
            <li
              key={place.placeId}
              id={`search-result-${index}`}
              role="option"
              aria-selected={index === highlightIndex}
            >
              <button
                type="button"
                onClick={() => handleSelect(place)}
                onMouseEnter={() => setHighlightIndex(index)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                  index === highlightIndex ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <span className="mt-0.5 shrink-0 text-white/35">
                  {place.source === "local" ? (
                    <MapPin className="h-4 w-4 text-amber-400" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-white">
                      {place.name}
                    </span>
                    {place.category && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          place.source === "local"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-white/10 text-white/50"
                        }`}
                      >
                        {place.category}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-white/45">
                    {place.formattedAddress}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
