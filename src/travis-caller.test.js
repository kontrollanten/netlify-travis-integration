const test = require('ava');
const sinon = require('sinon');
const mockRequire = require('mock-require');

const postMock = sinon.spy();
mockRequire('request', {
  post: postMock,
});

const { handler: callTravis } = require('./travis-caller');

test.afterEach(() => postMock.reset());

test('handler wont create POST request when context isn\'t deploy-preview', (t) => {
  const event = {
    body: JSON.stringify({ context: 'deploy' }),
  };

  callTravis(event, undefined, () => true);

  t.is(postMock.calledOnce, false);
});

test('handler creates POST request to correct URL', (t) => {
  t.plan(2);
  const event = {
    body: JSON.stringify({ context: 'deploy-preview' }),
  };
  const targetRepo = 'org/repo';
  process.env.TARGET_REPO = targetRepo;

  callTravis(event, undefined, () => true);

  t.is(postMock.calledOnce, true);
  t.is(postMock.getCall(0).args[0].url, `https://api.travis-ci.org/repo/${encodeURIComponent(targetRepo)}/requests`);
});

test('handler creates POST request with authorization headers', (t) => {
  const event = {
    body: JSON.stringify({ context: 'deploy-preview' }),
  };
  const travisToken = 'secret-token';
  process.env.TRAVIS_ACCESS_TOKEN = travisToken;

  callTravis(event, undefined, () => true);

  t.deepEqual(postMock.getCall(0).args[0].headers, {
    'Travis-API-Version': 3,
    Authorization: `token ${travisToken}`,
  });
});

test('handler creates POST request with Travis configuration body', (t) => {
  // eslint-disable-next-line camelcase
  const deploy_ssl_url = 'https://deploy.to.this';
  const branch = 'preview-branch';
  const title = 'commit message';
  const event = {
    body: JSON.stringify({
      deploy_ssl_url, branch, title, context: 'deploy-preview',
    }),
  };
  const travisToken = 'secret-token';
  process.env.TRAVIS_ACCESS_TOKEN = travisToken;

  callTravis(event, undefined, () => true);

  t.deepEqual(postMock.getCall(0).args[0].body, {
    message: `netlify-travis-proxy: ${title}`,
    request: {
      branch,
      config: {
        env: {
          TEST: 'e2e',
          SITE_URL: deploy_ssl_url,
        },
      },
    },
  });
});

test('handler logs error returned from POST request', (t) => {
  const event = { body: JSON.stringify({ context: 'deploy-preview' }) };
  const error = new Error();
  console.error = sinon.spy();

  callTravis(event, undefined, () => true);

  const requestCb = postMock.getCall(0).args[1];
  requestCb(error);

  t.is(console.error.getCall(0).args[0], error);
});

test('handler doesn\'t log error when no error returned from POST request', (t) => {
  const event = { body: JSON.stringify({ context: 'deploy-preview' }) };
  console.error = sinon.spy();

  callTravis(event, undefined, () => true);

  const requestCb = postMock.getCall(0).args[1];
  requestCb();

  t.is(console.error.calledOnce, false);
});

test('handler calls provided callback', (t) => {
  t.plan(2);
  const event = { body: JSON.stringify({ context: 'deploy-preview' }) };
  const callback = sinon.spy();

  callTravis(event, undefined, callback);

  t.is(callback.calledOnce, true);
  t.is(callback.getCall(0).args[1].statusCode, 201);
});
