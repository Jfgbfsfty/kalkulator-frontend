import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import Modal from '../common/Modal.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';

const ROLE_CONFIG = {
  SUPERADMIN: { label: 'Superadmin', cls: 'badge-red' },
  SZEF: { label: 'Szef', cls: 'badge-yellow' },
  ZASTEPCA: { label: 'Zastępca Szefa', cls: 'badge-yellow' },
  POLICJANT: { label: 'Policjant', cls: 'badge-blue' },
};

const ACTION_LABELS = {
  LOGIN_SUCCESS: 'Logowanie',
  LOGIN_FAILED: 'Błąd logowania',
  LOGOUT: 'Wylogowanie',
  CREATE_USER: 'Dodano użytkownika',
  UPDATE_USER: 'Edytowano użytkownika',
  DELETE_USER: 'Usunięto użytkownika',
  CREATE_MANDATE: 'Dodano typ mandatu',
  UPDATE_MANDATE: 'Edytowano typ mandatu',
  DELETE_MANDATE: 'Usunięto typ mandatu',
  CREATE_WANTED_PERSON: 'Dodano poszukiwanego',
  UPDATE_WANTED_PERSON: 'Edytowano poszukiwanego',
  DELETE_WANTED_PERSON: 'Usunięto poszukiwanego',
  CREATE_WANTED_VEHICLE: 'Dodano pojazd',
  UPDATE_WANTED_VEHICLE: 'Edytowano pojazd',
  DELETE_WANTED_VEHICLE: 'Usunięto pojazd',
  COLLECT_LICENSE: 'Zatrzymano prawo jazdy',
  UPDATE_LICENSE: 'Edytowano prawo jazdy',
  DELETE_LICENSE: 'Usunięto prawo jazdy',
  DISCORD_ASSIGN_ROLE: 'Nadano rolę Discord',
  DISCORD_REMOVE_ROLE: 'Usunięto rolę Discord',
  DISCORD_SEND_LOG: 'Wysłano log Discord',
  BOT_ASSIGN_ROLE: '[BOT] Nadano rolę',
  BOT_REMOVE_ROLE: '[BOT] Usunięto rolę',
  BOT_SEND_LOG: '[BOT] Wysłano log',
};

const ALL_ACTIONS = Object.keys(ACTION_LABELS);

const getActionClass = (action) => {
  if (!action) return 'text-slate-400';
  if (action.startsWith('DELETE_') || action === 'LOGIN_FAILED') return 'text-red-400';
  if (action.startsWith('UPDATE_') || action.includes('REMOVE')) return 'text-yellow-400';
  if (action.startsWith('CREATE_') || action.startsWith('COLLECT_') || action === 'LOGIN_SUCCESS') return 'text-emerald-400';
  if (action.includes('DISCORD') || action.startsWith('BOT_') || action === 'LOGOUT') return 'text-purple-400';
  return 'text-slate-300';
};

const formatLogDetails = (details) => {
  if (!details) return '—';
  const parts = [];
  if (details.title) parts.push(details.title);
  else if (details.nick) parts.push(`Nick: ${details.nick}`);
  else if (details.model) parts.push(`Pojazd: ${details.model}`);
  else if (details.username) parts.push(`Użytkownik: ${details.username}`);
  else if (details.message) parts.push(details.message.slice(0, 70));
  else if (details.discordUserId) parts.push(`Discord ID: ${details.discordUserId}`);
  if (details.before && details.changes) parts.push('→ edytowano');
  if (details.reason) parts.push(`Powód: ${details.reason.slice(0, 40)}`);
  return parts.join(' · ') || JSON.stringify(details).slice(0, 100);
};

const emptyUserForm = { username: '', password: '', role: 'POLICJANT', discordId: '', discordUsername: '' };
const emptyRoleForm = { discordUserId: '', roleId: '', username: '' };
const SALARY_RANKS = ['Drogówka', 'Kadet', 'Sierżant', 'Z-szef', 'Szef'];
const DISMISSAL_RANKS = ['Drogówka', 'Kadet', 'Sierżant', 'Z-szef', 'Szef'];
const emptyDismissalForm = { playerNick: '', playerDiscordId: '', playerDiscordUsername: '', rank: 'Drogówka', reason: '', signedBy: '', sendToChannel: true };

export default function AdminPanel() {
  const { user: me, hasRole } = useAuth();
  const isSuperAdmin = hasRole('SUPERADMIN');

  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [dutyStats, setDutyStats] = useState([]);
  const [clearingDuty, setClearingDuty] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilter, setAuditFilter] = useState({ action: '', user: '', dateFrom: '', dateTo: '' });
  const [auditPagination, setAuditPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [guildRoles, setGuildRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showDiscordModal, setShowDiscordModal] = useState(false);
  const [discordTarget, setDiscordTarget] = useState(null);
  const [roleForm, setRoleForm] = useState(emptyRoleForm);
  const [discordAction, setDiscordAction] = useState('assign');
  const [salaryRates, setSalaryRates] = useState({});
  const [savingSalary, setSavingSalary] = useState(false);
  const [dismissals, setDismissals] = useState([]);
  const [loadingDismissals, setLoadingDismissals] = useState(false);
  const [savingDismissal, setSavingDismissal] = useState(false);
  const [dismissalForm, setDismissalForm] = useState(emptyDismissalForm);
  const [deleteConfirmDismissal, setDeleteConfirmDismissal] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.data);
    } catch { toast.error('Błąd ładowania użytkowników'); }
    finally { setLoading(false); }
  };

  const fetchAuditLogs = async (filter = { action: '', user: '', dateFrom: '', dateTo: '' }, page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (filter.action) params.append('action', filter.action);
      if (filter.user) params.append('user', filter.user);
      if (filter.dateFrom) params.append('dateFrom', filter.dateFrom);
      if (filter.dateTo) params.append('dateTo', filter.dateTo);
      const res = await api.get(`/users/audit-logs?${params.toString()}`);
      setAuditLogs(res.data.data);
      if (res.data.pagination) setAuditPagination(res.data.pagination);
    } catch { toast.error('Błąd ładowania logów'); }
    finally { setLoading(false); }
  };

  const fetchGuildRoles = async () => {
    try {
      const res = await api.get('/discord/guild-roles');
      setGuildRoles(res.data.data || []);
    } catch { /* Bot może być offline */ }
  };

  const fetchDutyStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/duty/stats');
      setDutyStats(res.data.data || []);
    } catch { toast.error('Błąd ładowania statystyk służby'); }
    finally { setLoading(false); }
  };

  const fetchSalaryConfig = async () => {
    try {
      const res = await api.get('/salary-config');
      const map = {};
      (res.data.data || []).forEach((r) => { map[r.rankName] = r.hourlyRate; });
      setSalaryRates(map);
    } catch { toast.error('Błąd ładowania stawek'); }
  };

  const handleSaveSalary = async (e) => {
    e.preventDefault();
    setSavingSalary(true);
    try {
      const updates = SALARY_RANKS.map((rankName) => ({
        rankName,
        hourlyRate: Number(salaryRates[rankName]) || 0,
      }));
      await api.put('/salary-config', updates);
      toast.success('Stawki zapisane!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Błąd zapisywania stawek');
    } finally {
      setSavingSalary(false);
    }
  };

  const handleClearAllDuty = async () => {
    if (!window.confirm('Wyczyścić godziny służby WSZYSTKICH użytkowników?')) return;
    setClearingDuty('all');
    try {
      await api.delete('/duty/clear');
      toast.success('Wyczyszczono wszystkie godziny służby');
      setDutyStats([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Błąd czyszczenia');
    } finally { setClearingDuty(null); }
  };

  const handleClearUserDuty = async (discordId, username) => {
    if (!window.confirm(`Wyczyścić godziny służby dla ${username}?`)) return;
    setClearingDuty(discordId);
    try {
      await api.delete(`/duty/clear/${discordId}`);
      toast.success(`Wyczyszczono godziny dla ${username}`);
      setDutyStats((prev) => prev.filter((s) => s.discordId !== discordId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Błąd czyszczenia');
    } finally { setClearingDuty(null); }
  };

  const fetchDismissals = async () => {
    setLoadingDismissals(true);
    try {
      const res = await api.get('/dismissals');
      setDismissals(res.data.data || []);
    } catch { toast.error('Błąd ładowania zwolnień'); }
    finally { setLoadingDismissals(false); }
  };

  const handleCreateDismissal = async (e) => {
    e.preventDefault();
    setSavingDismissal(true);
    try {
      await api.post('/dismissals', dismissalForm);
      toast.success('Zwolnienie wystawione!');
      setDismissalForm(emptyDismissalForm);
      fetchDismissals();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Błąd wystawiania zwolnienia');
    } finally {
      setSavingDismissal(false);
    }
  };

  const handleDeleteDismissal = async (id) => {
    try {
      await api.delete(`/dismissals/${id}`);
      toast.success('Zwolnienie usunięte');
      setDeleteConfirmDismissal(null);
      fetchDismissals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Błąd usuwania');
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'audit') fetchAuditLogs();
    else if (activeTab === 'discord') fetchGuildRoles();
    else if (activeTab === 'duty') fetchDutyStats();
    else if (activeTab === 'salary') fetchSalaryConfig();
    else if (activeTab === 'dismissals') fetchDismissals();
  }, [activeTab]);

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm(emptyUserForm);
    setShowCreateModal(true);
  };

  const openEditUser = (u) => {
    setEditingUser(u);
    setUserForm({ username: u.username, password: '', role: u.role, discordId: u.discordId || '', discordUsername: u.discordUsername || '' });
    setShowCreateModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        const updateData = {
          role: userForm.role,
          discordId: userForm.discordId,
          discordUsername: userForm.discordUsername,
          isActive: true,
        };
        if (userForm.password) updateData.newPassword = userForm.password;
        await api.put(`/users/${editingUser._id}`, updateData);
        toast.success('Zaktualizowano użytkownika');
      } else {
        await api.post('/users', userForm);
        toast.success('Użytkownik utworzony');
      }
      setShowCreateModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      toast.success('Użytkownik usunięty');
      setDeleteConfirm(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Błąd usuwania');
    }
  };

  const handleToggleActive = async (u) => {
    try {
      await api.put(`/users/${u._id}`, { isActive: !u.isActive });
      toast.success(u.isActive ? 'Konto dezaktywowane' : 'Konto aktywowane');
      fetchUsers();
    } catch { toast.error('Błąd'); }
  };

  const openDiscordModal = (u, action) => {
    setDiscordTarget(u);
    setDiscordAction(action);
    setRoleForm({ discordUserId: u.discordId || '', roleId: '', username: u.username });
    setShowDiscordModal(true);
  };

  const handleDiscordRole = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const endpoint = discordAction === 'assign' ? '/discord/assign-role' : '/discord/remove-role';
      await api.post(endpoint, roleForm);
      // Wyślij log
      const logMsg = discordAction === 'assign'
        ? `📢 Nadanie roli: **${roleForm.username}** otrzymał rolę Discord`
        : `📢 Usunięcie roli: **${roleForm.username}** – usunięto rolę Discord`;
      await api.post('/discord/send-log', { message: logMsg });
      toast.success(discordAction === 'assign' ? 'Rola nadana!' : 'Rola usunięta!');
      setShowDiscordModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Błąd komunikacji z botem');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'users', label: 'Użytkownicy' },
    ...(hasRole('SZEF') ? [{ id: 'audit', label: 'Dziennik Audytu' }] : []),
    { id: 'discord', label: 'Discord' },
    ...(hasRole('SZEF') ? [{ id: 'duty', label: 'Godziny Służby' }] : []),
    ...(hasRole('SZEF') ? [{ id: 'salary', label: 'Stawki' }] : []),
    ...(hasRole('ZASTEPCA') ? [{ id: 'dismissals', label: 'Zwolnienia' }] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Panel Zarządzania</h2>
        <p className="text-slate-400 text-sm mt-0.5">Zarządzanie użytkownikami i systemem</p>
      </div>

      {/* Zakładki */}
      <div className="border-b border-dark-600">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Zakładka: Użytkownicy */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-slate-400 text-sm">{users.length} użytkowników</p>
            <button onClick={openCreateUser} className="btn-primary flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Dodaj użytkownika
            </button>
          </div>
          {loading ? <LoadingSpinner /> : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full">
                <thead className="bg-dark-800">
                  <tr>
                    <th className="table-header">Użytkownik</th>
                    <th className="table-header">Rola</th>
                    <th className="table-header">Discord</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Ostatnie logowanie</th>
                    <th className="table-header">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 bg-primary-600/30 rounded-full flex items-center justify-center text-primary-400 font-semibold text-xs shrink-0">
                            {u.username[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-slate-200 font-medium">{u.username}</p>
                            {u._id === me._id && <span className="text-slate-500 text-xs">(to Ty)</span>}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={ROLE_CONFIG[u.role]?.cls}>{ROLE_CONFIG[u.role]?.label}</span>
                      </td>
                      <td className="table-cell text-slate-400 text-xs">
                        {u.discordId ? (
                          <div>
                            <p className="text-slate-300">{u.discordUsername || 'Połączony'}</p>
                            <p className="text-slate-500">{u.discordId}</p>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="table-cell">
                        {u.isActive
                          ? <span className="badge-green">Aktywny</span>
                          : <span className="badge-red">Nieaktywny</span>}
                      </td>
                      <td className="table-cell text-slate-400">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString('pl-PL') : 'Never'}
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-1">
                          <button onClick={() => openEditUser(u)} className="text-slate-400 hover:text-blue-400 p-1 rounded hover:bg-dark-600 transition-colors" title="Edytuj">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          </button>
                          {u.discordId && (
                            <>
                              <button onClick={() => openDiscordModal(u, 'assign')} className="text-slate-400 hover:text-emerald-400 p-1 rounded hover:bg-dark-600 transition-colors" title="Nadaj rolę Discord">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                              </button>
                              <button onClick={() => openDiscordModal(u, 'remove')} className="text-slate-400 hover:text-orange-400 p-1 rounded hover:bg-dark-600 transition-colors" title="Usuń rolę Discord">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4"/></svg>
                              </button>
                            </>
                          )}
                          {u._id !== me._id && (
                            <>
                              <button onClick={() => handleToggleActive(u)} className={`p-1 rounded hover:bg-dark-600 transition-colors ${u.isActive ? 'text-slate-400 hover:text-yellow-400' : 'text-slate-400 hover:text-emerald-400'}`} title={u.isActive ? 'Dezaktywuj' : 'Aktywuj'}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                              </button>
                              {isSuperAdmin && (
                                <button onClick={() => setDeleteConfirm(u)} className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-dark-600 transition-colors" title="Usuń">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Zakładka: Dziennik Audytu */}
      {activeTab === 'audit' && hasRole('SZEF') && (
        <div className="space-y-4">
          {/* Filtry */}
          <div className="card">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Typ akcji</label>
                <select
                  className="input-field text-sm"
                  value={auditFilter.action}
                  onChange={(e) => setAuditFilter((f) => ({ ...f, action: e.target.value }))}
                >
                  <option value="">Wszystkie</option>
                  {ALL_ACTIONS.map((a) => (
                    <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Użytkownik</label>
                <input
                  type="text"
                  className="input-field text-sm"
                  placeholder="Szukaj po nazwie..."
                  value={auditFilter.user}
                  onChange={(e) => setAuditFilter((f) => ({ ...f, user: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Data od</label>
                <input
                  type="date"
                  className="input-field text-sm"
                  value={auditFilter.dateFrom}
                  onChange={(e) => setAuditFilter((f) => ({ ...f, dateFrom: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Data do</label>
                <input
                  type="date"
                  className="input-field text-sm"
                  value={auditFilter.dateTo}
                  onChange={(e) => setAuditFilter((f) => ({ ...f, dateTo: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => fetchAuditLogs(auditFilter, 1)}
                className="btn-primary text-sm px-4 py-2"
              >
                Szukaj
              </button>
              <button
                onClick={() => {
                  const empty = { action: '', user: '', dateFrom: '', dateTo: '' };
                  setAuditFilter(empty);
                  fetchAuditLogs(empty, 1);
                }}
                className="btn-secondary text-sm px-4 py-2"
              >
                Resetuj
              </button>
              <span className="ml-auto text-slate-500 text-sm self-center">
                {auditPagination.total} wpisów
              </span>
            </div>
          </div>

          {loading ? <LoadingSpinner /> : (
            <>
              <div className="card p-0 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-dark-800">
                    <tr>
                      <th className="table-header">Akcja</th>
                      <th className="table-header">Wykonał</th>
                      <th className="table-header">Szczegóły</th>
                      <th className="table-header">IP</th>
                      <th className="table-header">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-slate-500 py-12">Brak logów</td></tr>
                    ) : auditLogs.map((log) => (
                      <tr key={log._id} className="table-row">
                        <td className="table-cell">
                          <div className={`text-xs font-semibold ${getActionClass(log.action)}`}>
                            {ACTION_LABELS[log.action] || log.action}
                          </div>
                          {!log.success && (
                            <span className="text-red-500 text-xs">BŁĄD</span>
                          )}
                        </td>
                        <td className="table-cell">
                          <span className="text-slate-300 text-sm">{log.performedByUsername}</span>
                        </td>
                        <td className="table-cell text-slate-400 text-xs max-w-xs">
                          {formatLogDetails(log.details)}
                        </td>
                        <td className="table-cell text-slate-500 text-xs">{log.ipAddress || '—'}</td>
                        <td className="table-cell text-slate-400 text-xs whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('pl-PL')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginacja */}
              {auditPagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => fetchAuditLogs(auditFilter, auditPagination.page - 1)}
                    disabled={auditPagination.page <= 1}
                    className="btn-secondary px-3 py-1 text-sm disabled:opacity-40"
                  >
                    ← Poprzednia
                  </button>
                  <span className="text-slate-400 text-sm">
                    Strona {auditPagination.page} / {auditPagination.pages}
                  </span>
                  <button
                    onClick={() => fetchAuditLogs(auditFilter, auditPagination.page + 1)}
                    disabled={auditPagination.page >= auditPagination.pages}
                    className="btn-secondary px-3 py-1 text-sm disabled:opacity-40"
                  >
                    Następna →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Zakładka: Godziny Służby */}
      {activeTab === 'duty' && hasRole('SZEF') && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-slate-400 text-sm">{dutyStats.length} użytkowników z odnotowaną służbą</p>
            <button
              onClick={handleClearAllDuty}
              disabled={clearingDuty === 'all' || dutyStats.length === 0}
              className="btn-danger flex items-center gap-2 text-sm disabled:opacity-40"
            >
              {clearingDuty === 'all' ? 'Czyszczenie...' : '🗑 Wyczyść wszystko'}
            </button>
          </div>
          {loading ? <LoadingSpinner /> : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full">
                <thead className="bg-dark-800">
                  <tr>
                    <th className="table-header">Użytkownik Discord</th>
                    <th className="table-header">Łączny czas służby</th>
                    <th className="table-header">Liczba sesji</th>
                    <th className="table-header">Ostatnia sesja</th>
                    <th className="table-header">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {dutyStats.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-slate-500 py-12">Brak danych o służbie</td></tr>
                  ) : dutyStats.map((stat) => {
                    const hours = Math.floor((stat.totalMinutes || 0) / 60);
                    const mins = (stat.totalMinutes || 0) % 60;
                    return (
                      <tr key={stat.discordId} className="table-row">
                        <td className="table-cell">
                          <div>
                            <p className="text-slate-200 font-medium">{stat.discordUsername}</p>
                            <p className="text-slate-500 text-xs">{stat.discordId}</p>
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className="text-emerald-400 font-medium">{hours}h {mins}min</span>
                        </td>
                        <td className="table-cell text-slate-300">{stat.sessions}</td>
                        <td className="table-cell text-slate-400 text-xs">
                          {stat.lastSession ? new Date(stat.lastSession).toLocaleString('pl-PL') : '—'}
                        </td>
                        <td className="table-cell">
                          <button
                            onClick={() => handleClearUserDuty(stat.discordId, stat.discordUsername)}
                            disabled={clearingDuty === stat.discordId}
                            className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                          >
                            {clearingDuty === stat.discordId ? '...' : 'Wyczyść'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Zakładka: Discord */}
      {activeTab === 'discord' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-white mb-4">Role Discord na serwerze</h3>
            {guildRoles.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500">Brak połączenia z botem Discord lub brak ról.</p>
                <p className="text-slate-600 text-sm mt-1">Upewnij się, że bot jest uruchomiony.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {guildRoles.map((role) => (
                  <div key={role.id} className="flex items-center gap-2 bg-dark-800 rounded-lg px-3 py-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.hexColor || '#6b7280' }} />
                    <span className="text-slate-300 text-sm">{role.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold text-white mb-2">Wyślij log na Discord</h3>
            <p className="text-slate-500 text-sm mb-4">Ręczne wysłanie wiadomości na kanał logów</p>
            <SendDiscordLog />
          </div>
        </div>
      )}

      {/* Zakładka: Stawki godzinowe */}
      {activeTab === 'salary' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-white mb-1">Stawki godzinowe</h3>
            <p className="text-slate-400 text-sm mb-6">Kwota wypłacana za 1 godzinę służby na danym stopniu (widoczna w komendzie <code className="text-primary-400">/off</code>)</p>
            <form onSubmit={handleSaveSalary} className="space-y-4">
              {SALARY_RANKS.map((rank) => (
                <div key={rank} className="flex items-center gap-4">
                  <label className="text-slate-300 text-sm w-28 shrink-0">{rank}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="input-field w-32"
                      value={salaryRates[rank] ?? ''}
                      onChange={(e) => setSalaryRates({ ...salaryRates, [rank]: e.target.value })}
                      placeholder="0"
                    />
                    <span className="text-slate-400 text-sm">zł / h</span>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <button type="submit" disabled={savingSalary} className="btn-primary">
                  {savingSalary ? 'Zapisywanie...' : 'Zapisz stawki'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zakładka: Zwolnienia */}
      {activeTab === 'dismissals' && hasRole('ZASTEPCA') && (
        <div className="space-y-4">
          {/* Formularz wystawienia zwolnienia */}
          <div className="card">
            <h3 className="font-semibold text-white mb-1">Wystaw zwolnienie</h3>
            <p className="text-slate-400 text-sm mb-4">Zwolniony gracz otrzyma DM na Discord, a wszystkie role stopnia zostaną automatycznie usunięte.</p>
            <form onSubmit={handleCreateDismissal} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nick gracza *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="np. kowalski_jan"
                    value={dismissalForm.playerNick}
                    onChange={(e) => setDismissalForm({ ...dismissalForm, playerNick: e.target.value })}
                    maxLength={50}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Stopień *</label>
                  <select
                    className="input-field"
                    value={dismissalForm.rank}
                    onChange={(e) => setDismissalForm({ ...dismissalForm, rank: e.target.value })}
                    required
                  >
                    {DISMISSAL_RANKS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Discord ID gracza (opcjonalne)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="np. 123456789012345678"
                    value={dismissalForm.playerDiscordId}
                    onChange={(e) => setDismissalForm({ ...dismissalForm, playerDiscordId: e.target.value })}
                    maxLength={30}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Discord Username (opcjonalne)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="np. kowalski#1234"
                    value={dismissalForm.playerDiscordUsername}
                    onChange={(e) => setDismissalForm({ ...dismissalForm, playerDiscordUsername: e.target.value })}
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Podpisał *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="np. Szef Kowalski"
                    value={dismissalForm.signedBy}
                    onChange={(e) => setDismissalForm({ ...dismissalForm, signedBy: e.target.value })}
                    maxLength={100}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Powód zwolnienia *</label>
                <textarea
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Opisz powód zwolnienia..."
                  value={dismissalForm.reason}
                  onChange={(e) => setDismissalForm({ ...dismissalForm, reason: e.target.value })}
                  maxLength={500}
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-primary-500"
                    checked={dismissalForm.sendToChannel}
                    onChange={(e) => setDismissalForm({ ...dismissalForm, sendToChannel: e.target.checked })}
                  />
                  <span className="text-slate-300 text-sm">Wyślij powiadomienie na kanał Discord</span>
                </label>
              </div>
              <button type="submit" disabled={savingDismissal} className="btn-danger">
                {savingDismissal ? 'Wystawianie...' : '🚫 Wystaw zwolnienie'}
              </button>
            </form>
          </div>

          {/* Tabela zwolnień */}
          {loadingDismissals ? <LoadingSpinner /> : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full">
                <thead className="bg-dark-800">
                  <tr>
                    <th className="table-header">Gracz</th>
                    <th className="table-header">Stopień</th>
                    <th className="table-header">Powód</th>
                    <th className="table-header">Podpisał</th>
                    <th className="table-header">Wystawił</th>
                    <th className="table-header">Discord</th>
                    <th className="table-header">Data</th>
                    <th className="table-header">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {dismissals.length === 0 ? (
                    <tr><td colSpan={8} className="text-center text-slate-500 py-12">Brak zwolnień</td></tr>
                  ) : dismissals.map((d) => (
                    <tr key={d._id} className="table-row">
                      <td className="table-cell">
                        <div>
                          <p className="text-slate-200 font-medium">{d.playerNick}</p>
                          {d.playerDiscordUsername && <p className="text-slate-500 text-xs">{d.playerDiscordUsername}</p>}
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="badge-red">{d.rank}</span>
                      </td>
                      <td className="table-cell text-slate-400 text-xs max-w-xs">
                        <span title={d.reason}>{d.reason.length > 60 ? d.reason.slice(0, 60) + '…' : d.reason}</span>
                      </td>
                      <td className="table-cell text-slate-300 text-sm">{d.signedBy}</td>
                      <td className="table-cell text-slate-400 text-xs">{d.issuedByUsername || '—'}</td>
                      <td className="table-cell text-center">
                        <div className="flex flex-col gap-0.5 items-center">
                          <span className={`text-xs ${d.dmSent ? 'text-emerald-400' : 'text-slate-500'}`}>{d.dmSent ? '✅ DM' : '— DM'}</span>
                          <span className={`text-xs ${d.roleRemoved ? 'text-emerald-400' : 'text-slate-500'}`}>{d.roleRemoved ? '✅ Ranga' : '— Ranga'}</span>
                        </div>
                      </td>
                      <td className="table-cell text-slate-400 text-xs whitespace-nowrap">
                        {new Date(d.createdAt).toLocaleString('pl-PL')}
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => setDeleteConfirmDismissal(d)}
                          className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-dark-600 transition-colors"
                          title="Usuń wpis"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Usuń zwolnienie */}
      <Modal isOpen={!!deleteConfirmDismissal} onClose={() => setDeleteConfirmDismissal(null)} title="Usuń zwolnienie" size="sm">
        <p className="text-slate-300 mb-2">Usunąć wpis zwolnienia gracza:</p>
        <p className="text-white font-semibold mb-2">{deleteConfirmDismissal?.playerNick}</p>
        <p className="text-red-400 text-sm mb-6">To usuwa tylko wpis z bazy – rola i DM nie zostaną cofnięte.</p>
        <div className="flex gap-3">
          <button onClick={() => handleDeleteDismissal(deleteConfirmDismissal._id)} className="btn-danger flex-1">Usuń wpis</button>
          <button onClick={() => setDeleteConfirmDismissal(null)} className="btn-secondary flex-1">Anuluj</button>
        </div>
      </Modal>

      {/* Modal: Tworzenie/edycja użytkownika */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={editingUser ? 'Edytuj użytkownika' : 'Nowy użytkownik'}>
        <form onSubmit={handleSaveUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nazwa użytkownika</label>
            <input type="text" className="input-field" placeholder="np. officer_kowalski" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} maxLength={30} required disabled={!!editingUser} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              {editingUser ? 'Nowe hasło (zostaw puste, by nie zmieniać)' : 'Hasło'}
            </label>
            <input type="password" className="input-field" placeholder="Min. 8 znaków, duża litera, cyfra..." value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} minLength={editingUser ? 0 : 8} maxLength={100} required={!editingUser} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Rola</label>
            <select className="input-field" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
              {isSuperAdmin && <option value="SUPERADMIN">Superadmin</option>}
              {isSuperAdmin && <option value="SZEF">Szef</option>}
              {(isSuperAdmin || hasRole('SZEF')) && <option value="ZASTEPCA">Zastępca Szefa</option>}
              <option value="POLICJANT">Policjant</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Discord ID (opcjonalne)</label>
              <input type="text" className="input-field" placeholder="np. 123456789012345678" value={userForm.discordId} onChange={(e) => setUserForm({ ...userForm, discordId: e.target.value })} maxLength={30} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Discord Username</label>
              <input type="text" className="input-field" placeholder="np. kowalski#1234" value={userForm.discordUsername} onChange={(e) => setUserForm({ ...userForm, discordUsername: e.target.value })} maxLength={50} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Zapisywanie...' : editingUser ? 'Zaktualizuj' : 'Utwórz konto'}</button>
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">Anuluj</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Rola Discord */}
      <Modal isOpen={showDiscordModal} onClose={() => setShowDiscordModal(false)} title={discordAction === 'assign' ? 'Nadaj rolę Discord' : 'Usuń rolę Discord'}>
        <form onSubmit={handleDiscordRole} className="space-y-4">
          <div className="bg-dark-800 rounded-lg px-4 py-3">
            <p className="text-slate-400 text-sm">Użytkownik: <span className="text-white font-medium">{discordTarget?.username}</span></p>
            <p className="text-slate-400 text-sm mt-1">Discord ID: <span className="text-slate-300">{discordTarget?.discordId || '—'}</span></p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Discord User ID</label>
            <input type="text" className="input-field" placeholder="ID użytkownika na Discord..." value={roleForm.discordUserId} onChange={(e) => setRoleForm({ ...roleForm, discordUserId: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">ID Roli Discord</label>
            {guildRoles.length > 0 ? (
              <select className="input-field" value={roleForm.roleId} onChange={(e) => setRoleForm({ ...roleForm, roleId: e.target.value })} required>
                <option value="">Wybierz rolę...</option>
                {guildRoles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            ) : (
              <input type="text" className="input-field" placeholder="ID roli (np. 987654321098765432)..." value={roleForm.roleId} onChange={(e) => setRoleForm({ ...roleForm, roleId: e.target.value })} required />
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className={discordAction === 'assign' ? 'btn-success flex-1' : 'btn-danger flex-1'}>
              {saving ? 'Przetwarzanie...' : discordAction === 'assign' ? 'Nadaj rolę' : 'Usuń rolę'}
            </button>
            <button type="button" onClick={() => setShowDiscordModal(false)} className="btn-secondary flex-1">Anuluj</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Usuń użytkownika */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Usuń użytkownika" size="sm">
        <p className="text-slate-300 mb-2">Usunąć konto użytkownika:</p>
        <p className="text-white font-semibold mb-2">{deleteConfirm?.username}</p>
        <p className="text-red-400 text-sm mb-6">Ta operacja jest nieodwracalna!</p>
        <div className="flex gap-3">
          <button onClick={() => handleDeleteUser(deleteConfirm._id)} className="btn-danger flex-1">Usuń konto</button>
          <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Anuluj</button>
        </div>
      </Modal>
    </div>
  );
}

// Komponent pomocniczy – wysyłanie logu Discord
function SendDiscordLog() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.post('/discord/send-log', { message });
      toast.success('Log wysłany na Discord');
      setMessage('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Błąd wysyłania');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSend} className="flex gap-3">
      <input
        type="text"
        className="input-field flex-1"
        placeholder="Treść wiadomości do wysłania na Discord..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={1000}
      />
      <button type="submit" disabled={sending || !message.trim()} className="btn-primary shrink-0">
        {sending ? 'Wysyłanie...' : 'Wyślij'}
      </button>
    </form>
  );
}
