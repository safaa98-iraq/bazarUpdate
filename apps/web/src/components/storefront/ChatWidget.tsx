'use client';

import { useEffect, useState, useRef } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface StoreInfo { theme: string; merchantPlan?: string; }
interface ChatMsg { id: string; body: string; senderType: 'customer' | 'agent'; senderName: string; createdAt: string; }

function storageKey(slug: string) {
  return `sb_chat_${slug}`;
}

function seenKey(slug: string) {
  return `sb_chat_seen_${slug}`;
}

export function ChatWidget({ slug }: { slug: string }) {
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [nameSet, setNameSet] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastSeenRef = useRef<number | null>(null);
  const originalTitleRef = useRef<string | null>(null);

  useEffect(() => {
    api.get<{ success: boolean; data: StoreInfo }>(`/api/storefront/${slug}`, { noAuth: true })
      .then(r => setStore(r.data)).catch(() => null);
    const saved = localStorage.getItem(storageKey(slug));
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { convId: string; name: string };
        setConvId(parsed.convId);
        setName(parsed.name);
        setNameSet(true);
        const storedSeen = localStorage.getItem(seenKey(slug));
        lastSeenRef.current = storedSeen ? Number(storedSeen) : null;
      } catch { /* ignore */ }
    }
    originalTitleRef.current = document.title;
    return () => { if (originalTitleRef.current) document.title = originalTitleRef.current; };
  }, [slug]);

  const fetchMessages = async (id: string, isOpen: boolean) => {
    try {
      const res = await api.get<{ success: boolean; data: ChatMsg[] }>(`/api/chat/public/${slug}/conversation/${id}`, { noAuth: true });
      const msgs = res.data ?? [];
      setMessages(msgs);

      const agentCount = msgs.filter(m => m.senderType === 'agent').length;
      if (lastSeenRef.current === null) {
        // First time we see this conversation on this device — don't retroactively flag older replies as unread.
        lastSeenRef.current = agentCount;
        localStorage.setItem(seenKey(slug), String(agentCount));
      } else if (isOpen) {
        lastSeenRef.current = agentCount;
        localStorage.setItem(seenKey(slug), String(agentCount));
        setUnread(0);
      } else {
        setUnread(Math.max(0, agentCount - lastSeenRef.current));
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!convId) return;
    fetchMessages(convId, open);
    const t = setInterval(() => fetchMessages(convId, open), open ? 5000 : 12000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, convId]);

  useEffect(() => { if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

  useEffect(() => {
    if (!originalTitleRef.current) return;
    document.title = unread > 0 && !open ? `(${unread}) ${originalTitleRef.current}` : originalTitleRef.current;
  }, [unread, open]);

  if (!store || store.merchantPlan === 'FREE') return null;
  const theme = store.theme;

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setNameSet(true);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText('');
    setMessages(prev => [...prev, { id: `temp-${Date.now()}`, body, senderType: 'customer', senderName: name, createdAt: new Date().toISOString() }]);
    try {
      const res = await api.post<{ success: boolean; data: { conversationId: string } }>(
        `/api/chat/public/${slug}/message`,
        { customerName: name, body, conversationId: convId ?? undefined },
        { noAuth: true }
      );
      if (!convId) {
        setConvId(res.data.conversationId);
        localStorage.setItem(storageKey(slug), JSON.stringify({ convId: res.data.conversationId, name }));
      }
      fetchMessages(res.data.conversationId, true);
    } catch { /* keep optimistic message */ }
    finally { setSending(false); }
  };

  return (
    <div className="fixed bottom-5 left-5 z-40" dir="rtl">
      {open ? (
        <div className="w-80 max-w-[calc(100vw-40px)] h-[420px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border" style={{ borderColor: '#ECE6F0' }}>
          <div className="flex items-center justify-between px-4 py-3 text-white flex-shrink-0" style={{ background: theme }}>
            <span className="font-semibold text-sm flex items-center gap-2"><MessageCircle size={16} /> تواصل معنا</span>
            <button onClick={() => setOpen(false)}><X size={18} /></button>
          </div>

          {!nameSet ? (
            <form onSubmit={handleStart} className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
              <p className="text-sm text-gray-500 text-center">اكتب اسمك لتبدأ المحادثة مع المتجر</p>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="اسمك"
                className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none" style={{ borderColor: '#ECE6F0' }} />
              <button type="submit" disabled={!name.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition"
                style={{ background: theme }}>
                ابدأ المحادثة
              </button>
            </form>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                {messages.length === 0 && (
                  <p className="text-xs text-gray-400 text-center mt-6">اكتب رسالتك الأولى للمتجر</p>
                )}
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.senderType === 'customer' ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-[75%] px-3 py-2 rounded-2xl text-sm"
                      style={m.senderType === 'customer'
                        ? { background: '#fff', border: '1px solid #ECE6F0', color: '#2F2E4B' }
                        : { background: theme, color: '#fff' }}>
                      {m.body}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t flex-shrink-0" style={{ borderColor: '#ECE6F0' }}>
                <input value={text} onChange={e => setText(e.target.value)} placeholder="اكتب رسالتك…"
                  className="flex-1 px-3 py-2 rounded-xl border text-sm focus:outline-none" style={{ borderColor: '#ECE6F0' }} />
                <button type="submit" disabled={!text.trim() || sending}
                  className="w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition"
                  style={{ background: theme }}>
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                </button>
              </form>
            </>
          )}
        </div>
      ) : (
        <button onClick={() => setOpen(true)}
          className="relative w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition hover:scale-105"
          style={{ background: theme }}>
          <MessageCircle size={24} />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center border-2 border-white animate-pulse">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
