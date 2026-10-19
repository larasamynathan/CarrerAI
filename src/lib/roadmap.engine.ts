/** Pure, deterministic roadmap builder: same student signals always produce the same plan. */
export type Priority = "high" | "medium" | "low";

export type RoadmapSignals = {
  skills: { name: string; proficiency: number }[];
  weakAreas: { topic: string; severity: string }[];
  results: { topic: string; score: number }[];
  resumeScore: number | null;
  interviewScores: number[];
};

export type RoadmapTaskDraft = {
  week: number; day: number; position: number; topic: string; category: string;
  description: string; estimated_minutes: number; priority: Priority; reason: string;
};

type Topic = { topic: string; category: string; week: number; minutes: number; description: string; match: string[] };

export const CURRICULUM: Topic[] = [
  { topic: "Java Fundamentals", category: "Java", week: 1, minutes: 90, description: "Revise OOP syntax, collections overview, exceptions and the JVM memory model.", match: ["java"] },
  { topic: "Arrays", category: "Data Structures and Algorithms", week: 1, minutes: 90, description: "Two pointers, prefix sums and sliding window; solve 5 easy and 3 medium problems.", match: ["array", "dsa", "data structure", "algorithm"] },
  { topic: "Strings", category: "Data Structures and Algorithms", week: 1, minutes: 75, description: "Palindromes, anagrams, substring search and string builder patterns.", match: ["string"] },
  { topic: "HashMap", category: "Data Structures and Algorithms", week: 1, minutes: 75, description: "Hashing internals, frequency counting and two-sum style problems.", match: ["hash", "map"] },
  { topic: "SQL Basics", category: "SQL", week: 1, minutes: 75, description: "SELECT, JOINs, GROUP BY/HAVING and subqueries with practice queries.", match: ["sql", "query"] },
  { topic: "Linked Lists", category: "Data Structures and Algorithms", week: 2, minutes: 90, description: "Reversal, cycle detection, merging and fast/slow pointer problems.", match: ["linked list", "list"] },
  { topic: "Stacks", category: "Data Structures and Algorithms", week: 2, minutes: 60, description: "Balanced brackets, monotonic stack and expression evaluation.", match: ["stack"] },
  { topic: "Queues", category: "Data Structures and Algorithms", week: 2, minutes: 60, description: "Queue, deque and priority queue applications.", match: ["queue", "heap"] },
  { topic: "DBMS", category: "DBMS", week: 2, minutes: 90, description: "Normalization, transactions, ACID, indexing and concurrency control.", match: ["dbms", "database", "normaliz", "transaction"] },
  { topic: "OOP", category: "OOP", week: 2, minutes: 75, description: "Encapsulation, inheritance, polymorphism, abstraction and SOLID with examples.", match: ["oop", "object", "polymorph", "inherit"] },
  { topic: "Trees", category: "Data Structures and Algorithms", week: 3, minutes: 120, description: "Traversals, BST operations, height/diameter and lowest common ancestor.", match: ["tree", "bst"] },
  { topic: "Graphs", category: "Data Structures and Algorithms", week: 3, minutes: 120, description: "BFS, DFS, topological sort and shortest paths.", match: ["graph", "bfs", "dfs"] },
  { topic: "Operating Systems", category: "Operating Systems", week: 3, minutes: 90, description: "Processes, threads, scheduling, deadlocks and memory management.", match: ["operating system", "os", "process", "deadlock"] },
  { topic: "Computer Networks", category: "Computer Networks", week: 3, minutes: 90, description: "OSI/TCP-IP layers, TCP vs UDP, HTTP, DNS and common interview questions.", match: ["network", "tcp", "http", "cn"] },
  { topic: "Mock Interviews", category: "Technical Interviews", week: 4, minutes: 60, description: "Take a timed mock interview and review the feedback report.", match: ["interview", "mock"] },
  { topic: "Resume Improvement", category: "Resume Preparation", week: 4, minutes: 60, description: "Apply the resume analyzer's suggestions and quantify project impact.", match: ["resume", "cv"] },
  { topic: "Aptitude", category: "Aptitude", week: 4, minutes: 75, description: "Percentages, time and work, probability and logical reasoning sets.", match: ["aptitude", "quant", "reasoning"] },
  { topic: "HR Preparation", category: "HR Interviews", week: 4, minutes: 45, description: "Prepare STAR answers for introduction, strengths, conflict and goals.", match: ["hr", "behavio"] },
];

const norm = (s: string) => s.toLowerCase();
function matches(t: Topic, text: string) {
  const x = norm(text);
  if (x === norm(t.topic) || x === norm(t.category)) return true;
  return t.match.some((m) => (m.length <= 3 ? new RegExp(`\\b${m}\\b`).test(x) : x.includes(m)));
}

/** 0 = strong, higher = needs more work. Unmeasured topics get a neutral need of 1. */
export function assessTopic(t: Topic, s: RoadmapSignals): { need: number; reason: string } {
  if (t.topic === "Resume Improvement") {
    if (s.resumeScore == null) return { need: 2, reason: "No resume analysis yet" };
    return s.resumeScore < 70 ? { need: 2, reason: `Resume score ${s.resumeScore}/100` } : { need: 0, reason: `Resume score ${s.resumeScore}/100` };
  }
  if (t.topic === "Mock Interviews") {
    if (!s.interviewScores.length) return { need: 2, reason: "No mock interview completed yet" };
    const avg = Math.round(s.interviewScores.reduce((a, b) => a + b, 0) / s.interviewScores.length);
    return avg < 60 ? { need: 2, reason: `Interview average ${avg}/100` } : avg < 75 ? { need: 1, reason: `Interview average ${avg}/100` } : { need: 0, reason: `Interview average ${avg}/100` };
  }
  const weak = s.weakAreas.find((w) => matches(t, w.topic));
  if (weak) return { need: weak.severity === "low" ? 1 : 2, reason: `Weak area: ${weak.topic} (${weak.severity})` };
  const scores = s.results.filter((r) => matches(t, r.topic)).map((r) => r.score);
  if (scores.length) {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return { need: avg < 50 ? 2 : avg < 75 ? 1 : 0, reason: `Assessment average ${avg}%` };
  }
  const skill = s.skills.find((k) => matches(t, k.name));
  if (skill) return { need: skill.proficiency <= 2 ? 2 : skill.proficiency === 3 ? 1 : 0, reason: `Self-rated skill ${skill.proficiency}/5` };
  return { need: 1, reason: "Not measured yet" };
}

const PRIORITY = ["low", "medium", "high"] as const;
const minutesFor = (base: number, need: number) => Math.round((base * ([0.6, 1, 1.4][need] ?? 1)) / 15) * 15;

export function buildRoadmap(horizon: 7 | 30, s: RoadmapSignals): RoadmapTaskDraft[] {
  const scored = CURRICULUM.map((t, i) => ({ t, i, ...assessTopic(t, s) }));
  if (horizon === 30) {
    const out: RoadmapTaskDraft[] = [];
    for (let w = 1; w <= 4; w++) {
      // Within each week, weakest topics first.
      const week = scored.filter((x) => x.t.week === w).sort((a, b) => b.need - a.need || a.i - b.i);
      const startDay = (w - 1) * 7 + 1; const span = w === 4 ? 9 : 7;
      week.forEach((x, k) => out.push({
        week: w, day: startDay + Math.floor((k * span) / week.length), position: k, topic: x.t.topic, category: x.t.category,
        description: x.t.description, estimated_minutes: minutesFor(x.t.minutes, x.need), priority: PRIORITY[x.need] ?? "medium", reason: x.reason,
      }));
    }
    return out;
  }
  // 7-day sprint: the 7 highest-need topics, one per day, preserving curriculum order on ties.
  const pick = [...scored].sort((a, b) => b.need - a.need || a.i - b.i).slice(0, 7).sort((a, b) => b.need - a.need || a.i - b.i);
  return pick.map((x, k) => ({
    week: 1, day: k + 1, position: 0, topic: x.t.topic, category: x.t.category, description: x.t.description,
    estimated_minutes: minutesFor(x.t.minutes, x.need), priority: PRIORITY[x.need] ?? "medium", reason: x.reason,
  }));
}
