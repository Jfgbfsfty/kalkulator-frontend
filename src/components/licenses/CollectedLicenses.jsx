import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import Modal from '../common/Modal.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';

const emptyForm = {
  nick: '',
  reason: '',
  collectedAt: new Date().toISOString().split('T')[0],
  notes: '',
};

export default function CollectedLicenses() {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterReturned, setFilterReturned] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterReturned === 'active') params.isReturned = false;
      if (filterReturned === 'returned') params.isReturned = true;
      if (search) params.search = search;
      const res = await api.get('/licenses', { params });
      setLicenses(res.data.data);
    } catch {
      toast.error('Błąd ładowania danych');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLicenses(); }, [filterReturned]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, collectedAt: new Date().toISOString().split('T')[0] });
    setShowModal(true);
  };
  const openEdit = (l) => {
    setEditing(l);
    setForm({
      nick: l.nick,
      reason: l.reason,
      collectedAt: l.collectedAt ? new Date(l.collectedAt).toISOString().split('T')[0] : '',
      notes: l.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/licenses/${editing._id}`, form);
        toast.success('Zaktualizowano');
      } else {
        await api.post('/licenses', form);
        toast.success('Dodano prawo jazdy');
      }
      setShowModal(false);
      fetchLicenses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async (license) => {
    try {
      await api.put(`/licenses/${license._id}`, { isReturned: true, returnDate: new Date().toISOString() });
      toast.success(`Prawo jazdy zwrócone: ${license.nick}`);
      fetchLicenses();
    } catch {
      toast.error('Błąd');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/licenses/${id}`);
      toast.success('Usunięto');
      setDeleteConfirm(null);
      fetchLicenses();
    } catch { toast.error('Błąd usuwania'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Zebrane Prawa Jazdy</h2>
          <p className="text-slate-400 text-sm mt-0.5">{licenses.length} rekordów</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          Odbierz prawo jazdy
        </button>
      </div>

      <div className="card flex flex-wrap gap-4 items-center">
        <form onSubmit={(e) => { e.preventDefault(); fetchLicenses(); }} className="flex gap-2 flex-1 min-w-48">
          <input type="text" className="input-field" placeholder="Szukaj po nicku, powodzie..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" className="btn-secondary px-3 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </button>
        </form>
        <div className="flex gap-2">
          {[['active', 'Aktywne'], ['returned', 'Zwrócone'], ['all', 'Wszystkie']].map(([val, label]) => (
            <button key={val} onClick={() => setFilterReturned(val)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterReturned === val ? 'bg-primary-600 text-white' : 'bg-dark-700 text-slate-400 hover:text-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-dark-800">
              <tr>
                <th className="table-header">Nick</th>
                <th className="table-header">Powód</th>
                <th className="table-header">Data odebrania</th>
                <th className="table-header">Odebrał</th>
                <th className="table-header">Status</th>
                <th className="table-header">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {licenses.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-slate-500 py-12">Brak rekordów</td></tr>
              ) : licenses.map((l) => (
                <tr key={l._id} className="table-row">
                  <td className="table-cell font-medium">{l.nick}</td>
                  <td className="table-cell text-slate-400 max-w-xs truncate">{l.reason}</td>
                  <td className="table-cell text-slate-400">
                    {l.collectedAt ? new Date(l.collectedAt).toLocaleDateString('pl-PL') : '—'}
                  </td>
                  <td className="table-cell text-slate-400">{l.takenBy?.username || '—'}</td>
                  <td className="table-cell">
                    {l.isReturned
                      ? <span className="badge-green">Zwrócone</span>
                      : <span className="badge-red">Aktywne</span>}
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      {!l.isReturned && (
                        <button onClick={() => handleReturn(l)} className="text-slate-400 hover:text-emerald-400 p-1 rounded hover:bg-dark-600 transition-colors" title="Zwróć PJ">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                          </svg>
                        </button>
                      )}
                      <button onClick={() => openEdit(l)} className="text-slate-400 hover:text-blue-400 p-1 rounded hover:bg-dark-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                      <button onClick={() => setDeleteConfirm(l)} className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-dark-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edytuj wpis' : 'Odbierz prawo jazdy'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nick gracza</label>
            <input type="text" className="input-field" placeholder="Nick..." value={form.nick} onChange={(e) => setForm({ ...form, nick: e.target.value })} maxLength={50} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Powód odebrania</label>
            <textarea className="input-field resize-none" rows={3} placeholder="Powód..." value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} maxLength={300} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Data odebrania</label>
            <input type="date" className="input-field" value={form.collectedAt} onChange={(e) => setForm({ ...form, collectedAt: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Notatki (opcjonalne)</label>
            <textarea className="input-field resize-none" rows={2} placeholder="Dodatkowe notatki..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={300} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Zapisywanie...' : editing ? 'Zaktualizuj' : 'Odbierz'}</button>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Anuluj</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Usuń wpis" size="sm">
        <p className="text-slate-300 mb-2">Usunąć wpis:</p>
        <p className="text-white font-semibold mb-6">„{deleteConfirm?.nick}" – {deleteConfirm?.reason}</p>
        <div className="flex gap-3">
          <button onClick={() => handleDelete(deleteConfirm._id)} className="btn-danger flex-1">Usuń</button>
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Anuluj</button>
        </div>
      </Modal>
    </div>
  );
}
