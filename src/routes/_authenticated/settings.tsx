import { createFileRoute } from '@tanstack/react-router';
import { SettingsView } from '@/components/career/views';
export const Route = createFileRoute('/_authenticated/settings')({ head: () => ({ meta: [{title:'Settings | CareerAI'},{name:'description',content:'Settings in CareerAI Placement Copilot.'},{property:'og:title',content:'Settings | CareerAI'},{property:'og:description',content:'Settings in CareerAI Placement Copilot.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}] }), component: SettingsView });
