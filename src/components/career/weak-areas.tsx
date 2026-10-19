import { useCallback, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { ArrowRight, ChevronDown, LoaderCircle, Minus, RefreshCw, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { useCareer } from '@/lib/career-data';
import { refreshWeakAreas } from '@/lib/weak-areas.functions';
import { ASSESSMENT_TOPICS } from '@/lib/assessment.functions';
import type { TopicInsight } from '@/lib/weak-areas.engine';
import { PageHeader, RequireAccount } from './shell';
import { Badge, Button, Card, EmptyState, ErrorState, Progress } from './primitives';

const TrendIcon = ({ t }: { t: TopicInsight['trend'] }) => t === 'Improving' ? <TrendingUp size={15} /> : t === 'Declining' ? <TrendingDown size={15} /> : t === 'New' ? <Sparkles size={15} /> : <Minus size={15} />;
const tone = (a: TopicInsight['attention']) => a === 'High Attention' ? 'wa-high' : a === 'Needs Improvement' ? 'wa-mid' : 'wa-ok';

export function WeakAreasPage() {
  const { refresh } = useCareer();
  const run = useServerFn(refreshWeakAreas);
  const [items, setItems] = useState<TopicInsight[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try { const r = await run(); setItems(r.insights); if (r.error) setError(r.error); else void refresh(); }
    catch { setError('Your weak areas could not be updated right now.'); setItems((x) => x ?? []); }
    setBusy(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const counts = { high: items?.filter((i) => i.attention === 'High Attention').length ?? 0, mid: items?.filter((i) => i.attention === 'Needs Improvement').length ?? 0, ok: items?.filter((i) => i.attention === 'On Track').length ?? 0 };
  return <div className="page-container feature-page">
    <PageHeader eyebrow="FOCUS WHERE IT COUNTS" title="Weak areas" description="Topics ranked by how much practice they need, based on your assessments, practice sessions and mock interviews." action={<Button variant="outline" onClick={load} disabled={busy}>{busy ? <LoaderCircle className="animate-spin" size={15} /> : <RefreshCw size={15} />} Update</Button>} />
    <RequireAccount>
      {error && <ErrorState message={error} retry={load} />}
      {items === null ? <div className="status-state"><LoaderCircle className="animate-spin" /> Reviewing your performance…</div>
        : !items.length ? <EmptyState title="No performance data yet." description="Take an assessment and your topic-by-topic focus areas will appear here." action="Take an assessment" onAction={() => window.location.assign('/assessment')} />
        : <>
          <div className="as-summary wa-summary">
            <div><span>High attention</span><strong>{counts.high}</strong></div>
            <div><span>Needs improvement</span><strong>{counts.mid}</strong></div>
            <div><span>On track</span><strong>{counts.ok}</strong></div>
          </div>
          <div className="wa-list">{items.map((t) => <WeakCard key={t.topic} t={t} />)}</div>
          <p className="subtle-note">These indicators reflect your recorded practice results only. They are study guidance, not a judgement of your overall ability.</p>
        </>}
    </RequireAccount>
  </div>;
}

function WeakCard({ t }: { t: TopicInsight }) {
  const [open, setOpen] = useState(false);
  const practicable = (ASSESSMENT_TOPICS as readonly string[]).includes(t.topic);
  return <Card className={`wa-card ${tone(t.attention)}`}>
    <div className="wa-head">
      <div><h3>{t.topic}</h3><small>{t.attempts} attempt{t.attempts === 1 ? '' : 's'} · last on {new Date(t.lastActivity).toLocaleDateString()}</small></div>
      <Badge variant="outline" className="wa-badge">{t.attention}</Badge>
    </div>
    <div className="wa-score"><strong>{t.score}%</strong><Progress value={t.score} /><span className="wa-trend"><TrendIcon t={t.trend} /> {t.trend}</span></div>
    <div className="wa-body">
      <div><span className="mini-eyebrow">REASON</span><p>{t.reason}</p></div>
      <div><span className="mini-eyebrow">RECOMMENDED</span><p>{t.action}</p></div>
    </div>
    <div className="wa-foot">
      <button type="button" className="wa-why" aria-expanded={open} onClick={() => setOpen(!open)}>Why am I seeing this? <ChevronDown size={14} className={open ? 'rotate-180' : ''} /></button>
      {practicable ? <Button asChild size="sm"><Link to="/assessment" search={{ topic: t.topic }}>Start Practice <ArrowRight size={14} /></Link></Button>
        : <Button asChild size="sm" variant="outline"><Link to="/coach">Practise with the coach <ArrowRight size={14} /></Link></Button>}
    </div>
    {open && <ul className="wa-signals">{t.signals.map((s) => <li key={s}>{s}</li>)}<li>Attention levels: below 50% (or below 60% and falling) is High Attention; below 70%, uneven scores or a falling trend is Needs Improvement; otherwise On Track. Hard tests count a little more and easy ones a little less.</li></ul>}
  </Card>;
}
