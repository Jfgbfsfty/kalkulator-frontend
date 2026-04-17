import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import toast from 'react-hot-toast';

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

const getPromoDiscordOAuthUrl = () => {
  const base = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/^"|"$/g, '')
    : window.location.origin;
  return `${base}/api/promotion-auth/discord`;
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
  const [discordAuth, setDiscordAuth] = useState(null); // { token, username }
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cooldown, setCooldown] = useState(null);

  useEffect(() => {
    api.get('/promotion-requests/my-cooldown')
      .then(({ data }) => {
        if (!data.canSubmit) setCooldown(data.nextAllowedAt);
      })
      .catch(() => {});

    // Obsłuż powrót z Discord OAuth2
    const params = new URLSearchParams(window.location.search);
    const token    = params.get('discord_token');
    const username = params.get('discord_username');
    const errCode  = params.get('discord_error');

    if (token && username) {
      setDiscordAuth({ token, username });
      sessionStorage.setItem('promo_discord_auth', JSON.stringify({ token, username }));
      window.history.replaceState({}, '', window.location.pathname);
    } else if (errCode) {
      const msgs = {
        cancelled: 'Anulowałeś autoryzację Discord.',
        token:     'Błąd autoryzacji Discord. Spróbuj ponownie.',
        user:      'Nie udało się pobrać danych użytkownika Discord.',
        server:    'Błąd serwera podczas autoryzacji Discord.',
      };
      toast.error(msgs[errCode] || 'Błąd weryfikacji Discord.');
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      const stored = sessionStorage.getItem('promo_discord_auth');
      if (stored) {
        try { setDiscordAuth(JSON.parse(stored)); } catch {}
      }
    }
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleDiscordLogin = () => {
    window.location.href = getPromoDiscordOAuthUrl();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!discordAuth) {
      toast.error('Musisz najpierw zweryfikować konto Discord!');
      return;
    }
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
        discordToken: discordAuth.token,
        discordNick: discordAuth.username,
        hoursWorked: parseFloat(form.hoursWorked),
        availability: parseInt(form.availability),
      });
      setSubmitted(true);
      sessionStorage.removeItem('promo_discord_auth');
      toast.success('✅ Wniosek o awans został wysłany!');
    } catch (err) {
      if (err.response?.status === 429) {
        setCooldown(err.response.data.nextAllowedAt);
        toast.error('Możesz wysłać wniosek raz na 24 godziny.');
      } else if (err.response?.status === 401) {
        setDiscordAuth(null);
        sessionStorage.removeItem('promo_discord_auth');
        toast.error('Token Discord wygasł. Zweryfikuj się ponownie.');
      } else {
        const msg =
          err.response?.data?.errors?.[0]?.msg ||
          err.response?.data?.message ||
          'Błąd wysyłania wniosku';
        toast.error(msg);
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
        <p className="text-slate-400 mb-8">
          Twój wniosek o awans trafił na kanał Discord do kadry kierowniczej. Poczekaj na decyzję.
        </p>
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
        {/* Krok 1 – Discord */}
        <div>
          <h3 className="text-base font-semibold text-white border-b border-dark-600 pb-3 mb-3">
            Krok 1 – Weryfikacja Discord
          </h3>
          {!discordAuth ? (
            <button
              type="button"
              onClick={handleDiscordLogin}
              disabled={isBlocked}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
              Zaloguj przez Discord
            </button>
          ) : (
            <div className="bg-dark-800 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-3">
              <span className="text-emerald-400">✅</span>
              <div className="flex-1 min-w-0">
                <p className="text-emerald-300 text-sm font-medium">Zweryfikowano</p>
                <p className="text-slate-400 text-xs truncate">{discordAuth.username}</p>
              </div>
              <button
                type="button"
                onClick={() => { setDiscordAuth(null); sessionStorage.removeItem('promo_discord_auth'); }}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Zmień
              </button>
            </div>
          )}
        </div>

        {/* Krok 2 – Stopień */}
        <h3 className="text-base font-semibold text-white border-b border-dark-600 pb-3 pt-1">
          Krok 2 – Stopień
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Aktualny stopień <span className="text-red-400">*</span>
            </label>
            <select className="input-field" value={form.currentRank} onChange={set('currentRank')} required disabled={isBlocked}>
              {PLAYER_RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Wnioskowany stopień <span className="text-red-400">*</span>
            </label>
            <select className="input-field" value={form.desiredRank} onChange={set('desiredRank')} required disabled={isBlocked}>
              {PLAYER_RANKS.filter((r) => r !== form.currentRank).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <h3 className="text-base font-semibold text-white border-b border-dark-600 pb-3 pt-1">
          Aktywność i uzasadnienie
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Przepracowane godziny (orientacyjnie) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              className="input-field"
              placeholder="np. 40"
              value={form.hoursWorked}
              onChange={set('hoursWorked')}
              min={0}
              max={9999}
              step={0.5}
              required
              disabled={isBlocked}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Dostępność <span className="text-red-400">*</span>
              <span className="text-slate-500 font-normal ml-1 text-xs">(dni w tygodniu, 1–7)</span>
            </label>
            <input
              type="number"
              className="input-field"
              placeholder="np. 5"
              value={form.availability}
              onChange={set('availability')}
              min={1}
              max={7}
              required
              disabled={isBlocked}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Dlaczego zasługujesz na awans? <span className="text-red-400">*</span>
            <span className="text-slate-500 font-normal ml-1 text-xs">(min. 20 znaków)</span>
          </label>
          <textarea
            className="input-field resize-none"
            rows={4}
            placeholder="Opisz szczegółowo dlaczego uważasz, że zasługujesz na awans..."
            value={form.reason}
            onChange={set('reason')}
            minLength={20}
            maxLength={1000}
            required
            disabled={isBlocked}
          />
          <p className="text-slate-600 text-xs mt-1 text-right">{form.reason.length}/1000</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Osiągnięcia i zdarzenia{' '}
            <span className="text-slate-500 font-normal text-xs">(opcjonalne)</span>
          </label>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="Wymień ważne akcje, zdarzenia, patrole, w których uczestniczyłeś..."
            value={form.achievements}
            onChange={set('achievements')}
            maxLength={500}
            disabled={isBlocked}
          />
          <p className="text-slate-600 text-xs mt-1 text-right">{form.achievements.length}/500</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Dodatkowe informacje{' '}
            <span className="text-slate-500 font-normal text-xs">(opcjonalne)</span>
          </label>
          <textarea
            className="input-field resize-none"
            rows={2}
            placeholder="Cokolwiek co chciałbyś dodać do wniosku..."
            value={form.additionalInfo}
            onChange={set('additionalInfo')}
            maxLength={500}
            disabled={isBlocked}
          />
        </div>

        <div className="pt-1">
          <button
            type="submit"
            className="btn-primary w-full sm:w-auto"
            disabled={submitting || isBlocked || !discordAuth}
          >
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
          {!discordAuth && (
            <p className="text-slate-500 text-xs mt-2">Wymagana weryfikacja Discord przed wysłaniem.</p>
          )}
        </div>
      </form>
    </div>
  );
}


const PLAYER_RANKS = ['Drógówka', 'Kadet', 'Sierżant', 'Z-szef', 'Szef'];

const emptyForm = {
  discordNick: '',
  discordId: '',
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
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cooldown, setCooldown] = useState(null); // null = can submit, ISO string = blocked until

  useEffect(() => {
    api.get('/promotion-requests/my-cooldown')
      .then(({ data }) => {
        if (!data.canSubmit) setCooldown(data.nextAllowedAt);
      })
      .catch(() => {});
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        const msg =
          err.response?.data?.errors?.[0]?.msg ||
          err.response?.data?.message ||
          'Błąd wysyłania wniosku';
        toast.error(msg);
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
        <p className="text-slate-400 mb-8">
          Twój wniosek o awans trafił na kanał Discord do kadry kierowniczej. Poczekaj na decyzję.
        </p>
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
        <h3 className="text-base font-semibold text-white border-b border-dark-600 pb-3">
          Dane Discord
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Nick Discord <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="np. Jan_Kowalski"
              value={form.discordNick}
              onChange={set('discordNick')}
              maxLength={100}
              required
              disabled={isBlocked}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Discord ID <span className="text-red-400">*</span>
              <span className="text-slate-500 font-normal ml-1 text-xs">(17-20 cyfr)</span>
            </label>
            <input
              type="text"
              className="input-field font-mono"
              placeholder="np. 123456789012345678"
              value={form.discordId}
              onChange={set('discordId')}
              maxLength={20}
              pattern="\d{17,20}"
              title="Discord ID to liczba 17-20 cyfr"
              required
              disabled={isBlocked}
            />
          </div>
        </div>

        <h3 className="text-base font-semibold text-white border-b border-dark-600 pb-3 pt-1">
          Stopień
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Aktualny stopień <span className="text-red-400">*</span>
            </label>
            <select className="input-field" value={form.currentRank} onChange={set('currentRank')} required disabled={isBlocked}>
              {PLAYER_RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Wnioskowany stopień <span className="text-red-400">*</span>
            </label>
            <select className="input-field" value={form.desiredRank} onChange={set('desiredRank')} required disabled={isBlocked}>
              {PLAYER_RANKS.filter((r) => r !== form.currentRank).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <h3 className="text-base font-semibold text-white border-b border-dark-600 pb-3 pt-1">
          Aktywność i uzasadnienie
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Przepracowane godziny (orientacyjnie) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              className="input-field"
              placeholder="np. 40"
              value={form.hoursWorked}
              onChange={set('hoursWorked')}
              min={0}
              max={9999}
              step={0.5}
              required
              disabled={isBlocked}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Dostępność <span className="text-red-400">*</span>
              <span className="text-slate-500 font-normal ml-1 text-xs">(dni w tygodniu, 1–7)</span>
            </label>
            <input
              type="number"
              className="input-field"
              placeholder="np. 5"
              value={form.availability}
              onChange={set('availability')}
              min={1}
              max={7}
              required
              disabled={isBlocked}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Dlaczego zasługujesz na awans? <span className="text-red-400">*</span>
            <span className="text-slate-500 font-normal ml-1 text-xs">(min. 20 znaków)</span>
          </label>
          <textarea
            className="input-field resize-none"
            rows={4}
            placeholder="Opisz szczegółowo dlaczego uważasz, że zasługujesz na awans..."
            value={form.reason}
            onChange={set('reason')}
            minLength={20}
            maxLength={1000}
            required
            disabled={isBlocked}
          />
          <p className="text-slate-600 text-xs mt-1 text-right">{form.reason.length}/1000</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Osiągnięcia i zdarzenia{' '}
            <span className="text-slate-500 font-normal text-xs">(opcjonalne)</span>
          </label>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="Wymień ważne akcje, zdarzenia, patrole, w których uczestniczyłeś..."
            value={form.achievements}
            onChange={set('achievements')}
            maxLength={500}
            disabled={isBlocked}
          />
          <p className="text-slate-600 text-xs mt-1 text-right">{form.achievements.length}/500</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Dodatkowe informacje{' '}
            <span className="text-slate-500 font-normal text-xs">(opcjonalne)</span>
          </label>
          <textarea
            className="input-field resize-none"
            rows={2}
            placeholder="Cokolwiek co chciałbyś dodać do wniosku..."
            value={form.additionalInfo}
            onChange={set('additionalInfo')}
            maxLength={500}
            disabled={isBlocked}
          />
        </div>

        <div className="pt-1">
          <button
            type="submit"
            className="btn-primary w-full sm:w-auto"
            disabled={submitting || isBlocked}
          >
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
        </div>
      </form>
    </div>
  );
}
