import { useState } from 'react';
import type { DecisionAccess } from '@/lib/sendPrompts';

type Props = {
  access: DecisionAccess | null;
  loading: boolean;
  error: string;
  apiKey: string;
  onKeyChange: (key: string) => void;
  onRetry: () => void;
  busy: boolean;
};

export function AccessPanel({ access, loading, error, apiKey, onKeyChange, onRetry, busy }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [keyError, setKeyError] = useState('');
  const save = () => {
    const key = draft.trim();
    if (!/^[A-Za-z0-9._~-]{8,512}$/.test(key)) {
      setKeyError('Enter a Hack Club AI key without spaces (8–512 characters).');
      return;
    }
    onKeyChange(key); setDraft(''); setKeyError(''); setOpen(false);
  };
  const summary = apiKey ? 'Using your key'
    : loading ? 'Checking free allowance…'
    : error ? error
    : access?.networkLimited ? 'Free access limited on this network today'
    : access ? `${access.remaining} of ${access.limit} free questions left` : 'Free allowance unavailable';

  return (
    <div className="access-panel">
      <div className="access-summary">
        <span data-testid="text-free-allowance" role="status">{summary}</span>
        <button type="button" className="access-link" data-testid="button-toggle-key"
          aria-expanded={open} aria-controls="key-settings" disabled={busy}
          onClick={() => { setOpen(!open); setDraft(''); setKeyError(''); }}>
          {open ? 'Close' : apiKey ? 'Key settings' : 'Use your own key'}
        </button>
        {!apiKey && error && <button type="button" className="access-link" disabled={busy || loading}
          data-testid="button-retry-access" onClick={onRetry}>Retry</button>}
      </div>
      {!apiKey && access?.remaining === 0 && <p className="access-note">Your free trial is used up. Add your key to keep asking.</p>}
      {open && <div className="key-settings" id="key-settings">
        <label htmlFor="visitor-key">Your Hack Club AI key</label>
        <p className="access-note" id="key-help">
          Used for Claude, web research, and Jev through our server. Kept only in this tab’s memory,
          never saved or logged. Reloading clears it. Your provider’s limits apply.
        </p>
        <div className="key-entry">
          <input id="visitor-key" data-testid="input-visitor-key" type="password"
            autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={512}
            placeholder={apiKey ? 'Paste a replacement key' : 'Paste your key'}
            value={draft} disabled={busy} aria-describedby={`key-help${keyError ? ' key-error' : ''}`}
            aria-invalid={!!keyError}
            onChange={event => { setDraft(event.target.value); setKeyError(''); }}
            onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); save(); } }} />
          <button type="button" data-testid="button-save-key" disabled={busy || !draft.trim()} onClick={save}>Use key</button>
        </div>
        {keyError && <p id="key-error" className="access-note" role="alert">{keyError}</p>}
        {apiKey && <button type="button" className="access-link" data-testid="button-remove-key"
          disabled={busy} onClick={() => { onKeyChange(''); setDraft(''); setKeyError(''); }}>Remove key</button>}
        <p className="access-note">Keys are checked on your next question. Invalid keys never fall back to the app’s free credits.</p>
      </div>}
      {!apiKey && <p className="access-note">3 free questions, no reset. Attempts count when processing starts. Network limits also apply.</p>}
    </div>
  );
}
