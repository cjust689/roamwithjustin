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
    "plugin:prettier/recommended", // ✅ disables ESLint formatting in favor of Prettier
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["vue"],
  rules: {
    // ❌ Removed redundant prettier/prettier and arrow-parens overrides
    // ✅ Let Prettier handle formatting based on .prettierrc

    "vue/multi-word-component-names": "off",
    "vue/require-toggle-inside-transition": "off",
  },
}
