
'use strict';
const common = require('../common');
const { strictEqual, throws }= require('assert');
const { from } = require('path');

strictEqual(from('/Users/node/dev'), '/Users/node/dev');
strictEqual(from('file:///Users/node/dev'), '/Users/node/dev');
strictEqual(from(new URL('file:///Users/node/dev')), '/Users/node/dev');
strictEqual(from('file://localhost/etc/fstab'), '/etc/fstab');
// Examples from file rfc https://datatracker.ietf.org/doc/html/rfc8089
strictEqual(from('file:///path/to/file'), '/path/to/file');
if (common.isWindows) {
    strictEqual(from('file:///c:/foo.txt'), 'c:/foo.txt');
}
// URL instance but not with the file scheme
throws(
    () => from(new URL('http:///Users/node/dev')), 
    { code: 'ERR_INVALID_URL_SCHEME' },
);