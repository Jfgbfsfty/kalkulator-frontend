import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const PLAYER_RANKS = ['Drógówka', 'Kadet', 'Sierżant', 'Z-szef', 'Szef'];

const emptyForm = {
  playerNick: '',
  playerDiscordId: '',
  playerDiscordUsername: '',
  rank: 'Drógówka',
  reason: '',
  signedBy: '',
  sendToChannel: true,
};

export default function Dismissals() {
  const { hasRole } = useAuth();
  const isSzef = hasRole('SZEF');

  const [dismissals, setDismissals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);

  if (!isSzef) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <p className="text-4xl mb-3">🔒</p>
        <p>Brak uprawnień do tej sekcji.</p>
      </div>
    );
  }

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const fetchDismissals = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/dismissals');
      setDismissals(Array.isArray(data) ? data : data.data ?? []);
    } catch {
      toast.error('Błąd pobierania zwolnień');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDismissals(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/dismissals', form);
      toast.success(`🚫 Zwolnienie dla ${form.playerNick} zostało wystawione!`);
      setForm(emptyForm);
      fetchDismissals();
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
    if (!window.confirm(`Usunąć wpis zwolnienia dla ${nick}?`)) return;
    setDeleting(id);
    try {
      await api.delete(`/dismissals/${id}`);
      toast.success('Usunięto wpis');
      setDismissals((prev) => prev.filter((d) => d._id !== id));
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
        <h2 className="text-xl font-bold text-white">Zwolnienia ze Służby</h2>
        <p className="text-slate-400 text-sm mt-0.5">
          Wystawiaj zwolnienia dla graczy. Zwolniony gracz otrzyma DM na Discord,
          a wszystkie role stopnia zostaną automatycznie usunięte.
        </p>
      </div>

      {/* Formularz */}
      <form onSubmit={handleSubmit} className="card space-y-5">
        <h3 className="text-base font-semibold text-white border-b border-dark-600 pb-3">
          Nowe zwolnienie
        </h3>

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
              Stopień <span className="text-red-400">*</span>
            </label>
            <select className="input-field" value={form.rank} onChange={set('rank')} required>
              {PLAYER_RANKS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Discord ID gracza{' '}
              <span className="text-slate-500 font-normal">(opcjonalne – do pingu i usunięcia roli)</span>
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
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Discord Username <span className="text-slate-500 font-normal">(opcjonalne)</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="np. kowalski#1234"
              value={form.playerDiscordUsername}
              onChange={set('playerDiscordUsername')}
              maxLength={100}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Powód <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="np. Naruszenie regulaminu, nieobecność..."
              value={form.reason}
              onChange={set('reason')}
              maxLength={500}
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
              placeholder="np. Szef Kowalski"
              value={form.signedBy}
              onChange={set('signedBy')}
              maxLength={100}
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-primary-500"
              checked={form.sendToChannel}
              onChange={(e) => setForm((f) => ({ ...f, sendToChannel: e.target.checked }))}
            />
            <span className="text-slate-300 text-sm">
              Wyślij powiadomienie na kanał Discord (#zwolnienia)
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-danger w-full flex items-center justify-center gap-2"
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
            '🚫 Wystaw zwolnienie'
          )}
        </button>
      </form>

      {/* Lista */}
      <div className="card overflow-hidden p-0">
        <div className="p-4 border-b border-dark-600 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Historia zwolnień</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-dark-700 text-slate-400">{dismissals.length}</span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <svg className="animate-spin w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : dismissals.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-4xl mb-3">🚫</p>
            <p>Brak zwolnień</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-dark-600">
                  <th className="px-4 py-3">Gracz</th>
                  <th className="px-4 py-3">Stopień</th>
                  <th className="px-4 py-3">Powód</th>
                  <th className="px-4 py-3">Podpisał</th>
                  <th className="px-4 py-3">Wystawił</th>
                  <th className="px-4 py-3">Discord</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3 text-right">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {dismissals.map((d) => (
                  <tr key={d._id} className="hover:bg-dark-700/40 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-white">{d.playerNick}</p>
                        {d.playerDiscordUsername && (
                          <p className="text-slate-500 text-xs">{d.playerDiscordUsername}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                        {d.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 max-w-xs truncate" title={d.reason}>
                      {d.reason}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{d.signedBy}</td>
                    <td className="px-4 py-3 text-slate-400">{d.issuedByUsername || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-xs ${d.dmSent ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {d.dmSent ? '✅ DM' : '— DM'}
                        </span>
                        <span className={`text-xs ${d.roleRemoved ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {d.roleRemoved ? '✅ Ranga' : '— Ranga'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(d.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(d._id, d.playerNick)}
                        disabled={deleting === d._id}
                        className="text-red-400 hover:text-red-300 transition-colors text-xs px-2 py-1 rounded hover:bg-red-500/10"
                      >
                        {deleting === d._id ? '...' : 'Usuń'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
