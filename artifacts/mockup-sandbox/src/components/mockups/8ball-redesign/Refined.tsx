import './_group.css';
import './Refined.css';

export function Refined() {
  return (
    <main className="eightball-refined">
      <header className="refined-brand" aria-label="8ball">8BALL</header>
      <section className="refined-stage" aria-label="Eight ball">
        <div className="refined-ball" role="img" aria-label="Black eight ball with a white center and the answer yes">
          <div className="refined-window">
            <span className="refined-answer">YES</span>
          </div>
          <div className="refined-band" aria-hidden="true" />
        </div>
        <label className="refined-sr-only" htmlFor="refined-question">Your question</label>
        <textarea
          id="refined-question"
          className="refined-prompt"
          aria-label="Your question"
          placeholder="Ask a question"
          rows={2}
        />
      </section>
    </main>
  );
}
