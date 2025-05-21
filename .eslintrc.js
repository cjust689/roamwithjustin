module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:vue/vue3-recommended",
    "plugin:prettier/recommended",
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["vue", "prettier"],
  rules: {
    "arrow-parens": ["error", "as-needed"],
    "prettier/prettier": [
      "error",
      {
        semi: false,
        singleQuote: false,
        tabWidth: 2,
        trailingComma: "all",
        arrowParens: "avoid",
      },
    ],
    "vue/multi-word-component-names": "off",
    "vue/require-toggle-inside-transition": "off",
  },
}
