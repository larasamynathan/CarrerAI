import { createFileRoute } from '@tanstack/react-router';
import { PlanView } from '@/components/career/views';
export const Route = createFileRoute('/_authenticated/plan')({ head: () => ({ meta: [{title:'Plan | CareerAI'},{name:'description',content:'Plan in CareerAI Placement Copilot.'},{property:'og:title',content:'Plan | CareerAI'},{property:'og:description',content:'Plan in CareerAI Placement Copilot.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}] }), component: PlanView });
