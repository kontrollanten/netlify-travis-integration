const request = require('request');

module.exports.callTravis = (event, context, callback) => {
  // eslint-disable-next-line camelcase
  const { deploy_ssl_url } = JSON.parse(event.body);

  request.post({
    url: `https://api.travis-ci.org/repo/${encodeURIComponent(process.env.TARGET_REPO)}/requests`,
    headers: {
      'Travis-API-Version': 3,
      Authorization: `token ${process.env.TRAVIS_ACCESS_TOKEN}`,
    },
    json: true,
    body: {
      request: {
        branch: 'master',
        config: {
          env: {
            TEST: 'e2e',
            SITE_URL: deploy_ssl_url,
          },
        },
      },
    },
  }, (error) => {
    if (error) console.error(error);
  });

  callback(null, {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Go Serverless v1.0! Your function executed successfully!',
    }),
  });
};
