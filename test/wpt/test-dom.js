'use strict';

// Flags: --expose-internals

require('../common');
const { WPTRunner } = require('../common/wpt');

const runner = new WPTRunner('dom/events');

const { EventTarget } = require('internal/event_target');

globalThis.document = {
  createElement() {
    return new EventTarget();
  }
}
globalThis.window = new EventTarget();
// Copy global descriptors from the global object
runner.copyGlobalsFromObject(global, ['Event', 'EventTarget', 'document', 'window']);

runner.runJsTests();
