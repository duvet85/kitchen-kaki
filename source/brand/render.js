// node render.js : draws the PNGs the app uses from the SVG files in this folder (needs Playwright + Chromium)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const out = path.join(__dirname, '..', 'assets');
const jobs = [['icon-full.svg', 'icon.png', 1024], ['motif.svg', 'splash-icon.png', 1024], ['android-foreground.svg', 'android-icon-foreground.png', 1024],
  ['android-background.svg', 'android-icon-background.png', 1024], ['android-monochrome.svg', 'android-icon-monochrome.png', 1024], ['icon-full.svg', 'favicon.png', 64],
  ['logo.svg', 'logo.png', 512], ['motif.svg', 'logo-motif.png', 512]];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' });
  for (const [svg, png, size] of jobs) {
    const pg = await b.newPage({ viewport: { width: size, height: size } });
    await pg.setContent(`<body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${fs.readFileSync(path.join(__dirname, svg)).toString('base64')}" width="${size}" height="${size}"></body>`);
    await pg.screenshot({ path: path.join(out, png), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    await pg.close();
  }
  await b.close();
})();
