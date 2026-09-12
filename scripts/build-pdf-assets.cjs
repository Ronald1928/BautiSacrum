const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'bautismo-backend/pdf/public');
fs.mkdirSync(path.join(output, 'fonts'), { recursive: true });
const cli = path.join(path.dirname(require.resolve('@tailwindcss/cli/package.json')), 'dist/index.mjs');
execFileSync(process.execPath, [cli, '-i', path.join(root, 'scripts/pdf-tailwind.input.css'), '-o', path.join(output, 'pdf-tailwind.css'), '--minify'], { cwd: root, stdio: 'inherit' });
for (const family of ['alex-brush', 'pt-serif']) {
  const source = path.dirname(require.resolve('@fontsource/' + family + '/package.json'));
  for (const file of fs.readdirSync(path.join(source, 'files')).filter(name => name.endsWith('.woff2'))) {
    fs.copyFileSync(path.join(source, 'files', file), path.join(output, 'fonts', file));
  }
  fs.copyFileSync(path.join(source, 'LICENSE'), path.join(output, 'fonts', family + '-LICENSE.txt'));
}
const css = ['alex-brush', 'pt-serif'].map(family => {
  const source = path.dirname(require.resolve('@fontsource/' + family + '/package.json'));
  const variants = family === 'alex-brush' ? ['400.css'] : ['400.css', '700.css', '400-italic.css', '700-italic.css'];
  return variants.map(file => fs.readFileSync(path.join(source, file), 'utf8')).join('\n');
}).join('\n').replace(/url\(\.\/files\/([^\)]+)\)/g, (_, name) => {
  if (!name.endsWith('.woff2')) return 'url(data:font/woff;base64,)';
  return 'url(data:font/woff2;base64,' + fs.readFileSync(path.join(output, 'fonts', name)).toString('base64') + ')';
});
fs.writeFileSync(path.join(output, 'pdf-fonts.css'), css);
console.log('CSS y fuentes del PDF preparados localmente.');
