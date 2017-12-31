const request = require('request');
const qs = require('qs');
const signatureVerifier = require('./travis-signature-verifier');
const travisBuildInfo = require('./travis-build-info');

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
const createGitHubStatus = (repoSlug, payload, callback) => {
  const {
    head_commit, base_commit, status_message, build_url: target_url,
  } = payload;
  const commit = head_commit || base_commit;

  const state = getStatusState(status_message);

  if (!state) {
    console.error(`Received unknown status_message ${status_message}`, payload);

    return callback({
      statusCode: 422,
    });
  }

  const url = `https://api.github.com/repos/${repoSlug}/statuses/${commit}`;
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
      description: 'The Travis CI e2e test passed',
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
};

module.exports.handler = (event, _context, callback) => {
  const { Signature: signature } = event.headers;
  const { payload } = qs.parse(event.body);

  signatureVerifier.verify(signature, payload, (error) => {
    if (error && error.status === 'error') {
      return callback({
        statusCode: 422,
      });
    }

    const parsedPayload = JSON.parse(payload);

    return travisBuildInfo.get(parsedPayload.id, (e, buildInfo) => {
      if (e) {
        console.error(e);
        return callback({ statusCode: 500 });
      }

      if (!buildInfo.stages.find(({ name }) => name.toLowerCase() === 'e2e')) {
        return callback({ statusCode: 200 });
      }

      return createGitHubStatus(event.headers['Travis-Repo-Slug'], parsedPayload, callback);
    });
  });
};
