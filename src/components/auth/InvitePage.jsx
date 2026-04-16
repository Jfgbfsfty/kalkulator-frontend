import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import toast from 'react-hot-toast';

const getApiBase = () => {
  const raw = import.meta.env.VITE_API_URL || '';
  return raw.replace(/^"|"$/g, '');
};

const DISCORD_ERRORS = {
  cancelled:      'Anulowałeś autoryzację Discord.',
  token:          'Błąd autoryzacji Discord. Spróbuj ponownie.',
  user:           'Nie udało się pobrać danych konta Discord.',
  server:         'Błąd serwera podczas autoryzacji.',
  discord_taken:  'To konto Discord jest już zarejestrowane w systemie.',
  invalid:        'Ten link rejestracyjny jest nieważny lub wygasł.',
};

export default function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading'); // loading | valid | invalid | discord | register | done
  const [inviteInfo, setInviteInfo] = useState(null);
  const [discordAuth, setDiscordAuth] = useState(null); // { token, username }
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sprawdź ważność tokenu + obsłuż powrót z Discord OAuth2
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const discordToken    = params.get('discord_token');
    const discordUsername = params.get('discord_username');
    const errorCode       = params.get('error');

    if (errorCode) {
      toast.error(DISCORD_ERRORS[errorCode] || 'Błąd weryfikacji.');
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (discordToken && discordUsername) {
      setDiscordAuth({ token: discordToken, username: discordUsername });
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Sprawdź ważność linku
    api.get(`/invite/${token}`)
      .then((res) => {
        setInviteInfo(res.data);
        setStatus(discordToken ? 'register' : 'discord');
      })
      .catch((err) => {
        const msg = err.response?.data?.message || 'Link nieważny.';
        setInviteInfo({ message: msg });
        setStatus('invalid');
      });
  }, [token]);

  const handleDiscordLogin = () => {
    window.location.href = `${getApiBase()}/api/invite/${token}/discord`;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== passwordConfirm) {
      toast.error('Hasła nie są identyczne.');
      return;
    }
    if (!discordAuth) {
      toast.error('Wymagana weryfikacja Discord.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/invite/${token}/register`, {
        password,
        discordToken: discordAuth.token,
      });
      toast.success(`Konto "${res.data.username}" zostało utworzone!`);
      setStatus('done');
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Błąd rejestracji.';
      toast.error(msg);
      if (err.response?.status === 401) {
        setDiscordAuth(null);
        setStatus('discord');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Widoki ────────────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center space-y-4 py-10">
          <div className="text-5xl">❌</div>
          <h2 className="text-xl font-bold text-white">Link nieważny</h2>
          <p className="text-slate-400 text-sm">{inviteInfo?.message}</p>
        </div>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center space-y-4 py-10">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-white">Konto utworzone!</h2>
          <p className="text-slate-400 text-sm">Zaloguj się do panelu używając swojego nicku Discord i ustawionego hasła.</p>
          <button onClick={() => navigate('/panel')} className="btn-primary w-full">
            Przejdź do logowania
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">

        {/* Nagłówek */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600/20 border border-primary-500/30 rounded-2xl mb-3">
            <svg className="w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Rejestracja do panelu</h1>
          <p className="text-slate-400 text-sm mt-1">Polskie RP – Wydział Drogówki</p>
        </div>

        <div className="card space-y-5">

          {/* Krok 1 – Discord */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Krok 1 – Weryfikacja Discord</p>
            {!discordAuth ? (
              <div className="bg-dark-800 border border-indigo-500/30 rounded-xl p-4 flex flex-col items-center gap-3 text-center">
                <p className="text-slate-300 text-sm">Zaloguj się przez Discord, aby powiązać konto</p>
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
              <div className="bg-dark-800 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-3">
                <span className="text-emerald-400">✅</span>
                <div className="flex-1 min-w-0">
                  <p className="text-emerald-300 text-sm font-medium">Zweryfikowano</p>
                  <p className="text-slate-400 text-xs truncate">{discordAuth.username}</p>
                </div>
                <button type="button" onClick={() => { setDiscordAuth(null); setStatus('discord'); }} className="text-xs text-slate-500 hover:text-slate-300">
                  Zmień
                </button>
              </div>
            )}
          </div>

          {/* Krok 2 – Hasło */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Krok 2 – Ustaw hasło</p>
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Hasło <span className="text-red-400">*</span></label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Min. 8 znaków, duża litera, cyfra"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  disabled={!discordAuth}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Powtórz hasło <span className="text-red-400">*</span></label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Powtórz hasło"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  minLength={8}
                  required
                  disabled={!discordAuth}
                />
              </div>
              <div className="bg-dark-800 rounded-lg p-3 text-slate-400 text-xs">
                Twoja nazwa użytkownika zostanie ustawiona automatycznie na podstawie nicku Discord.<br />
                Rola: <span className="text-blue-400 font-medium">Policjant</span>
              </div>
              <button
                type="submit"
                disabled={submitting || !discordAuth}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Tworzenie konta...' : 'Utwórz konto'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
