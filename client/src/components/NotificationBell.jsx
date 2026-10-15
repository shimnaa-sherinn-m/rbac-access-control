import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAsync } from '../lib/hooks.js';
import { timeAgo } from '../lib/format.js';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { data, reload } = useAsync(() => api.get('/notifications'), []);

  useEffect(() => {
    const timer = setInterval(reload, 60000);
    return () => clearInterval(timer);
  }, [reload]);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const unread = data?.unreadCount ?? 0;

  async function markAllRead() {
    try {
      await api.post('/notifications/read-all');
    } finally {
      reload();
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="icon-btn relative h-9 w-9"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        onClick={() => {
          setOpen((v) => !v);
          reload();
        }}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-neutral-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <p className="text-sm font-semibold text-neutral-900">Notifications</p>
            <button
              type="button"
              className="text-xs font-medium text-brand hover:text-brand-hover disabled:opacity-40"
              disabled={!unread}
              onClick={markAllRead}
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-80 divide-y divide-neutral-200/60 overflow-y-auto">
            {(data?.notifications ?? []).length === 0 && <li className="px-4 py-6 text-center text-sm text-neutral-500">No notifications yet</li>}
            {(data?.notifications ?? []).map((n) => (
              <li key={n.id} className={`flex gap-3 px-4 py-3 ${n.read ? '' : 'bg-brand-50/50'}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-brand'}`} />
                <div>
                  <p className="text-sm text-neutral-700">{n.message}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">{timeAgo(n.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
