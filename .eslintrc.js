module.exports = {
    "extends": [
      "airbnb-base",
      "plugin:ava/recommended",
      "plugin:node/recommended"
    ],
    "rules": {
      "no-console": [0],
      "node/no-unpublished-require": 0,
    },
    "plugins": [
      "ava",
      "node"
    ]
};
