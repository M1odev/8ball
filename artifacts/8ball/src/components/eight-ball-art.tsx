// A 96-cell grid keeps the circular silhouette readable while exposing
// deliberate, medium-sized pixel steps at the app's display size.
function pixelCircle(radius: number, centerX = 48, centerY = 48) {
  const rows: string[] = [];
  for (let y = 0; y < 96; y += 1) {
    const distance = y + 0.5 - centerY;
    if (Math.abs(distance) >= radius) continue;
    const halfWidth = Math.sqrt(radius * radius - distance * distance);
    const left = Math.ceil(centerX - halfWidth - 0.5);
    const right = Math.floor(centerX + halfWidth - 0.5) + 1;
    rows.push(`M${left} ${y}h${right - left}v1H${left}z`);
  }
  return rows.join('');
}

const silhouette = pixelCircle(46);
const highlight = pixelCircle(44);
const shadedBody = pixelCircle(43, 50, 50);
const windowPath = pixelCircle(23);
const bandClip = pixelCircle(45);

export function EightBallArt() {
  return (
    <svg className="orb-art" viewBox="0 0 96 96" shapeRendering="crispEdges" aria-hidden="true">
      <defs>
        <clipPath id="eightball-band-clip"><path d={bandClip} /></clipPath>
      </defs>
      <path d={silhouette} fill="#050505" />
      <path d={highlight} fill="#242424" />
      <path d={shadedBody} fill="#050505" />
      <path d={windowPath} fill="#fff" />
      <rect x="0" y="41" width="96" height="14" fill="#fff" clipPath="url(#eightball-band-clip)" />
    </svg>
  );
}
