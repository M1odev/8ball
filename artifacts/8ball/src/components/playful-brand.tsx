import { useState } from 'react';

export function PlayfulBrand() {
  const [popping, setPopping] = useState(false);
  return (
    <header className="brand" aria-label="8Ball">
      <button type="button" className={`brand-name${popping ? ' is-popping' : ''}`}
        aria-label="Play with the 8Ball logo" data-testid="button-play-logo"
        onClick={() => {
          if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPopping(true);
        }}
        onAnimationEnd={event => {
          if (event.animationName === 'logo-pop') setPopping(false);
        }}>
        {'8Ball'.split('').map((letter, index) => (
          <span className="brand-letter" aria-hidden="true" key={index}
            style={{ animationDelay: `${index * 45}ms` }}>{letter}</span>
        ))}
      </button>
      <span className="brand-byline">Powered by Jev</span>
      <h1 className="brand-tagline">Jev online playground</h1>
    </header>
  );
}
