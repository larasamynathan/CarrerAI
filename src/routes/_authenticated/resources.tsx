import { createFileRoute } from '@tanstack/react-router';
import { ResourcesLibrary } from '@/components/career/resources';
const d = 'Search and filter curated placement resources for DSA, Java, SQL, OS, networks, aptitude, interviews and resumes, and track what you complete.';
export const Route = createFileRoute('/_authenticated/resources')({ head: () => ({ meta: [{title:'Resource library | CareerAI'},{name:'description',content:d},{property:'og:title',content:'Resource library | CareerAI'},{property:'og:description',content:d},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}] }), component: ResourcesLibrary });
