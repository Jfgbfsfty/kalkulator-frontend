import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const PLAYER_RANKS = ['Kadet', 'Drogówka', 'Sierżant', 'Z-szef', 'Szef'];

const TYPE_CONFIG = {
  AWANS: {
    label: 'Awans',
    textCls: 'text-emerald-400',
    bgCls: 'bg-emerald-500/20',
    icon: '⬆️',
  },
  DEGRADACJA: {
    label: 'Degradacja',
    textCls: 'text-red-400',
    bgCls: 'bg-red-500/20',
    icon: '⬇️',
  },
};

const emptyForm = {
  playerNick: '',
  playerDiscordId: '',
  type: 'AWANS',
  fromRank: '',
  toRank: '',
  reason: '',
  signedBy: '',
};

export default function Promotions() {
  const { user, hasRole } = useAuth();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const isSzef = hasRole('SZEF');

  // Ukryj stronę jeśli brak uprawnień
  if (!hasRole('ZASTEPCA')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <p className="text-4xl mb-3">🔒</p>
        <p>Brak uprawnień do tej sekcji.</p>
      </div>
    );
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/promotions');
      setPromotions(Array.isArray(data) ? data : data.data ?? []);
    } catch {
      toast.error('Błąd pobierania danych');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPromotions(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fromRank || !form.toRank) {
      toast.error('Wybierz stopnie: z i na');
      return;
    }
    if (form.fromRank === form.toRank) {
      toast.error('Stopień "z" i "na" nie mogą być takie same');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/promotions', form);
      toast.success(
        form.type === 'AWANS'
          ? `✅ Awans dla ${form.playerNick} został wystawiony i wysłany na Discord!`
          : `✅ Degradacja dla ${form.playerNick} została wystawiona i wysłana na Discord!`
      );
      setForm(emptyForm);
      fetchPromotions();
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0]?.msg ||
        err.response?.data?.message ||
        'Błąd wystawiania';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, nick) => {
    if (!window.confirm(`Usunąć wpis dla ${nick}?`)) return;
    setDeleting(id);
    try {
      await api.delete(`/promotions/${id}`);
      toast.success('Usunięto wpis');
      setPromotions((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Błąd usuwania');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Awanse i Degrady</h2>
        <p className="text-slate-400 text-sm mt-0.5">
          Wystawiaj awanse i degradacje dla graczy. Wpisy są automatycznie wysyłane na kanał Discord.
        </p>
      </div>

      {/* Formularz */}
      <form onSubmit={handleSubmit} className="card space-y-5">
        <h3 className="text-base font-semibold text-white border-b border-dark-600 pb-3">
          Nowy wpis
        </h3>

        {/* Nick + Typ */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Nick gracza <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="np. Jan_Kowalski"
              value={form.playerNick}
              onChange={set('playerNick')}
              maxLength={50}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Typ <span className="text-red-400">*</span>
            </label>
            <select className="input-field" value={form.type} onChange={set('type')}>
              <option value="AWANS">⬆️ Awans</option>
              <option value="DEGRADACJA">⬇️ Degradacja</option>
            </select>
          </div>
        </div>

        {/* Discord ID gracza */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Discord ID gracza{' '}
            <span className="text-slate-500 font-normal">(opcjonalne – potrzebne do automatycznej zamiany roli)</span>
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="np. 123456789012345678"
            value={form.playerDiscordId}
            onChange={set('playerDiscordId')}
            maxLength={30}
          />
        </div>

        {/* Stopnie */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Ze stopnia <span className="text-red-400">*</span>
            </label>
            <select className="input-field" value={form.fromRank} onChange={set('fromRank')} required>
              <option value="">Wybierz stopień</option>
              {PLAYER_RANKS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Na stopień <span className="text-red-400">*</span>
            </label>
            <select className="input-field" value={form.toRank} onChange={set('toRank')} required>
              <option value="">Wybierz stopień</option>
              {PLAYER_RANKS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Powód + Podpis */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Powód <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="np. Wzorowa służba, naruszenie regulaminu..."
              value={form.reason}
              onChange={set('reason')}
              maxLength={300}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Podpisał <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="np. gen. Adam Nowak"
              value={form.signedBy}
              onChange={set('signedBy')}
              maxLength={100}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={`btn-primary w-full flex items-center justify-center gap-2 ${
            form.type === 'DEGRADACJA' ? 'bg-red-600 hover:bg-red-700' : ''
          }`}
        >
          {submitting ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Wysyłanie...
            </>
          ) : (
            <>
              {form.type === 'AWANS' ? '⬆️' : '⬇️'}
              {form.type === 'AWANS' ? 'Wystawiaj Awans' : 'Wystawiaj Degradację'}
            </>
          )}
        </button>
      </form>

      {/* Lista */}
      <div className="card overflow-hidden p-0">
        <div className="p-4 border-b border-dark-600 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Historia awansów i degradacji</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-dark-700 text-slate-400">{promotions.length}</span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : promotions.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-4xl mb-3">🏅</p>
            <p>Brak wpisów</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-dark-600">
                  <th className="px-4 py-3">Gracz</th>
                  <th className="px-4 py-3">Typ</th>
                  <th className="px-4 py-3">Ze stopnia</th>
                  <th className="px-4 py-3">Na stopień</th>
                  <th className="px-4 py-3">Powód</th>
                  <th className="px-4 py-3">Podpisał</th>
                  <th className="px-4 py-3">Wystawił</th>
                  <th className="px-4 py-3">Data</th>
                  {isSzef && <th className="px-4 py-3 text-right">Akcje</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {promotions.map((p) => {
                  const cfg = TYPE_CONFIG[p.type] || TYPE_CONFIG.AWANS;
                  return (
                    <tr key={p._id} className="hover:bg-dark-700/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{p.playerNick}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bgCls} ${cfg.textCls}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{p.fromRank}</td>
                      <td className="px-4 py-3 text-slate-300">{p.toRank}</td>
                      <td className="px-4 py-3 text-slate-400 max-w-xs truncate" title={p.reason}>{p.reason}</td>
                      <td className="px-4 py-3 text-slate-300">{p.signedBy}</td>
                      <td className="px-4 py-3 text-slate-400">{p.issuedByUsername || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(p.createdAt)}</td>
                      {isSzef && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDelete(p._id, p.playerNick)}
                            disabled={deleting === p._id}
                            className="text-red-400 hover:text-red-300 transition-colors text-xs px-2 py-1 rounded hover:bg-red-500/10"
                          >
                            {deleting === p._id ? '...' : 'Usuń'}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
