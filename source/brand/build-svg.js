// node brand/build-svg.js : writes the SVG artwork (original pot mascot, badge, icons, intro decor). Then run render.js for the PNGs.
const fs = require('fs'), path = require('path');
const T = '#DC4426', T2 = '#C23216', BASIL = '#1E4D38', HONEY = '#F2B33D', INK = '#2A1A12', CREAM = '#FFFDF8', SAGE = '#9DB88F';
/** The mascot: a winking tomato-red pot with a chef hat. 1024 box, art roughly x 150..874, y 130..890. `mono` makes a one-colour silhouette with the face cut out. */
const mascot = (mono) => {
  const f = (c) => (mono ? '#000' : c);
  const body = `<path d="M262 420 H762 C800 590 778 760 676 836 C628 868 396 868 348 836 C246 760 224 590 262 420 Z" fill="${mono ? '#000' : 'url(#pot)'}"/>`;
  const rim = `<rect x="232" y="372" width="560" height="68" rx="34" fill="${f(T2)}"/>`;
  const handles = `<rect x="140" y="498" width="116" height="46" rx="23" fill="${f(BASIL)}"/><rect x="768" y="498" width="116" height="46" rx="23" fill="${f(BASIL)}"/>`;
  const feet = `<ellipse cx="410" cy="872" rx="62" ry="26" fill="${f(BASIL)}"/><ellipse cx="614" cy="872" rx="62" ry="26" fill="${f(BASIL)}"/>`;
  const hat = `<g fill="${f(CREAM)}" ${mono ? '' : `stroke="#E5D8BF" stroke-width="7"`}>
      <circle cx="396" cy="258" r="74"/><circle cx="512" cy="212" r="92"/><circle cx="628" cy="258" r="74"/>
      <rect x="352" y="262" width="320" height="108" rx="22"/></g>
    ${mono ? '' : `<rect x="352" y="336" width="320" height="34" rx="12" fill="${HONEY}"/>`}`;
  const leaf = mono ? '' : `<g><path d="M700 196 C740 150 800 150 826 176 C792 216 736 220 700 196 Z" fill="${SAGE}"/><path d="M706 194 C746 186 788 180 818 178" stroke="#6F8F63" stroke-width="6" fill="none" stroke-linecap="round"/></g>`;
  const shine = mono ? '' : `<path d="M300 480 C284 580 296 680 340 750" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="22" stroke-linecap="round"/>`;
  const face = `
    <ellipse cx="418" cy="570" rx="31" ry="40" fill="${mono ? '#fff' : INK}"/>${mono ? '' : `<circle cx="428" cy="554" r="11" fill="#fff"/>`}
    <path d="M574 578 Q606 536 640 578" fill="none" stroke="${mono ? '#fff' : INK}" stroke-width="15" stroke-linecap="round"/>
    <path d="M436 636 Q512 744 588 636 Z" fill="${mono ? '#fff' : INK}" stroke="${mono ? '#fff' : INK}" stroke-width="12" stroke-linejoin="round"/>
    ${mono ? '' : `<clipPath id="mouth"><path d="M436 636 Q512 744 588 636 Z"/></clipPath><ellipse cx="512" cy="712" rx="48" ry="26" fill="#F2877B" clip-path="url(#mouth)"/>`}
    ${mono ? '' : `<circle cx="352" cy="632" r="30" fill="#FF9A7F" opacity="0.75"/><circle cx="672" cy="632" r="30" fill="#FF9A7F" opacity="0.75"/>`}`;
  if (mono) return `<mask id="m"><rect width="1024" height="1024" fill="#000"/><g fill="#fff">${handles}${feet}${rim}${body}${hat}</g><g>${face}</g></mask><rect width="1024" height="1024" fill="#000" mask="url(#m)"/>`.replace(/<g fill="#fff">([\s\S]*?)<\/g><g>/, (m, a) => `<g>${a.replace(/fill="#000"/g, 'fill="#fff"')}</g><g>`).replace(/<ellipse cx="418"[^>]*fill="#fff"/, (m) => m.replace('fill="#fff"', 'fill="#000"')).replace(/<path d="M574[^>]*stroke="#fff"/, (m) => m.replace('stroke="#fff"', 'stroke="#000"')).replace(/<path d="M436[^>]*/, (m) => m.replace(/#fff/g, '#000'));
  return `<defs><linearGradient id="pot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EA5A36"/><stop offset="1" stop-color="${T2}"/></linearGradient></defs>${handles}${feet}${body}${shine}${rim}${hat}${leaf}${face}`;
};
const wrap = (inner, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${extra}${inner}</svg>\n`;
const at = (g, s) => `<g transform="translate(${512 - 512 * s} ${520 - 520 * s}) scale(${s})">${g}</g>`;
const honeyBg = `<defs><radialGradient id="hb" cx="0.5" cy="0.38" r="0.75"><stop offset="0" stop-color="#FFD679"/><stop offset="1" stop-color="#EDA21F"/></radialGradient></defs>`;
const out = (n, s) => fs.writeFileSync(path.join(__dirname, n), s);
out('motif.svg', wrap(mascot(false)));
out('logo.svg', wrap(`${honeyBg}<circle cx="512" cy="512" r="508" fill="url(#hb)"/><circle cx="512" cy="512" r="470" fill="none" stroke="#FFF3CF" stroke-width="16"/>${at(mascot(false), 0.92)}`));
out('icon-full.svg', wrap(`${honeyBg}<rect width="1024" height="1024" fill="url(#hb)"/><circle cx="512" cy="512" r="440" fill="none" stroke="#FFF3CF" stroke-width="14"/>${at(mascot(false), 0.88)}`));
out('android-background.svg', wrap(`${honeyBg}<rect width="1024" height="1024" fill="url(#hb)"/><circle cx="512" cy="512" r="420" fill="none" stroke="#FFF3CF" stroke-width="14"/>`));
out('android-foreground.svg', wrap(at(mascot(false), 0.58)));
out('android-monochrome.svg', wrap(at(mascot(true), 0.58)));
// intro decor: tomato, garlic, herb, spoon, spatula, whisk around the edges of a 1080 x 1920 screen
const tomato = `<circle r="46" fill="#E5472B"/><path d="M-22 -40 L0 -26 L22 -40 L10 -18 L0 -22 L-10 -18 Z" fill="#5E8F4F"/><ellipse cx="-16" cy="-12" rx="9" ry="13" fill="#fff" opacity="0.35"/>`;
const garlic = `<path d="M0 -52 C10 -30 52 -20 46 20 C40 52 -40 52 -46 20 C-52 -20 -10 -30 0 -52 Z" fill="#FFF6E8" stroke="#E3D3B8" stroke-width="5"/><path d="M0 -50 V40 M-22 -22 C-30 6 -24 30 -14 44 M22 -22 C30 6 24 30 14 44" stroke="#E3D3B8" stroke-width="4" fill="none"/>`;
const herb = `<path d="M0 60 C-4 20 -4 -20 0 -60" stroke="#5E8F4F" stroke-width="8" fill="none" stroke-linecap="round"/>${[-40, -12, 18].map((y, i) => `<path d="M0 ${y} C${i % 2 ? 40 : -40} ${y - 24} ${i % 2 ? 44 : -44} ${y + 6} 0 ${y + 10} Z" fill="${SAGE}"/>`).join('')}`;
const spoon = `<ellipse cx="0" cy="-48" rx="24" ry="34" fill="#C98B4E"/><rect x="-8" y="-20" width="16" height="96" rx="8" fill="#B07638"/>`;
const spatula = `<rect x="-26" y="-60" width="52" height="64" rx="10" fill="${HONEY}"/><rect x="-7" y="0" width="14" height="76" rx="7" fill="#C98B4E"/><path d="M-12 -52 V-14 M0 -52 V-14 M12 -52 V-14" stroke="#D99A22" stroke-width="4"/>`;
const whisk = `<g fill="none" stroke="#8A8F93" stroke-width="5"><ellipse cx="0" cy="-30" rx="12" ry="44"/><ellipse cx="0" cy="-30" rx="28" ry="44"/><ellipse cx="0" cy="-30" rx="40" ry="42"/></g><rect x="-8" y="10" width="16" height="64" rx="8" fill="#C98B4E"/>`;
const items = [[tomato, 120, 110, 1.4, -10], [garlic, 950, 120, 1.3, 14], [herb, 80, 820, 1.5, -22], [spoon, 990, 700, 1.4, 24], [whisk, 110, 1330, 1.4, 18], [spatula, 960, 1260, 1.3, -18], [tomato, 900, 1700, 1.3, 20], [herb, 150, 1760, 1.4, 28], [garlic, 520, 1850, 1.0, -12], [tomato, 980, 380, 0.8, 0]];
out('splash-decor.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">${items.map(([g, x, y, s, r]) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})" opacity="0.95">${g}</g>`).join('')}</svg>\n`);

// single floating-ingredient icons for empty states and headers (transparent, 128 box)
const one = (n, g) => out(`decor-${n}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-64 -64 128 128" width="128" height="128">${g}</svg>\n`);
one('tomato', tomato); one('garlic', garlic); one('herb', herb); one('spoon', `<g transform="rotate(35)">${spoon}</g>`); one('whisk', whisk); one('spatula', spatula);
