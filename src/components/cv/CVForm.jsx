import { useState } from 'react';
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
  discordUserId: '',
  additionalInfo: '',
};

export default function CVForm() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/cv', {
        ...form,
        age: parseInt(form.age),
      });
      setSubmitted(true);
      toast.success('CV zostało wysłane! Oczekuj odpowiedzi.');
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Błąd wysyłania CV';
      toast.error(msg);
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

        {/* Discord ID */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Discord ID
            <span className="ml-1 text-slate-500 font-normal text-xs">(opcjonalne – umożliwia automatyczne nadanie roli po akceptacji)</span>
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="np. 123456789012345678"
            value={form.discordUserId}
            onChange={set('discordUserId')}
            maxLength={20}
            inputMode="numeric"
          />
          <p className="text-slate-600 text-xs mt-1">Swoje ID znajdziesz w ustawieniach Discord → Zaawansowane → Tryb dewelopera → kliknij prawym na swój nick → Kopiuj ID</p>
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
          disabled={submitting}
          className="btn-primary w-full flex items-center justify-center gap-2"
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
