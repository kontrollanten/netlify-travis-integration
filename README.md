# netlify-travis-proxy [![Build Status](https://travis-ci.org/kontrollanten/netlify-travis-proxy.svg?branch=master)](https://travis-ci.org/kontrollanten/netlify-travis-proxy) [![codecov.io](https://img.shields.io/codecov/c/github/kontrollanten/netlify-travis-proxy.svg?branch=master&style=flat-square)](https://codecov.io/github/kontrollanten/netlify-travis-proxy?branch=master)

[Serverless](https://serverless.com) glue proxy for calling [Travis](https://travis-ci.org) upon [Netlify](https://netlify.com) deployment.

![netlify-travis-proxy screenshot](./screenshot-status.png "netlify-travis-proxy screenshot")

## Why?
Makes it easy to run e2e tests after [Netlify deployment preview](https://www.netlify.com/blog/2016/07/20/introducing-deploy-previews-in-netlify/) is generated.

## How?
Typical workflow:
1. Netlify deployment is triggered upon creating/updating pull request
2. `netlify-travis-proxy` is called after Netlify deployment
3. `netlify-travis-proxy` triggers a Travis build to perform e2e tests

![netlify-travis-proxy sequence diagram](./netlify-travis-proxy.svg "netlify-travis-proxy sequence diagram")

## Getting started
You can deploy and manage netlify-travis-integration locally or which every CI environment you prefer, below is an example how to do it with Travis.

1. Fork this repository.
2. Setup Travis for your forked repository.
3. Set the following env variables in your Travis Settings.
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
GITHUB_OAUTH_TOKEN
TARGET_REPO=username/repository-with-e2e-tests
TRAVIS_ACCESS_TOKEN
```
4. Set the accurate IAM permissions, see `aws-permissions.json`.
5. Trigger a Travis build on master branch.
6. Verify that the deploy succeeds.
7. Copy the travis-caller URL provided by serverless in the deploy stage and use it to [add a Netlify deploy notification](https://www.netlify.com/docs/webhooks/#outgoing-webhooks-and-notifications).
8. Additionaly you can [add support for GitHub statuses by adding the github-status URL to Travis notifications](#github-statuses).

## Target repo .travix.yml example
Since Travis [doesn't support reading env vars for conditional builds from the API call](https://docs.travis-ci.com/user/conditional-builds-stages-jobs#Specifying-conditions), we have to use `type = api` for conditional checks.

```
- stage: lint
  if: type != api
  script: yarn lint
- stage: test
  if: type != api
  script: yarn test && codecov
- stage: e2e
  if: type = api
  script: yarn install-selenium && yarn e2e
```

## GitHub statuses
By adding webhook notifications to your target repo .travis.yml you can create statuses for the corresponding git commit.

The webhook will search for stage e2e in the triggering build. **If stage e2e isn't found, no status will be created.**

```
notifications:
  webhooks:
    urls:
      - https://fdyg78nn.execute-api.eu-west-1.amazonaws.com/dev/github-status # endpoint provided from *yarn deploy*
    on_start: always    # will create GH status `pending`
    on_success: always  # will create GH status `success`
    on_failure: always  # will create GH status `failure`
    on_cancel: always   # will create GH status `failure`
    on_error: always    # will create GH status `error`
```

## Limitations
Works only for AWS for the moment. It's possible to configure the serverless.yml file to use other providers.
