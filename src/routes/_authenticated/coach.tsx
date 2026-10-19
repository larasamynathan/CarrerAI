import { createFileRoute } from '@tanstack/react-router';
import { CoachChat } from '@/components/career/coach';
export const Route = createFileRoute('/_authenticated/coach')({ head: () => ({ meta: [{title:'Coach | CareerAI'},{name:'description',content:'Coach in CareerAI Placement Copilot.'},{property:'og:title',content:'Coach | CareerAI'},{property:'og:description',content:'Coach in CareerAI Placement Copilot.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}] }), component: CoachChat });
