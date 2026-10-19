import { describe, it, expect } from 'vitest';
import { practiceStreak, skillImprovement, assessmentTrend, questionsSolved, type AnalyticsInput } from '@/lib/analytics.engine';
const base: AnalyticsInput = { results: [], answers: [], practiceSessions: [], mockInterviews: [], resumeAnalyses: [], skills: [] };
const r = (topic: string, score: number, d: string) => ({ id: d + topic, topic, score, correct: 0, total: 5, created_at: d });
describe('analytics', () => {
  it('counts a streak ending yesterday', () => { expect(practiceStreak(new Set(['2026-10-11','2026-10-12','2026-10-13']), new Date('2026-10-14T05:00:00Z')).current).toBe(3); });
  it('breaks streak after a missed day', () => { expect(practiceStreak(new Set(['2026-10-11']), new Date('2026-10-14T05:00:00Z')).current).toBe(0); });
  it('improvement needs two attempts in a topic', () => {
    const out = skillImprovement({ ...base, results: [r('SQL', 40, '2026-10-01'), r('SQL', 80, '2026-10-05'), r('OS', 60, '2026-10-02')] });
    expect(out).toEqual([{ topic: 'SQL', first: 40, latest: 80, change: 40 }]);
  });
  it('no fabricated history with no data', () => { expect(assessmentTrend(base)).toEqual([]); expect(questionsSolved(base).accuracy).toBeNull(); });
});
