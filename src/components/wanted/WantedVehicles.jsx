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

// URL zdjęcia – używa tego samego baseURL co reszta API (dev: proxy Vite, prod: bezpośrednio)
// Nie używamy już imgSrc do src, zamiast tego blob URLs z api.get

const emptyForm = { model: '', licensePlate: '', owner: '', reason: '', status: 'POSZUKIWANY', image: null, imagePreview: null, removeImage: false };

export default function WantedVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewImage, setViewImage] = useState(null);

  const getDataUri = (v) => v.imageData && v.imageMimeType ? `data:${v.imageMimeType};base64,${v.imageData}` : null;

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus !== 'ALL') params.status = filterStatus;
      if (search) params.search = search;
      const res = await api.get('/wanted-vehicles', { params });
      setVehicles(res.data.data);
      // DEBUG - usuń po naprawieniu
      res.data.data.forEach(v => {
        console.log(`[DEBUG] ${v.model}: imageMimeType=${v.imageMimeType}, imageData length=${v.imageData?.length ?? 'BRAK'}, imageData prefix=${v.imageData?.slice(0,30) ?? 'BRAK'}`);
      });
    } catch {
      toast.error('Błąd ładowania danych');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVehicles(); }, [filterStatus]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (v) => {
    setEditing(v);
    setForm({ model: v.model, licensePlate: v.licensePlate || '', owner: v.owner, reason: v.reason, status: v.status, image: null, imagePreview: null, removeImage: false });
    setShowModal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    setForm({ ...form, image: file, imagePreview: URL.createObjectURL(file), removeImage: false });
  };

  const handleRemoveImage = () => {
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    setForm({ ...form, image: null, imagePreview: null, removeImage: true });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('model', form.model);
      formData.append('licensePlate', form.licensePlate);
      formData.append('owner', form.owner);
      formData.append('reason', form.reason);
      formData.append('status', form.status);
      if (form.image) formData.append('image', form.image);
      if (form.removeImage) formData.append('removeImage', 'true');
      if (editing) {
        await api.put(`/wanted-vehicles/${editing._id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Zaktualizowano');
      } else {
        await api.post('/wanted-vehicles', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Dodano pojazd');
      }
      setShowModal(false);
      fetchVehicles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/wanted-vehicles/${id}`);
      toast.success('Usunięto');
      setDeleteConfirm(null);
      fetchVehicles();
    } catch { toast.error('Błąd usuwania'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Poszukiwane Pojazdy</h2>
          <p className="text-slate-400 text-sm mt-0.5">{vehicles.length} rekordów</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          Dodaj pojazd
        </button>
      </div>

      <div className="card flex flex-wrap gap-4 items-center">
        <form onSubmit={(e) => { e.preventDefault(); fetchVehicles(); }} className="flex gap-2 flex-1 min-w-48">
          <input type="text" className="input-field" placeholder="Szukaj model, właściciel, rejestracja..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" className="btn-secondary px-3 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </button>
        </form>
        <div className="flex gap-2 flex-wrap">
          {['ALL', 'POSZUKIWANY', 'ZATRZYMANY', 'ZWOLNIONY'].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === s ? 'bg-primary-600 text-white' : 'bg-dark-700 text-slate-400 hover:text-slate-200'}`}>
              {s === 'ALL' ? 'Wszystkie' : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-dark-800">
              <tr>
                <th className="table-header">Zdjęcie</th>
                <th className="table-header">Model</th>
                <th className="table-header">Nr rej.</th>
                <th className="table-header">Właściciel</th>
                <th className="table-header">Powód</th>
                <th className="table-header">Status</th>
                <th className="table-header">Dodał</th>
                <th className="table-header">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-slate-500 py-12">Brak rekordów</td></tr>
              ) : vehicles.map((v) => (
                <tr key={v._id} className="table-row">
                  <td className="table-cell">
                    {(() => { const src = getDataUri(v); return src ? (
                      <img
                        src={src}
                        alt={v.model}
                        className="h-10 w-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setViewImage(src)}
                      />
                    ) : (
                      <div className="h-10 w-16 rounded-lg bg-dark-700 border border-dark-600 flex items-center justify-center">
                        <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                      </div>
                    ); })()}
                  </td>
                  <td className="table-cell font-medium">{v.model}</td>
                  <td className="table-cell text-slate-400">{v.licensePlate || '—'}</td>
                  <td className="table-cell">{v.owner}</td>
                  <td className="table-cell text-slate-400 max-w-xs truncate">{v.reason}</td>
                  <td className="table-cell"><span className={STATUS_CONFIG[v.status]?.cls}>{STATUS_CONFIG[v.status]?.label}</span></td>
                  <td className="table-cell text-slate-400">{v.addedBy?.username || '—'}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(v)} className="text-slate-400 hover:text-blue-400 p-1 rounded hover:bg-dark-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                      <button onClick={() => setDeleteConfirm(v)} className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-dark-600 transition-colors">
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edytuj pojazd' : 'Dodaj pojazd poszukiwany'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Model pojazdu</label>
              <input type="text" className="input-field" placeholder="np. Sultan RS" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} maxLength={80} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Nr rejestracyjny</label>
              <input type="text" className="input-field" placeholder="np. WA12345 (opcjonalne)" value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} maxLength={20} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Właściciel (nick)</label>
            <input type="text" className="input-field" placeholder="Nick właściciela..." value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} maxLength={50} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Powód poszukiwań</label>
            <textarea className="input-field resize-none" rows={3} placeholder="Powód..." value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} maxLength={300} required />
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
            <label className="block text-sm font-medium text-slate-300 mb-1">Zdjęcie pojazdu</label>
            {editing && getDataUri(editing) && !form.removeImage && !form.imagePreview && (
              <div className="mb-2 relative inline-block">
                <img src={getDataUri(editing)} alt="Aktualne zdjęcie" className="h-28 rounded-lg object-cover" />
                <button type="button" onClick={handleRemoveImage}
                  className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 rounded-full w-5 h-5 flex items-center justify-center text-white text-xs font-bold">
                  ✕
                </button>
                <p className="text-xs text-slate-500 mt-1">Aktualne zdjęcie — kliknij ✕ aby usunąć</p>
              </div>
            )}
            {form.imagePreview && (
              <div className="mb-2 relative inline-block">
                <img src={form.imagePreview} alt="Podgląd" className="h-28 rounded-lg object-cover" />
                <button type="button" onClick={handleRemoveImage}
                  className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 rounded-full w-5 h-5 flex items-center justify-center text-white text-xs font-bold">
                  ✕
                </button>
                <p className="text-xs text-slate-500 mt-1">Nowe zdjęcie — podgląd</p>
              </div>
            )}
            {form.removeImage && !form.imagePreview && (
              <p className="text-xs text-yellow-500 mb-2">Zdjęcie zostanie usunięte po zapisaniu</p>
            )}
            <label className="flex items-center gap-2 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg cursor-pointer hover:bg-dark-600 transition-colors text-sm text-slate-300">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              <span className="truncate">{form.image ? form.image.name : 'Wybierz zdjęcie (jpg, png, webp — max 5 MB)'}</span>
              <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageChange} />
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Zapisywanie...' : editing ? 'Zaktualizuj' : 'Dodaj'}</button>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Anuluj</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Usuń pojazd" size="sm">
        <p className="text-slate-300 mb-2">Usunąć poszukiwany pojazd:</p>
        <p className="text-white font-semibold mb-6">„{deleteConfirm?.model}" – właściciel: {deleteConfirm?.owner}</p>
        <div className="flex gap-3">
          <button onClick={() => handleDelete(deleteConfirm._id)} className="btn-danger flex-1">Usuń</button>
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Anuluj</button>
        </div>
      </Modal>

      {viewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setViewImage(null)}>
          <div className="relative max-w-3xl max-h-screen p-4" onClick={(e) => e.stopPropagation()}>
            <img src={viewImage} alt="Zdjęcie pojazdu" className="max-h-[80vh] max-w-full rounded-xl shadow-2xl" />
            <button onClick={() => setViewImage(null)}
              className="absolute top-2 right-2 bg-dark-800/80 hover:bg-dark-700 rounded-full w-8 h-8 flex items-center justify-center text-white">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
