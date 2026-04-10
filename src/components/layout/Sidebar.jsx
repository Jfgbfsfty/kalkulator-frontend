import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const navItems = [
  {
    to: '/mandates',
    label: 'Kalkulator Mandatów',
    roles: ['POLICJANT', 'SZEF', 'SUPERADMIN', 'ZASTEPCA'],
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z"/>
      </svg>
    ),
  },
  {
    to: '/wanted-persons',
    label: 'Poszukiwane Osoby',
    roles: ['POLICJANT', 'SZEF', 'SUPERADMIN', 'ZASTEPCA'],
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    ),
  },
  {
    to: '/wanted-vehicles',
    label: 'Poszukiwane Pojazdy',
    roles: ['POLICJANT', 'SZEF', 'SUPERADMIN', 'ZASTEPCA'],
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h10zM13 16h2l3-5h-5v5z"/>
      </svg>
    ),
  },
  {
    to: '/licenses',
    label: 'Zebrane Prawa Jazdy',
    roles: ['POLICJANT', 'SZEF', 'SUPERADMIN', 'ZASTEPCA'],
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0"/>
      </svg>
    ),
  },
  {
    to: '/promotions',
    label: 'Awanse i Degrady',
    roles: ['SZEF', 'SUPERADMIN', 'ZASTEPCA'],
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z"/>
      </svg>
    ),
  },
  {
    to: '/dismissals',
    label: 'Zwolnienia',
    roles: ['SZEF', 'SUPERADMIN'],
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
      </svg>
    ),
  },
  {
    to: '/admin',
    label: 'Panel Zarządzania',
    roles: ['SZEF', 'SUPERADMIN'],
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    ),
  },
];

const roleBadge = {
  SUPERADMIN: { label: 'SUPERADMIN', cls: 'badge-red' },
  SZEF: { label: 'SZEF', cls: 'badge-yellow' },
  ZASTEPCA: { label: 'Z-CA SZEFA', cls: 'badge-yellow' },
  POLICJANT: { label: 'POLICJANT', cls: 'badge-blue' },
};

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const badge = roleBadge[user?.role] || { label: user?.role, cls: 'badge-gray' };

  return (
    <aside className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col w-64 bg-dark-800 border-r border-dark-600 shrink-0 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-dark-600">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">Kalkulator Mandatów</p>
            <p className="text-slate-500 text-xs">Polskie RP</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-700 lg:hidden shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Nawigacja */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => item.roles.includes(user?.role))
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-dark-700'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
      </nav>

      {/* Info użytkownika */}
      <div className="px-4 py-4 border-t border-dark-600">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600/30 rounded-full flex items-center justify-center text-primary-400 font-semibold text-sm shrink-0">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 font-medium text-sm truncate">{user?.username}</p>
            <span className={`${badge.cls} mt-0.5 inline-block`}>{badge.label}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
