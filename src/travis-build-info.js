const request = require('request');

module.exports.get = (buildId, callback) => {
  request.get({
    url: `https://api.travis-ci.org/build/${buildId}`,
    headers: {
      'User-Agent': 'netlify-travis-proxy',
      'Travis-API-Version': 3,
      Authorization: `token ${process.env.TRAVIS_ACCESS_TOKEN}`,
    },
  }, (error, httpResponse, body) => {
    if (error) return callback(error);

    return callback(false, JSON.parse(body));
  });
};
