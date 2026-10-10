import { useState } from 'react';
import './Current.css';

export function Current() {
  const [question, setQuestion] = useState('');

  return (
    <main className="current-eightball">
      <header className="current-brand" aria-label="8ball">8BALL</header>
      <section className="current-stage" aria-label="Eight ball and question">
        <div className="current-ball" role="img" aria-label="Eight ball showing yes">
          <div className="current-window"><span>YES</span></div>
          <div className="current-band" aria-hidden="true" />
        </div>
        <label className="current-sr-only" htmlFor="current-question">Your question</label>
        <textarea
          id="current-question"
          className="current-prompt"
          aria-label="Your question"
          placeholder="Ask a question"
          rows={2}
          value={question}
          onChange={(event) => setQuestion(event.currentTarget.value)}
        />
      </section>
    </main>
  );
}
