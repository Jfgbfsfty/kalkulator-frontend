/**
 * UserPicker – wyszukiwarka użytkowników z bazy (mają discordId).
 * Zwraca { _id, username, discordId, discordUsername, role } przez onSelect.
 */
import { useState, useEffect, useRef } from 'react';
import api from '../../services/api.js';

export default function UserPicker({ value, onSelect, placeholder = 'Wyszukaj użytkownika...', disabled = false }) {
  const [query, setQuery] = useState(value?.username || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Zamknij dropdown po kliknięciu poza
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sync jeśli value zmienione z zewnątrz
  useEffect(() => {
    if (value) setQuery(value.username || '');
    else setQuery('');
  }, [value]);

  const search = (q) => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
        setResults(data.data || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    if (value) onSelect(null); // clear selection on type
    search(q);
  };

  const handleSelect = (user) => {
    setQuery(user.username);
    setOpen(false);
    setResults([]);
    onSelect(user);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    onSelect(null);
  };

  const ROLE_LABEL = { SUPERADMIN: 'Superadmin', SZEF: 'Szef', ZASTEPCA: 'Z-Szef', POLICJANT: 'Policjant' };
  const ROLE_COLOR = { SUPERADMIN: 'text-red-400', SZEF: 'text-yellow-400', ZASTEPCA: 'text-blue-400', POLICJANT: 'text-slate-400' };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          className="input-field pr-8"
          placeholder={placeholder}
          value={query}
          onChange={handleInput}
          onFocus={() => query && results.length && setOpen(true)}
          disabled={disabled}
          autoComplete="off"
        />
        {(loading) && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </span>
        )}
        {!loading && value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown wyników */}
      {open && results.length > 0 && (
        <ul className="absolute z-50 top-full mt-1 w-full bg-dark-700 border border-dark-500 rounded-lg shadow-xl max-h-56 overflow-y-auto">
          {results.map((u) => (
            <li key={u._id}>
              <button
                type="button"
                onClick={() => handleSelect(u)}
                className="w-full text-left px-3 py-2.5 hover:bg-dark-600 flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-white font-medium text-sm truncate">{u.username}</span>
                  {u.discordUsername && (
                    <span className="text-slate-500 text-xs truncate">{u.discordUsername}</span>
                  )}
                </div>
                <span className={`text-xs shrink-0 ${ROLE_COLOR[u.role] || 'text-slate-400'}`}>
                  {ROLE_LABEL[u.role] || u.role}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !loading && results.length === 0 && query.trim() && (
        <div className="absolute z-50 top-full mt-1 w-full bg-dark-700 border border-dark-500 rounded-lg shadow-xl px-3 py-3 text-slate-500 text-sm">
          Nie znaleziono użytkownika
        </div>
      )}

      {/* Wybrany użytkownik – info */}
      {value && (
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <span className="text-emerald-400">✓</span>
          <span>{value.username}</span>
          {value.discordId && <span className="font-mono text-slate-500">ID: {value.discordId}</span>}
          {value.discordUsername && <span className="text-slate-500">({value.discordUsername})</span>}
        </div>
      )}
    </div>
  );
}
