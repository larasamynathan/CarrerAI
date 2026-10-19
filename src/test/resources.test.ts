import { describe, it, expect } from 'vitest';
import { filterResources } from '@/components/career/resources';
const mk = (id: string, category: string, difficulty: string, title: string) => ({ id, category, difficulty, title, description: '', url: null, resource_type: 'Guide', estimated_minutes: 30, source_name: null, created_at: '' });
const list = [mk('1','SQL','Beginner','Joins'), mk('2','OS','Advanced','Deadlocks'), mk('3','SQL','Advanced','Window functions')] as never[];
describe('resource filters', () => {
  it('filters by category and difficulty', () => { expect(filterResources(list,'','SQL','Advanced','All',new Set()).map((r: {id:string}) => r.id)).toEqual(['3']); });
  it('filters by completed status', () => { expect(filterResources(list,'','All','All','Completed',new Set(['2'])).map((r: {id:string}) => r.id)).toEqual(['2']); });
  it('searches titles', () => { expect(filterResources(list,'dead','All','All','All',new Set()).length).toBe(1); });
});
