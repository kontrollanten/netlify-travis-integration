import test from 'ava';
import sinon from 'sinon';
import mockRequire from 'mock-require';

const postSpy = sinon.spy();
mockRequire('request', {
  post: postSpy,
});
const signatureVerifierSpy = sinon.stub({
  verify: () => true,
});
mockRequire('./travis-signature-verifier', signatureVerifierSpy);

const { handler: ghStatusManager } = require('./gh-status-manager');

const callback = sinon.spy();

test.beforeEach(() => {
  callback.reset();
  postSpy.reset();
  signatureVerifierSpy.verify.reset();
  signatureVerifierSpy.verify.callsFake((_event, _callback) => _callback());
});

test('handler verifies the POST request', (t) => {
  const event = {
    headers: {},
    body: '{}',
  };

  ghStatusManager(event, undefined, callback);
  t.is(signatureVerifierSpy.verify.calledOnce, true);
});

test('handler doesn\'t create a POST request upon verify status is `error`', (t) => {
  signatureVerifierSpy.verify.callsFake((_event, _callback) => _callback({ status: 'error' }));
  const event = {
    headers: {},
    body: JSON.stringify({ status_message: 'Fixed' }),
  };

  ghStatusManager(event, undefined, callback);
  t.is(postSpy.calledOnce, false);
});

test('handler creates a POST request', (t) => {
  t.plan(4);
  const repoSlug = 'super/netlify-travis-proxy';
  const commit = 'swedish-hacker-association';
  const context = 'netlify-travis-proxy';
  // eslint-disable-next-line camelcase
  const target_url = 'https://travis-ci.org/build/1337';
  const event = {
    headers: { 'Travis-Repo-Slug': repoSlug },
    body: JSON.stringify({
      status_message: 'Passed', commit, build_url: target_url, context,
    }),
  };

  ghStatusManager(event, undefined, callback);

  t.is(postSpy.calledOnce, true);
  t.is(postSpy.getCall(0).args[0].url, `https://api.github.com/repos/${repoSlug}/statuses/${commit}`);
  const { state, ...postBody } = postSpy.getCall(0).args[0].body;
  t.deepEqual(postBody, {
    target_url,
    context,
  });
  t.is(callback.calledOnce, true);
});

test('handler creates a POST request with state `success`  when receiving status `Passed`', (t) => {
  const event = {
    headers: {},
    body: JSON.stringify({
      status_message: 'Passed',
    }),
  };

  ghStatusManager(event, undefined, callback);

  t.deepEqual(postSpy.getCall(0).args[0].body.state, 'success');
});

test('handler creates a POST request with state `success`  when receiving status `Fixed`', (t) => {
  const event = {
    headers: {},
    body: JSON.stringify({ status_message: 'Fixed' }),
  };

  ghStatusManager(event, undefined, callback);

  t.deepEqual(postSpy.getCall(0).args[0].body.state, 'success');
});

test('handler creates a POST request with state `failure`  when receiving status `Broken`', (t) => {
  const event = {
    headers: {},
    body: JSON.stringify({ status_message: 'Broken' }),
  };

  ghStatusManager(event, undefined, callback);

  t.deepEqual(postSpy.getCall(0).args[0].body.state, 'failure');
});

test('handler creates a POST request with state `failure`  when receiving status `Failed`', (t) => {
  const event = {
    headers: {},
    body: JSON.stringify({ status_message: 'Failed' }),
  };

  ghStatusManager(event, undefined, callback);

  t.deepEqual(postSpy.getCall(0).args[0].body.state, 'failure');
});

test('handler creates a POST request with state `failure`  when receiving status `Still Failing`', (t) => {
  const event = {
    headers: {},
    body: JSON.stringify({ status_message: 'Still Failing' }),
  };

  ghStatusManager(event, undefined, callback);

  t.deepEqual(postSpy.getCall(0).args[0].body.state, 'failure');
});

test('handler creates a POST request with state `failure`  when receiving status `Canceled`', (t) => {
  const event = {
    headers: {},
    body: JSON.stringify({ status_message: 'Canceled' }),
  };

  ghStatusManager(event, undefined, callback);

  t.deepEqual(postSpy.getCall(0).args[0].body.state, 'failure');
});

test('handler creates a POST request with state `error`  when receiving status `Errored`', (t) => {
  const event = {
    headers: {},
    body: JSON.stringify({ status_message: 'Errored' }),
  };

  ghStatusManager(event, undefined, callback);

  t.deepEqual(postSpy.getCall(0).args[0].body.state, 'error');
});

test('handler creates a POST request with state `pending`  when receiving status `Pending`', (t) => {
  const event = {
    headers: {},
    body: JSON.stringify({ status_message: 'Pending' }),
  };
  signatureVerifierSpy.verify.callsFake((_event, _callback) => _callback());

  ghStatusManager(event, undefined, callback);

  t.deepEqual(postSpy.getCall(0).args[0].body.state, 'pending');
});

test('handler logs when an unknown status is received', (t) => {
  console.error = sinon.spy();
  const event = {
    headers: {},
    body: JSON.stringify({ status_message: 'You dont even know me' }),
  };
  signatureVerifierSpy.verify.callsFake((_event, _callback) => _callback());

  ghStatusManager(event, undefined, callback);

  t.is(console.error.calledOnce, true);
});

test('handler wont do any POST request when an unknown status is received', (t) => {
  const event = {
    headers: {},
    body: JSON.stringify({ status_message: 'You dont even know me' }),
  };

  ghStatusManager(event, undefined, callback);

  t.is(postSpy.calledOnce, false);
});
