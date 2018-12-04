const request = require('request');

module.exports.handler = (event, _context, callback) => {
  /* eslint-disable camelcase */
  const {
    deploy_ssl_url, branch, context, title,
  } = JSON.parse(event.body);
  /* eslint-enable camelcase */

  if (context !== 'deploy-preview') {
    return callback(null, {
      statusCode: 200,
      body: JSON.stringify({
        message: `Wont trigger Travis build upon ${context}`,
      }),
    });
  }

  return request.post({
    url: `https://api.travis-ci.org/repo/${encodeURIComponent(process.env.TARGET_REPO)}/requests`,
    headers: {
      'Travis-API-Version': 3,
      Authorization: `token ${process.env.TRAVIS_ACCESS_TOKEN}`,
    },
    json: true,
    body: {
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
    },
  }, (error) => {
    if (error) return callback(JSON.stringify(error));

    return callback(null, {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Go Serverless v1.0! Your function executed successfully!',
      }),
    });
  });
};
