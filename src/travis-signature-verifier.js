const request = require('request');
const crypto = require('crypto');

// https://docs.travis-ci.com/user/notifications/#Verifying-Webhook-requests
module.exports.verify = (signature, payload, callback) => {
  request.get('https://api.travis-ci.org/config', (error, response, body) => {
    if (error) {
      return callback({
        status: 'error',
        error,
      });
    }

    // eslint-disable-next-line camelcase
    const { public_key } = JSON.parse(body).config.notifications.webhook;
    const verifier = crypto.createVerify('sha1');
    verifier.update(payload);
    const status = verifier.verify(public_key, signature);

    if (!status) {
      return callback({
        status: 'failed',
      });
    }
    return callback();
  });
};
