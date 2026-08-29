import React, { useEffect, useState } from 'react';
import { Bell, Check, Clock } from 'lucide-react';
import { AppNotification, Usuario } from '../types';
import { Database } from '../lib/db';

export default function NotificationsPanel({ companyId, currentUser }: { companyId: string; currentUser: Usuario }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(Database.getNotifications(companyId));
  const [loading, setLoading] = useState(true);
  const refresh = async () => { setLoading(true); try { setNotifications(await Database.loadNotifications(companyId)); } finally { setLoading(false); } };
  useEffect(() => { refresh(); }, [companyId]);
  const unread = notifications.filter(item => !item.readBy.includes(currentUser.id));
  return <section className="space-y-5 animate-fade-in">
    <div className="flex items-center justify-between"><div><h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><Bell className="w-5 h-5 text-amber-500" />Notificações</h2><p className="text-sm text-slate-500">Alertas operacionais da sua empresa.</p></div><span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">{unread.length} não lida{unread.length === 1 ? '' : 's'}</span></div>
    {loading ? <div className="p-8 text-center text-sm text-slate-500">Carregando notificações…</div> : notifications.length === 0 ? <div className="p-8 border border-dashed border-slate-300 rounded-2xl text-center text-sm text-slate-500">Nenhuma notificação por enquanto.</div> : <div className="space-y-2">{notifications.map(item => { const read = item.readBy.includes(currentUser.id); return <article key={item.id} className={`p-4 rounded-xl border flex gap-3 ${read ? 'bg-white border-slate-200' : 'bg-amber-50 border-amber-200'}`}><div className="mt-0.5"><Clock className="w-4 h-4 text-amber-600" /></div><div className="flex-1"><h3 className="text-sm font-bold text-slate-900">{item.title}</h3><p className="text-sm text-slate-600 mt-1">{item.message}</p><p className="text-[11px] text-slate-400 mt-2">{new Date(item.createdAt).toLocaleString('pt-BR')}</p></div>{!read && <button onClick={async () => { await Database.markNotificationRead(companyId, item.id); setNotifications([...Database.getNotifications(companyId)]); }} className="self-start p-2 rounded-lg text-amber-700 hover:bg-amber-100" title="Marcar como lida"><Check className="w-4 h-4" /></button>}</article>; })}</div>}
  </section>;
}
