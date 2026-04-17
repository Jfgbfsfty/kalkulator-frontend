import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import UserPicker from '../common/UserPicker.jsx';

const PLAYER_RANKS = ['Drógówka', 'Kadet', 'Sierżant', 'Z-szef', 'Szef'];

const emptyForm = {
  currentRank: 'Drógówka',
  desiredRank: 'Kadet',
  hoursWorked: '',
  reason: '',
  achievements: '',
  availability: '',
  additionalInfo: '',
};

function CooldownBanner({ nextAllowedAt }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const calc = () => {
      const diff = new Date(nextAllowedAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining(''); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [nextAllowedAt]);

  if (!remaining) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 flex items-start gap-3">
      <span className="text-amber-400 text-xl mt-0.5">⏳</span>
      <div>
        <p className="text-amber-300 font-semibold text-sm">Limit 24h – wniosek już wysłany</p>
        <p className="text-amber-400/70 text-xs mt-0.5">
          Możesz złożyć kolejny wniosek za: <span className="font-mono font-bold">{remaining}</span>
        </p>
      </div>
    </div>
  );
}

export default function PromotionRequestForm() {
  const [form, setForm] = useState(emptyForm);
  const [targetUser, setTargetUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cooldown, setCooldown] = useState(null);

  useEffect(() => {
    api.get('/promotion-requests/my-cooldown')
      .then(({ data }) => { if (!data.canSubmit) setCooldown(data.nextAllowedAt); })
      .catch(() => {});
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetUser) { toast.error('Wybierz użytkownika z listy.'); return; }
    if (cooldown && new Date(cooldown).getTime() > Date.now()) {
      toast.error('Musisz poczekać 24h przed wysłaniem kolejnego wniosku.');
      return;
    }
    if (form.currentRank === form.desiredRank) {
      toast.error('Wnioskowany stopień musi być inny niż aktualny.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/promotion-requests', {
        ...form,
        discordNick: targetUser.discordUsername || targetUser.username,
        targetUserId: targetUser._id,
        hoursWorked: parseFloat(form.hoursWorked),
        availability: parseInt(form.availability),
      });
      setSubmitted(true);
      toast.success('✅ Wniosek o awans został wysłany!');
    } catch (err) {
      if (err.response?.status === 429) {
        setCooldown(err.response.data.nextAllowedAt);
        toast.error('Możesz wysłać wniosek raz na 24 godziny.');
      } else {
        toast.error(err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Błąd wysyłania wniosku');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 max-w-md mx-auto text-center">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Wniosek wysłany!</h2>
        <p className="text-slate-400 mb-8">Twój wniosek trafił na kanał Discord do kadry kierowniczej.</p>
        <p className="text-slate-600 text-xs">Następny wniosek możesz złożyć za 24 godziny.</p>
      </div>
    );
  }

  const isBlocked = cooldown && new Date(cooldown).getTime() > Date.now();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-white">Wniosek o Awans</h2>
        <p className="text-slate-400 text-sm mt-0.5">
          Wypełnij formularz, a wniosek automatycznie trafi na kanał Discord kadry kierowniczej.
          Limit: jeden wniosek co 24 godziny.
        </p>
      </div>

      {isBlocked && <CooldownBanner nextAllowedAt={cooldown} />}

      <form onSubmit={handleSubmit} className={`card space-y-5 ${isBlocked ? 'opacity-50 pointer-events-none' : ''}`}>

        <div>
          <h3 className="text-base font-semibold text-white border-b border-dark-600 pb-3 mb-3">Użytkownik</h3>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Wybierz użytkownika <span className="text-red-400">*</span>
          </label>
          <UserPicker value={targetUser} onSelect={setTargetUser} placeholder="Wyszukaj po nicku lub Discord..." disabled={isBlocked} />
        </div>

        <h3 className="text-base font-semibold text-white border-b border-dark-600 pb-3 pt-1">Stopień</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Aktualny stopień <span className="text-red-400">*</span></label>
            <select className="input-field" value={form.currentRank} onChange={set('currentRank')} required disabled={isBlocked}>
              {PLAYER_RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Wnioskowany stopień <span className="text-red-400">*</span></label>
            <select className="input-field" value={form.desiredRank} onChange={set('desiredRank')} required disabled={isBlocked}>
              {PLAYER_RANKS.filter((r) => r !== form.currentRank).map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <h3 className="text-base font-semibold text-white border-b border-dark-600 pb-3 pt-1">Aktywność i uzasadnienie</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Przepracowane godziny <span className="text-red-400">*</span></label>
            <input type="number" className="input-field" placeholder="np. 40" value={form.hoursWorked} onChange={set('hoursWorked')} min={0} max={9999} step={0.5} required disabled={isBlocked} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Dostępność <span className="text-red-400">*</span>
              <span className="text-slate-500 font-normal ml-1 text-xs">(dni w tygodniu, 1–7)</span>
            </label>
            <input type="number" className="input-field" placeholder="np. 5" value={form.availability} onChange={set('availability')} min={1} max={7} required disabled={isBlocked} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Dlaczego zasługuje na awans? <span className="text-red-400">*</span>
            <span className="text-slate-500 font-normal ml-1 text-xs">(min. 20 znaków)</span>
          </label>
          <textarea className="input-field resize-none" rows={4} placeholder="Opisz szczegółowo..." value={form.reason} onChange={set('reason')} minLength={20} maxLength={1000} required disabled={isBlocked} />
          <p className="text-slate-600 text-xs mt-1 text-right">{form.reason.length}/1000</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Osiągnięcia i zdarzenia <span className="text-slate-500 font-normal text-xs">(opcjonalne)</span>
          </label>
          <textarea className="input-field resize-none" rows={3} placeholder="Ważne akcje, patrole..." value={form.achievements} onChange={set('achievements')} maxLength={500} disabled={isBlocked} />
          <p className="text-slate-600 text-xs mt-1 text-right">{form.achievements.length}/500</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Dodatkowe informacje <span className="text-slate-500 font-normal text-xs">(opcjonalne)</span>
          </label>
          <textarea className="input-field resize-none" rows={2} placeholder="Cokolwiek co chciałbyś dodać..." value={form.additionalInfo} onChange={set('additionalInfo')} maxLength={500} disabled={isBlocked} />
        </div>

        <div className="pt-1">
          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting || isBlocked || !targetUser}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Wysyłanie...
              </span>
            ) : '📋 Wyślij wniosek o awans'}
          </button>
          {!targetUser && <p className="text-slate-500 text-xs mt-2">Wybierz użytkownika przed wysłaniem.</p>}
        </div>
      </form>
    </div>
  );
}
