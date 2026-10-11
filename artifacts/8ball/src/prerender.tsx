import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { renderToString } from 'react-dom/server';
import App from './App';

// Render the actual initial UI at build time, not different text for crawlers.
// Effects don't run here: no visitor cookies, API keys, or AI calls enter the HTML.
const indexPath = fileURLToPath(new URL('../public/index.html', import.meta.url));
const template = await readFile(indexPath, 'utf8');
const marker = '<div id="root"></div>';
if (!template.includes(marker)) throw new Error('Missing root element in the HTML template.');
const markup = renderToString(<App ssrPath="/" />);
if (!markup.includes('Jev online playground')) throw new Error('The homepage did not render during prerendering.');
await writeFile(indexPath, template.replace(marker, () => `<div id="root">${markup}</div>`));
console.log('Prerendered the 8Ball homepage for visitors and search engines.');
