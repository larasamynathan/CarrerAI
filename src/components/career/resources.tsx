import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Circle, Clock3, ExternalLink, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useCareer } from '@/lib/career-data';
import { PageHeader, RequireAccount } from './shell';
import { Badge, Button, EmptyState, ErrorState, LoadingState, Progress } from './primitives';
import { Input } from '@/components/ui/input';

export const RESOURCE_CATEGORIES = ['DSA', 'Java', 'Python', 'SQL', 'DBMS', 'OS', 'Computer Networks', 'OOP', 'Aptitude', 'Technical Interview', 'HR Interview', 'Resume'] as const;
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const;
type Resource = Tables<'resources'>;
const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m} min`);

export function filterResources(list: Resource[], q: string, category: string, difficulty: string, status: string, done: Set<string>) {
  const needle = q.trim().toLowerCase();
  return list.filter(r =>
    (!needle || `${r.title} ${r.description ?? ''} ${r.category} ${r.source_name ?? ''}`.toLowerCase().includes(needle)) &&
    (category === 'All' || r.category === category) &&
    (difficulty === 'All' || r.difficulty === difficulty) &&
    (status === 'All' || (status === 'Completed') === done.has(r.id)));
}

export function ResourcesLibrary() {
  const { user } = useCareer();
  const [items, setItems] = useState<Resource[] | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(''); const [category, setCategory] = useState('All'); const [difficulty, setDifficulty] = useState('All'); const [status, setStatus] = useState('All');

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    const [r, p] = await Promise.all([
      supabase.from('resources').select('*').order('category').order('estimated_minutes'),
      supabase.from('resource_progress').select('resource_id').eq('user_id', user.id),
    ]);
    if (r.error || p.error) { setError('Could not load the resource library.'); return; }
    const order = (c: string) => RESOURCE_CATEGORIES.indexOf(c as never);
    const rank = (d: string) => DIFFICULTIES.indexOf(d as never);
    setItems([...(r.data ?? [])].sort((a, b) => order(a.category) - order(b.category) || rank(a.difficulty) - rank(b.difficulty)));
    setDone(new Set((p.data ?? []).map(x => x.resource_id)));
  }, [user]);
  useEffect(() => { void load(); }, [load]);

  async function toggle(id: string) {
    if (!user) return;
    const was = done.has(id);
    const next = new Set(done); was ? next.delete(id) : next.add(id); setDone(next);
    const res = was
      ? await supabase.from('resource_progress').delete().eq('user_id', user.id).eq('resource_id', id)
      : await supabase.from('resource_progress').upsert({ user_id: user.id, resource_id: id }, { onConflict: 'user_id,resource_id' });
    if (res.error) { setDone(done); setError('Could not save your progress. Please try again.'); }
  }

  const filtered = useMemo(() => filterResources(items ?? [], q, category, difficulty, status, done), [items, q, category, difficulty, status, done]);
  const total = items?.length ?? 0;
  const completed = items?.filter(r => done.has(r.id)).length ?? 0;

  return <div className="page-container feature-page">
    <PageHeader eyebrow="LEARN WITH INTENTION" title="Resource library" description="Curated, attributed study references for every placement topic. Mark what you finish to track your coverage."/>
    <RequireAccount>
      {error && <ErrorState message={error} retry={load}/>}
      {items === null ? <LoadingState/> : <>
        <div className="summary-strip"><div><span>LIBRARY COVERAGE</span><strong>{completed} <small>/ {total} completed</small></strong></div><Progress value={total ? completed / total * 100 : 0}/><span>{total ? Math.round(completed / total * 100) : 0}% done</span></div>
        <div className="res-filters">
          <div className="resource-search"><Search size={18}/><Input placeholder="Search titles, topics or sources" value={q} onChange={e => setQ(e.target.value)} aria-label="Search resources"/></div>
          <select aria-label="Category" value={category} onChange={e => setCategory(e.target.value)}><option>All</option>{RESOURCE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
          <select aria-label="Difficulty" value={difficulty} onChange={e => setDifficulty(e.target.value)}><option>All</option>{DIFFICULTIES.map(d => <option key={d}>{d}</option>)}</select>
          <select aria-label="Status" value={status} onChange={e => setStatus(e.target.value)}><option>All</option><option>Completed</option><option>Not completed</option></select>
        </div>
        <div className="res-chips">{['All', ...RESOURCE_CATEGORIES].map(c => <button key={c} className={`res-chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>)}</div>
        {filtered.length ? <div className="resources-grid">{filtered.map(r => {
          const isDone = done.has(r.id); const internal = !!r.url?.startsWith('/');
          return <div className={`resource-item res-card ${isDone ? 'is-done' : ''}`} key={r.id}>
            <div className="res-top"><div className="resource-icon"><BookOpen size={21}/></div><Badge variant="outline">{r.category}</Badge><Badge variant="secondary" className={`res-diff res-${r.difficulty.toLowerCase()}`}>{r.difficulty}</Badge></div>
            <h3>{r.title}</h3><p>{r.description}</p>
            <div className="res-meta"><span><Clock3 size={13}/> {fmt(r.estimated_minutes)}</span><span>{r.resource_type}</span>{r.source_name && <span>Source: {r.source_name}</span>}</div>
            <div className="res-actions">
              {r.url && <a href={r.url} {...(internal ? {} : { target: '_blank', rel: 'noreferrer' })} className="text-link">{internal ? 'Open in CareerAI' : 'Open resource'} <ExternalLink size={13}/></a>}
              <Button size="sm" variant={isDone ? 'secondary' : 'outline'} onClick={() => toggle(r.id)} aria-pressed={isDone}>{isDone ? <CheckCircle2 size={15} className="text-success"/> : <Circle size={15}/>}{isDone ? 'Completed' : 'Mark complete'}</Button>
            </div>
          </div>;
        })}</div> : <EmptyState title="Nothing matched your filters." description="Try another keyword, category or difficulty." action="Clear filters" onAction={() => { setQ(''); setCategory('All'); setDifficulty('All'); setStatus('All'); }}/>}
        <p className="subtle-note">Summaries are written by CareerAI. Each card links to the original publisher, who owns that content.</p>
      </>}
    </RequireAccount>
  </div>;
}
