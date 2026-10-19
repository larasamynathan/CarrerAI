import { describe, it, expect } from "vitest";
import { buildRoadmap, type RoadmapSignals } from "@/lib/roadmap.engine";
const base: RoadmapSignals = { skills: [], weakAreas: [], results: [], resumeScore: null, interviewScores: [] };
describe("roadmap", () => {
  it("30-day plan covers 4 weeks with the full curriculum", () => {
    const r = buildRoadmap(30, base);
    expect(new Set(r.map((t) => t.week))).toEqual(new Set([1, 2, 3, 4]));
    expect(r.length).toBe(18);
    expect(Math.max(...r.map((t) => t.day))).toBeLessThanOrEqual(30);
  });
  it("7-day plan has one task per day", () => {
    expect(buildRoadmap(7, base).map((t) => t.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it("weak areas become high priority and lead the 7-day plan", () => {
    const r = buildRoadmap(7, { ...base, resumeScore: 90, interviewScores: [90], weakAreas: [{ topic: "Graphs", severity: "high" }] });
    expect(r[0]?.topic).toBe("Graphs");
    expect(r[0]?.priority).toBe("high");
  });
  it("strong assessment scores lower priority", () => {
    const r = buildRoadmap(30, { ...base, results: [{ topic: "SQL", score: 95 }] });
    expect(r.find((t) => t.topic === "SQL Basics")?.priority).toBe("low");
  });
  it("is deterministic for the same signals", () => {
    expect(buildRoadmap(30, base)).toEqual(buildRoadmap(30, base));
  });
});
