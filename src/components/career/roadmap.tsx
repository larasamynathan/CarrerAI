import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, Clock3, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useCareer } from '@/lib/career-data';
import { buildRoadmap, type RoadmapSignals } from '@/lib/roadmap.engine';
import { Button, Badge, Progress, ErrorState } from './primitives';

type Task = Tables<'roadmap_tasks'>;
type Horizon = 7 | 30;

function fmt(min: number) { const h = Math.floor(min / 60), m = min % 60; return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`; }

export function RoadmapPanel() {
  const { user, skills, weakAreas, results, resumeAnalyses, mockInterviews, loading } = useCareer();
  const [horizon, setHorizon] = useState<Horizon>(7);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const signals = useCallback((): RoadmapSignals => ({
    skills: skills.map((s) => ({ name: s.name, proficiency: s.proficiency })),
    weakAreas: weakAreas.map((w) => ({ topic: w.topic, severity: w.severity })),
    results: results.map((r) => ({ topic: r.topic, score: r.score })),
    resumeScore: resumeAnalyses[0]?.overall_score ?? null,
    interviewScores: mockInterviews.filter((m) => m.status === 'completed' && m.overall_score != null).map((m) => m.overall_score as number),
  }), [skills, weakAreas, results, resumeAnalyses, mockInterviews]);

  const generate = useCallback(async (replace: boolean) => {
    if (!user) return;
    setBusy(true); setError('');
    if (replace) {
      const del = await supabase.from('roadmaps').delete().eq('user_id', user.id).eq('horizon_days', horizon);
      if (del.error) { setError(del.error.message); setBusy(false); return; }
    }
    const s = signals();
    const rm = await supabase.from('roadmaps').insert({ user_id: user.id, horizon_days: horizon, inputs: s }).select('id,created_at').single();
    if (rm.error) {
      // Another tab/render already built this plan: show the saved one instead of a duplicate.
      if (rm.error.code === '23505') {
        const ex = await supabase.from('roadmaps').select('id,created_at').eq('user_id', user.id).eq('horizon_days', horizon).single();
        const t = ex.data ? await supabase.from('roadmap_tasks').select('*').eq('roadmap_id', ex.data.id).order('day').order('position') : null;
        setTasks(t?.data ?? []); setCreatedAt(ex.data?.created_at ?? null); setBusy(false); return;
      }
      setError(rm.error.message); setBusy(false); return;
    }
    const rows = buildRoadmap(horizon, s).map((t) => ({ ...t, roadmap_id: rm.data.id, user_id: user.id }));
    const ins = await supabase.from('roadmap_tasks').insert(rows).select('*').order('day').order('position');
    setBusy(false);
    if (ins.error) { setError(ins.error.message); return; }
    setTasks(ins.data); setCreatedAt(rm.data.created_at);
  }, [user, horizon, signals]);

  useEffect(() => {
    if (!user || loading) return;
    let alive = true;
    setTasks(null);
    (async () => {
      const rm = await supabase.from('roadmaps').select('id,created_at').eq('user_id', user.id).eq('horizon_days', horizon).maybeSingle();
      if (!alive) return;
      if (rm.error) { setError(rm.error.message); setTasks([]); return; }
      if (!rm.data) { await generate(false); return; }
      const t = await supabase.from('roadmap_tasks').select('*').eq('roadmap_id', rm.data.id).order('day').order('position');
      if (!alive) return;
      if (t.error) setError(t.error.message);
      setTasks(t.data ?? []); setCreatedAt(rm.data.created_at);
    })();
    return () => { alive = false; };
    // generate intentionally excluded: only re-run when the plan type or account changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, horizon, loading]);

  async function toggle(task: Task) {
    const completed = !task.completed;
    setTasks((ts) => ts?.map((t) => (t.id === task.id ? { ...t, completed } : t)) ?? null);
    const { error } = await supabase.from('roadmap_tasks').update({ completed, completed_at: completed ? new Date().toISOString() : null }).eq('id', task.id);
    if (error) { setError(error.message); setTasks((ts) => ts?.map((t) => (t.id === task.id ? { ...t, completed: !completed } : t)) ?? null); }
  }

  const list = tasks ?? [];
  const done = list.filter((t) => t.completed).length;
  const groups = horizon === 30
    ? [1, 2, 3, 4].map((w) => ({ label: `Week ${w}`, items: list.filter((t) => t.week === w) }))
    : list.map((t) => ({ label: `Day ${t.day}`, items: [t] }));

  return (
    <div className="roadmap">
      <div className="section-header">
        <div><span className="mini-eyebrow">PERSONALIZED ROADMAP</span><h2>Placement preparation roadmap</h2></div>
        <div className="roadmap-actions">
          <Button variant={horizon === 7 ? 'default' : 'outline'} onClick={() => setHorizon(7)}>7-day plan</Button>
          <Button variant={horizon === 30 ? 'default' : 'outline'} onClick={() => setHorizon(30)}>30-day plan</Button>
          <Button variant="ghost" disabled={busy || !tasks} onClick={() => { if (confirm('Rebuild this plan from your latest progress? Completed ticks on this plan will be cleared.')) void generate(true); }}><RefreshCw size={15} /> Rebuild</Button>
        </div>
      </div>
      {error && <ErrorState message={error} />}
      {tasks === null || busy ? <p className="muted-small">Building your plan from your skills, weak areas, scores, resume and interviews…</p> : (
        <>
          <div className="summary-strip">
            <div><span>{horizon}-DAY PROGRESS</span><strong>{done} <small>/ {list.length} tasks</small></strong></div>
            <Progress value={list.length ? (done / list.length) * 100 : 0} />
            <span>{createdAt ? `Built ${new Date(createdAt).toLocaleDateString()}` : ''}</span>
          </div>
          {groups.map((g) => g.items.length > 0 && (
            <div key={g.label} className="roadmap-group">
              <h3 className="mini-eyebrow">{g.label.toUpperCase()}</h3>
              <div className="list-panel">
                {g.items.map((t) => (
                  <div className="task-line" key={t.id}>
                    <Button variant="ghost" size="icon" onClick={() => toggle(t)} aria-label={t.completed ? 'Mark incomplete' : 'Mark complete'}>{t.completed ? <CheckCircle2 className="text-success" /> : <Circle />}</Button>
                    <div className="task-detail">
                      <strong className={t.completed ? 'completed' : ''}>{t.topic}</strong>
                      <small>{t.description}</small>
                      <small>{horizon === 30 ? `Day ${t.day} · ` : ''}{t.reason}</small>
                    </div>
                    <div className="roadmap-meta">
                      <Badge variant={t.priority === 'high' ? 'default' : 'outline'}>{t.priority} priority</Badge>
                      <small><Clock3 size={13} /> {fmt(t.estimated_minutes)}</small>
                      <small>{t.completed ? 'Done' : 'To do'}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
