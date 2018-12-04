const request = require('request');
const qs = require('qs');
const signatureVerifier = require('./travis-signature-verifier');
const travisBuildInfo = require('./travis-build-info');

const getStatusStateAndDesc = (statusMessage) => {
  const msg = statusMessage.toLowerCase();
  const description = 'The Travis CI e2e tests ';

  switch (msg) {
    case 'passed':
      return {
        state: 'success',
        description: description.concat(msg),
      };
    case 'fixed':
      return {
        state: 'success',
        description: description.concat(`is ${msg}`),
      };
    case 'failed':
      return {
        state: 'failure',
        description: description.concat(`has ${msg}`),
      };
    case 'broken':
    case 'still failing':
    case 'canceled':
      return {
        state: 'failure',
        description: description.concat(`is ${msg}`),
      };
    case 'errored':
      return {
        state: 'error',
        description: description.concat(`is ${msg}`),
      };
    case 'pending':
      return {
        state: 'pending',
        description: description.concat(`is ${msg}`),
      };
    default:
      return {
        state: false,
        description: false,
      };
  }
};

/* eslint-disable camelcase */
const createGitHubStatus = (repoSlug, payload, callback) => {
  const {
    commit, status_message, build_url: target_url,
  } = payload;

  const { state, description } = getStatusStateAndDesc(status_message);

  if (!state) {
    console.error(`Received unknown status_message ${status_message}: ${JSON.stringify(payload)}`);

    return callback(`Received unknown status_message ${status_message}: ${JSON.stringify(payload)}`);
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
      description,
    },
    json: true,
  }, (requestError, httpResponse) => {
    if (requestError || httpResponse.statusCode > 201) {
      return callback(`Failed to POST to ${url}: ${JSON.stringify(httpResponse)} ${JSON.stringify(requestError)}`);
    }

    console.info(`Successfully POST ${JSON.stringify(httpResponse)}`);

    return callback(null, { statusCode: 201 });
  });
};

module.exports.handler = (event, _context, callback) => {
  const { Signature: signature } = event.headers;
  const { payload } = qs.parse(event.body);

  signatureVerifier.verify(signature, payload, (error) => {
    if (error && error.status === 'error') {
      return callback(JSON.stringify(error));
    }

    const parsedPayload = JSON.parse(payload);

    return travisBuildInfo.get(parsedPayload.id, (e, buildInfo) => {
      if (e) {
        console.error(JSON.stringify(e));
        return callback(JSON.stringify(e));
      }

      if (!buildInfo.stages.find(({ name }) => name.toLowerCase() === 'e2e')) {
        return callback(null, { statusCode: 200 });
      }

      return createGitHubStatus(event.headers['Travis-Repo-Slug'], parsedPayload, callback);
    });
  });
};
