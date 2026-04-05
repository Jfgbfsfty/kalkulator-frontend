import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

const pageTitles = {
  '/mandates': 'Kalkulator Mandatów',
  '/wanted-persons': 'Poszukiwane Osoby',
  '/wanted-vehicles': 'Poszukiwane Pojazdy',
  '/licenses': 'Zebrane Prawa Jazdy',
  '/admin': 'Panel Zarządzania',
};

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const title = pageTitles[pathname] || 'Panel';

  const handleLogout = async () => {
    await logout();
    toast.success('Wylogowano pomyślnie');
    navigate('/login');
  };

  return (
    <header className="bg-dark-800 border-b border-dark-600 px-4 md:px-6 py-4 flex items-center gap-3 justify-between shrink-0">
      {/* Hamburger – tylko mobile */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-700 shrink-0"
        aria-label="Menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-semibold text-white truncate">{title}</h1>
        <p className="text-slate-500 text-xs">Polskie RP – Panel Zarządzania</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Status online */}
        <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          Online
        </div>

        {/* Przycisk wylogowania */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors text-sm px-3 py-1.5 rounded-lg hover:bg-dark-700"
          title="Wyloguj się"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          Wyloguj
        </button>
      </div>
    </header>
  );
}
