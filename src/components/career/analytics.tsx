import { useMemo, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { ArrowRight, Award, BookCheck, ClipboardCheck, FileText, Flame, Mic } from 'lucide-react';
import { useCareer } from '@/lib/career-data';
import { activityDays, assessmentTrend, practiceStreak, progressTimeline, questionsSolved, readiness, skillImprovement, topicPerformance, weeklyPractice, type AnalyticsInput } from '@/lib/analytics.engine';
import { PageHeader, RequireAccount } from './shell';
import { Card, ScoreRing } from './primitives';

const axis = { fontSize: 11, fill: 'var(--muted-foreground)' };
const tip = { contentStyle: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 } };

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return <Card className="an-metric"><div className="an-metric-top"><span>{label}</span>{icon}</div><strong>{value}</strong><p>{detail}</p></Card>;
}
function ChartCard({ title, eyebrow, ready, empty, cta, to, children }: { title: string; eyebrow: string; ready: boolean; empty: string; cta: string; to: '/assessment' | '/mock-interview' | '/schedule' | '/resume'; children: ReactNode }) {
  return <Card className="an-chart"><span className="mini-eyebrow">{eyebrow}</span><h3>{title}</h3>{ready ? <div className="an-chart-body">{children}</div> : <div className="an-empty"><p>{empty}</p><Link to={to} className="text-link">{cta} <ArrowRight size={14}/></Link></div>}</Card>;
}

export function AnalyticsView() {
  const { results, answers, practiceSessions, mockInterviews, resumeAnalyses, skills } = useCareer();
  const a = useMemo(() => {
    const input: AnalyticsInput = { results, answers, practiceSessions, mockInterviews, resumeAnalyses, skills };
    const done = mockInterviews.filter(m => m.overall_score !== null);
    const resume = [...resumeAnalyses].sort((x, y) => y.created_at.localeCompare(x.created_at)).filter(r => r.overall_score !== null);
    const weekly = weeklyPractice(input);
    return {
      ready: readiness(input), solved: questionsSolved(input), streak: practiceStreak(activityDays(input)),
      assessAvg: results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : null,
      interviewAvg: done.length ? Math.round(done.reduce((s, m) => s + (m.overall_score as number), 0) / done.length) : null, interviewCount: done.length,
      resume: resume[0]?.overall_score ?? null, resumeDelta: resume.length >= 2 ? (resume[0]!.overall_score as number) - (resume[1]!.overall_score as number) : null,
      weekly, weeklyHas: weekly.some(w => w.assessments + w.interviews + w.practice > 0),
      topics: topicPerformance(input), trend: assessmentTrend(input), improvement: skillImprovement(input), timeline: progressTimeline(input),
    };
  }, [results, answers, practiceSessions, mockInterviews, resumeAnalyses, skills]);

  return <div className="page-container feature-page">
    <PageHeader eyebrow="THE BIGGER PICTURE" title="Progress analytics" description="Every number here comes from work you've actually done. Charts appear once there's enough real history to show."/>
    <RequireAccount>
      <div className="an-hero">
        <Card className="an-readiness">{a.ready.score === null ? <div className="an-empty"><strong>Readiness not measured yet</strong><p>Take an assessment, add skills or analyze your resume to get your first score.</p><Link to="/assessment" className="text-link">Take an assessment <ArrowRight size={14}/></Link></div> : <><ScoreRing value={a.ready.score} label="readiness"/><div><span className="mini-eyebrow">PLACEMENT READINESS</span><strong>{a.ready.score} / 100</strong><small>Based on {a.ready.signals} measured signal{a.ready.signals === 1 ? '' : 's'}</small></div></>}</Card>
        <div className="an-metrics">
          <Metric icon={<BookCheck size={16}/>} label="Questions solved" value={a.solved.attempted ? `${a.solved.correct}` : '—'} detail={a.solved.attempted ? `of ${a.solved.attempted} answered · ${a.solved.accuracy}% accuracy` : 'Answer assessment questions to start counting'}/>
          <Metric icon={<ClipboardCheck size={16}/>} label="Assessment average" value={a.assessAvg === null ? '—' : `${a.assessAvg}%`} detail={results.length ? `${results.length} assessment${results.length === 1 ? '' : 's'} taken` : 'No assessments yet'}/>
          <Metric icon={<Mic size={16}/>} label="Mock interviews" value={a.interviewAvg === null ? '—' : `${a.interviewAvg}`} detail={a.interviewCount ? `average of ${a.interviewCount} scored interview${a.interviewCount === 1 ? '' : 's'}` : 'Finish a mock interview to get scored'}/>
          <Metric icon={<FileText size={16}/>} label="Resume score" value={a.resume === null ? '—' : `${a.resume}`} detail={a.resume === null ? 'Upload a resume to get an estimate' : a.resumeDelta === null ? 'latest estimated score' : `${a.resumeDelta >= 0 ? '+' : ''}${a.resumeDelta} vs previous analysis`}/>
          <Metric icon={<Flame size={16}/>} label="Practice streak" value={`${a.streak.current} day${a.streak.current === 1 ? '' : 's'}`} detail={a.streak.activeDays ? `Longest ${a.streak.longest} · ${a.streak.activeDays} active day${a.streak.activeDays === 1 ? '' : 's'}` : 'Practice today to start a streak'}/>
        </div>
      </div>

      <div className="an-grid">
        <ChartCard eyebrow="LAST 8 WEEKS" title="Weekly practice" ready={a.weeklyHas} empty="No practice recorded in the last 8 weeks. Assessments, mock interviews and completed scheduled sessions all count." cta="Schedule a session" to="/schedule">
          <ResponsiveContainer width="100%" height={230}><BarChart data={a.weekly}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/><XAxis dataKey="label" tick={axis}/><YAxis allowDecimals={false} tick={axis} width={28}/><Tooltip {...tip}/><Legend wrapperStyle={{ fontSize: 11 }}/><Bar dataKey="assessments" name="Assessments" stackId="a" fill="var(--plum)"/><Bar dataKey="interviews" name="Interviews" stackId="a" fill="var(--iris)"/><Bar dataKey="practice" name="Sessions" stackId="a" fill="var(--wisteria)" radius={[3, 3, 0, 0]}/></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard eyebrow="AVERAGE SCORE" title="Topic performance" ready={a.topics.length > 0} empty="Take an assessment in any topic to see how your topics compare." cta="Take an assessment" to="/assessment">
          <ResponsiveContainer width="100%" height={Math.max(150, a.topics.length * 42)}><BarChart data={a.topics} layout="vertical" margin={{ left: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/><XAxis type="number" domain={[0, 100]} tick={axis}/><YAxis type="category" dataKey="topic" tick={axis} width={110}/><Tooltip {...tip} formatter={(v: number) => [`${v}%`, 'Average']}/><Bar dataKey="average" fill="var(--plum)" radius={[0, 3, 3, 0]}/></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard eyebrow="OVER TIME" title="Assessment trend" ready={a.trend.length >= 2} empty={a.trend.length === 1 ? 'You have one result so far. Take one more assessment to see a trend line.' : 'Take at least two assessments to see your trend.'} cta="Take an assessment" to="/assessment">
          <ResponsiveContainer width="100%" height={230}><LineChart data={a.trend}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/><XAxis dataKey="label" tick={axis}/><YAxis domain={[0, 100]} tick={axis} width={28}/><Tooltip {...tip} formatter={(v: number, _n, p) => [`${v}%`, (p as { payload: { topic: string } }).payload.topic]}/><Line type="monotone" dataKey="score" stroke="var(--plum)" strokeWidth={2} dot={{ r: 3 }}/></LineChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard eyebrow="FIRST VS LATEST" title="Skill improvement" ready={a.improvement.length > 0} empty="Retake a topic you've already attempted — improvement is measured from your first to your latest score in the same topic." cta="Retake an assessment" to="/assessment">
          <ResponsiveContainer width="100%" height={Math.max(170, a.improvement.length * 52)}><BarChart data={a.improvement} layout="vertical" margin={{ left: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/><XAxis type="number" domain={[0, 100]} tick={axis}/><YAxis type="category" dataKey="topic" tick={axis} width={110}/><Tooltip {...tip}/><Legend wrapperStyle={{ fontSize: 11 }}/><Bar dataKey="first" name="First" fill="var(--wisteria)"/><Bar dataKey="latest" name="Latest" fill="var(--plum)"/></BarChart></ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="section-header"><div><span className="mini-eyebrow">HISTORY</span><h2>Your progress</h2></div></div>
      {a.timeline.length ? <Card className="an-timeline">{a.timeline.map((e, i) => <div className="an-tl-item" key={i}><span className={`an-tl-dot an-${e.kind}`}>{e.kind === 'assessment' ? <ClipboardCheck size={13}/> : e.kind === 'interview' ? <Mic size={13}/> : e.kind === 'resume' ? <FileText size={13}/> : <Award size={13}/>}</span><div><strong>{e.title}</strong><small>{e.detail}</small></div><time>{new Date(e.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time></div>)}</Card>
        : <Card className="an-empty an-empty-wide"><strong>Your timeline is empty.</strong><p>Each assessment, mock interview, resume analysis and completed practice session will appear here as a milestone.</p><Link to="/assessment" className="text-link">Start with an assessment <ArrowRight size={14}/></Link></Card>}
    </RequireAccount>
  </div>;
}
