module.exports = {
  "extends": "eslint:recommended",
  "rules": {
    "no-console": 0,
    "prefer-const": "error",
    "no-caller": 2,
    "no-alert": "error",
    "no-unsafe-negation": "error",
    "no-mixed-spaces-and-tabs": 0,
    "no-sequences": "error",
    "no-proto": "error",
    "no-path-concat": "error",
    "radix": "error",
    "callback-return": "error",
    "global-require": "error",
    "handle-callback-err": "error",
    "no-mixed-requires": "error",
    "no-new-require": "error",
    "no-confusing-arrow": "error",
    "no-class-assign": "error",
    "no-shadow": "error",
    "no-shadow-restricted-names": "error",
    "no-label-var": "error",
    "no-useless-computed-key": "error",
    "no-useless-constructor": "error",
    "no-with": 2,
    "no-void": "error",
    "wrap-iife": [
      "error",
      "outside"
    ],
    "no-useless-escape": "error",
    "no-new": "error",
    "no-self-compare": "error",
    "no-unmodified-loop-condition": "error",
    "consistent-this": [
      "error",
      "self"
    ],
    "no-irregular-whitespace": 2,
    "no-unexpected-multiline": 2,
    "no-extend-native": 2,
    "no-extra-bind": 2,
    "no-throw-literal": 2,
    "no-new-wrappers": 2,
    "guard-for-in": 2,
    "no-multi-spaces": 2,
    "no-multi-str": 2,
    "yoda": "error",
    "id-length": [
      "error",
      {
        "exceptions": [
          "_",
          "Q",
          "x",
          "y"
        ]
      }
    ],
    "no-unreachable": "error",
    "semi": [
      "error",
      "always"
    ],
    "no-bitwise": "error"
  },
  "env": {
    "node": true,
    "es6": true
  },
	"parserOptions": {
    "ecmaVersion": 2017,
    "sourceType": "module"
	}
};