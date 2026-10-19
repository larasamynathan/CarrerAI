import type { ReactNode } from 'react';
import { ArrowRight, AlertCircle, LoaderCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export { Button, Card, Badge, Progress, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger };
export function ScoreRing({ value, label, size = 'normal' }: { value: number; label?: string; size?: 'normal' | 'small' }) {
  return <div className={`score-ring ${size === 'small' ? 'score-ring-small' : ''}`} style={{ '--score': `${Math.max(0, Math.min(100, value))}%` } as React.CSSProperties} aria-label={`${label ?? 'Score'}: ${value}%`}><div><strong>{value}%</strong>{label && <span>{label}</span>}</div></div>;
}
export function StatCard({ label, value, detail, icon }: { label: string; value: string | number; detail: string; icon: ReactNode }) {
  return <Card className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong className="stat-value">{value}</strong><p>{detail}</p></Card>;
}
export function RecommendationCard({ number, title, description, href, action = 'Explore' }: { number: string; title: string; description: string; href: string; action?: string }) {
  return <a href={href} className="recommendation"><span className="recommendation-number">{number}</span><span className="recommendation-body"><strong>{title}</strong><small>{description}</small></span><span className="recommendation-action">{action}<ArrowRight size={15}/></span></a>;
}
export function SkillCard({ name, score, detail }: { name: string; score: number; detail: string }) {
  return <div className="skill-row"><span><strong>{name}</strong><small>{detail}</small></span><span className="skill-meter"><Progress value={score} /><b>{score}%</b></span></div>;
}
export function Timeline({ items }: { items: { title: string; meta: string; done?: boolean }[] }) {
  return <div className="timeline">{items.map((item, index) => <div className="timeline-item" key={index}><span className={`timeline-dot ${item.done ? 'done' : ''}`}/><div><strong>{item.title}</strong><small>{item.meta}</small></div></div>)}</div>;
}
export function EmptyState({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return <div className="empty-state"><div className="empty-icon"><Plus size={20}/></div><strong>{title}</strong><p>{description}</p>{action && <Button size="sm" onClick={onAction}>{action}</Button>}</div>;
}
export function LoadingState() { return <div className="status-state"><LoaderCircle className="animate-spin" /> Loading your workspace…</div>; }
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) { return <div className="status-state text-destructive"><AlertCircle size={18}/>{message}{retry && <Button variant="outline" size="sm" onClick={retry}>Retry</Button>}</div>; }
