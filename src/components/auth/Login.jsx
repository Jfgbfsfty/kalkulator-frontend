import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [twoFAStep, setTwoFAStep] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const { login, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.username.trim() || !form.password) {
      setError('Wypełnij wszystkie pola');
      return;
    }

    setLoading(true);
    try {
      const res = await login(form.username.trim(), form.password);
      if (res.requires2FA) {
        setTempToken(res.tempToken);
        setTwoFAStep(true);
        toast('Wprowadź kod z aplikacji uwierzytelniającej', { icon: '🔐' });
      } else if (res.success) {
        toast.success(`Witaj, ${res.user.username}!`);
        navigate('/mandates');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Błąd logowania';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFA = async (e) => {
    e.preventDefault();
    setError('');
    if (!totpCode.trim()) { setError('Wprowadź kod 2FA'); return; }
    setLoading(true);
    try {
      const res = await verifyTwoFactor(tempToken, totpCode.trim());
      if (res.success) {
        toast.success(`Witaj, ${res.user.username}!`);
        navigate('/mandates');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Nieprawidłowy kod 2FA';
      setError(msg);
      toast.error(msg);
      if (err.response?.status === 401 && msg.includes('wygasł')) {
        setTwoFAStep(false);
        setTempToken('');
        setTotpCode('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      {/* Tło z efektem gradientu */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-800/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600/20 border border-primary-500/30 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Kalkulator Mandatów</h1>
          <p className="text-slate-400 mt-1 text-sm">Polskie RP – Panel Zarządzania</p>
        </div>

        {/* Formularz */}
        <div className="card border-dark-600 shadow-2xl">
          {twoFAStep ? (
            /* ── Krok 2FA ── */
            <form onSubmit={handleTwoFA} className="space-y-5" autoComplete="off">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-600/20 border border-amber-500/30 rounded-xl mb-3">
                  <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-white font-semibold">Weryfikacja dwuetapowa</p>
                <p className="text-slate-400 text-sm mt-1">Wprowadź 6-cyfrowy kod z aplikacji uwierzytelniającej</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Kod 2FA</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="input-field text-center text-2xl tracking-widest"
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  autoFocus
                  required
                />
              </div>
              {error && (
                <div className="bg-red-900/30 border border-red-700/50 text-red-300 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading || totpCode.length < 6} className="btn-primary w-full py-2.5 disabled:opacity-50">
                {loading ? 'Weryfikacja...' : 'Potwierdź'}
              </button>
              <button type="button" onClick={() => { setTwoFAStep(false); setTempToken(''); setTotpCode(''); setError(''); }}
                className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors">
                ← Wróć do logowania
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Nazwa użytkownika
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Wprowadź login..."
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                maxLength={30}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Hasło
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Wprowadź hasło..."
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                maxLength={100}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700/50 text-red-300 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-base"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Logowanie...
                </>
              ) : (
                'Zaloguj się'
              )}
            </button>
          </form>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          © 2026 Kalkulator Mandatów – Polskie RP
        </p>
      </div>
    </div>
  );
}
