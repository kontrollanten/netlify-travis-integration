# netlify-travis-proxy
[![Build Status](https://travis-ci.org/kontrollanten/netlify-travis-proxy.svg?branch=master)](https://travis-ci.org/kontrollanten/netlify-travis-proxy)
[![codecov.io](https://img.shields.io/codecov/c/github/kontrollanten/netlify-travis-proxy.svg?branch=master&style=flat-square)](https://codecov.io/github/kontrollanten/netlify-travis-proxy?branch=master)
[Serverless](https://serverless.com) glue proxy for calling [Travis](https://travis-ci.org) upon [Netlify](https://netlify.com) deployment.

## Why?
Makes it easy to run e2e tests after [Netlify deployment preview](https://www.netlify.com/blog/2016/07/20/introducing-deploy-previews-in-netlify/) is generated.

## How?
Typical workflow:
1. Netlify deployment is triggered upon pushing a new commit
2. `netlify-travis-proxy` is called after Netlify deployment
3. `netlify-travis-proxy` triggers a Travis build to perform e2e tests

## Getting started
```
git clone git@github.com:kontrollanten/netlify-travis-proxy.git
cd netlify-travis-proxy
yarn
cp .env.example .env # Open and fill your configuration
cp example.config.dev.json config.dev.json # Open and fill your configuration
yarn deploy
```

[Add a Netlify deploy notification](https://www.netlify.com/docs/webhooks/#outgoing-webhooks-and-notifications) with the URL provided from `yarn deploy`.

## Limitations
Works only for AWS for the moment. It's possible to configure the serverless.yml file to use other providers.
