// Flags: --expose-internals --no-warnings
'use strict';

const common = require('../common');
const { promisify } = require('util');
const delay = promisify(setTimeout);

const {
  Event,
  EventTarget,
  NodeEventTarget,
} = require('internal/event_target');

const {
  ok,
  deepStrictEqual,
  strictEqual,
  throws,
} = require('assert');

const { once } = require('events');
// The globals are defined.
ok(Event);
ok(EventTarget);

// The warning event has special behavior regarding attaching listeners
let lastWarning;
process.on('warning', (e) => {
  lastWarning = e;
});

// Utility promise for parts of the test that need to wait for eachother -
// Namely tests for warning events
let asyncTest = Promise.resolve();

// First, test Event
{
  const ev = new Event('foo');
  strictEqual(ev.type, 'foo');
  strictEqual(ev.cancelable, false);
  strictEqual(ev.defaultPrevented, false);
  strictEqual(typeof ev.timeStamp, 'number');

  // Compatibility properties with the DOM
  deepStrictEqual(ev.composedPath(), []);
  strictEqual(ev.returnValue, true);
  strictEqual(ev.bubbles, false);
  strictEqual(ev.composed, false);
  strictEqual(ev.isTrusted, false);
  strictEqual(ev.eventPhase, 0);
  strictEqual(ev.cancelBubble, false);

  // Not cancelable
  ev.preventDefault();
  strictEqual(ev.defaultPrevented, false);
}
{
  const ev = new Event('foo');
  strictEqual(ev.cancelBubble, false);
  ev.cancelBubble = true;
  strictEqual(ev.cancelBubble, true);
}
{
  const ev = new Event('foo');
  strictEqual(ev.cancelBubble, false);
  ev.stopPropagation();
  strictEqual(ev.cancelBubble, true);
}
{
  const ev = new Event('foo');
  strictEqual(ev.cancelBubble, false);
  ev.cancelBubble = 'some-truthy-value';
  strictEqual(ev.cancelBubble, true);
}
{
  // No argument behavior - throw TypeError
  throws(() => {
    new Event();
  }, TypeError);
  // Too many arguments passed behavior - ignore additional arguments
  const ev = new Event('foo', {}, {});
  strictEqual(ev.type, 'foo');
}
{
  const ev = new Event('foo', { cancelable: true });
  strictEqual(ev.type, 'foo');
  strictEqual(ev.cancelable, true);
  strictEqual(ev.defaultPrevented, false);

  ev.preventDefault();
  strictEqual(ev.defaultPrevented, true);
  throws(() => new Event(Symbol()), TypeError);
}
{
  const ev = new Event('foo');
  deepStrictEqual(Object.keys(ev), ['isTrusted']);
}
{
  const eventTarget = new EventTarget();

  const ev1 = common.mustCall(function(event) {
    strictEqual(event.type, 'foo');
    strictEqual(this, eventTarget);
    strictEqual(event.eventPhase, 2);
  }, 2);

  const ev2 = {
    handleEvent: common.mustCall(function(event) {
      strictEqual(event.type, 'foo');
      strictEqual(this, ev2);
    })
  };

  eventTarget.addEventListener('foo', ev1);
  eventTarget.addEventListener('foo', ev2, { once: true });
  ok(eventTarget.dispatchEvent(new Event('foo')));
  eventTarget.dispatchEvent(new Event('foo'));

  eventTarget.removeEventListener('foo', ev1);
  eventTarget.dispatchEvent(new Event('foo'));
}
{
  // event subclassing
  const SubEvent = class extends Event {};
  const ev = new SubEvent('foo');
  const eventTarget = new EventTarget();
  const fn = common.mustCall((event) => strictEqual(event, ev));
  eventTarget.addEventListener('foo', fn, { once: true });
  eventTarget.dispatchEvent(ev);
  const eventTarget = new EventTarget();
  // Single argument throws
  throws(() => eventTarget.addEventListener('foo'), TypeError);
  // Null events - does not throw
  eventTarget.addEventListener('foo', null);
  eventTarget.removeEventListener('foo', null);
  eventTarget.addEventListener('foo', undefined);
  eventTarget.removeEventListener('foo', undefined);
  // Strings, booleans
  throws(() => eventTarget.addEventListener('foo', 'hello'), TypeError);
  throws(() => eventTarget.addEventListener('foo', false), TypeError);
  throws(() => eventTarget.addEventListener('foo', Symbol()), TypeError);
  asyncTest = asyncTest.then(async () => {
    const eventTarget = new EventTarget();
    // Single argument throws
    throws(() => eventTarget.addEventListener('foo'), TypeError);
    // Null events - does not throw

    eventTarget.addEventListener('foo', null);
    eventTarget.removeEventListener('foo', null);

    // Warnings always happen after nextTick, so wait for a timer of 0
    await delay(0);
    strictEqual(lastWarning.name, 'AddEventListenerArgumentTypeWarning');
    strictEqual(lastWarning.target, eventTarget);
    lastWarning = null;
    eventTarget.addEventListener('foo', undefined);
    await delay(0);
    strictEqual(lastWarning.name, 'AddEventListenerArgumentTypeWarning');
    strictEqual(lastWarning.target, eventTarget);
    eventTarget.removeEventListener('foo', undefined);
    // Strings, booleans
    throws(() => eventTarget.addEventListener('foo', 'hello'), TypeError);
    throws(() => eventTarget.addEventListener('foo', false), TypeError);
    throws(() => eventTarget.addEventListener('foo', Symbol()), TypeError);
  });

}
{
  const eventTarget = new NodeEventTarget();
  strictEqual(eventTarget.listenerCount('foo'), 0);
  deepStrictEqual(eventTarget.eventNames(), []);

  const ev1 = common.mustCall(function(event) {
    strictEqual(event.type, 'foo');
    strictEqual(this, eventTarget);
  }, 2);

  const ev2 = {
    handleEvent: common.mustCall(function(event) {
      strictEqual(event.type, 'foo');
      strictEqual(this, ev2);
    })
  };

  eventTarget.addEventListener('foo', ev1);
  eventTarget.addEventListener('foo', ev2, { once: true });
  strictEqual(eventTarget.listenerCount('foo'), 2);
  ok(eventTarget.dispatchEvent(new Event('foo')));
  strictEqual(eventTarget.listenerCount('foo'), 1);
  eventTarget.dispatchEvent(new Event('foo'));

  eventTarget.removeEventListener('foo', ev1);
  strictEqual(eventTarget.listenerCount('foo'), 0);
  eventTarget.dispatchEvent(new Event('foo'));
}


{
  const eventTarget = new EventTarget();
  const event = new Event('foo', { cancelable: true });
  eventTarget.addEventListener('foo', (event) => event.preventDefault());
  ok(!eventTarget.dispatchEvent(event));
}
{
  // Adding event listeners with a boolean useCapture
  const eventTarget = new EventTarget();
  const event = new Event('foo');
  const fn = common.mustCall((event) => strictEqual(event.type, 'foo'));
  eventTarget.addEventListener('foo', fn, false);
  eventTarget.dispatchEvent(event);
}
{
  const eventTarget = new NodeEventTarget();
  strictEqual(eventTarget.listenerCount('foo'), 0);
  deepStrictEqual(eventTarget.eventNames(), []);

  const ev1 = common.mustCall((event) => {
    strictEqual(event.type, 'foo');
  }, 2);

  const ev2 = {
    handleEvent: common.mustCall((event) => {
      strictEqual(event.type, 'foo');
    })
  };

  strictEqual(eventTarget.on('foo', ev1), eventTarget);
  strictEqual(eventTarget.once('foo', ev2, { once: true }), eventTarget);
  strictEqual(eventTarget.listenerCount('foo'), 2);
  eventTarget.dispatchEvent(new Event('foo'));
  strictEqual(eventTarget.listenerCount('foo'), 1);
  eventTarget.dispatchEvent(new Event('foo'));

  strictEqual(eventTarget.off('foo', ev1), eventTarget);
  strictEqual(eventTarget.listenerCount('foo'), 0);
  eventTarget.dispatchEvent(new Event('foo'));
}

{
  const eventTarget = new NodeEventTarget();
  strictEqual(eventTarget.listenerCount('foo'), 0);
  deepStrictEqual(eventTarget.eventNames(), []);

  const ev1 = common.mustCall((event) => {
    strictEqual(event.type, 'foo');
  }, 2);

  const ev2 = {
    handleEvent: common.mustCall((event) => {
      strictEqual(event.type, 'foo');
    })
  };

  eventTarget.addListener('foo', ev1);
  eventTarget.once('foo', ev2, { once: true });
  strictEqual(eventTarget.listenerCount('foo'), 2);
  eventTarget.dispatchEvent(new Event('foo'));
  strictEqual(eventTarget.listenerCount('foo'), 1);
  eventTarget.dispatchEvent(new Event('foo'));

  eventTarget.removeListener('foo', ev1);
  strictEqual(eventTarget.listenerCount('foo'), 0);
  eventTarget.dispatchEvent(new Event('foo'));
}

{
  const eventTarget = new NodeEventTarget();
  strictEqual(eventTarget.listenerCount('foo'), 0);
  deepStrictEqual(eventTarget.eventNames(), []);

  // Won't actually be called.
  const ev1 = () => {};

  // Won't actually be called.
  const ev2 = { handleEvent() {} };

  eventTarget.addListener('foo', ev1);
  eventTarget.addEventListener('foo', ev1);
  eventTarget.once('foo', ev2, { once: true });
  eventTarget.once('foo', ev2, { once: false });
  eventTarget.on('bar', ev1);
  strictEqual(eventTarget.listenerCount('foo'), 2);
  strictEqual(eventTarget.listenerCount('bar'), 1);
  deepStrictEqual(eventTarget.eventNames(), ['foo', 'bar']);
  eventTarget.removeAllListeners('foo');
  strictEqual(eventTarget.listenerCount('foo'), 0);
  strictEqual(eventTarget.listenerCount('bar'), 1);
  deepStrictEqual(eventTarget.eventNames(), ['bar']);
  eventTarget.removeAllListeners();
  strictEqual(eventTarget.listenerCount('foo'), 0);
  strictEqual(eventTarget.listenerCount('bar'), 0);
  deepStrictEqual(eventTarget.eventNames(), []);
}

{
  const uncaughtException = common.mustCall((err, event) => {
    strictEqual(err.message, 'boom');
    strictEqual(event.type, 'foo');
  }, 4);

  // Whether or not the handler function is async or not, errors
  // are routed to uncaughtException
  process.on('error', uncaughtException);

  const eventTarget = new EventTarget();

  const ev1 = async () => { throw new Error('boom'); };
  const ev2 = () => { throw new Error('boom'); };
  const ev3 = { handleEvent() { throw new Error('boom'); } };
  const ev4 = { async handleEvent() { throw new Error('boom'); } };

  // Errors in a handler won't stop calling the others.
  eventTarget.addEventListener('foo', ev1, { once: true });
  eventTarget.addEventListener('foo', ev2, { once: true });
  eventTarget.addEventListener('foo', ev3, { once: true });
  eventTarget.addEventListener('foo', ev4, { once: true });

  eventTarget.dispatchEvent(new Event('foo'));
}

{
  const eventTarget = new EventTarget();

  // Once handler only invoked once
  const ev = common.mustCall((event) => {
    throws(() => eventTarget.dispatchEvent(new Event('foo')), {
      code: 'ERR_EVENT_RECURSION'
    });
  });

  // Errors in a handler won't stop calling the others.
  eventTarget.addEventListener('foo', ev);

  eventTarget.dispatchEvent(new Event('foo'));
}

{
  // Coercion to string works
  strictEqual((new Event(1)).type, '1');
  strictEqual((new Event(false)).type, 'false');
  strictEqual((new Event({})).type, String({}));

  const target = new EventTarget();

  [
    'foo',
    {},  // No type event
    undefined,
    1,
    false
  ].forEach((i) => {
    throws(() => target.dispatchEvent(i), {
      code: 'ERR_INVALID_ARG_TYPE'
    });
  });

  [
    'foo',
    1,
    {},  // No handleEvent function
  ].forEach((i) => {
    throws(() => target.addEventListener('foo', i), {
      code: 'ERR_INVALID_ARG_TYPE'
    });
  });

  [
    'foo',
    1,
    {},  // No handleEvent function
  ].forEach((i) => {
    throws(() => target.removeEventListener('foo', i), {
      code: 'ERR_INVALID_ARG_TYPE'
    });
  });
}

{
  const target = new EventTarget();
  once(target, 'foo').then(common.mustCall());
  target.dispatchEvent(new Event('foo'));
}

{
  asyncTest = asyncTest.then(async () => {
    const target = new NodeEventTarget();
    strictEqual(target.getMaxListeners(), NodeEventTarget.defaultMaxListeners);
    target.setMaxListeners(1);
    target.on('foo', () => {});
    target.on('foo', () => {});

    // warnings are always emitted asynchronously so wait for a tick
    await delay(0)
    ok(lastWarning instanceof Error);
    strictEqual(lastWarning.name, 'MaxListenersExceededWarning');
    strictEqual(lastWarning.target, target);
    strictEqual(lastWarning.count, 2);
    strictEqual(lastWarning.type, 'foo');
    ok(lastWarning.message.includes('2 foo listeners added to NodeEventTarget'));
  }).then(common.mustCall());
}

{
  const target = new EventTarget();
  const event = new Event('foo');
  event.stopImmediatePropagation();
  target.addEventListener('foo', common.mustNotCall());
  target.dispatchEvent(event);
}

{
  const target = new EventTarget();
  const event = new Event('foo');
  target.addEventListener('foo', common.mustCall((event) => {
    event.stopImmediatePropagation();
  }));
  target.addEventListener('foo', common.mustNotCall());
  target.dispatchEvent(event);
}

{
  const target = new EventTarget();
  const event = new Event('foo');
  target.addEventListener('foo', common.mustCall((event) => {
    event.stopImmediatePropagation();
  }));
  target.addEventListener('foo', common.mustNotCall());
  target.dispatchEvent(event);
}

{
  const target = new EventTarget();
  const event = new Event('foo');
  strictEqual(event.target, null);
  target.addEventListener('foo', common.mustCall((event) => {
    strictEqual(event.target, target);
    strictEqual(event.currentTarget, target);
    strictEqual(event.srcElement, target);
  }));
  target.dispatchEvent(event);
}

{
  const target1 = new EventTarget();
  const target2 = new EventTarget();
  const event = new Event('foo');
  target1.addEventListener('foo', common.mustCall((event) => {
    throws(() => target2.dispatchEvent(event), {
      code: 'ERR_EVENT_RECURSION'
    });
  }));
  target1.dispatchEvent(event);
}

{
  const target = new EventTarget();
  const a = common.mustCall(() => target.removeEventListener('foo', a));
  const b = common.mustCall(2);

  target.addEventListener('foo', a);
  target.addEventListener('foo', b);

  target.dispatchEvent(new Event('foo'));
  target.dispatchEvent(new Event('foo'));
}

{
  const target = new EventTarget();
  const a = common.mustCall(3);

  target.addEventListener('foo', a, { capture: true });
  target.addEventListener('foo', a, { capture: false });

  target.dispatchEvent(new Event('foo'));
  target.removeEventListener('foo', a, { capture: true });
  target.dispatchEvent(new Event('foo'));
  target.removeEventListener('foo', a, { capture: false });
  target.dispatchEvent(new Event('foo'));
}

{
  const target = new EventTarget();
  strictEqual(target.toString(), '[object EventTarget]');
  const event = new Event('');
  strictEqual(event.toString(), '[object Event]');
}
