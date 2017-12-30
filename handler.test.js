import test from 'ava';
import sinon from 'sinon';
import mockRequire from 'mock-require';

const postMock = sinon.spy();
mockRequire('request', {
  post: postMock,
});

const { callTravis } = require('./handler');

test.afterEach(() => postMock.reset());

test('callTravis creates POST request to correct URL', (t) => {
  t.plan(2);
  const event = { body: '{}' };
  const targetRepo = 'org/repo';
  process.env.TARGET_REPO = targetRepo;

  callTravis(event, undefined, () => true);

  t.is(postMock.calledOnce, true);
  t.is(postMock.getCall(0).args[0].url, `https://api.travis-ci.org/repo/${encodeURIComponent(targetRepo)}/requests`);
});

test('callTravis creates POST request with authorization headers', (t) => {
  const event = { body: '{}' };
  const travisToken = 'secret-token';
  process.env.TRAVIS_ACCESS_TOKEN = travisToken;

  callTravis(event, undefined, () => true);

  t.deepEqual(postMock.getCall(0).args[0].headers, {
    'Travis-API-Version': 3,
    Authorization: `token ${travisToken}`,
  });
});

test('callTravis creates POST request with Travis configuration body', (t) => {
  // eslint-disable-next-line camelcase
  const deploy_ssl_url = 'https://deploy.to.this';
  const event = { body: JSON.stringify({ deploy_ssl_url }) };
  const travisToken = 'secret-token';
  process.env.TRAVIS_ACCESS_TOKEN = travisToken;

  callTravis(event, undefined, () => true);

  t.deepEqual(postMock.getCall(0).args[0].body, {
    request: {
      branch: 'master',
      config: {
        env: {
          TEST: 'e2e',
          SITE_URL: deploy_ssl_url,
        },
      },
    },
  });
});

test('callTravis logs error returned from POST request', (t) => {
  const event = { body: '{}' };
  const error = new Error();
  console.error = sinon.spy();

  callTravis(event, undefined, () => true);

  const requestCb = postMock.getCall(0).args[1];
  requestCb(error);

  t.is(console.error.getCall(0).args[0], error);
});

test('callTravis doesn\'t log error when no error returned from POST request', (t) => {
  const event = { body: '{}' };
  console.error = sinon.spy();

  callTravis(event, undefined, () => true);

  const requestCb = postMock.getCall(0).args[1];
  requestCb();

  t.is(console.error.calledOnce, false);
});

test('callTravis calls provided callback', (t) => {
  t.plan(2);
  const event = { body: '{}' };
  const callback = sinon.spy();

  callTravis(event, undefined, callback);

  t.is(callback.calledOnce, true);
  t.is(callback.getCall(0).args[1].statusCode, 200);
});
