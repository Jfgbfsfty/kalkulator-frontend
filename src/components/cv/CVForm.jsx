import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import toast from 'react-hot-toast';

const emptyForm = {
  nick: '',
  age: '',
  whyJoin: '',
  experience: '',
  availability: '',
  contactDiscord: '',
  additionalInfo: '',
};

const getDiscordOAuthUrl = () => {
  const base = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/^"|"$/g, '')
    : window.location.origin;
  return `${base}/api/cv-auth/discord`;
};

export default function CVForm() {
  const [form, setForm] = useState(emptyForm);
  const [discordAuth, setDiscordAuth] = useState(null); // { token, username }
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  // Odczytaj token Discord z URL po powrocie z OAuth2
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token    = params.get('discord_token');
    const username = params.get('discord_username');
    const errCode  = params.get('discord_error');

    if (token && username) {
      setDiscordAuth({ token, username });
      sessionStorage.setItem('cv_discord_auth', JSON.stringify({ token, username }));
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
      // Przywróć z sessionStorage (np. po odświeżeniu)
      const stored = sessionStorage.getItem('cv_discord_auth');
      if (stored) {
        try { setDiscordAuth(JSON.parse(stored)); } catch {}
      }
    }
  }, []);

  const handleDiscordLogin = () => {
    window.location.href = getDiscordOAuthUrl();
  };

  const handleDiscordLogout = () => {
    setDiscordAuth(null);
    sessionStorage.removeItem('cv_discord_auth');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!discordAuth) {
      toast.error('Musisz najpierw zweryfikować konto Discord!');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/cv', {
        ...form,
        age: parseInt(form.age),
        discordToken: discordAuth.token,
      });
      setSubmitted(true);
      sessionStorage.removeItem('cv_discord_auth');
      toast.success('CV zostało wysłane! Oczekuj odpowiedzi.');
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Błąd wysyłania CV';
      toast.error(msg);
      // Jeśli token wygasł, wyczyść
      if (err.response?.status === 401) {
        setDiscordAuth(null);
        sessionStorage.removeItem('cv_discord_auth');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center py-24 max-w-md w-full">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">CV wysłane!</h2>
          <p className="text-slate-400 mb-8 text-center">
            Twoje CV zostało przesłane na kanał Discord rekrutacji. Czekaj na kontakt od kadry kierowniczej.
          </p>
          <button
            onClick={() => { setSubmitted(false); setForm(emptyForm); }}
            className="btn-secondary"
          >
            Wyślij kolejne CV
          </button>
          <Link to="/panel" className="mt-8 text-slate-700 hover:text-slate-500 text-xs transition-colors">
            Panel administracyjny
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Nagłówek strony */}
        <div className="text-center mb-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600/20 border border-primary-500/30 rounded-2xl mb-3">
            <svg className="w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Rekrutacja do Policji</h1>
          <p className="text-slate-400 text-sm mt-1">Polskie RP – Wydział Drogówki</p>
        </div>

      <form onSubmit={handleSubmit} className="card space-y-5">

        {/* Weryfikacja Discord */}
        {!discordAuth ? (
          <div className="bg-dark-800 border border-indigo-500/30 rounded-xl p-5 flex flex-col items-center gap-3 text-center">
            <svg className="w-8 h-8 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
            </svg>
            <div>
              <p className="text-white font-medium text-sm">Wymagana weryfikacja Discord</p>
              <p className="text-slate-400 text-xs mt-1">Przed wysłaniem CV musisz zalogować się przez Discord, aby potwierdzić tożsamość.</p>
            </div>
            <button
              type="button"
              onClick={handleDiscordLogin}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
              Zaloguj przez Discord
            </button>
          </div>
        ) : (
          <div className="bg-dark-800 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
            <span className="text-emerald-400 text-lg">✅</span>
            <div className="flex-1 min-w-0">
              <p className="text-emerald-300 text-sm font-medium">Zweryfikowano konto Discord</p>
              <p className="text-slate-400 text-xs truncate">{discordAuth.username}</p>
            </div>
            <button
              type="button"
              onClick={handleDiscordLogout}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors shrink-0"
            >
              Zmień konto
            </button>
          </div>
        )}

        {/* Nick + Wiek */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Nick w grze <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="np. Jan_Kowalski"
              value={form.nick}
              onChange={set('nick')}
              maxLength={50}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Wiek <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              className="input-field"
              placeholder="np. 18"
              value={form.age}
              onChange={set('age')}
              min={1}
              max={99}
              required
            />
          </div>
        </div>

        {/* Motywacja */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Dlaczego chcesz służyć w policji? <span className="text-red-400">*</span>
          </label>
          <textarea
            className="input-field resize-none"
            rows={5}
            placeholder="Opisz swoją motywację, co Cię pociąga do służby w policji Polskie RP..."
            value={form.whyJoin}
            onChange={set('whyJoin')}
            maxLength={1500}
            required
          />
          <p className="text-slate-600 text-xs mt-1 text-right">{form.whyJoin.length}/1500</p>
        </div>

        {/* Doświadczenie */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Poprzednie doświadczenie w RP
          </label>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="Podaj serwery, frakcje lub role które pełniłeś wcześniej (opcjonalne)..."
            value={form.experience}
            onChange={set('experience')}
            maxLength={700}
          />
        </div>

        {/* Dostępność + Discord */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Dostępność</label>
            <input
              type="text"
              className="input-field"
              placeholder="np. pon-pt 18-22, weekend cały dzień"
              value={form.availability}
              onChange={set('availability')}
              maxLength={300}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Kontakt Discord
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="np. twojnick#1234"
              value={form.contactDiscord}
              onChange={set('contactDiscord')}
              maxLength={100}
            />
          </div>
        </div>

        {/* Dodatkowe informacje */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Dodatkowe informacje
          </label>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="Cokolwiek chcesz dodać do swojego zgłoszenia (opcjonalne)..."
            value={form.additionalInfo}
            onChange={set('additionalInfo')}
            maxLength={700}
          />
        </div>

        {/* Zgoda + przycisk */}
        <div className="bg-dark-800 rounded-lg p-4 text-slate-400 text-sm">
          <p>📋 Wysyłając CV zgadzasz się na przetwarzanie danych w celu rekrutacji do Wydziału Drogówki Polskie RP.</p>
        </div>

        <button
          type="submit"
          disabled={submitting || !discordAuth}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Wyślij CV na Discord
            </>
          )}
        </button>
      </form>

        {/* Dyskretny link do panelu */}
        <div className="text-center pb-8">
          <Link to="/panel" className="text-slate-700 hover:text-slate-500 text-xs transition-colors">
            Panel administracyjny
          </Link>
        </div>
      </div>
    </div>
  );
}
