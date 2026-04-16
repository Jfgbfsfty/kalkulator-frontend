import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api.js';

const POLL_INTERVAL = 30_000; // 30 sekund
const STORAGE_KEY = 'notif_last_seen';
const MAX_ITEMS = 25;

const ACTION_MAP = {
  CREATE_WANTED_PERSON:     { icon: '🚨', color: 'text-red-400',     label: (d) => `Dodano poszukiwanego: ${d?.nick || '—'}` },
  UPDATE_WANTED_PERSON:     { icon: '✏️', color: 'text-amber-400',   label: (d) => `Zaktualizowano poszukiwanego: ${d?.nick || '—'}` },
  DELETE_WANTED_PERSON:     { icon: '🗑️', color: 'text-slate-400',   label: (d) => `Usunięto poszukiwanego: ${d?.nick || '—'}` },
  CREATE_WANTED_VEHICLE:    { icon: '🚗', color: 'text-red-400',     label: (d) => `Dodano poszukiwany pojazd: ${d?.model || '—'}` },
  UPDATE_WANTED_VEHICLE:    { icon: '✏️', color: 'text-amber-400',   label: (d) => `Zaktualizowano pojazd: ${d?.model || '—'}` },
  DELETE_WANTED_VEHICLE:    { icon: '🗑️', color: 'text-slate-400',   label: (d) => `Usunięto pojazd: ${d?.model || '—'}` },
  COLLECT_LICENSE:          { icon: '🪪', color: 'text-blue-400',    label: (d) => `Odebrano prawo jazdy: ${d?.nick || '—'}` },
  UPDATE_LICENSE:           { icon: '✏️', color: 'text-amber-400',   label: (d) => `Zaktualizowano prawo jazdy: ${d?.nick || '—'}` },
  DELETE_LICENSE:           { icon: '🗑️', color: 'text-slate-400',   label: (d) => `Usunięto prawo jazdy: ${d?.nick || '—'}` },
  CREATE_MANDATE:           { icon: '📋', color: 'text-indigo-400',  label: (d) => `Dodano mandat: ${d?.title || '—'}` },
  UPDATE_MANDATE:           { icon: '✏️', color: 'text-amber-400',   label: (d) => `Zaktualizowano mandat: ${d?.title || '—'}` },
  DELETE_MANDATE:           { icon: '🗑️', color: 'text-slate-400',   label: (d) => `Usunięto mandat: ${d?.title || '—'}` },
  CREATE_USER:              { icon: '👤', color: 'text-emerald-400', label: (d) => `Dodano użytkownika: ${d?.username || '—'}` },
  UPDATE_USER:              { icon: '✏️', color: 'text-amber-400',   label: (d) => `Zaktualizowano użytkownika` },
  DELETE_USER:              { icon: '🗑️', color: 'text-slate-400',   label: (d) => `Usunięto użytkownika: ${d?.username || '—'}` },
  CREATE_PROMOTION:         { icon: '⬆️', color: 'text-emerald-400', label: (d) => `${d?.type === 'DEGRADACJA' ? 'Degradacja' : 'Awans'}: ${d?.playerNick || '—'}` },
  DELETE_PROMOTION:         { icon: '🗑️', color: 'text-slate-400',   label: (d) => `Usunięto awans: ${d?.playerNick || '—'}` },
  CREATE_DISMISSAL:         { icon: '🚫', color: 'text-red-400',     label: (d) => `Zwolnienie: ${d?.playerNick || '—'}` },
  DELETE_DISMISSAL:         { icon: '🗑️', color: 'text-slate-400',   label: (d) => `Usunięto zwolnienie: ${d?.playerNick || '—'}` },
  CREATE_PROMOTION_REQUEST: { icon: '📩', color: 'text-yellow-400',  label: (d) => `Nowy wniosek o awans: ${d?.discordNick || '—'}` },
  REVIEW_PROMOTION_REQUEST: { icon: '📋', color: 'text-primary-400', label: (d) => `Rozpatrzono wniosek: ${d?.discordNick || '—'} (${d?.status || ''})` },
};

const DEFAULT_ENTRY = { icon: '🔔', color: 'text-slate-400', label: () => 'Akcja systemowa' };

export function formatNotification(log) {
  const cfg = ACTION_MAP[log.action] || DEFAULT_ENTRY;
  return {
    _id: log._id,
    icon: cfg.icon,
    color: cfg.color,
    message: cfg.label(log.details),
    performer: log.performedByUsername,
    createdAt: log.createdAt,
  };
}

export default function useNotifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const lastFetchRef = useRef(null);
  const timerRef = useRef(null);

  const calcUnread = useCallback((notifications) => {
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    if (!lastSeen) {
      setUnread(notifications.length);
      return;
    }
    const count = notifications.filter(
      (n) => new Date(n.createdAt) > new Date(lastSeen)
    ).length;
    setUnread(count);
  }, []);

  const fetchNotifications = useCallback(async (since = null) => {
    try {
      const params = since ? { since: since.toISOString() } : {};
      const { data } = await api.get('/users/notifications', { params });
      const incoming = (data.data || []).map(formatNotification);

      setItems((prev) => {
        if (!since) return incoming; // initial load – replace
        if (!incoming.length) return prev;
        // prepend new, deduplicate, cap at MAX_ITEMS
        const existingIds = new Set(prev.map((n) => n._id));
        const fresh = incoming.filter((n) => !existingIds.has(n._id));
        return [...fresh, ...prev].slice(0, MAX_ITEMS);
      });

      if (incoming.length > 0) {
        setItems((latest) => { calcUnread(latest); return latest; });
      }

      lastFetchRef.current = new Date();
    } catch {
      // silent – network might be briefly unavailable
    }
  }, [calcUnread]);

  // Initial load
  useEffect(() => {
    fetchNotifications(null);
  }, [fetchNotifications]);

  // Recalculate unread whenever items change
  useEffect(() => {
    calcUnread(items);
  }, [items, calcUnread]);

  // Polling
  useEffect(() => {
    timerRef.current = setInterval(() => {
      fetchNotifications(lastFetchRef.current);
    }, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [fetchNotifications]);

  const markAllRead = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setUnread(0);
  }, []);

  return { items, unread, markAllRead };
}
