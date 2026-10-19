import { describe, it, expect } from 'vitest';
import { greetingFor } from '@/lib/greeting';
const at = (h: number, m = 0) => new Date(2026, 0, 1, h, m);
describe('greetingFor', () => {
  it('morning 5:00–11:59', () => { expect(greetingFor(at(5))).toBe('Good morning'); expect(greetingFor(at(11, 59))).toBe('Good morning'); });
  it('afternoon 12:00–16:59', () => { expect(greetingFor(at(12))).toBe('Good afternoon'); expect(greetingFor(at(16, 59))).toBe('Good afternoon'); });
  it('evening 17:00–4:59', () => { expect(greetingFor(at(17))).toBe('Good evening'); expect(greetingFor(at(4, 59))).toBe('Good evening'); });
});
