import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, CheckCircle2, Circle, Clock3, LoaderCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCareer } from '@/lib/career-data';
import { ASSESSMENT_TOPICS, DIFFICULTIES, QUESTION_COUNTS, SECONDS_PER_QUESTION, getAssessmentReview, loadAssessment, saveAnswer, startAssessment, submitAssessment, type AssessmentSummary, type PublicQuestion } from '@/lib/assessment.functions';
import { PageHeader, RequireAccount } from './shell';
import { Badge, Button, Card, EmptyState, ErrorState, Progress, ScoreRing } from './primitives';

type Answer = { selected: string | null; marked: boolean };
type Review = Awaited<ReturnType<typeof getAssessmentReview>>;
const fmt = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, Math.floor(s) % 60)).padStart(2, '0')}`;

export function SkillAssessment({ initialTopic }: { initialTopic?: string | undefined } = {}) {
  const { user, refresh } = useCareer();
  const [mode, setMode] = useState<'setup' | 'run' | 'result'>('setup');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [history, setHistory] = useState<AssessmentSummary[]>([]);
  const loadHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('assessments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10);
    setHistory((data ?? []) as unknown as AssessmentSummary[]);
  }, [user]);
  useEffect(() => { void loadHistory(); }, [loadHistory]);
  const open = (id: string, status: string) => { setActiveId(id); setMode(status === 'completed' ? 'result' : 'run'); };
  return <div className="page-container feature-page">
    <PageHeader eyebrow="KNOW WHERE YOU STAND" title="Skill assessment" description="Timed, mixed-topic checks that measure your fundamentals and feed your weak-area recommendations." />
    <RequireAccount>
      {mode === 'setup' && <Setup initialTopic={initialTopic} onStarted={(id) => open(id, 'in_progress')} history={history} onOpen={open} />}
      {mode === 'run' && activeId && <Runner id={activeId} onSubmitted={async () => { await Promise.all([refresh(), loadHistory()]); setMode('result'); }} onExit={() => { void loadHistory(); setMode('setup'); }} />}
      {mode === 'result' && activeId && <Result id={activeId} onBack={() => { void loadHistory(); setMode('setup'); }} />}
    </RequireAccount>
  </div>;
}

function Setup({ initialTopic, onStarted, history, onOpen }: { initialTopic?: string | undefined; onStarted: (id: string) => void; history: AssessmentSummary[]; onOpen: (id: string, status: string) => void }) {
  const start = useServerFn(startAssessment);
  const [topics, setTopics] = useState<string[]>([initialTopic ?? 'DSA']);
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('medium');
  const [count, setCount] = useState<number>(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const limit = count * (SECONDS_PER_QUESTION[difficulty] ?? 75);
  const toggle = (t: string) => setTopics((cur) => cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]);
  async function begin() {
    setBusy(true); setError('');
    try { const r = await start({ data: { topics: topics as never, difficulty, count } }); if (r.error || !r.id) setError(r.error ?? 'Could not start.'); else onStarted(r.id); }
    catch { setError('The assessment could not be started. Please try again.'); }
    setBusy(false);
  }
  const inProgress = history.filter((h) => h.status === 'in_progress' && Date.now() - new Date(h.started_at).getTime() < (h.time_limit_seconds ?? 0) * 1000);
  return <>
    {inProgress.length > 0 && <div className="note-banner"><Clock3 size={18} /><span>You have an unfinished assessment: {inProgress[0]!.title}.</span><Button size="sm" variant="outline" onClick={() => onOpen(inProgress[0]!.id, 'in_progress')}>Resume</Button></div>}
    <Card className="as-setup">
      <div><span className="mini-eyebrow">TOPICS</span><div className="as-chips">{ASSESSMENT_TOPICS.map((t) => <button type="button" key={t} className={`as-chip ${topics.includes(t) ? 'on' : ''}`} aria-pressed={topics.includes(t)} onClick={() => toggle(t)}>{t}</button>)}</div></div>
      <div className="as-row">
        <div><span className="mini-eyebrow">DIFFICULTY</span><div className="as-chips">{DIFFICULTIES.map((d) => <button type="button" key={d} className={`as-chip ${difficulty === d ? 'on' : ''}`} aria-pressed={difficulty === d} onClick={() => setDifficulty(d)}>{d[0]!.toUpperCase() + d.slice(1)}</button>)}</div></div>
        <div><span className="mini-eyebrow">NUMBER OF QUESTIONS</span><div className="as-chips">{QUESTION_COUNTS.map((n) => <button type="button" key={n} className={`as-chip ${count === n ? 'on' : ''}`} aria-pressed={count === n} onClick={() => setCount(n)}>{n}</button>)}</div></div>
      </div>
      <div className="as-summary">
        <div><span>Questions</span><strong>{count}</strong></div>
        <div><span>Time limit</span><strong>{Math.round(limit / 60)} min</strong></div>
        <div><span>Topics</span><strong>{topics.length || '—'}</strong></div>
        <div><span>Difficulty</span><strong className="capitalize">{difficulty}</strong></div>
      </div>
      {error && <ErrorState message={error} retry={begin} />}
      <Button onClick={begin} disabled={busy || !topics.length || topics.length > count}>{busy ? <><LoaderCircle className="animate-spin" size={16} /> Preparing fresh questions…</> : <>Start assessment <ArrowRight size={16} /></>}</Button>
      <p className="subtle-note">Questions are generated fresh for each attempt. Answers save as you go; the test submits automatically when time runs out.</p>
    </Card>
    <div className="section-header"><div><span className="mini-eyebrow">YOUR HISTORY</span><h2>Recent assessments</h2></div></div>
    {history.filter((h) => h.status === 'completed').length ? <div className="list-panel">{history.filter((h) => h.status === 'completed').map((h) => <button type="button" className="history-row as-history" key={h.id} onClick={() => onOpen(h.id, h.status)}><span>{h.title}<small>{new Date(h.completed_at ?? h.started_at).toLocaleDateString()} · {h.difficulty}</small></span><strong>{h.score}%</strong></button>)}</div>
      : <EmptyState title="No assessments yet." description="Pick your topics above and take your first assessment to see your scores here." />}
  </>;
}

function Runner({ id, onSubmitted, onExit }: { id: string; onSubmitted: () => Promise<void>; onExit: () => void }) {
  const load = useServerFn(loadAssessment); const save = useServerFn(saveAnswer); const submit = useServerFn(submitAssessment);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [step, setStep] = useState(0);
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitted = useRef(false);
  useEffect(() => { void (async () => {
    try {
      const r = await load({ data: { id } });
      setQuestions(r.questions);
      setAnswers(Object.fromEntries(r.answers.map((a) => [a.questionId, { selected: a.selected, marked: a.marked }])));
      const skew = Date.now() - new Date(r.serverNow).getTime();
      setDeadline(new Date(r.assessment.started_at).getTime() + (r.assessment.time_limit_seconds ?? 0) * 1000 + skew);
    } catch { setError('This assessment could not be loaded.'); }
  })(); }, [id]);
  const finish = useCallback(async () => {
    if (submitted.current) return; submitted.current = true; setBusy(true);
    try { const r = await submit({ data: { id } }); if (r.error) { setError(r.error); submitted.current = false; } else await onSubmitted(); }
    catch { setError('Your assessment could not be submitted. Please retry.'); submitted.current = false; }
    setBusy(false);
  }, [id]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const remaining = deadline ? (deadline - now) / 1000 : 0;
  useEffect(() => { if (deadline && remaining <= 0) void finish(); }, [deadline, remaining <= 0]);
  async function update(q: PublicQuestion, patch: Partial<Answer>) {
    const next = { selected: null, marked: false, ...answers[q.id], ...patch };
    setAnswers((a) => ({ ...a, [q.id]: next }));
    try { const r = await save({ data: { assessmentId: id, questionId: q.id, selected: next.selected, marked: next.marked } }); if (!r.ok) setError(r.error ?? 'Answer not saved.'); else setError(''); }
    catch { setError('Your answer could not be saved. Check your connection.'); }
  }
  if (!questions.length) return error ? <ErrorState message={error} retry={onExit} /> : <div className="status-state"><LoaderCircle className="animate-spin" /> Loading assessment…</div>;
  const q = questions[step]!; const a = answers[q.id];
  const answered = questions.filter((x) => answers[x.id]?.selected != null).length;
  return <div className="assessment-box as-run">
    <div className="question-meta"><Badge variant="outline">{q.topic}</Badge><span>QUESTION {step + 1} / {questions.length}</span><span className={`as-timer ${remaining < 60 ? 'low' : ''}`} aria-live="polite"><Clock3 size={15} /> {fmt(remaining)}</span></div>
    <Progress value={(answered / questions.length) * 100} />
    <h2>{q.question}</h2>
    <div className="answer-list" role="radiogroup">{q.options.map((o, i) => <Button variant="outline" role="radio" aria-checked={a?.selected === String(i)} className={a?.selected === String(i) ? 'as-selected' : ''} key={i} onClick={() => update(q, { selected: String(i) })} disabled={busy}><span className="answer-letter">{String.fromCharCode(65 + i)}</span>{o}</Button>)}</div>
    {error && <ErrorState message={error} />}
    <div className="as-nav">
      <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0}><ArrowLeft size={15} /> Previous</Button>
      <Button variant="ghost" onClick={() => update(q, { marked: !a?.marked })}>{a?.marked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />} {a?.marked ? 'Marked for review' : 'Mark for review'}</Button>
      {step < questions.length - 1 ? <Button onClick={() => setStep(step + 1)}>Next <ArrowRight size={15} /></Button> : <Button onClick={finish} disabled={busy}>{busy ? 'Submitting…' : 'Submit'}</Button>}
    </div>
    <div className="as-palette" aria-label="Question navigator">{questions.map((x, i) => <button type="button" key={x.id} onClick={() => setStep(i)} className={`${i === step ? 'cur' : ''} ${answers[x.id]?.selected != null ? 'done' : ''} ${answers[x.id]?.marked ? 'mark' : ''}`} aria-label={`Question ${i + 1}`}>{i + 1}</button>)}</div>
    <div className="as-nav"><span className="muted-small">{answered} answered · {questions.filter((x) => answers[x.id]?.marked).length} marked</span><Button variant="ghost" onClick={onExit}>Save and exit</Button><Button variant="outline" onClick={finish} disabled={busy}>Submit now</Button></div>
  </div>;
}

function Result({ id, onBack }: { id: string; onBack: () => void }) {
  const get = useServerFn(getAssessmentReview);
  const [data, setData] = useState<Review | null>(null); const [error, setError] = useState('');
  const fetchIt = useCallback(() => { setError(''); get({ data: { id } }).then(setData).catch(() => setError('Results could not be loaded.')); }, [id]);
  useEffect(fetchIt, [fetchIt]);
  if (error) return <ErrorState message={error} retry={fetchIt} />;
  if (!data) return <div className="status-state"><LoaderCircle className="animate-spin" /> Calculating your results…</div>;
  const a = data.assessment;
  const stats = [['Total score', `${a.score}%`], ['Accuracy', `${a.accuracy}%`], ['Correct', a.correct], ['Incorrect', a.incorrect], ['Unanswered', a.unanswered], ['Time efficiency', `${a.time_efficiency}%`]] as const;
  const weak = a.topic_breakdown.filter((t) => t.score < 70);
  return <div className="as-result">
    <Card className="assessment-box result-box">
      <ScoreRing value={a.score ?? 0} label="total score" />
      <h2>{(a.score ?? 0) >= 70 ? 'Strong work.' : 'Keep practicing.'}</h2>
      <p>{a.title} · {a.difficulty} · finished in {fmt(a.time_taken_seconds ?? 0)} of {fmt(a.time_limit_seconds ?? 0)}</p>
      <div className="as-stats">{stats.map(([l, v]) => <div key={l}><span>{l}</span><strong>{v}</strong></div>)}</div>
      <p className="subtle-note">Accuracy counts only answered questions. Time efficiency compares your correct answers with the pace allowed per question.</p>
    </Card>
    <div className="section-header"><div><span className="mini-eyebrow">TOPIC-WISE PERFORMANCE</span><h2>By topic</h2></div></div>
    <div className="list-panel skill-list">{a.topic_breakdown.map((t) => <div className="skill-row" key={t.topic}><span><strong>{t.topic}</strong><small>{t.correct}/{t.total} correct · {t.incorrect} incorrect · {t.unanswered} unanswered</small></span><span className="skill-meter"><Progress value={t.score} /><b>{t.score}%</b></span></div>)}</div>
    {weak.length > 0 ? <div className="note-banner"><span>Added to your weak areas: {weak.map((w) => w.topic).join(', ')}. Your dashboard recommendations are updated.</span><Button asChild size="sm" variant="outline"><Link to="/weak-areas">View weak areas</Link></Button></div>
      : <div className="note-banner"><CheckCircle2 size={18} /><span>All topics in this assessment are at or above 70%.</span></div>}
    <div className="section-header"><div><span className="mini-eyebrow">REVIEW</span><h2>Answers and explanations</h2></div></div>
    <div className="result-review">{data.review.map((q) => { const ok = q.selected === q.correct; return <div key={q.id}><span>{q.selected == null ? <Circle className="text-warning" size={17} /> : ok ? <CheckCircle2 className="text-success" size={17} /> : <XCircle className="text-destructive" size={17} />}</span><div><strong>{q.position}. {q.question}</strong><small>Your answer: {q.selected == null ? 'Not answered' : q.options[Number(q.selected)]} · Correct: {q.options[Number(q.correct)]}</small>{q.explanation && <small>{q.explanation}</small>}</div></div>; })}</div>
    <Button onClick={onBack}>Take another assessment <ArrowRight size={15} /></Button>
  </div>;
}
