/** @jest-environment node */
import { execFileSync } from 'node:child_process';
import path from 'node:path';

it('keeps Expo Router query parsing compatible with the patched decoder', () => {
  const script = `
    const assert = require('node:assert/strict');
    const routerEntry = require.resolve('expo-router');
    const queryEntry = require.resolve('query-string', { paths: [routerEntry] });
    const queryString = require(queryEntry);
    assert.deepEqual(queryString.parse('?task=one%20two&task=three').task, ['one two', 'three']);
    assert.equal(queryString.stringify({ task: ['one two', 'three'] }), 'task=one%20two&task=three');
  `;
  execFileSync(process.execPath, ['-e', script], { cwd: path.resolve(__dirname, '..') });
});
