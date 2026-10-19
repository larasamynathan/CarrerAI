import { useEffect, useState } from 'react';
export function greetingFor(d: Date): string { const h = d.getHours(); return h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : 'Good evening'; }
export function useGreeting(): string {
  const [g, setG] = useState('Hello');
  useEffect(() => { const tick = () => setG(greetingFor(new Date())); tick(); const id = setInterval(tick, 60_000); return () => clearInterval(id); }, []);
  return g;
}
