import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import Modal from '../common/Modal.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';

const CATEGORY_LABELS = {
  PREDKOSC: 'Prędkość',
  POJAZD: 'Pojazd',
  DOKUMENTY: 'Dokumenty',
  ZACHOWANIE: 'Zachowanie',
  ALKOHOL: 'Alkohol',
  INNE: 'Inne',
};

const CATEGORY_COLORS = {
  PREDKOSC: 'bg-orange-900/30 border-orange-700/40 text-orange-300',
  POJAZD: 'bg-blue-900/30 border-blue-700/40 text-blue-300',
  DOKUMENTY: 'bg-purple-900/30 border-purple-700/40 text-purple-300',
  ZACHOWANIE: 'bg-red-900/30 border-red-700/40 text-red-300',
  ALKOHOL: 'bg-yellow-900/30 border-yellow-700/40 text-yellow-300',
  INNE: 'bg-slate-800 border-slate-700 text-slate-300',
};

const emptyForm = { title: '', description: '', price: '', penaltyPoints: '0', category: 'PREDKOSC' };

export default function MandateCalculator() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('SZEF');

  const [mandates, setMandates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingMandate, setEditingMandate] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [collapsedCats, setCollapsedCats] = useState(new Set());

  const toggleCat = (cat) => setCollapsedCats((prev) => {
    const next = new Set(prev);
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    return next;
  });

  const fetchMandates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/mandates');
      setMandates(res.data.data);
    } catch {
      toast.error('Błąd ładowania mandatów');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMandates(); }, []);

  const grouped = useMemo(() => {
    const filtered = filterCategory === 'ALL'
      ? mandates
      : mandates.filter((m) => m.category === filterCategory);

    return filtered.reduce((acc, m) => {
      if (!acc[m.category]) acc[m.category] = [];
      acc[m.category].push(m);
      return acc;
    }, {});
  }, [mandates, filterCategory]);

  const totalSum = useMemo(() => {
    return mandates
      .filter((m) => selected.has(m._id))
      .reduce((sum, m) => sum + m.price, 0);
  }, [selected, mandates]);

  const totalPoints = useMemo(() => {
    return mandates
      .filter((m) => selected.has(m._id))
      .reduce((sum, m) => sum + (m.penaltyPoints || 0), 0);
  }, [selected, mandates]);

  const selectedMandates = mandates.filter((m) => selected.has(m._id));

  const toggleMandate = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const openCreate = () => {
    setEditingMandate(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (mandate) => {
    setEditingMandate(mandate);
    setForm({
      title: mandate.title,
      description: mandate.description,
      price: mandate.price.toString(),
      penaltyPoints: (mandate.penaltyPoints ?? 0).toString(),
      category: mandate.category,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.price) {
      toast.error('Wypełnij wszystkie pola'); return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      toast.error('Nieprawidłowa cena'); return;
    }
    const penaltyPoints = parseInt(form.penaltyPoints, 10) || 0;
    if (penaltyPoints < 0 || penaltyPoints > 10) {
      toast.error('Punkty karne 0–10'); return;
    }

    setSaving(true);
    try {
      const payload = { ...form, price, penaltyPoints };
      if (editingMandate) {
        await api.put(`/mandates/${editingMandate._id}`, payload);
        toast.success('Mandat zaktualizowany');
      } else {
        await api.post('/mandates', payload);
        toast.success('Mandat dodany');
      }
      setShowModal(false);
      fetchMandates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/mandates/${id}`);
      toast.success('Mandat usunięty');
      setDeleteConfirm(null);
      fetchMandates();
    } catch {
      toast.error('Błąd usuwania');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Kalkulator Mandatów</h2>
          <p className="text-slate-400 text-sm mt-0.5">Zaznacz mandaty, aby obliczyć sumę</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button onClick={openCreate} className="btn-primary flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Dodaj mandat
            </button>
          )}
        </div>
      </div>

      {/* Filtr kategorii */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', ...Object.keys(CATEGORY_LABELS)].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterCategory === cat
                ? 'bg-primary-600 text-white'
                : 'bg-dark-700 text-slate-400 hover:text-slate-200 hover:bg-dark-600'
            }`}
          >
            {cat === 'ALL' ? 'Wszystkie' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Lista mandatów */}
          <div className="xl:col-span-2 space-y-4">
            {Object.entries(grouped).length === 0 && (
              <div className="card text-center text-slate-400 py-12">
                Brak mandatów w tej kategorii
              </div>
            )}
            {Object.entries(grouped).map(([category, items]) => {
              const isCollapsed = collapsedCats.has(category);
              return (
              <div key={category} className="bg-dark-700 border border-dark-600 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleCat(category)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-dark-600/40 transition-colors"
                >
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-sm font-medium ${CATEGORY_COLORS[category]}`}>
                    {CATEGORY_LABELS[category]}
                    <span className="opacity-60 text-xs">({items.length})</span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                {!isCollapsed && (
                <div className="px-4 pb-4 space-y-2">
                  {items.map((m) => (
                    <div
                      key={m._id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selected.has(m._id)
                          ? 'bg-primary-600/20 border-primary-500/50'
                          : 'bg-dark-800 border-dark-500 hover:border-dark-400'
                      }`}
                      onClick={() => toggleMandate(m._id)}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selected.has(m._id) ? 'bg-primary-600 border-primary-500' : 'border-dark-400'
                      }`}>
                        {selected.has(m._id) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 font-medium text-sm">{m.title}</p>
                        <p className="text-slate-500 text-xs truncate">{m.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-emerald-400 font-semibold text-sm">
                          {m.price.toLocaleString('pl-PL')} $
                        </span>
                        {m.penaltyPoints > 0 && (
                          <span className="flex items-center gap-1 text-xs font-medium bg-red-900/40 text-red-400 border border-red-700/40 px-1.5 py-0.5 rounded">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                            </svg>
                            {m.penaltyPoints} pkt
                          </span>
                        )}
                        {isAdmin && (
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => openEdit(m)}
                              className="text-slate-400 hover:text-blue-400 p-1 rounded transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(m)}
                              className="text-slate-400 hover:text-red-400 p-1 rounded transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
              );
            })}
          </div>

          {/* Panel sumy */}
          <div className="xl:col-span-1">
            <div className="card xl:sticky xl:top-0">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                Kalkulator
              </h3>

              {selectedMandates.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">
                  Zaznacz mandaty z listy
                </p>
              ) : (
                <div className="space-y-2 mb-4">
                  {selectedMandates.map((m) => (
                    <div key={m._id} className="flex justify-between items-start text-sm">
                      <span className="text-slate-300 leading-snug flex-1 mr-2">{m.title}</span>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className="text-emerald-400 font-medium">{m.price.toLocaleString('pl-PL')} $</span>
                        {m.penaltyPoints > 0 && (
                          <span className="text-red-400 text-xs">{m.penaltyPoints} pkt</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-dark-600 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Mandatów:</span>
                  <span className="text-white font-medium">{selectedMandates.length}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-slate-400">Łączna kwota:</span>
                  <span className="text-2xl font-bold text-emerald-400">{totalSum.toLocaleString('pl-PL')} $</span>
                </div>
                {totalPoints > 0 && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-slate-400">Punkty karne:</span>
                    <span className="text-2xl font-bold text-red-400">{totalPoints} pkt</span>
                  </div>
                )}
              </div>

              {selectedMandates.length > 0 && (
                <button onClick={clearSelection} className="btn-secondary w-full mt-4 text-sm">
                  Wyczyść wybór
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal dodaj/edytuj */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingMandate ? 'Edytuj mandat' : 'Dodaj mandat'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Tytuł</label>
            <input
              type="text"
              className="input-field"
              placeholder="np. Przekroczenie prędkości 1-20 km/h"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={100}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Opis</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Opis naruszenia..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={500}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Kwota ($)</label>
              <input
                type="number"
                className="input-field"
                placeholder="np. 500"
                min={0}
                max={1000000}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Punkty karne (0–10)</label>
              <input
                type="number"
                className="input-field"
                placeholder="np. 2"
                min={0}
                max={10}
                value={form.penaltyPoints}
                onChange={(e) => setForm({ ...form, penaltyPoints: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Kategoria</label>
            <select
              className="input-field"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Zapisywanie...' : editingMandate ? 'Zaktualizuj' : 'Dodaj mandat'}
            </button>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
              Anuluj
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal potwierdzenia usunięcia */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Usuń mandat" size="sm">
        <p className="text-slate-300 mb-2">Czy na pewno chcesz usunąć mandat:</p>
        <p className="text-white font-semibold mb-6">„{deleteConfirm?.title}"</p>
        <div className="flex gap-3">
          <button onClick={() => handleDelete(deleteConfirm._id)} className="btn-danger flex-1">
            Usuń
          </button>
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">
            Anuluj
          </button>
        </div>
      </Modal>
    </div>
  );
}
