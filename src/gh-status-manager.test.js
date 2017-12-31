const test = require('ava');
const sinon = require('sinon');
const mockRequire = require('mock-require');

const postSpy = sinon.spy();
mockRequire('request', {
  post: postSpy,
});
const signatureVerifierSpy = sinon.stub({
  verify: () => true,
});
mockRequire('./travis-signature-verifier', signatureVerifierSpy);
const qsStub = sinon.stub({
  parse: () => true,
});
mockRequire('qs', qsStub);
const travisBuildInfoStub = sinon.stub({
  get: () => true,
});
mockRequire('./travis-build-info', travisBuildInfoStub);

const { handler: ghStatusManager } = require('./gh-status-manager');

const callback = sinon.spy();
sinon.stub(console, 'error');
sinon.stub(console, 'info');

test.beforeEach(() => {
  callback.reset();
  postSpy.reset();
  signatureVerifierSpy.verify.reset();
  signatureVerifierSpy.verify.callsFake((sign, payload, _callback) => _callback());
  qsStub.parse.reset();
  qsStub.parse.callsFake(payload => ({ payload }));
  travisBuildInfoStub.get.reset();
  travisBuildInfoStub.get.callsFake((settings, cb) => cb(false, { stages: [{ name: 'e2e' }] }));

  console.error.reset();
});

test('handler verifies the POST request', (t) => {
  t.plan(3);
  const signature = 'i-saw-the-sign';
  const payload = JSON.stringify({ body: 'shop', status_message: 'Passed' });
  const event = {
    headers: {
      Signature: signature,
    },
    body: payload,
  };

  ghStatusManager(event, undefined, callback);
  t.is(signatureVerifierSpy.verify.calledOnce, true);
  t.is(signatureVerifierSpy.verify.getCall(0).args[0], signature);
  t.deepEqual(signatureVerifierSpy.verify.getCall(0).args[1], payload);
});

test('handler returns callback if request verification return error status `error`', (t) => {
  t.plan(2);
  signatureVerifierSpy.verify.callsFake((sign, payload, _callback) => _callback({ status: 'error' }));
  const event = {
    headers: {},
    body: JSON.stringify({ status_message: 'Fixed' }),
  };

  ghStatusManager(event, undefined, callback);
  t.is(callback.calledOnce, true);
  t.is(travisBuildInfoStub.get.calledOnce, false);
});

test('handler checks the build info', (t) => {
  t.plan(2);
  const id = 'build-id';
  const event = {
    headers: {},
    body: JSON.stringify({ id, status_message: 'Fixed' }),
  };

  ghStatusManager(event, undefined, callback);
  t.is(travisBuildInfoStub.get.calledOnce, true);
  t.is(travisBuildInfoStub.get.lastCall.args[0], id);
});

test('handler logs error and returns callback if fetching build fails', (t) => {
  t.plan(2);
  const error = new Error('fetch failed');
  travisBuildInfoStub.get.callsFake((settings, cb) => cb(error));
  const event = {
    headers: {},
    body: JSON.stringify({ status_message: 'Fixed' }),
  };

  ghStatusManager(event, undefined, callback);
  t.is(callback.calledOnce, true);
  t.is(console.error.lastCall.args[0], error);
});

test('handler returns callback if build doesn\'t contain e2e stage', (t) => {
  t.plan(2);
  travisBuildInfoStub.get.callsFake((settings, cb) => cb(false, { stages: [] }));
  const id = 'build-id';
  const event = {
    headers: {},
    body: JSON.stringify({ id, status_message: 'Fixed' }),
  };

  ghStatusManager(event, undefined, callback);
  t.is(callback.calledOnce, true);
  t.is(postSpy.calledOnce, false);
});

test('handler creates a POST request to accurate URL and with correct body', (t) => {
  t.plan(4);
  const repoSlug = 'super/netlify-travis-proxy';
  const context = 'netlify-travis-proxy';
  /* eslint-disable camelcase  */
  const head_commit = 'swedish-hacker-association';
  const target_url = 'https://travis-ci.org/build/1337';
  const event = {
    headers: { 'Travis-Repo-Slug': repoSlug },
    body: JSON.stringify({
      status_message: 'Passed', head_commit, build_url: target_url, context,
    }),
  };

  ghStatusManager(event, undefined, callback);

  t.is(postSpy.calledOnce, true);
  t.is(postSpy.getCall(0).args[0].url, `https://api.github.com/repos/${repoSlug}/statuses/${head_commit}`);
  const postBody = postSpy.getCall(0).args[0].body;
  t.deepEqual(Object.keys(postBody)
    .filter(key => key !== 'state')
    .reduce((output, key) => Object.assign(output, { [key]: postBody[key] }), {}), {
    target_url,
    context,
  });
  t.is(postSpy.getCall(0).args[0].json, true);
});

test('handler creates a POST request with accurate headers', (t) => {
  const event = {
    headers: {},
    body: JSON.stringify({
      status_message: 'Passed',
    }),
  };
  const token = 'token no 7';
  process.env.GITHUB_OAUTH_TOKEN = token;

  ghStatusManager(event, undefined, callback);

  t.deepEqual(postSpy.getCall(0).args[0].headers, {
    'User-Agent': 'netlify-travis-proxy',
    Authorization: `token ${token}`,
  });
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

  ghStatusManager(event, undefined, callback);

  t.deepEqual(postSpy.getCall(0).args[0].body.state, 'pending');
});

test('handler logs when an unknown status is received', (t) => {
  const event = {
    headers: {},
    body: JSON.stringify({ status_message: 'You dont even know me' }),
  };

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

test('is firing callback if POST returns error', (t) => {
  const event = {
    headers: {},
    body: JSON.stringify({ status_message: 'Pending' }),
  };

  ghStatusManager(event, undefined, callback);
  postSpy.getCall(0).args[1](true);

  t.deepEqual(callback.lastCall.args[0], {
    statusCode: 500,
  });
  t.is(console.error.calledOnce, true);
});

test('is firing callback if POST returns statusCode bigger than 201', (t) => {
  const event = {
    headers: {},
    body: JSON.stringify({ status_message: 'Pending' }),
  };

  ghStatusManager(event, undefined, callback);
  postSpy.getCall(0).args[1](false, { statusCode: 404 });

  t.deepEqual(callback.lastCall.args[0], {
    statusCode: 500,
  });
});

test('is firing callback if POST returns successfully', (t) => {
  t.plan(2);
  const event = {
    headers: {},
    body: JSON.stringify({ status_message: 'Pending' }),
  };

  ghStatusManager(event, undefined, callback);
  postSpy.getCall(0).args[1](false, { statusCode: 201 });

  t.deepEqual(callback.lastCall.args[0], {
    statusCode: 201,
  });
  t.is(console.info.calledOnce, true);
  console.info.restore();
});
