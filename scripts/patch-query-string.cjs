'use strict';

const fs = require('node:fs');
const path = require('node:path');

const routerEntry = require.resolve('expo-router');
const queryEntry = require.resolve('query-string', { paths: [routerEntry] });
const queryPackage = require(
  require.resolve('query-string/package.json', { paths: [routerEntry] }),
);
const decoderEntry = require.resolve('decode-uri-component', { paths: [queryEntry] });
const decoderPackage = JSON.parse(
  fs.readFileSync(path.join(path.dirname(decoderEntry), 'package.json'), 'utf8'),
);

if (queryPackage.version !== '7.1.3' || decoderPackage.version !== '0.5.0') {
  throw new Error(
    'Review the query-string compatibility patch before changing dependency versions.',
  );
}

const original = "const decodeComponent = require('decode-uri-component');";
const patched = "const decodeComponent = require('decode-uri-component').default;";
const source = fs.readFileSync(queryEntry, 'utf8');

if (source.includes(patched)) {
  process.exit(0);
}
if (!source.includes(original)) {
  throw new Error('The query-string decoder import changed. Review the compatibility patch.');
}

fs.writeFileSync(queryEntry, source.replace(original, patched));
