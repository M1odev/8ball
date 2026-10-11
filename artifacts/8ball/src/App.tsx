import { type KeyboardEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { toJevPrompt, getJevResponse, getDecisionAccess, type DecisionAccess, type DecisionResult } from '@/lib/sendPrompts';
import { AccessPanel } from '@/components/access-panel';
import { ErrorBoundary } from '@/components/error-boundary';
import { EightBallArt } from '@/components/eight-ball-art';
import { PlayfulBall } from '@/components/playful-ball';
import { PlayfulBrand } from '@/components/playful-brand';
import { InfoTip } from '@/components/info-tip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const MAX_CHARS = 4000;
type Stage = 'idle' | 'preparing' | 'asking' | 'done' | 'error';
const pct = (n: number) => Math.round(n * 1000) / 10;

function EightBall() {
  const [input, setInput] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [access, setAccess] = useState<DecisionAccess | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState('');
  const refreshAccess = useCallback(async (signal?: AbortSignal) => {
    setAccessLoading(true);
    try {
      const current = await getDecisionAccess(signal);
      if (!signal?.aborted) { setAccess(current); setAccessError(''); }
    } catch (e) {
      if (!signal?.aborted) {
        setAccess(null);
        setAccessError(e instanceof Error ? e.message : 'Could not check your allowance.');
      }
    } finally { if (!signal?.aborted) setAccessLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void refreshAccess(controller.signal);
    return () => controller.abort();
  }, [refreshAccess]);
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const composingRef = useRef(false);
  useEffect(() => () => abortRef.current?.abort(), []);
  const busy = stage === 'preparing' || stage === 'asking';
  const accessBlocked = !apiKey && (accessLoading || !access || access.remaining === 0 || access.networkLimited);

  const submit = async () => {
    if (busyRef.current) return;
    if (accessBlocked) {
      setError('Free access is unavailable. Add your Hack Club key to continue.');
      setStage('error');
      return;
    }
    const q = input.trim();
    setResult(null);
    if (!q || q.length > MAX_CHARS) {
      setError(!q ? 'Type a question first.' : `Keep it under ${MAX_CHARS} characters.`);
      setStage('error');
      return;
    }
    busyRef.current = true;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError(''); setStage('preparing');
    const requestKey = apiKey || undefined;
    try {
      const prepared = await toJevPrompt(q, ctrl.signal, requestKey);
      if (ctrl.signal.aborted) return;
      setStage('asking');
      const answer = await getJevResponse(prepared, ctrl.signal, requestKey);
      if (ctrl.signal.aborted) return;
      setResult(answer); setStage('done');
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
      setStage('error');
    } finally {
      busyRef.current = false;
      if (!ctrl.signal.aborted) void refreshAccess();
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !composingRef.current && !e.nativeEvent.isComposing) {
      e.preventDefault(); void submit();
    }
  };
  const orbText = busy ? '...' : result?.answer ?? '8';
  const rounds = result?.researchRounds ?? 0;
  const isChoiceAnswer = !busy && result?.type === 'choice';
  const status = stage === 'preparing' ? 'Preparing context…'
    : stage === 'asking' ? 'Asking Jev…'
    : stage === 'error' ? error
    : result ? result.type === 'noul'
      ? `${result.answer} · ${pct(result.probability!)}% probability of yes`
      : result.answer : '';

  return (
    <main className="page-shell">
      <PlayfulBrand />
      <section className={`main-stage${result ? ' has-result' : ''}`} aria-label="Ask a question">
        <div className={`orb${busy ? ' is-busy' : ''}`}>
          <PlayfulBall label={`Eight ball: ${result?.answer ?? (busy ? 'thinking' : 'waiting for a question')}`}>
          <EightBallArt />
          <span
            className={`orb-answer${!result && !busy ? ' is-eight' : ''}${isChoiceAnswer ? ' is-choice' : ''}`}
            style={isChoiceAnswer ? { fontSize: `clamp(4px, ${Math.min(5, 28 / Math.sqrt(Math.max(1, orbText.length)))}cqw, 16px)` } : undefined}
            aria-hidden="true"
          >{orbText}</span>
          </PlayfulBall>
        </div>
        <div className={`readout${result ? ' is-in' : ''}`} key={result ? 'r' : 'e'}>
          <p className={`status${stage === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite">{status}</p>
          {result?.question && (
            <div className="asked-row">
              <p className="asked">{result.question}</p>
              <InfoTip label="About this question">This is the question sent to Jev — prepared from your input with added context, not your exact words.</InfoTip>
            </div>
          )}
          {rounds > 0 && <p className="rounds">{rounds} {rounds === 1 ? 'round' : 'rounds'} of research done</p>}
          {!!result?.options.length && (
            <ul className="bars" aria-label="Option weights">
              {result.options.map(option => {
                const weight = pct(option.weight);
                return (
                  <li key={option.key} className={`bar${option.label === result.answer ? ' is-chosen' : ''}`}>
                    <div className="bar-head">
                      <span className="bar-label">{option.label}</span>
                      <span className="bar-pct">{weight}%</span>
                    </div>
                    <div className="bar-track" role="meter" aria-label={option.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={weight}>
                      <div className="bar-fill" style={{ transform: `scaleX(${option.weight})` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="prompt-area">
        <form className="prompt-frame" onSubmit={e => { e.preventDefault(); void submit(); }}>
          <label className="sr-only" htmlFor="question">Your question</label>
          <div className="prompt-content">
            <textarea id="question" className="prompt" data-testid="input-question" placeholder="Ask a question" rows={2}
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown}
              onCompositionStart={() => { composingRef.current = true; }}
              onCompositionEnd={() => { composingRef.current = false; }}
              aria-invalid={input.length > MAX_CHARS || undefined} aria-describedby="char-count" />
            <button className="prompt-send" type="submit" aria-label={stage === 'error' ? 'Retry question' : 'Send question'} disabled={busy || accessBlocked}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3M3 8l5-5 5 5" /></svg>
            </button>
          </div>
          <div id="char-count" className={`char-count${input.length > MAX_CHARS ? ' is-over' : ''}`}>
            {input.length > MAX_CHARS * .8 ? `${input.length} / ${MAX_CHARS}` : ''}
          </div>
        </form>
        <AccessPanel access={access} loading={accessLoading} error={accessError}
          apiKey={apiKey} onKeyChange={setApiKey} busy={busy}
          onRetry={() => { void refreshAccess(); }} />
        </div>
      </section>
      <section className="desktop-faq" aria-labelledby="faq-title">
        <h2 id="faq-title">FAQ</h2>
        <div className="faq-grid">
          <article className="faq-item" data-testid="faq-jev">
            <h3>Can I try Jev online?</h3>
            <p>Yes. 8Ball is an independent Jev playground you can use in your browser. Jev is a <b>system one</b> AI model that gives yes-or-no answers or picks from multiple-choice options.</p>
          </article>
          <article className="faq-item" data-testid="faq-process">
            <h3>How does it work?</h3>
            <p>Claude turns your question into a clear prompt for Jev because Jev cannot reason deeply. When useful, it can add context with a round of web research.</p>
          </article>
          <article className="faq-item" data-testid="faq-results">
            <h3>How should I read the result?</h3>
            <p>For choices, the bars show Jev’s relative weighting for each option. Yes-or-no answers include an estimated probability of yes.</p>
          </article>
          <article className="faq-item" data-testid="faq-usage">
            <h3>Is this Jev playground free?</h3>
            <p>8Ball doesn’t bill you: each browser gets 3 free questions total, with no reset. A question counts when processing starts, even if it fails. Free use is also capped at 12 questions per shared network each day.</p>
          </article>
          <article className="faq-item" data-testid="faq-hack-club">
            <h3>Is 8Ball an official Jev or Hack Club site?</h3>
            <p>No. 8Ball is an independent project, not an official Jev site. It is not made, operated, or endorsed by, or officially affiliated with, Hack Club. Hack Club is a nonprofit coding community for teens; 8Ball uses its AI API. <a href="https://hackclub.com/" target="_blank" rel="noreferrer">About Hack Club</a> · <a href="https://ai.hackclub.com/" target="_blank" rel="noreferrer">Hack Club AI</a></p>
          </article>
          <article className="faq-item" data-testid="faq-keys">
            <h3>What happens when I use my own key?</h3>
            <p>You can continue after using the included questions. Your key is sent to Hack Club AI for processing and kept only in this tab. Hack Club AI sets its own eligibility and usage terms.</p>
          </article>
        </div>
      </section>
    </main>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
export default function App({ ssrPath }: { ssrPath?: string }) {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')} ssrPath={ssrPath}>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={EightBall} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </WouterRouter>
  );
}
