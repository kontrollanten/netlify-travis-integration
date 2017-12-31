const request = require('request');
const signatureVerifier = require('./travis-signature-verifier');
const qs = require('qs');

const getStatusState = (statusMessage) => {
  switch (statusMessage) {
    case 'Passed':
    case 'Fixed':
      return 'success';
    case 'Broken':
    case 'Failed':
    case 'Still Failing':
    case 'Canceled':
      return 'failure';
    case 'Errored':
      return 'error';
    case 'Pending':
      return 'pending';
    default:
      return false;
  }
};

/* eslint-disable camelcase */
module.exports.handler = (event, _context, callback) => {
  const { Signature: signature } = event.headers;
  const { payload } = qs.parse(event.body);

  signatureVerifier.verify(signature, payload, (error) => {
    if (error && error.status === 'error') {
      return callback({
        statusCode: 422,
      });
    }

    const {
      head_commit, status_message, build_url: target_url,
    } = JSON.parse(payload);

    const state = getStatusState(status_message);

    if (!state) {
      console.error(`Received unknown status_message ${status_message}`, event.body);

      return callback({
        statusCode: 422,
      });
    }

    const url = `https://api.github.com/repos/${event.headers['Travis-Repo-Slug']}/statuses/${head_commit}`;
    return request.post({
      url,
      headers: {
        'User-Agent': 'netlify-travis-proxy',
        Authorization: `token ${process.env.GITHUB_OAUTH_TOKEN}`,
      },
      body: {
        state,
        target_url,
        context: 'netlify-travis-proxy',
      },
      json: true,
    }, (requestError, httpResponse) => {
      if (requestError || httpResponse.statusCode > 201) {
        console.error(`Failed to POST to ${url}`, httpResponse, requestError);

        return callback({ statusCode: 500 });
      }

      console.info('Successfully POST', JSON.stringify(httpResponse));

      return callback({ statusCode: 201 });
    });
  });
};
