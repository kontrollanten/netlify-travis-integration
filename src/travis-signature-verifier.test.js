const test = require('ava');
const sinon = require('sinon');
const mockRequire = require('mock-require');

const getMock = sinon.spy();
mockRequire('request', {
  get: getMock,
});
const createVerifyStub = sinon.stub({
  update: () => true,
  verify: () => true,
});
mockRequire('crypto', {
  createVerify: () => createVerifyStub,
});

const { verify: signatureVerifier } = require('./travis-signature-verifier');

const callback = sinon.spy();

test.beforeEach(() => {
  getMock.reset();
  callback.reset();
});

test('creates GET request to retrieve Travis config', (t) => {
  signatureVerifier('', '', () => true);

  t.is(getMock.calledOnce, true);
});

test('logs and returns error upon GET request error', (t) => {
  t.plan(2);
  const error = new Error('GET request error');
  signatureVerifier('', '', callback);

  getMock.getCall(0).args[1](error);

  t.is(callback.calledOnce, true);
  t.deepEqual(callback.getCall(0).args[0], {
    status: 'error',
    error,
  });
});

test('verifies the signature against the public key', (t) => {
  t.plan(3);
  const payload = 'payload=pay-the-load';
  const signature = 'signature 1';
  signatureVerifier(signature, payload, callback);

  /* eslint-disable camelcase */
  const public_key = 'public-enemy';
  const getBody = JSON.stringify({
    config: {
      notifications: {
        webhook: { public_key },
      },
    },
  });

  getMock.getCall(0).args[1](false, undefined, getBody);

  t.is(createVerifyStub.update.calledOnce, true);
  t.is(createVerifyStub.update.getCall(0).args[0], payload);
  t.deepEqual(createVerifyStub.verify.getCall(0).args, [public_key, signature]);
});

test('return status `failed` upon verify failure', (t) => {
  signatureVerifier('', '', callback);

  const getBody = JSON.stringify({
    config: {
      notifications: {
        webhook: { },
      },
    },
  });

  createVerifyStub.verify.callsFake(() => false);

  getMock.getCall(0).args[1](false, undefined, getBody);

  t.deepEqual(callback.getCall(0).args[0], {
    status: 'failed',
  });
});

test('return no error upon verify success', (t) => {
  signatureVerifier('', 'pay-the-load', callback);

  const getBody = JSON.stringify({
    config: {
      notifications: {
        webhook: { },
      },
    },
  });

  createVerifyStub.verify.callsFake(() => true);

  getMock.getCall(0).args[1](false, undefined, getBody);

  t.deepEqual(callback.getCall(0).args[0], undefined);
});
