import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { BookOpen, Compass, History, Plus, RotateCcw, Send, Trash2, UserRound } from 'lucide-react';
import { askCoach, deleteCoachSession, getCoachSession, listCoachSessions, KNOWLEDGE_CATEGORIES, type CoachMeta, type CoachSessionSummary, type CoachSource } from '@/lib/coach.functions';
import { Button, Badge } from './primitives';
import { Textarea } from '@/components/ui/textarea';

type Msg = { role: string; content: string; sources: CoachSource[]; meta?: CoachMeta; grounded?: boolean; personalized?: boolean; error?: string | undefined; question?: string };

const PROMPTS = ['Explain binary search', 'Practice Java interview questions', 'Improve my SQL skills', 'Create a 7-day placement plan'];

export function CoachChat() {
  const ask = useServerFn(askCoach);
  const listFn = useServerFn(listCoachSessions);
  const loadFn = useServerFn(getCoachSession);
  const deleteFn = useServerFn(deleteCoachSession);
  const [sessions, setSessions] = useState<CoachSessionSummary[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function refreshSessions() { try { setSessions(await listFn()); } catch { /* keep list */ } }
  async function open(id: string) {
    setShowHistory(false); setLoadingThread(true); setSessionId(id);
    try { setMessages(await loadFn({ data: { sessionId: id } })); } catch { setMessages([{ role: 'assistant', content: '', sources: [], error: 'Could not load this conversation.' }]); }
    finally { setLoadingThread(false); inputRef.current?.focus(); }
  }
  useEffect(() => { listFn().then((s) => { setSessions(s); if (s[0]) void open(s[0].id); }).catch(() => {}); inputRef.current?.focus(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  async function run(q: string, retry = false) {
    setBusy(true);
    try {
      const r = await ask({ data: { question: q, sessionId, category: category || null, retry } });
      setSessionId(r.sessionId);
      setMessages((m) => [...m, { role: 'assistant', content: r.answer, sources: r.sources, meta: r.meta, grounded: r.grounded, personalized: r.personalized, error: r.error, question: q }]);
      void refreshSessions();
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: '', sources: [], error: 'The coach is unavailable right now.', question: q }]);
    } finally { setBusy(false); inputRef.current?.focus(); }
  }
  function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: q, sources: [] }]);
    void run(q);
  }
  function retry(index: number) {
    const q = messages[index]?.question;
    if (!q || busy) return;
    setMessages((m) => m.filter((_, i) => i !== index));
    void run(q, !!sessionId);
  }
  function newConversation() { setSessionId(null); setMessages([]); setShowHistory(false); inputRef.current?.focus(); }
  async function clearConversation() {
    if (!sessionId) { setMessages([]); return; }
    if (!window.confirm('Delete this conversation permanently?')) return;
    try { await deleteFn({ data: { sessionId } }); newConversation(); void refreshSessions(); } catch { window.alert('Could not clear the conversation. Please try again.'); }
  }

  const title = sessions.find((s) => s.id === sessionId)?.title ?? 'New coaching session';

  return <div className="page-container feature-page">
    <div className="coach-workspace coach-clean">
      <section className="coach-panel" aria-label="Conversation">
        <header className="coach-bar">
          <div className="coach-bar-title"><span className="coach-rag"><i/>RAG-powered Career Assistant</span><strong>{title}</strong></div>
          <div className="coach-bar-actions">
            <Button variant="outline" size="sm" onClick={() => setShowHistory((v) => !v)} aria-expanded={showHistory}><History size={14}/> History</Button>
            <Button variant="outline" size="sm" onClick={newConversation}><Plus size={14}/> New</Button>
            <Button variant="ghost" size="sm" onClick={clearConversation} disabled={!messages.length && !sessionId} aria-label="Clear conversation"><Trash2 size={14}/> Clear</Button>
          </div>
        </header>
        {showHistory && <div className="coach-history">{sessions.length ? sessions.map((s) => <button key={s.id} type="button" className={s.id === sessionId ? 'active' : ''} onClick={() => open(s.id)}><span>{s.title}</span><small>{new Date(s.updated_at).toLocaleDateString()}</small></button>) : <p>No saved conversations yet.</p>}</div>}
        <div className="coach-thread" aria-live="polite">
          {loadingThread && <p className="coach-thinking">Opening conversation…</p>}
          {!loadingThread && messages.length === 0 && !busy && <div className="coach-empty"><div className="coming-icon"><Compass size={24}/></div><h2>Your placement journey starts with one question.</h2><p>Keep learning, keep practicing, and get one step closer to your dream role.</p><blockquote className="coach-quote">“Success is the sum of small efforts, repeated day in and day out.”</blockquote><div className="coach-prompts" aria-label="Suggested prompts">{PROMPTS.map((p) => <button key={p} type="button" onClick={() => send(p)} disabled={busy}>{p}</button>)}</div></div>}
          {messages.map((m, i) => m.role === 'user'
            ? <div key={i} className="coach-turn is-user"><span className="coach-label"><UserRound size={12}/> You</span><p>{m.content}</p></div>
            : <article key={i} className="coach-turn is-coach">
                <span className="coach-label"><Compass size={12}/> Coach{m.personalized && <Badge variant="outline">Personalized</Badge>}</span>
                {!m.error && m.meta?.mode && <div className="coach-meta">{m.meta.topic && <span>Detected topic: {m.meta.topic}</span>}<span>{m.meta.mode === 'general' ? 'General AI answer — no matching knowledge found' : m.meta.contextCount ? `${m.meta.contextCount} relevant knowledge section${m.meta.contextCount === 1 ? '' : 's'} found` : 'Based on your preparation data'}</span></div>}
                {m.error ? <div className="coach-error"><p>{m.error}</p>{m.question && <Button size="sm" variant="outline" onClick={() => retry(i)} disabled={busy}><RotateCcw size={13}/> Retry</Button>}</div> : <p className="coach-answer">{m.content}</p>}
                {!m.error && (m.sources.length ? <div className="coach-sources"><span><BookOpen size={12}/> Sources</span>{m.sources.map((s, j) => <div key={j} className="coach-source"><strong>[{j + 1}] {s.title}</strong><small>{s.category} · {s.topic} · {s.difficulty} · match {Math.round(s.similarity * 100)}%</small></div>)}</div> : <div className="coach-sources"><Badge variant="outline">{m.personalized ? 'Based on your preparation data' : (m.meta?.mode === 'general' ? 'General answer · not from the knowledge base' : 'No matching knowledge found')}</Badge></div>)}
              </article>)}
          {busy && <div className="coach-turn is-coach"><span className="coach-label"><Compass size={12}/> Coach</span><p className="coach-thinking"><span className="coach-dots"><i/><i/><i/></span> Searching the knowledge base and your record…</p></div>}
          <div ref={endRef}/>
        </div>
        <form className="coach-composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <select aria-label="Limit to category" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All topics</option>{KNOWLEDGE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <Textarea ref={inputRef} aria-label="Your question" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything about placement preparation..." rows={2} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}/>
          <Button type="submit" disabled={busy || !input.trim()}><Send size={15}/> Ask</Button>
        </form>
      </section>
    </div>
  </div>;
}
