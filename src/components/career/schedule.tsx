import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Pencil, Play, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCareer } from '@/lib/career-data';
import type { Tables } from '@/integrations/supabase/types';
import { PageHeader, RequireAccount } from './shell';
import { Badge, Button, Card, Dialog, DialogContent, DialogHeader, DialogTitle, EmptyState, ErrorState, Progress } from './primitives';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type S = Tables<'scheduled_sessions'>;
type Launch = { label: string; to: '/assessment' | '/mock-interview' | '/resume' | '/coach'; search?: Record<string, string> };
/** Each session type launches an existing module — no separate practice implementation. */
const TYPES: Record<string, { topic: string; launch: Launch; goals: string[] }> = {
  'DSA Practice': { topic: 'DSA', launch: { label: 'Start DSA assessment', to: '/assessment', search: { topic: 'DSA' } }, goals: ['Review one pattern (two pointers, sliding window, recursion…)', 'Take a timed DSA assessment', 'Note every question you missed and why'] },
  'SQL Practice': { topic: 'SQL', launch: { label: 'Start SQL assessment', to: '/assessment', search: { topic: 'SQL' } }, goals: ['Revise JOIN, GROUP BY and HAVING', 'Take a timed SQL assessment', 'Rewrite one wrong query correctly'] },
  'Aptitude Practice': { topic: 'Aptitude', launch: { label: 'Start aptitude assessment', to: '/assessment', search: { topic: 'Aptitude' } }, goals: ['Warm up with shortcuts for percentages and ratios', 'Take a timed aptitude assessment', 'Review time spent per question'] },
  'Technical Mock Interview': { topic: 'Technical Interview', launch: { label: 'Launch technical mock interview', to: '/mock-interview', search: { type: 'Technical' } }, goals: ['Prepare two projects you can explain in depth', 'Complete a technical mock interview', 'Read the report and pick one area to improve'] },
  'HR Interview': { topic: 'HR Interview', launch: { label: 'Launch HR mock interview', to: '/mock-interview', search: { type: 'HR' } }, goals: ['Draft a 60-second self-introduction', 'Complete an HR mock interview', 'Refine answers flagged as low relevance'] },
  'Behavioral Interview': { topic: 'Behavioral Interview', launch: { label: 'Launch behavioral mock interview', to: '/mock-interview', search: { type: 'Behavioral' } }, goals: ['List three STAR stories', 'Complete a behavioral mock interview', 'Add measurable results to weaker stories'] },
  'Resume Review': { topic: 'Resume', launch: { label: 'Open Resume Analyzer', to: '/resume' }, goals: ['Upload your latest resume', 'Review missing keywords for your target role', 'Apply the top three suggestions'] },
  'Skill Assessment': { topic: 'Assessment', launch: { label: 'Open Skill Assessment', to: '/assessment' }, goals: ['Pick the topics you are weakest in', 'Complete the assessment without pausing', 'Check updated weak areas'] },
};
const TYPE_NAMES = Object.keys(TYPES);
const typeOf = (s: S) => s.session_type || s.round_type;
const isDone = (s: S) => s.status === 'Completed';
const isCancelled = (s: S) => s.status === 'Cancelled';
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

export function SchedulePage() {
  const { interviews, refresh, user } = useCareer();
  const [tab, setTab] = useState<'today' | 'upcoming' | 'completed'>('today');
  const [editing, setEditing] = useState<S | 'new' | null>(null);
  const [focus, setFocus] = useState<S | null>(null);
  const [day, setDay] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const now = new Date();
  const active = interviews.filter((s) => !isCancelled(s));
  const lists = {
    today: active.filter((s) => !isDone(s) && sameDay(new Date(s.scheduled_at), now)),
    upcoming: active.filter((s) => !isDone(s) && !sameDay(new Date(s.scheduled_at), now) && new Date(s.scheduled_at) > now),
    completed: interviews.filter((s) => isDone(s) || isCancelled(s)).sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at)),
  };
  const missed = active.filter((s) => !isDone(s) && !sameDay(new Date(s.scheduled_at), now) && new Date(s.scheduled_at) < now);
  const shown = day ? interviews.filter((s) => sameDay(new Date(s.scheduled_at), day)) : lists[tab];

  async function update(s: S, patch: Partial<S>) {
    setError('');
    const { error: e } = await supabase.from('scheduled_sessions').update(patch).eq('id', s.id);
    if (e) setError('That change could not be saved.'); await refresh();
  }
  async function complete(s: S, minutes: number) {
    await update(s, { status: 'Completed', completed_at: new Date().toISOString() });
    if (user) await supabase.from('practice_sessions').insert({ user_id: user.id, topic: TYPES[typeOf(s)]?.topic ?? typeOf(s), session_type: typeOf(s), duration_minutes: Math.max(1, minutes), started_at: s.started_at ?? new Date().toISOString(), completed_at: new Date().toISOString(), notes: s.notes });
    await refresh(); setFocus(null);
  }
  if (focus) return <FocusScreen s={interviews.find((x) => x.id === focus.id) ?? focus} onExit={() => setFocus(null)} onComplete={complete} />;

  return <div className="page-container feature-page">
    <PageHeader eyebrow="PLAN YOUR WEEK" title="Preparation schedule" description="Schedule practice, interviews and reviews — each session launches the matching CareerAI module." action={<Button onClick={() => setEditing('new')}><Plus size={15} /> New session</Button>} />
    <RequireAccount>
      {error && <ErrorState message={error} />}
      <div className="sc-layout">
        <MonthCalendar sessions={interviews} selected={day} onSelect={(d) => setDay(d && day && sameDay(d, day) ? null : d)} />
        <div className="sc-main">
          {day ? <div className="sc-dayhead"><h2>{day.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</h2><Button variant="ghost" size="sm" onClick={() => setDay(null)}><X size={14} /> Clear day</Button></div>
            : <div className="sc-tabs" role="tablist">{(['today', 'upcoming', 'completed'] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}<span>{lists[t].length}</span></button>)}</div>}
          {!day && tab !== 'completed' && missed.length > 0 && <Card className="sc-missed"><strong>{missed.length} missed session{missed.length > 1 ? 's' : ''}</strong><div>{missed.map((s) => <SessionRow key={s.id} s={s} missed onStart={() => startSession(s)} onEdit={() => setEditing(s)} onCancel={() => update(s, { status: 'Cancelled' })} />)}</div></Card>}
          {shown.length ? <div className="sc-timeline">{shown.map((s) => <SessionRow key={s.id} s={s} onStart={() => startSession(s)} onEdit={() => setEditing(s)} onCancel={() => update(s, { status: 'Cancelled' })} onRestore={() => update(s, { status: 'Scheduled' })} />)}</div>
            : <EmptyState title={day ? 'Nothing scheduled this day.' : tab === 'today' ? 'Nothing planned for today.' : tab === 'upcoming' ? 'No upcoming sessions.' : 'No completed sessions yet.'} description="Schedule a focused session and CareerAI will open the right module when it starts." action="Schedule a session" onAction={() => setEditing('new')} />}
        </div>
      </div>
      <SessionDialog open={editing !== null} session={editing === 'new' ? null : editing} defaultDay={day} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await refresh(); }} />
    </RequireAccount>
  </div>;

  async function startSession(s: S) {
    if (!s.started_at) await update(s, { started_at: new Date().toISOString() });
    setFocus(s);
  }
}

function SessionRow({ s, missed, onStart, onEdit, onCancel, onRestore }: { s: S; missed?: boolean; onStart: () => void; onEdit: () => void; onCancel: () => void; onRestore?: () => void }) {
  const done = isDone(s), cancelled = isCancelled(s);
  return <div className={`sc-row ${done ? 'done' : ''} ${cancelled ? 'cancelled' : ''}`}>
    <div className="sc-when"><strong>{fmtTime(s.scheduled_at)}</strong><small>{fmtDay(s.scheduled_at)}</small></div>
    <span className="sc-dot" />
    <div className="sc-body">
      <strong>{typeOf(s)}</strong>
      <small><Clock3 size={12} /> {s.duration_minutes} min{s.company ? ` · ${s.company}` : ''}{s.role ? ` · ${s.role}` : ''}</small>
      {s.notes && <p>{s.notes}</p>}
    </div>
    <div className="sc-actions">
      {cancelled ? <><Badge variant="outline">Cancelled</Badge>{onRestore && <Button size="sm" variant="ghost" onClick={onRestore}>Restore</Button>}</>
        : done ? <Badge variant="outline"><Check size={12} /> Completed</Badge>
        : <>{missed && <Badge variant="outline" className="sc-missed-badge">Missed</Badge>}
          <Button size="sm" variant="ghost" onClick={onEdit} aria-label={missed ? 'Reschedule' : 'Edit or reschedule'}><Pencil size={14} />{missed ? 'Reschedule' : 'Edit'}</Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={onStart}><Play size={14} /> {s.started_at ? 'Resume' : 'Start'}</Button></>}
    </div>
  </div>;
}

function MonthCalendar({ sessions, selected, onSelect }: { sessions: S[]; selected: Date | null; onSelect: (d: Date | null) => void }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const days = useMemo(() => {
    const first = new Date(cursor); const offset = (first.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), 1 - offset + i));
  }, [cursor]);
  const today = new Date();
  return <Card className="sc-cal">
    <div className="sc-cal-head"><button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft size={16} /></button><strong>{cursor.toLocaleDateString([], { month: 'long', year: 'numeric' })}</strong><button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight size={16} /></button></div>
    <div className="sc-grid">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="sc-wd">{d}</span>)}
      {days.map((d) => { const items = sessions.filter((s) => !isCancelled(s) && sameDay(new Date(s.scheduled_at), d)); return <button key={d.toISOString()} onClick={() => onSelect(d)} className={`sc-day ${d.getMonth() !== cursor.getMonth() ? 'out' : ''} ${sameDay(d, today) ? 'today' : ''} ${selected && sameDay(d, selected) ? 'sel' : ''}`} aria-label={`${d.toDateString()}, ${items.length} sessions`}><span>{d.getDate()}</span>{items.length > 0 && <i className={items.every(isDone) ? 'done' : ''}>{items.length > 1 ? items.length : ''}</i>}</button>; })}
    </div>
  </Card>;
}

function SessionDialog({ open, session, defaultDay, onClose, onSaved }: { open: boolean; session: S | null; defaultDay: Date | null; onClose: () => void; onSaved: () => void }) {
  const { user } = useCareer();
  const [type, setType] = useState<string>(TYPE_NAMES[0] ?? "DSA Practice");
  const [when, setWhen] = useState('');
  const [duration, setDuration] = useState(45);
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setError('');
    if (session) { setType(typeOf(session)); setWhen(toLocalInput(new Date(session.scheduled_at))); setDuration(session.duration_minutes); setCompany(session.company); setNotes(session.notes ?? ''); }
    else { const d = defaultDay ? new Date(defaultDay) : new Date(); d.setHours(defaultDay ? 18 : d.getHours() + 1, 0, 0, 0); setType(TYPE_NAMES[0] ?? "DSA Practice"); setWhen(toLocalInput(d)); setDuration(45); setCompany(''); setNotes(''); }
  }, [open, session]);
  async function save() {
    const at = new Date(when);
    if (!user || Number.isNaN(at.getTime())) { setError('Choose a valid date and time.'); return; }
    if (!session && at.getTime() < Date.now() - 60000) { setError('Choose a time in the future.'); return; }
    setBusy(true); setError('');
    const row = { session_type: type, round_type: type, scheduled_at: at.toISOString(), duration_minutes: duration, company: company.trim(), notes: notes.trim() || null, status: 'Scheduled' };
    const { error: e } = session ? await supabase.from('scheduled_sessions').update(row).eq('id', session.id) : await supabase.from('scheduled_sessions').insert({ ...row, user_id: user.id, role: '' });
    setBusy(false);
    if (e) setError('The session could not be saved.'); else onSaved();
  }
  return <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="sc-dialog">
      <DialogHeader><DialogTitle>{session ? 'Edit or reschedule session' : 'Schedule a session'}</DialogTitle></DialogHeader>
      <div className="sc-form">
        <div><span className="mini-eyebrow">SESSION TYPE</span><div className="as-chips">{TYPE_NAMES.map((t) => <button key={t} type="button" className={`as-chip ${type === t ? 'active' : ''}`} onClick={() => setType(t)}>{t}</button>)}</div></div>
        <div className="sc-form-row">
          <label><span className="mini-eyebrow">DATE & TIME</span><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
          <label><span className="mini-eyebrow">DURATION</span><div className="as-chips">{[30, 45, 60, 90].map((m) => <button key={m} type="button" className={`as-chip ${duration === m ? 'active' : ''}`} onClick={() => setDuration(m)}>{m} min</button>)}</div></label>
        </div>
        <label><span className="mini-eyebrow">COMPANY (OPTIONAL)</span><Input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={80} placeholder="e.g. TCS" /></label>
        <label><span className="mini-eyebrow">NOTES (OPTIONAL)</span><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} placeholder="What do you want to focus on?" /></label>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <div className="sc-form-actions"><Button variant="ghost" onClick={onClose}>Close</Button><Button onClick={save} disabled={busy}>{session ? 'Save changes' : 'Schedule'}</Button></div>
      </div>
    </DialogContent>
  </Dialog>;
}

function FocusScreen({ s, onExit, onComplete }: { s: S; onExit: () => void; onComplete: (s: S, minutes: number) => Promise<void> }) {
  const { weakAreas } = useCareer();
  const cfg = TYPES[typeOf(s)];
  const startMs = new Date(s.started_at ?? Date.now()).getTime();
  const [elapsed, setElapsed] = useState(0);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { const t = setInterval(() => setElapsed(Math.floor((Date.now() - startMs) / 1000)), 1000); return () => clearInterval(t); }, [startMs]);
  const total = s.duration_minutes * 60;
  const left = Math.max(0, total - elapsed);
  const weak = weakAreas.find((w) => cfg && w.topic.toLowerCase() === cfg.topic.toLowerCase());
  return <div className="page-container feature-page sc-focus">
    <div className="sc-focus-top"><Button variant="ghost" size="sm" onClick={onExit}><ChevronLeft size={15} /> Back to schedule</Button><Badge variant="outline">FOCUS SESSION</Badge></div>
    <div className="sc-focus-hero">
      <div><span className="mini-eyebrow">{fmtDay(s.scheduled_at).toUpperCase()} · {s.duration_minutes} MIN{s.company ? ` · ${s.company.toUpperCase()}` : ''}</span><h1>{typeOf(s)}</h1>{s.notes && <p>{s.notes}</p>}</div>
      <div className="sc-clock"><strong>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</strong><small>{left ? 'remaining' : 'time is up'}</small><Progress value={Math.min(100, (elapsed / total) * 100)} /></div>
    </div>
    <div className="sc-focus-grid">
      <Card className="sc-card"><span className="mini-eyebrow">SESSION PLAN</span>
        <ul className="sc-goals">{(cfg?.goals ?? ['Work through your notes for this session']).map((g, i) => <li key={g}><button type="button" onClick={() => setChecked((c) => { const n = [...c]; n[i] = !n[i]; return n; })} aria-pressed={!!checked[i]} className={checked[i] ? 'on' : ''}>{checked[i] ? <Check size={13} /> : null}</button><span>{g}</span></li>)}</ul>
        {cfg && <Button asChild size="lg"><Link to={cfg.launch.to} search={cfg.launch.search as never}>{cfg.launch.label} <ArrowRight size={16} /></Link></Button>}
        <small className="subtle-note">The module opens with this session’s settings; return here to mark the session complete.</small>
      </Card>
      <Card className="sc-card"><span className="mini-eyebrow">YOUR CONTEXT</span>
        {weak ? <><strong>{weak.topic}: {weak.score ?? '—'}% · {weak.attention ?? weak.severity}</strong><p>{weak.recommended_action ?? weak.reason}</p><Link to="/weak-areas" className="text-link">View weak areas</Link></>
          : <p>No open weak area is recorded for this topic yet. Your results from this session will update it.</p>}
        <div className="sc-done"><Button variant="outline" disabled={busy} onClick={async () => { setBusy(true); await onComplete(s, Math.round(elapsed / 60)); setBusy(false); }}><CalendarDays size={15} /> Mark session complete</Button></div>
      </Card>
    </div>
  </div>;
}
