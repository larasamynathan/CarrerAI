import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { ArrowRight, CheckCircle2, Circle, Clock, LoaderCircle, Mic, RotateCcw } from 'lucide-react';
import { useCareer } from '@/lib/career-data';
import { INTERVIEW_LENGTHS, INTERVIEW_TYPES, finishInterview, loadInterview, startInterview, submitInterviewAnswer } from '@/lib/mock-interview.functions';
import { PageHeader, RequireAccount } from './shell';
import { Badge, Button, Card, ErrorState, Progress, ScoreRing } from './primitives';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

type Type = (typeof INTERVIEW_TYPES)[number];
const ABOUT: Record<Type, string> = {
  Technical: 'Core CS, programming concepts and your projects — explained clearly.',
  HR: 'Introduction, motivation, goals and fit for the role.',
  Behavioral: 'Real situations from your experience, answered with STAR.',
};
const INTRO: Record<Type, string> = {
  Technical: 'I’ll ask questions on computer-science fundamentals, problem solving and your projects. Explain your reasoning as you would aloud — correctness, depth and clarity all count.',
  HR: 'This round is about you: your background, motivation and goals. Be specific, honest and concise, and connect your answers to the role.',
  Behavioral: 'I’ll ask about situations you have faced. Use the STAR structure — Situation, Task, Action, Result — and focus on what you personally did.',
};
type Q = { id: string; position: number; question: string; focus: string | null; answer: string | null; feedback: string | null; score: number | null; evaluation: any };

export function MockInterviewPage({ initialType }: { initialType?: Type | undefined } = {}) {
  const { mockInterviews, refresh } = useCareer();
  const [active, setActive] = useState<string | null>(null);
  const inProgress = mockInterviews.find((m) => m.status === 'in_progress' && (m as any).question_count);
  return <div className="page-container feature-page">
    <PageHeader eyebrow="PRACTICE UNDER REAL CONDITIONS" title="Mock interview" description="A timed, AI-evaluated interview with unique questions and a full performance report." />
    <RequireAccount>
      {active ? <Session id={active} onExit={() => { setActive(null); void refresh(); }} />
        : <Setup initialType={initialType} resume={inProgress ? { id: inProgress.id, label: `${inProgress.interview_type} interview · ${inProgress.role}` } : null} onStart={setActive} history={mockInterviews.filter((m) => m.status === 'completed')} />}
    </RequireAccount>
  </div>;
}

function Setup({ initialType, onStart, resume, history }: { initialType?: Type | undefined; onStart: (id: string) => void; resume: { id: string; label: string } | null; history: any[] }) {
  const { profile } = useCareer();
  const start = useServerFn(startInterview);
  const [type, setType] = useState<Type>(initialType ?? 'Technical');
  const [role, setRole] = useState(profile?.target_role || 'Software Engineer');
  const [company, setCompany] = useState(profile?.target_company || '');
  const [count, setCount] = useState<number>(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function go() {
    setBusy(true); setError('');
    try { const r = await start({ data: { type, role: role.trim() || 'Software Engineer', company: company.trim() || undefined, count } }); if (r.id) onStart(r.id); else setError(r.error ?? 'The interview could not be started.'); }
    catch { setError('The interview could not be started.'); }
    setBusy(false);
  }
  return <>
    {resume && <Card className="mi-resume"><div><span className="mini-eyebrow">UNFINISHED</span><strong>{resume.label}</strong></div><Button onClick={() => onStart(resume.id)}>Resume <ArrowRight size={14} /></Button></Card>}
    <Card className="as-setup">
      <div><span className="mini-eyebrow">INTERVIEW TYPE</span>
        <div className="mi-types">{INTERVIEW_TYPES.map((t) => <button key={t} type="button" className={`mi-type ${type === t ? 'active' : ''}`} onClick={() => setType(t)} aria-pressed={type === t}><strong>{t}</strong><small>{ABOUT[t]}</small></button>)}</div>
      </div>
      <div className="as-row">
        <label><span className="mini-eyebrow">TARGET ROLE</span><Input value={role} onChange={(e) => setRole(e.target.value)} maxLength={80} /></label>
        <label><span className="mini-eyebrow">COMPANY (OPTIONAL)</span><Input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={80} placeholder="e.g. Infosys" /></label>
        <div><span className="mini-eyebrow">QUESTIONS</span><div className="as-chips">{INTERVIEW_LENGTHS.map((n) => <button key={n} type="button" className={`as-chip ${count === n ? 'active' : ''}`} onClick={() => setCount(n)}>{n} questions</button>)}</div><small className="subtle-note">3 minutes per answer</small></div>
      </div>
      {error && <ErrorState message={error} retry={go} />}
      <div><Button size="lg" onClick={go} disabled={busy}>{busy ? <><LoaderCircle className="animate-spin" size={16} /> Preparing your interviewer…</> : <>Start interview <ArrowRight size={16} /></>}</Button></div>
    </Card>
    {history.length > 0 && <div className="mi-history"><h2>Past interviews</h2>{history.slice(0, 8).map((m) => <button key={m.id} type="button" className="mi-hist-row" onClick={() => onStart(m.id)}><span><strong>{m.interview_type} · {m.role}</strong><small>{new Date(m.completed_at ?? m.started_at).toLocaleDateString()}</small></span><b>{m.overall_score ?? '—'}%</b></button>)}</div>}
  </>;
}

function Session({ id, onExit }: { id: string; onExit: () => void }) {
  const load = useServerFn(loadInterview), submit = useServerFn(submitInterviewAnswer), finish = useServerFn(finishInterview);
  const [state, setState] = useState<Awaited<ReturnType<typeof loadInterview>> | null>(null);
  const [stage, setStage] = useState<'intro' | 'question' | 'feedback' | 'report'>('intro');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [left, setLeft] = useState(0);
  const startedAt = useRef(Date.now());
  const reload = useCallback(async () => {
    setError('');
    try {
      const r = await load({ data: { id } }); setState(r);
      const m = r.interview as any;
      if (m.status === 'completed') setStage('report');
      else if ((r.questions as Q[]).some((q) => q.answer != null)) setStage((s) => (s === 'intro' ? 'question' : s));
    } catch { setError('The interview could not be loaded.'); }
  }, [id]);
  useEffect(() => { void reload(); }, [reload]);
  const m = state?.interview as any;
  const qs = (state?.questions ?? []) as Q[];
  const current = qs.find((q) => q.position === m?.current_position);
  const limit = m?.seconds_per_question ?? 180;
  const answeredCurrent = current?.answer != null;
  useEffect(() => { if (stage === 'question' && current && !answeredCurrent) { startedAt.current = Date.now(); setLeft(limit); setAnswer(''); } }, [stage, current?.id]);
  useEffect(() => {
    if (stage !== 'question') return;
    const t = setInterval(() => setLeft(Math.max(0, limit - Math.floor((Date.now() - startedAt.current) / 1000))), 500);
    return () => clearInterval(t);
  }, [stage, limit]);
  const send = useCallback(async () => {
    if (!current || busy) return;
    setBusy(true); setError('');
    try {
      const r = await submit({ data: { id, position: current.position, answer, seconds: Math.round((Date.now() - startedAt.current) / 1000) } });
      if (r.error) setError(r.error); else { await reload(); setStage('feedback'); }
    } catch { setError('Your answer could not be submitted.'); }
    setBusy(false);
  }, [current, answer, busy, id]);
  useEffect(() => { if (stage === 'question' && left === 0 && current && !busy && Date.now() - startedAt.current > 2000) void send(); }, [left]);
  async function next() {
    const last = qs.length && m && qs.every((q) => q.answer != null) && qs.length >= (state?.total ?? 0);
    if (!last) { setStage('question'); return; }
    setBusy(true); setError('');
    try { await finish({ data: { id } }); await reload(); setStage('report'); } catch { setError('The report could not be prepared.'); }
    setBusy(false);
  }
  if (!state) return error ? <ErrorState message={error} retry={reload} /> : <div className="status-state"><LoaderCircle className="animate-spin" /> Joining the interview room…</div>;
  if (stage === 'report') return <ReportView m={m} qs={qs} onExit={onExit} />;
  const total = state.total;
  const shown = stage === 'feedback' ? qs.filter((q) => q.answer != null).at(-1) : current;
  return <div className="mi-room">
    <div className="mi-stage">
      <div className="mi-top"><Badge variant="outline">{m.interview_type.toUpperCase()} INTERVIEW</Badge><span>{m.role}{m.company ? ` · ${m.company}` : ''}</span></div>
      {stage === 'intro' ? <div className="mi-intro">
        <div className="mi-avatar"><Mic size={22} /></div>
        <span className="mini-eyebrow">YOUR INTERVIEWER</span>
        <h2>Welcome. Let’s begin when you’re ready.</h2>
        <p>{INTRO[m.interview_type as Type] ?? INTRO.Technical}</p>
        <ul><li>{total} questions, each asked once</li><li>{Math.round(limit / 60)} minutes per answer — submits automatically at zero</li><li>Each answer is evaluated before the next question</li></ul>
        <Button size="lg" onClick={() => setStage('question')}>Start <ArrowRight size={16} /></Button>
      </div> : shown && <>
        <div className="mi-qhead"><strong>Question {shown.position} / {total}</strong>{stage === 'question' && <span className={`mi-timer ${left <= 30 ? 'low' : ''}`}><Clock size={15} /> {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>}</div>
        <Progress value={(shown.position - (stage === 'question' ? 1 : 0)) / total * 100} />
        {shown.focus && <span className="mini-eyebrow mi-focus">{shown.focus.toUpperCase()}</span>}
        <h2 className="mi-question">{shown.question}</h2>
        {stage === 'question' ? <>
          <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={9} maxLength={6000} placeholder="Type your answer as you would say it…" disabled={busy} aria-label="Your answer" />
          <div className="mi-actions"><small>{answer.trim() ? answer.trim().split(/\s+/).length : 0} words</small><Button onClick={send} disabled={busy || !answer.trim()}>{busy ? <><LoaderCircle className="animate-spin" size={15} /> Evaluating…</> : <>Submit answer <ArrowRight size={15} /></>}</Button></div>
        </> : <Feedback q={shown} onNext={next} busy={busy} last={shown.position >= total} />}
      </>}
      {error && <ErrorState message={error} retry={stage === 'question' ? send : reload} />}
    </div>
    <aside className="mi-panel"><span className="mini-eyebrow">INTERVIEW PROGRESS</span>
      <ol>{Array.from({ length: total }, (_, i) => { const q = qs.find((x) => x.position === i + 1); const done = q?.answer != null; const now = q?.position === m.current_position && !done; return <li key={i} className={now ? 'now' : done ? 'done' : ''}>{done ? <CheckCircle2 size={15} /> : <Circle size={15} />}<span>Q{i + 1}{q?.focus ? ` · ${q.focus}` : ''}</span>{done && <b>{q?.score ?? 0}%</b>}</li>; })}</ol>
      <Button variant="ghost" size="sm" onClick={onExit}>Save and exit</Button>
    </aside>
  </div>;
}

function Bar({ label, v }: { label: string; v: number }) { return <div className="mi-bar"><span>{label}</span><Progress value={v} /><b>{v}%</b></div>; }

function Feedback({ q, onNext, busy, last }: { q: Q; onNext: () => void; busy: boolean; last: boolean }) {
  const e = q.evaluation ?? {};
  return <div className="mi-feedback">
    <div className="mi-answer"><span className="mini-eyebrow">YOUR ANSWER</span><p>{q.answer || '—'}</p></div>
    <div className="mi-eval"><ScoreRing value={q.score ?? 0} label="Answer" size="small" /><div><Bar label="Communication" v={e.communication ?? 0} /><Bar label="Knowledge" v={e.knowledge ?? 0} /><Bar label="Relevance" v={e.relevance ?? 0} /></div></div>
    <p>{q.feedback}</p>
    {(e.strengths?.length || e.improve?.length) ? <div className="mi-two">{e.strengths?.length > 0 && <div><span className="mini-eyebrow">WORKED WELL</span><ul>{e.strengths.map((s: string) => <li key={s}>{s}</li>)}</ul></div>}{e.improve?.length > 0 && <div><span className="mini-eyebrow">TO IMPROVE</span><ul>{e.improve.map((s: string) => <li key={s}>{s}</li>)}</ul></div>}</div> : null}
    <div className="mi-actions"><span /><Button onClick={onNext} disabled={busy}>{busy ? <><LoaderCircle className="animate-spin" size={15} /> Preparing report…</> : last ? <>See final report <ArrowRight size={15} /></> : <>Next question <ArrowRight size={15} /></>}</Button></div>
  </div>;
}

function ReportView({ m, qs, onExit }: { m: any; qs: Q[]; onExit: () => void }) {
  const r = m.report ?? {};
  const ind = r.indicators ?? {};
  const rows = useMemo(() => qs.slice().sort((a, b) => a.position - b.position), [qs]);
  return <div className="mi-report">
    <Card className="mi-report-hero">
      <ScoreRing value={r.overall ?? m.overall_score ?? 0} label="Overall" />
      <div><span className="mini-eyebrow">{m.interview_type.toUpperCase()} INTERVIEW · FINAL REPORT</span><h2>{m.role}{m.company ? ` · ${m.company}` : ''}</h2><p>{r.summary || m.feedback}</p><small>{r.answered ?? 0} of {r.total ?? rows.length} questions answered</small></div>
    </Card>
    <div className="mi-report-grid">
      <Card className="mi-card"><h3>Performance</h3><Bar label="Communication" v={r.communication ?? 0} /><Bar label={m.interview_type === 'Technical' ? 'Technical knowledge' : 'Answer substance'} v={r.knowledge ?? 0} /><Bar label="Answer relevance" v={r.relevance ?? 0} /></Card>
      <Card className="mi-card"><h3>Response indicators</h3>
        <dl className="mi-ind"><div><dt>Average answer length</dt><dd>{ind.avgWords ?? 0} words</dd></div><div><dt>Hedging phrases</dt><dd>{ind.hedgeRate ?? 0} per 100 words</dd></div><div><dt>Answers with concrete examples</dt><dd>{ind.exampleRate ?? 0}%</dd></div><div><dt>Average time used</dt><dd>{ind.avgTimePct == null ? 'Not measured' : `${ind.avgTimePct}%`}</dd></div></dl>
        <small className="subtle-note">Measured from your written answers only (e.g. “maybe”, “I think”). They describe how answers were phrased, not personality or confidence as a trait.</small></Card>
      <Card className="mi-card"><h3>Areas to improve</h3><ul>{(r.improve ?? []).map((s: string) => <li key={s}>{s}</li>)}</ul></Card>
      <Card className="mi-card"><h3>Suggested next practice</h3>{(r.nextPractice ?? []).map((p: any) => <Link key={p.title} to={p.link} className="mi-next" onClick={p.link === '/mock-interview' ? onExit : undefined}><strong>{p.title}</strong><small>{p.detail}</small></Link>)}</Card>
    </div>
    <h3 className="mi-sub">Question by question</h3>
    <div className="mi-qlist">{rows.map((q) => <details key={q.id} className="mi-qrow"><summary><span>Q{q.position}. {q.question}</span><b>{q.score ?? 0}%</b></summary><p><em>Your answer:</em> {q.answer || 'Not answered'}</p><p>{q.feedback}</p></details>)}</div>
    <Button variant="outline" onClick={onExit}><RotateCcw size={15} /> New interview</Button>
  </div>;
}
