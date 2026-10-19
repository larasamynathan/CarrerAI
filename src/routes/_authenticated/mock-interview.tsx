import { createFileRoute } from '@tanstack/react-router';
import { MockInterviewPage } from '@/components/career/mock-interview';
import { INTERVIEW_TYPES } from '@/lib/mock-interview.functions';
type Search = { type?: (typeof INTERVIEW_TYPES)[number] | undefined };
export const Route = createFileRoute('/_authenticated/mock-interview')({ validateSearch: (s: Record<string, unknown>): Search => (typeof s['type'] === 'string' && (INTERVIEW_TYPES as readonly string[]).includes(s['type']) ? { type: s['type'] as Search['type'] } : {}), head: () => ({ meta: [{title:'Mock Interview | CareerAI'},{name:'description',content:'Timed Technical, HR and Behavioral mock interviews with AI evaluation and a final report.'},{property:'og:title',content:'Mock Interview | CareerAI'},{property:'og:description',content:'Timed Technical, HR and Behavioral mock interviews with AI evaluation and a final report.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}] }), component: Page });
function Page() { const { type } = Route.useSearch(); return <MockInterviewPage initialType={type} />; }
