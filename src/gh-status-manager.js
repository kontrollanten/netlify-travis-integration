const request = require('request');
const signatureVerifier = require('./travis-signature-verifier');

/* eslint-disable camelcase */
module.exports.handler = (event, _context, callback) => {
  signatureVerifier.verify(event, (error) => {
    if (error && error.status === 'error') {
      return callback({
        statusCode: 422,
      });
    }

    const {
      commit, status_message, build_url: target_url,
    } = JSON.parse(event.body);

    let state;

    switch (status_message) {
      case 'Passed':
      case 'Fixed':
        state = 'success';
        break;
      case 'Broken':
      case 'Failed':
      case 'Still Failing':
      case 'Canceled':
        state = 'failure';
        break;
      case 'Errored':
        state = 'error';
        break;
      case 'Pending':
        state = 'pending';
        break;
      default:
        console.error(`Received unknown status_message ${status_message}`, event.body);
    }

    if (state) {
      request.post({
        url: `https://api.github.com/repos/${event.headers['Travis-Repo-Slug']}/statuses/${commit}`,
        body: {
          state,
          target_url,
          context: 'netlify-travis-proxy',
        },
      });
    }

    return callback({ statusCode: state ? 201 : 422 });
  });
};