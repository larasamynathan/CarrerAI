import { createFileRoute } from '@tanstack/react-router';
import { ProfileView } from '@/components/career/views';
export const Route = createFileRoute('/_authenticated/profile')({ head: () => ({ meta: [{title:'Profile | CareerAI'},{name:'description',content:'Profile in CareerAI Placement Copilot.'},{property:'og:title',content:'Profile | CareerAI'},{property:'og:description',content:'Profile in CareerAI Placement Copilot.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}] }), component: ProfileView });
