import { useEffect, useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { LayoutDashboard, Sparkles, FileUser, ClipboardCheck, Target, MessagesSquare, Map, CalendarDays, ChartNoAxesCombined, LibraryBig, UserRound, Settings2, Menu, X, ChevronDown, Bell, LogOut, ArrowUpRight, Sun, Moon } from 'lucide-react';
import { useEffect as useThemeEffect, useState as useThemeState } from 'react';
import { Button } from '@/components/ui/button';
import { CareerProvider, useCareer } from '@/lib/career-data';
import { LoadingState } from './primitives';

const nav = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'AI Placement Coach', path: '/coach', icon: Sparkles },
  { label: 'Resume Analyzer', path: '/resume', icon: FileUser },
  { label: 'Skill Assessment', path: '/assessment', icon: ClipboardCheck },
  { label: 'Weak Areas', path: '/weak-areas', icon: Target },
  { label: 'Mock Interview', path: '/mock-interview', icon: MessagesSquare },
  { label: 'Preparation Plan', path: '/plan', icon: Map },
  { label: 'Interview Schedule', path: '/schedule', icon: CalendarDays },
  { label: 'Progress', path: '/progress', icon: ChartNoAxesCombined },
  { label: 'Resources', path: '/resources', icon: LibraryBig },
];
const bottom = [{ label: 'Profile', path: '/profile', icon: UserRound }, { label: 'Settings', path: '/settings', icon: Settings2 }];
function ShellInner({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { user, profile, loading, signOut } = useCareer();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <LoadingState/>;
  const current = [...nav, ...bottom].find(n => n.path === location.pathname)?.label ?? 'Dashboard';
  if (location.pathname === '/auth' || location.pathname === '/reset-password') return <>{children}</>;
  return <div className="app-layout">
    {open && <div className="sidebar-scrim" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="sidebar-brand"><Link to="/" onClick={() => setOpen(false)} className="brand-link"><span className="brand-mark"><span /></span><span><strong>CareerAI</strong><small>PLACEMENT COPILOT</small></span></Link><Button variant="ghost" size="icon" className="mobile-close" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={20}/></Button></div>
      <div className="sidebar-main"><p className="nav-caption">WORKSPACE</p><nav className="sidebar-nav" aria-label="Main navigation">{nav.map(({ label, path, icon: Icon }) => <Link to={path} key={path} onClick={() => setOpen(false)} className={`nav-link ${location.pathname === path ? 'active' : ''}`}><Icon size={18} strokeWidth={1.8}/><span>{label}</span>{location.pathname === path && <span className="active-indicator" />}</Link>)}</nav></div>
      <div className="sidebar-bottom"><p className="nav-caption">ACCOUNT</p><nav className="sidebar-nav" aria-label="Account navigation">{bottom.map(({ label, path, icon: Icon }) => <Link to={path} key={path} onClick={() => setOpen(false)} className={`nav-link ${location.pathname === path ? 'active' : ''}`}><Icon size={18} strokeWidth={1.8}/><span>{label}</span></Link>)}</nav><div className="sidebar-footer"><span className="footer-signal"/> Keep building your future.</div></div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="topbar-left"><Button variant="ghost" size="icon" className="menu-toggle" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={21}/></Button><span className="breadcrumb-root">Workspace</span><span className="breadcrumb-divider">/</span><span className="breadcrumb-current">{current}</span></div><div className="topbar-right"><span className="topbar-date">YOUR PLACEMENT JOURNEY</span><span className="topbar-separator"/><ThemeToggle/><Bell size={18} className="topbar-bell"/><Link to={user ? '/profile' : '/auth'} className="user-chip"><span className="avatar-circle">{user ? (profile?.full_name || user.email || 'S').slice(0, 1).toUpperCase() : 'G'}</span><span className="user-chip-label">{user ? profile?.full_name || user.email?.split('@')[0] : 'Guest'}</span><ChevronDown size={14}/></Link></div></header>
    {loading ? <LoadingState/> : <>{!user && <div className="guest-banner"><span>Save your progress and make this workspace yours.</span><Link to="/auth">Create your free account <ArrowUpRight size={14}/></Link></div>}{children}</>}
    </main>
  </div>;
}
export function AppShell({ children }: { children: React.ReactNode }) { return <CareerProvider><ShellInner>{children}</ShellInner></CareerProvider>; }
export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) { return <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"/>{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="page-action">{action}</div>}</div>; }
export function RequireAccount({ children }: { children: React.ReactNode }) { const { user } = useCareer(); return user ? <>{children}</> : <div className="auth-required"><div className="auth-required-icon"><LogOut size={22}/></div><h2>Your workspace, your progress.</h2><p>Create an account to save your preparation and pick up where you left off.</p><Button asChild><Link to="/auth">Get started <ArrowUpRight size={16}/></Link></Button></div>; }

function ThemeToggle() {
  const [dark, setDark] = useThemeState(false);
  useThemeEffect(() => { setDark(document.documentElement.classList.contains('dark')); }, []);
  const toggle = () => { const next = !dark; setDark(next); document.documentElement.classList.toggle('dark', next); try { localStorage.setItem('careerai-theme', next ? 'dark' : 'light'); } catch { /* ignore */ } };
  return <Button variant="ghost" size="icon" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</Button>;
}
