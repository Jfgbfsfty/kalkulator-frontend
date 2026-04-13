import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  OCZEKUJE:    { label: 'Oczekuje',    cls: 'badge-yellow' },
  ZATWIERDZONY: { label: 'Zatwierdzony', cls: 'badge-green'  },
  ODRZUCONY:   { label: 'Odrzucony',   cls: 'badge-red'    },
};

function ReviewModal({ request, onClose, onDone }) {
  const [status, setStatus] = useState('ZATWIERDZONY');
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === 'ODRZUCONY' && !reviewNote.trim()) {
      toast.error('Podaj powód odrzucenia.');
      return;
    }
    setSubmitting(true);
    try {
      await api.put(`/promotion-requests/${request._id}/review`, { status, reviewNote });
      toast.success(status === 'ZATWIERDZONY' ? '✅ Wniosek zatwierdzony' : '❌ Wniosek odrzucony');
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Błąd');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-800 border border-dark-600 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-600">
          <h3 className="text-lg font-bold text-white">Rozpatrz wniosek</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-dark-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="rounded-lg bg-dark-700 px-4 py-3 space-y-1 text-sm">
            <p className="text-slate-300"><span className="text-slate-500">Nick:</span> {request.discordNick}</p>
            <p className="text-slate-300"><span className="text-slate-500">Zmiana:</span> {request.currentRank} → {request.desiredRank}</p>
            <p className="text-slate-300"><span className="text-slate-500">Godziny:</span> ~{request.hoursWorked}h</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Decyzja</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStatus('ZATWIERDZONY')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${status === 'ZATWIERDZONY' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'border-dark-500 text-slate-400 hover:border-dark-400'}`}
              >
                ✅ Zatwierdź
              </button>
              <button
                type="button"
                onClick={() => setStatus('ODRZUCONY')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${status === 'ODRZUCONY' ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'border-dark-500 text-slate-400 hover:border-dark-400'}`}
              >
                ❌ Odrzuć
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Notatka / powód{status === 'ODRZUCONY' ? <span className="text-red-400"> *</span> : <span className="text-slate-500"> (opcjonalne)</span>}
            </label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder={status === 'ODRZUCONY' ? 'Podaj powód odrzucenia...' : 'Opcjonalna notatka...'}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              maxLength={300}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Anuluj</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Zapisywanie...' : 'Zapisz decyzję'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PromotionRequestsAdmin() {
  const { hasRole } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [reviewing, setReviewing] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [deleting, setDeleting] = useState(null);

  if (!hasRole('SZEF')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <p className="text-4xl mb-3">🔒</p>
        <p>Brak uprawnień do tej sekcji.</p>
      </div>
    );
  }

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.nick = search;
      const { data } = await api.get('/promotion-requests', { params });
      setRequests(Array.isArray(data) ? data : data.data ?? []);
    } catch {
      toast.error('Błąd pobierania wniosków');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [statusFilter]);

  const handleDelete = async (id, nick) => {
    if (!window.confirm(`Usunąć wniosek od ${nick}?`)) return;
    setDeleting(id);
    try {
      await api.delete(`/promotion-requests/${id}`);
      toast.success('Usunięto wniosek');
      setRequests((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Błąd usuwania');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });

  const counts = {
    OCZEKUJE: requests.filter((r) => r.status === 'OCZEKUJE').length,
    ZATWIERDZONY: requests.filter((r) => r.status === 'ZATWIERDZONY').length,
    ODRZUCONY: requests.filter((r) => r.status === 'ODRZUCONY').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Wnioski o Awans</h2>
        <p className="text-slate-400 text-sm mt-0.5">
          Przeglądaj i rozpatruj wnioski złożone przez policjantów.
        </p>
      </div>

      {/* Statystyki */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Oczekuje', key: 'OCZEKUJE', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Zatwierdzonych', key: 'ZATWIERDZONY', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Odrzuconych', key: 'ODRZUCONY', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
        ].map(({ label, key, color, bg }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
            className={`rounded-xl border px-4 py-3 text-left transition-all ${bg} ${statusFilter === key ? 'ring-1 ring-white/20' : ''}`}
          >
            <p className={`text-2xl font-bold ${color}`}>{counts[key]}</p>
            <p className="text-slate-400 text-xs mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      {/* Szukaj */}
      <div className="flex gap-3">
        <input
          type="text"
          className="input-field max-w-xs"
          placeholder="Szukaj po nicku..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchRequests()}
        />
        <button onClick={fetchRequests} className="btn-secondary">Szukaj</button>
        {statusFilter && (
          <button onClick={() => setStatusFilter('')} className="btn-secondary text-slate-400">
            Wyczyść filtr
          </button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-slate-500">Ładowanie...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">📭</p>
          <p>Brak wniosków{statusFilter ? ` ze statusem "${STATUS_CONFIG[statusFilter]?.label}"` : ''}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.OCZEKUJE;
            const isExpanded = expanded === r._id;

            return (
              <div key={r._id} className="card">
                {/* Nagłówek kafelka */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center shrink-0 text-sm font-bold text-primary-400">
                      {r.discordNick?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-semibold text-sm">{r.discordNick}</p>
                        <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
                      </div>
                      <p className="text-slate-500 text-xs font-mono">{r.discordId}</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {r.currentRank} → <span className="text-primary-400 font-semibold">{r.desiredRank}</span>
                        <span className="mx-2 text-slate-600">·</span>
                        ~{r.hoursWorked}h
                        <span className="mx-2 text-slate-600">·</span>
                        {r.availability} dni/tydz.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-600 text-xs whitespace-nowrap hidden sm:block">{formatDate(r.createdAt)}</span>
                    {r.status === 'OCZEKUJE' && (
                      <button
                        onClick={() => setReviewing(r)}
                        className="btn-primary text-xs px-3 py-1.5"
                      >
                        Rozpatrz
                      </button>
                    )}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : r._id)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-700 transition-colors"
                      title="Szczegóły"
                    >
                      <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(r._id, r.discordNick)}
                      disabled={deleting === r._id}
                      className="p-1.5 text-slate-600 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                      title="Usuń"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Rozwinięte szczegóły */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-dark-600 space-y-3 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Powód</p>
                      <p className="text-slate-300">{r.reason}</p>
                    </div>
                    {r.achievements && (
                      <div>
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Osiągnięcia</p>
                        <p className="text-slate-300">{r.achievements}</p>
                      </div>
                    )}
                    {r.additionalInfo && (
                      <div>
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Dodatkowe informacje</p>
                        <p className="text-slate-300">{r.additionalInfo}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-4 pt-1">
                      <div>
                        <p className="text-slate-500 text-xs">Złożył</p>
                        <p className="text-slate-300 text-xs">{r.submittedByUsername}</p>
                      </div>
                      {r.reviewedByUsername && (
                        <div>
                          <p className="text-slate-500 text-xs">Rozpatrzył</p>
                          <p className="text-slate-300 text-xs">{r.reviewedByUsername} · {formatDate(r.reviewedAt)}</p>
                        </div>
                      )}
                      {r.reviewNote && (
                        <div>
                          <p className="text-slate-500 text-xs">Notatka</p>
                          <p className="text-slate-300 text-xs">{r.reviewNote}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {reviewing && (
        <ReviewModal
          request={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); fetchRequests(); }}
        />
      )}
    </div>
  );
}
