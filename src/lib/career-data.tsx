import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { useRouter } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type Task = Tables<'preparation_plans'>;
type Result = Tables<'assessment_results'>;
type Interview = Tables<'scheduled_sessions'>;
type Skill = Tables<'skills'>;
type Answer = Tables<'assessment_answers'>;
type PracticeSession = Tables<'practice_sessions'>;
type MockInterview = Tables<'mock_interviews'>;
type ResumeAnalysis = Tables<'resume_analysis'>;
type WeakArea = Tables<'weak_areas'>;
type Recommendation = Tables<'recommendations'>;
type Data = {
  user: User | null; loading: boolean; profile: Profile | null; tasks: Task[]; results: Result[]; interviews: Interview[];
  skills: Skill[]; answers: Answer[]; practiceSessions: PracticeSession[]; mockInterviews: MockInterview[];
  resumeAnalyses: ResumeAnalysis[]; weakAreas: WeakArea[]; recommendations: Recommendation[];
  refresh: () => Promise<void>; signOut: () => Promise<void>;
};
const Context = createContext<Data | null>(null);
export function useCareer() { const value = useContext(Context); if (!value) throw new Error('Career provider missing'); return value; }
export function CareerProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [practiceSessions, setPracticeSessions] = useState<PracticeSession[]>([]);
  const [mockInterviews, setMockInterviews] = useState<MockInterview[]>([]);
  const [resumeAnalyses, setResumeAnalyses] = useState<ResumeAnalysis[]>([]);
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  async function ensureProfile(u: User) {
    const existing = await supabase.from('profiles').select('*').eq('user_id', u.id).maybeSingle();
    if (existing.data) return existing.data;
    const meta = (u.user_metadata ?? {}) as { full_name?: string; name?: string };
    const created = await supabase.from('profiles').upsert({ user_id: u.id, email: u.email ?? null, full_name: meta.full_name ?? meta.name ?? '' }, { onConflict: 'user_id' }).select('*').maybeSingle();
    return created.data ?? null;
  }
  async function load(u: User) {
    const uid = u.id;
    const p = await ensureProfile(u);
    const [t, r, i, s, a, ps, mi, ra, wa, rec] = await Promise.all([
      supabase.from('preparation_plans').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('assessment_results').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('scheduled_sessions').select('*').eq('user_id', uid).order('scheduled_at', { ascending: true }),
      supabase.from('skills').select('*').eq('user_id', uid).order('updated_at', { ascending: false }),
      supabase.from('assessment_answers').select('*').eq('user_id', uid).order('answered_at', { ascending: false }),
      supabase.from('practice_sessions').select('*').eq('user_id', uid).order('started_at', { ascending: false }),
      supabase.from('mock_interviews').select('*').eq('user_id', uid).order('started_at', { ascending: false }),
      supabase.from('resume_analysis').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('weak_areas').select('*').eq('user_id', uid).eq('resolved', false).order('updated_at', { ascending: false }),
      supabase.from('recommendations').select('*').eq('user_id', uid).eq('status', 'open').order('priority', { ascending: false }),
    ]);
    setProfile(p); setTasks(t.data ?? []); setResults(r.data ?? []); setInterviews(i.data ?? []);
    setSkills(s.data ?? []); setAnswers(a.data ?? []); setPracticeSessions(ps.data ?? []); setMockInterviews(mi.data ?? []);
    setResumeAnalyses(ra.data ?? []); setWeakAreas(wa.data ?? []); setRecommendations(rec.data ?? []);
  }
  async function refresh() { if (user) await load(user); }
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setUser(data.session?.user ?? null);
      if (data.session?.user) await load(data.session.user);
      if (alive) setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'USER_UPDATED') return;
      setUser(session?.user ?? null);
      if (session?.user) { void load(session.user); }
       else { setProfile(null); setTasks([]); setResults([]); setInterviews([]); setSkills([]); setAnswers([]); setPracticeSessions([]); setMockInterviews([]); setResumeAnalyses([]); setWeakAreas([]); setRecommendations([]); void router.invalidate(); }
      setLoading(false);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);
  async function signOut() { await supabase.auth.signOut(); await router.navigate({ to: '/auth', replace: true }); }
  return <Context.Provider value={{ user, loading, profile, tasks, results, interviews, skills, answers, practiceSessions, mockInterviews, resumeAnalyses, weakAreas, recommendations, refresh, signOut }}>{children}</Context.Provider>;
}
