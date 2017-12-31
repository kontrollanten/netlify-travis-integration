const test = require('ava');
const sinon = require('sinon');
const mockRequire = require('mock-require');

const getStub = sinon.stub();
mockRequire('request', {
  get: getStub,
});

const travisBuildInfo = require('./travis-build-info');

test.beforeEach(() => {
  getStub.reset();
});

test('get calls accurate URL', (t) => {
  const buildId = 'we-build-this-city';
  travisBuildInfo.get(buildId, () => true);

  t.is(getStub.lastCall.args[0].url, `https://api.travis-ci.org/build/${buildId}`);
});

test('get calls with accureate headers', (t) => {
  const token = 'im-token';
  process.env.TRAVIS_ACCESS_TOKEN = token;
  travisBuildInfo.get('', sinon.spy());

  t.deepEqual(getStub.lastCall.args[0].headers, {
    'User-Agent': 'netlify-travis-proxy',
    'Travis-API-Version': 3,
    Authorization: `token ${token}`,
  });
});

test('get fires callback upon GET request error', (t) => {
  t.plan(2);
  const callback = sinon.spy();
  const error = new Error('callback hell');
  getStub.callsFake((settings, cb) => cb(error));

  travisBuildInfo.get('', callback);

  t.is(callback.calledOnce, true);
  t.is(callback.lastCall.args[0], error);
});

test('get fires callback with JSON object upon GET request success', (t) => {
  t.plan(2);
  const jsonResponse = { success: 200 };
  const callback = sinon.spy();
  getStub.callsFake((settings, cb) => cb(false, undefined, JSON.stringify(jsonResponse)));

  travisBuildInfo.get('', callback);

  t.is(callback.calledOnce, true);
  t.deepEqual(callback.lastCall.args[1], jsonResponse);
});
