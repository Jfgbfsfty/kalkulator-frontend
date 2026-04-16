import { useState, useRef, useEffect } from 'react';
import useNotifications from '../../hooks/useNotifications.js';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'przed chwilą';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min temu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h temu`;
  return new Date(dateStr).toLocaleDateString('pl-PL');
}

export default function NotificationBell() {
  const { items, unread, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  // Zamknij panel po kliknięciu poza nim
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    setOpen((v) => {
      if (!v) markAllRead(); // mark as read when opening
      return !v;
    });
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Przycisk dzwonka */}
      <button
        onClick={handleOpen}
        className="relative p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-700 transition-colors"
        title="Powiadomienia"
        aria-label="Powiadomienia"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Czerwona kropka / licznik */}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Panel powiadomień */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Nagłówek */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-600">
            <span className="text-sm font-semibold text-white">Powiadomienia</span>
            <span className="text-xs text-slate-500">ostatnie 24h</span>
          </div>

          {/* Lista */}
          <div className="max-h-96 overflow-y-auto divide-y divide-dark-700">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-600">
                <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p className="text-xs">Brak powiadomień</p>
              </div>
            ) : (
              items.map((n) => (
                <div key={n._id} className="flex items-start gap-3 px-4 py-3 hover:bg-dark-700 transition-colors">
                  <span className="text-base mt-0.5 shrink-0">{n.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-medium leading-snug ${n.color}`}>{n.message}</p>
                    <p className="text-slate-600 text-xs mt-0.5">
                      <span className="text-slate-500">{n.performer}</span>
                      <span className="mx-1">·</span>
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Stopka */}
          {items.length > 0 && (
            <div className="px-4 py-2.5 border-t border-dark-600">
              <p className="text-slate-600 text-xs text-center">
                Aktualizacja co 30 sekund
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
