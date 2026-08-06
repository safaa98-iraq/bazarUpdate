'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageCircle, Send, Clock, CheckCheck, Search, Zap, X, Plus, User, Mail, Phone, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth.store';
import { PlanGate } from '@/components/ui/PlanGate';
import { canUseFeature, Plan } from '@/lib/plan-features';

const BRAND = { primary: '#2F2E4B', secondary: '#4A4767', accent: '#DB6E93', light: '#FBE1EA' };

interface Conversation {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  status: 'open' | 'closed';
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number | bigint;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderType: 'customer' | 'agent';
  senderName: string;
  body: string;
  isRead: boolean | number;
  createdAt: string;
}

interface QuickReply {
  id: string;
  title: string;
  body: string;
}

import { useDocumentTitle } from '@/lib/useDocumentTitle';

export default function ChatPage() {
  useDocumentTitle('المحادثات');
  const searchParams = useSearchParams();
  const targetConvId = searchParams.get('conversationId');
  const plan = (useAuthStore(s => s.user?.plan) ?? 'FREE') as Plan;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [search, setSearch] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showNewQR, setShowNewQR] = useState(false);
  const [newQR, setNewQR] = useState({ title: '', body: '' });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadedOnce = useRef(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: Conversation[] }>('/api/chat/conversations');
      setConversations(res.data ?? []);
    } catch (err: unknown) {
      // Swallow errors on background polling ticks, but surface the initial-load failure —
      // otherwise a broken endpoint just looks like an empty, permanently-loading inbox.
      if (!loadedOnce.current) toast.error(err instanceof Error ? err.message : 'فشل تحميل المحادثات');
    }
    finally { loadedOnce.current = true; setLoading(false); }
  }, []);

  const fetchMessages = useCallback(async (convId: string) => {
    try {
      const res = await api.get<{ success: boolean; data: ChatMessage[] }>(`/api/chat/conversations/${convId}/messages`);
      setMessages(res.data ?? []);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch { /* silent */ }
  }, []);

  const fetchQuickReplies = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: QuickReply[] }>('/api/chat/quick-replies');
      setQuickReplies(res.data ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchQuickReplies();
    const t = setInterval(fetchConversations, 6000);
    return () => clearInterval(t);
  }, [fetchConversations, fetchQuickReplies]);

  useEffect(() => {
    if (!selectedConv) return;
    fetchMessages(selectedConv.id);
    pollRef.current = setInterval(() => fetchMessages(selectedConv.id), 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedConv, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectConversation = (conv: Conversation) => {
    setSelectedConv(conv);
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));
  };

  // Auto-open a conversation deep-linked from the notification bell (?conversationId=...)
  useEffect(() => {
    if (!targetConvId || selectedConv?.id === targetConvId) return;
    const match = conversations.find(c => c.id === targetConvId);
    if (match) selectConversation(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetConvId, conversations]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim() || !selectedConv) return;
    setSending(true);
    const text = msgText;
    setMsgText('');
    try {
      await api.post(`/api/chat/conversations/${selectedConv.id}/messages`, { body: text, senderName: 'الدعم' });
      fetchMessages(selectedConv.id);
      fetchConversations();
    } catch { toast.error('فشل إرسال الرسالة'); setMsgText(text); }
    finally { setSending(false); }
  };

  const closeConversation = async (id: string) => {
    try {
      await api.patch(`/api/chat/conversations/${id}`, { status: 'closed' });
      setConversations(prev => prev.map(c => c.id === id ? { ...c, status: 'closed' } : c));
      if (selectedConv?.id === id) setSelectedConv(prev => prev ? { ...prev, status: 'closed' } : null);
      toast.success('تم إغلاق المحادثة');
    } catch { toast.error('فشل إغلاق المحادثة'); }
  };

  const addQuickReply = async () => {
    if (!newQR.title || !newQR.body) return;
    try {
      await api.post('/api/chat/quick-replies', newQR);
      toast.success('تمت إضافة الرد السريع');
      setNewQR({ title: '', body: '' });
      setShowNewQR(false);
      fetchQuickReplies();
    } catch { toast.error('فشل الإضافة'); }
  };

  const deleteQuickReply = async (id: string) => {
    try {
      await api.delete(`/api/chat/quick-replies/${id}`);
      setQuickReplies(prev => prev.filter(q => q.id !== id));
    } catch { toast.error('فشل الحذف'); }
  };

  const filtered = conversations.filter(c =>
    c.customerName.toLowerCase().includes(search.toLowerCase()) ||
    c.customerEmail?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = conversations.reduce((s, c) => s + Number(c.unreadCount), 0);

  if (!canUseFeature(plan, 'chat')) return (
    <div className="p-8"><PlanGate feature="chat" /></div>
  );

  return (
    <div className="flex h-screen overflow-hidden" dir="rtl" style={{ background: '#F5EFFA' }}>
      {/* Sidebar — conversation list */}
      <div className="w-80 flex flex-col border-l" style={{ background: 'white', borderColor: '#ECE6F0' }}>
        {/* Header */}
        <div className="px-4 py-4 border-b" style={{ borderColor: '#ECE6F0' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" style={{ color: BRAND.accent }} />
              <h1 className="font-bold text-base" style={{ color: BRAND.primary }}>المحادثات</h1>
              {totalUnread > 0 && (
                <span className="text-xs font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: BRAND.accent }}>
                  {totalUnread}
                </span>
              )}
            </div>
            <button onClick={() => setShowQuickReplies(true)}
              className="p-1.5 rounded-lg text-xs font-medium hover:bg-purple-50 transition"
              style={{ color: BRAND.secondary }}>
              <Zap className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث في المحادثات…"
              className="w-full pr-9 pl-3 py-2 rounded-xl border text-xs focus:outline-none"
              style={{ borderColor: '#ECE6F0' }} />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" style={{ color: BRAND.accent }} /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="h-10 w-10 mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">لا توجد محادثات</p>
            </div>
          ) : filtered.map(conv => (
            <button key={conv.id} onClick={() => selectConversation(conv)}
              className="w-full text-right px-4 py-3 border-b hover:bg-purple-50/50 transition"
              style={{
                borderColor: '#F5EFFA',
                background: selectedConv?.id === conv.id ? '#F5EFFA' : undefined,
              }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ background: conv.status === 'closed' ? '#9ca3af' : BRAND.accent }}>
                  {conv.customerName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-semibold text-sm truncate" style={{ color: BRAND.primary }}>{conv.customerName}</p>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs text-gray-500 truncate">{conv.lastMessage ?? '—'}</p>
                    {Number(conv.unreadCount) > 0 && (
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: BRAND.accent, fontSize: '10px' }}>{Number(conv.unreadCount)}</span>
                    )}
                  </div>
                  <span className={`text-xs ${conv.status === 'open' ? 'text-emerald-500' : 'text-gray-400'}`}>
                    {conv.status === 'open' ? '● مفتوحة' : '● مغلقة'}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      {selectedConv ? (
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          <div className="flex items-center justify-between px-6 py-4 bg-white border-b" style={{ borderColor: '#ECE6F0' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: BRAND.accent }}>
                {selectedConv.customerName.charAt(0)}
              </div>
              <div>
                <p className="font-bold" style={{ color: BRAND.primary }}>{selectedConv.customerName}</p>
                <p className="text-xs text-gray-400">{selectedConv.customerEmail ?? 'بدون بريد'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedConv.status === 'open' && (
                <button onClick={() => closeConversation(selectedConv.id)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border transition hover:bg-gray-50"
                  style={{ borderColor: '#ECE6F0', color: '#6b7280' }}>
                  إغلاق المحادثة
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">لا توجد رسائل بعد</div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.senderType === 'agent' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                  msg.senderType === 'agent'
                    ? 'text-white rounded-tr-none'
                    : 'bg-white border rounded-tl-none'
                }`}
                  style={msg.senderType === 'agent' ? { background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` } : { borderColor: '#ECE6F0', color: '#374151' }}>
                  {msg.senderType === 'customer' && (
                    <p className="text-xs font-semibold mb-1" style={{ color: BRAND.accent }}>{msg.senderName}</p>
                  )}
                  <p>{msg.body}</p>
                  <div className="flex items-center gap-1 mt-1 justify-end">
                    <span className="text-xs opacity-60">
                      {new Date(msg.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.senderType === 'agent' && <CheckCheck className="h-3 w-3 opacity-60" />}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies strip */}
          {quickReplies.length > 0 && (
            <div className="px-6 pb-2 flex gap-2 overflow-x-auto">
              {quickReplies.map(qr => (
                <button key={qr.id} onClick={() => setMsgText(qr.body)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border hover:bg-purple-50 transition"
                  style={{ borderColor: BRAND.light, color: BRAND.secondary }}>
                  <Zap className="h-3 w-3 inline ml-1" />{qr.title}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={sendMessage}
            className="flex items-center gap-3 px-6 py-4 bg-white border-t"
            style={{ borderColor: '#ECE6F0' }}>
            <input value={msgText} onChange={e => setMsgText(e.target.value)}
              placeholder={selectedConv.status === 'closed' ? 'المحادثة مغلقة' : 'اكتب رسالة…'}
              disabled={selectedConv.status === 'closed' || sending}
              className="flex-1 px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-400"
              style={{ borderColor: '#ECE6F0' }} />
            <button type="submit" disabled={!msgText.trim() || selectedConv.status === 'closed' || sending}
              className="p-2.5 rounded-xl text-white transition disabled:opacity-40 flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center" style={{ color: '#9ca3af' }}>
          <MessageCircle className="h-16 w-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">اختر محادثة للبدء</p>
          <p className="text-sm mt-1">ستظهر رسائل العملاء هنا</p>
        </div>
      )}

      {/* Customer info sidebar — right side (inside selected conv) */}
      {selectedConv && (
        <div className="w-64 flex flex-col bg-white border-r" style={{ borderColor: '#ECE6F0' }}>
          <div className="px-4 py-4 border-b" style={{ borderColor: '#ECE6F0' }}>
            <h3 className="text-sm font-bold" style={{ color: BRAND.primary }}>بيانات العميل</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold"
                style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>
                {selectedConv.customerName.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: BRAND.primary }}>{selectedConv.customerName}</p>
                <p className="text-xs text-gray-400">{selectedConv.status === 'open' ? 'نشط' : 'مغلق'}</p>
              </div>
            </div>

            {selectedConv.customerEmail && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Mail className="h-3.5 w-3.5 flex-shrink-0" style={{ color: BRAND.accent }} />
                <span className="truncate">{selectedConv.customerEmail}</span>
              </div>
            )}

            {selectedConv.customerPhone && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Phone className="h-3.5 w-3.5 flex-shrink-0" style={{ color: BRAND.accent }} />
                <span>{selectedConv.customerPhone}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="h-3.5 w-3.5" style={{ color: BRAND.accent }} />
              <span>منذ {selectedConv.updatedAt ? formatDate(selectedConv.updatedAt) : '—'}</span>
            </div>

            <div className="pt-2 border-t" style={{ borderColor: '#F5EFFA' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: BRAND.secondary }}>الردود السريعة</p>
              {quickReplies.length === 0 ? (
                <p className="text-xs text-gray-400">لا توجد ردود سريعة</p>
              ) : quickReplies.map(qr => (
                <button key={qr.id} onClick={() => setMsgText(qr.body)}
                  className="w-full text-right mb-1 px-2.5 py-1.5 rounded-lg text-xs hover:bg-purple-50 transition"
                  style={{ color: BRAND.primary }}>
                  <span className="font-medium">{qr.title}</span>
                </button>
              ))}
              <button onClick={() => setShowQuickReplies(true)}
                className="mt-1 text-xs flex items-center gap-1"
                style={{ color: BRAND.accent }}>
                <Plus className="h-3 w-3" /> إدارة الردود السريعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Replies modal */}
      {showQuickReplies && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#ECE6F0' }}>
              <h2 className="font-bold" style={{ color: BRAND.primary }}>الردود السريعة</h2>
              <button onClick={() => setShowQuickReplies(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-80 overflow-y-auto">
              {quickReplies.map(qr => (
                <div key={qr.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: '#F5EFFA' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: BRAND.primary }}>{qr.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{qr.body}</p>
                  </div>
                  <button onClick={() => deleteQuickReply(qr.id)} className="p-1 rounded-lg hover:bg-red-50 text-red-400 flex-shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {quickReplies.length === 0 && <p className="text-sm text-gray-400 text-center py-4">لا توجد ردود سريعة بعد</p>}
            </div>
            {showNewQR ? (
              <div className="p-5 border-t space-y-3" style={{ borderColor: '#ECE6F0' }}>
                <input value={newQR.title} onChange={e => setNewQR(n => ({ ...n, title: e.target.value }))}
                  placeholder="عنوان الرد (مثال: شكراً لتواصلك)"
                  className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none"
                  style={{ borderColor: '#ECE6F0' }} />
                <textarea value={newQR.body} onChange={e => setNewQR(n => ({ ...n, body: e.target.value }))}
                  placeholder="نص الرد…" rows={3}
                  className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none resize-none"
                  style={{ borderColor: '#ECE6F0' }} />
                <div className="flex gap-2">
                  <button onClick={() => setShowNewQR(false)} className="flex-1 py-2 border rounded-xl text-sm text-gray-500 hover:bg-gray-50" style={{ borderColor: '#ECE6F0' }}>إلغاء</button>
                  <button onClick={addQuickReply} className="flex-1 py-2 rounded-xl text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.accent})` }}>حفظ</button>
                </div>
              </div>
            ) : (
              <div className="p-5 border-t" style={{ borderColor: '#ECE6F0' }}>
                <button onClick={() => setShowNewQR(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                  style={{ background: `${BRAND.primary}10`, color: BRAND.primary }}>
                  <Plus className="h-4 w-4" /> إضافة رد سريع
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
