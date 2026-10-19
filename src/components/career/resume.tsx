import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { AlertCircle, CheckCircle2, FileText, LoaderCircle, RefreshCw, Sparkles, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCareer } from '@/lib/career-data';
import { analyzeResume, type AtsFactorOut } from '@/lib/resume.functions';
import { PageHeader } from './shell';
import { Badge, Button, Progress, ScoreRing } from './primitives';
import { Textarea } from '@/components/ui/textarea';

const ROLES = ['Software Engineer', 'Data Analyst', 'Web Developer'];
type Analysis = { id: string; created_at: string; overall_score: number | null; target_role: string | null; strengths: unknown; improvements: unknown; suggestions: unknown; keywords: unknown; missing_keywords: unknown; ats_breakdown: unknown; resume_profile_id: string };
type Parsed = { name?: string; contact?: { email?: string; phone?: string; links?: string[]; location?: string }; summary?: string; education?: string[]; skills?: string[]; projects?: string[]; experience?: string[]; certifications?: string[]; achievements?: string[] };
const list = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) {
    const { extractText: pdf, getDocumentProxy } = await import('unpdf');
    const doc = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const { text } = await pdf(doc, { mergePages: true });
    return text as string;
  }
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
  }
  if (name.endsWith('.txt')) return file.text();
  throw new Error('Please upload a PDF, DOCX or TXT file.');
}

const STAGES = ['Uploading', 'Extracting text', 'Parsing & extracting details', 'Scoring & AI feedback'];

export function ResumeAnalyzer() {
  const { user, refresh } = useCareer();
  const run = useServerFn(analyzeResume);
  const input = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState(ROLES[0]);
  const [jd, setJd] = useState('');
  const [stage, setStage] = useState(-1);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [fileName, setFileName] = useState('');

  async function loadLatest(id?: string) {
    if (!user) return;
    let q = supabase.from('resume_analysis').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
    if (id) q = supabase.from('resume_analysis').select('*').eq('id', id).limit(1);
    const { data } = await q;
    const a = (data?.[0] as Analysis | undefined) ?? null;
    setAnalysis(a);
    if (a) {
      const { data: p } = await supabase.from('resume_profiles').select('parsed_data,title').eq('id', a.resume_profile_id).maybeSingle();
      setParsed((p?.parsed_data as Parsed) ?? null); setFileName(p?.title ?? '');
      if (a.target_role) setRole(a.target_role);
    }
  }
  useEffect(() => { void loadLatest(); }, [user?.id]);

  async function analyze(profileId: string) {
    setStage(3);
    const res = await run({ data: { profileId, role, jobDescription: jd } });
    if (!res.ok) throw new Error(res.error);
    await loadLatest(res.analysisId); void refresh();
  }

  async function onFile(file: File) {
    if (!user) return;
    setError('');
    if (file.size > 10 * 1024 * 1024) { setError('Files must be under 10 MB.'); return; }
    try {
      setStage(1);
      const text = (await extractText(file)).replace(/\u0000/g, '').trim();
      if (text.length < 80) throw new Error('We could not read enough text. Scanned image PDFs are not supported — try a text-based PDF or DOCX.');
      setStage(0);
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const up = await supabase.storage.from('resumes').upload(path, file, { contentType: file.type || 'application/octet-stream' });
      if (up.error) throw new Error('Upload failed. Please try again.');
      setStage(2);
      await supabase.from('resume_profiles').update({ is_primary: false }).eq('user_id', user.id);
      const { data: prof, error: e } = await supabase.from('resume_profiles').insert({ user_id: user.id, title: file.name, file_path: path, raw_text: text.slice(0, 30000), is_primary: true }).select('id').single();
      if (e || !prof) throw new Error('Could not save your resume.');
      await analyze(prof.id);
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.'); }
    finally { setStage(-1); if (input.current) input.current.value = ''; }
  }

  async function reanalyze() {
    if (!analysis) return;
    setError('');
    try { await analyze(analysis.resume_profile_id); } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.'); } finally { setStage(-1); }
  }

  const busy = stage >= 0;
  const factors = list(analysis?.ats_breakdown) as unknown as AtsFactorOut[];

  return <div className="page-container feature-page">
    <PageHeader eyebrow="MAKE YOUR STORY COUNT" title="Resume analyzer" description="Upload your resume for an estimated ATS-style readiness score, extracted details, and specific AI feedback." />
    <div className="note-banner"><AlertCircle size={18}/><span>This is an <b>estimated resume-readiness score</b> built from the factors shown below. It is not the score of any real company’s applicant tracking system. Your file is stored privately and only you can access it.</span></div>

    <div className="ra-setup">
      <div className="ra-drop" onClick={() => !busy && input.current?.click()} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && input.current?.click()}>
        <input ref={input} type="file" accept=".pdf,.docx,.txt" hidden onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} aria-label="Upload resume"/>
        {busy ? <LoaderCircle className="animate-spin" size={26}/> : <Upload size={26}/>}
        <strong>{busy ? STAGES[stage] + '…' : 'Upload your resume'}</strong>
        <small>PDF, DOCX or TXT · up to 10 MB</small>
        {busy && <ol className="ra-stages">{STAGES.map((s, i) => <li key={s} className={i < stage ? 'done' : i === stage ? 'active' : ''}>{s}</li>)}</ol>}
      </div>
      <div className="ra-options">
        <label>Target role<select value={role} onChange={e => setRole(e.target.value)} disabled={busy}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></label>
        <label>Job description (optional)<Textarea value={jd} onChange={e => setJd(e.target.value)} rows={5} placeholder="Paste a job description to match its keywords instead of the role defaults…" disabled={busy}/></label>
      </div>
    </div>
    {error && <div className="status-state text-destructive"><AlertCircle size={18}/>{error}{analysis && <Button size="sm" variant="outline" onClick={reanalyze}>Retry</Button>}</div>}

    {!analysis && !busy && <div className="empty-state"><div className="empty-icon"><FileText size={20}/></div><strong>No resume analyzed yet</strong><p>Upload a text-based resume to see your score, strengths and missing keywords.</p></div>}

    {analysis && <div className="resume-results">
      <div className="section-header"><div><span className="mini-eyebrow">{fileName} · {new Date(analysis.created_at).toLocaleDateString()}</span><h2>Your resume report</h2></div><Button variant="outline" size="sm" onClick={reanalyze} disabled={busy}><RefreshCw size={14}/> Analyze again</Button></div>
      <div className="match-summary"><ScoreRing value={analysis.overall_score ?? 0} label="estimated"/><div><h3>ATS-style score for {analysis.target_role}</h3><p>A weighted estimate across seven measurable factors. Improve the lowest factors first.</p></div></div>

      <div className="ra-factors">{factors.map(f => <div key={f.name} className="ra-factor"><div><strong>{f.name}</strong><small>{f.detail}</small></div><span className="skill-meter"><Progress value={f.score}/><b>{f.score}%</b></span><em>{f.weight}% weight</em></div>)}</div>

      <div className="ra-grid">
        <Block title="Strengths" icon={<CheckCircle2 size={16}/>} items={list(analysis.strengths)}/>
        <Block title="Potential improvements" icon={<AlertCircle size={16}/>} items={list(analysis.improvements)}/>
      </div>
      <div className="keyword-section"><strong>Missing keywords</strong><div>{list(analysis.missing_keywords).map(w => <Badge key={w} variant="outline">{w}</Badge>)}{!list(analysis.missing_keywords).length && <p>No missing keywords found.</p>}</div><p className="subtle-note">Only add keywords that genuinely reflect your skills.</p></div>
      <div className="ra-suggestions"><span className="mini-eyebrow"><Sparkles size={12}/> AI SUGGESTIONS</span>{list(analysis.suggestions).map((s, i) => <p key={i}><b>{String(i + 1).padStart(2, '0')}</b>{s}</p>)}</div>

      {parsed && <div className="ra-extracted"><h2>Extracted information</h2>
        <dl>
          <Field k="Name" v={parsed.name}/>
          <Field k="Contact" v={[parsed.contact?.email, parsed.contact?.phone, parsed.contact?.location, ...(parsed.contact?.links ?? [])].filter(Boolean).join(' · ')}/>
          <Field k="Summary" v={parsed.summary}/>
          {(['education', 'skills', 'projects', 'experience', 'certifications', 'achievements'] as const).map(k => <Field key={k} k={k.charAt(0).toUpperCase() + k.slice(1)} v={parsed[k]}/>)}
        </dl></div>}
    </div>}
  </div>;
}

function Block({ title, icon, items }: { title: string; icon: React.ReactNode; items: string[] }) {
  return <div className="ra-block"><strong>{icon}{title}</strong>{items.length ? <ul>{items.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p>Nothing noted.</p>}</div>;
}
function Field({ k, v }: { k: string; v?: string | string[] | undefined }) {
  const empty = !v || (Array.isArray(v) && !v.length);
  return <><dt>{k}</dt><dd>{empty ? <span className="ra-missing">Not found</span> : Array.isArray(v) ? <ul>{v.map((x, i) => <li key={i}>{x}</li>)}</ul> : v}</dd></>;
}
