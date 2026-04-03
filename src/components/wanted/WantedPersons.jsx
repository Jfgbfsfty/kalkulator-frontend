import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import toast from 'react-hot-toast';
import Modal from '../common/Modal.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';

const STATUS_CONFIG = {
  POSZUKIWANY: { label: 'Poszukiwany', cls: 'badge-red' },
  ZATRZYMANY: { label: 'Zatrzymany', cls: 'badge-yellow' },
  ZWOLNIONY: { label: 'Zwolniony', cls: 'badge-green' },
};

const emptyForm = { nick: '', reason: '', status: 'POSZUKIWANY', additionalInfo: '' };

export default function WantedPersons() {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchPersons = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus !== 'ALL') params.status = filterStatus;
      if (search) params.search = search;
      const res = await api.get('/wanted-persons', { params });
      setPersons(res.data.data);
    } catch {
      toast.error('Błąd ładowania danych');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPersons(); }, [filterStatus]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPersons();
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ nick: p.nick, reason: p.reason, status: p.status, additionalInfo: p.additionalInfo || '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/wanted-persons/${editing._id}`, form);
        toast.success('Zaktualizowano');
      } else {
        await api.post('/wanted-persons', form);
        toast.success('Dodano osobę poszukiwaną');
      }
      setShowModal(false);
      fetchPersons();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/wanted-persons/${id}`);
      toast.success('Usunięto');
      setDeleteConfirm(null);
      fetchPersons();
    } catch {
      toast.error('Błąd usuwania');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Poszukiwane Osoby</h2>
          <p className="text-slate-400 text-sm mt-0.5">{persons.length} rekordów</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          Dodaj osobę
        </button>
      </div>

      {/* Filtry */}
      <div className="card flex flex-wrap gap-4 items-center">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-48">
          <input
            type="text"
            className="input-field"
            placeholder="Szukaj po nicku, powodzie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-secondary px-3 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </button>
        </form>
        <div className="flex gap-2 flex-wrap">
          {['ALL', 'POSZUKIWANY', 'ZATRZYMANY', 'ZWOLNIONY'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s === 'ALL' ? 'Wszystkie' : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      {loading ? <LoadingSpinner /> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-dark-800">
              <tr>
                <th className="table-header">Nick</th>
                <th className="table-header">Powód</th>
                <th className="table-header">Status</th>
                <th className="table-header">Dodał</th>
                <th className="table-header">Data</th>
                <th className="table-header">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {persons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-slate-500 py-12">Brak rekordów</td>
                </tr>
              ) : (
                persons.map((p) => (
                  <tr key={p._id} className="table-row">
                    <td className="table-cell font-medium">{p.nick}</td>
                    <td className="table-cell text-slate-400 max-w-xs truncate">{p.reason}</td>
                    <td className="table-cell">
                      <span className={STATUS_CONFIG[p.status]?.cls}>{STATUS_CONFIG[p.status]?.label}</span>
                    </td>
                    <td className="table-cell text-slate-400">{p.addedBy?.username || '—'}</td>
                    <td className="table-cell text-slate-400">
                      {new Date(p.createdAt).toLocaleDateString('pl-PL')}
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(p)} className="text-slate-400 hover:text-blue-400 transition-colors p-1 rounded hover:bg-dark-600">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <button onClick={() => setDeleteConfirm(p)} className="text-slate-400 hover:text-red-400 transition-colors p-1 rounded hover:bg-dark-600">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edytuj osobę' : 'Dodaj osobę poszukiwaną'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nick</label>
            <input type="text" className="input-field" placeholder="Nick gracza..." value={form.nick} onChange={(e) => setForm({ ...form, nick: e.target.value })} maxLength={50} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Powód</label>
            <textarea className="input-field resize-none" rows={3} placeholder="Powód poszukiwania..." value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} maxLength={300} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
            <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {Object.entries(STATUS_CONFIG).map(([val, { label }]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Dodatkowe informacje (opcjonalne)</label>
            <textarea className="input-field resize-none" rows={2} placeholder="Np. ostatnia znana lokalizacja..." value={form.additionalInfo} onChange={(e) => setForm({ ...form, additionalInfo: e.target.value })} maxLength={500} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Zapisywanie...' : editing ? 'Zaktualizuj' : 'Dodaj'}</button>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Anuluj</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Usuń rekord" size="sm">
        <p className="text-slate-300 mb-2">Usunąć rekord osoby poszukiwanej:</p>
        <p className="text-white font-semibold mb-6">„{deleteConfirm?.nick}"</p>
        <div className="flex gap-3">
          <button onClick={() => handleDelete(deleteConfirm._id)} className="btn-danger flex-1">Usuń</button>
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Anuluj</button>
        </div>
      </Modal>
    </div>
  );
}
