import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'ava';
import posthtml from 'posthtml';
import plugin from '../lib/picture-srcset.js';

const __dirname = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:)/, '$1'));
const fixtures = path.join(__dirname, 'fixtures');

async function compare(t, name) {
  const source = readFileSync(path.join(fixtures, `${name}.html`), 'utf8');
  const expected = readFileSync(path.join(fixtures, `${name}.expected.html`), 'utf8');
  const { html } = await posthtml([plugin()]).process(source);
  t.deepEqual(html, expected);
}

test('basic', async t => {
  await compare(t, 'basic');
});
