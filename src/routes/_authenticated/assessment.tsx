import { createFileRoute } from '@tanstack/react-router';
import { SkillAssessment } from '@/components/career/assessment';
import { ASSESSMENT_TOPICS } from '@/lib/assessment.functions';
type Search = { topic?: string };
export const Route = createFileRoute('/_authenticated/assessment')({ validateSearch: (s: Record<string, unknown>): Search => (typeof s['topic'] === 'string' && (ASSESSMENT_TOPICS as readonly string[]).includes(s['topic']) ? { topic: s['topic'] } : {}), head: () => ({ meta: [{title:'Skill Assessment | CareerAI'},{name:'description',content:'Timed placement skill assessments with topic-wise scores in CareerAI.'},{property:'og:title',content:'Skill Assessment | CareerAI'},{property:'og:description',content:'Timed placement skill assessments with topic-wise scores in CareerAI.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}] }), component: AssessmentPage });
function AssessmentPage() { const { topic } = Route.useSearch(); return <SkillAssessment initialTopic={topic} />; }
