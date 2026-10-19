import { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/reset-password')({
  head: () => ({ meta: [{ title: 'Reset password | CareerAI' }, { name: 'description', content: 'Choose a new password for your CareerAI account.' }, { property: 'og:title', content: 'Reset password | CareerAI' }, { property: 'og:description', content: 'Choose a new password for your CareerAI account.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes('type=recovery');
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') setReady(true); });
    supabase.auth.getSession().then(({ data: s }) => { if (s.session && isRecovery) setReady(true); else if (s.session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setMessage('Passwords do not match.'); return; }
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setMessage(error.message);
    else { setMessage('Password updated. Taking you to your dashboard…'); setTimeout(() => navigate({ to: '/', replace: true }), 1200); }
  }

  return <div className="auth-layout"><div className="auth-brand-panel"><Link to="/auth" className="brand-link"><span className="brand-mark"><span/></span><span><strong>CareerAI</strong><small>PLACEMENT COPILOT</small></span></Link><div className="auth-brand-copy"><span className="auth-kicker">THE WORK BEHIND WHAT'S NEXT</span><h1>Your next opportunity starts with a better plan.</h1><p>A focused space to build your skills, track your growth, and prepare for what matters.</p></div><div className="auth-brand-foot">CAREERAI / PLACEMENT COPILOT</div></div><div className="auth-form-panel"><div className="auth-form-wrap"><span className="auth-lock"><LockKeyhole size={20}/></span><h2>Choose a new password.</h2><p>{ready ? 'Enter and confirm your new password.' : 'Open this page from the reset link in your email.'}</p><form onSubmit={submit} className="auth-form"><label>New password<Input type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} required disabled={!ready}/></label><label>Confirm password<Input type="password" minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)} required disabled={!ready}/></label>{message && <p className="form-message" role="status">{message}</p>}<Button disabled={busy || !ready} type="submit" className="auth-submit">{busy ? 'Please wait…' : 'Update password'}<ArrowRight size={16}/></Button></form><Link to="/auth" className="auth-back">← Back to sign in</Link></div></div></div>;
}
