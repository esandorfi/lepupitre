const vue = require("eslint-plugin-vue");
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = [
  {
    files: ["**/*.{ts,vue}"],
    languageOptions: {
      parser: require("vue-eslint-parser"),
      parserOptions: {
        parser: tsParser,
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      vue,
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...vue.configs["vue3-recommended"].rules,
      ...tsPlugin.configs.recommended.rules,
      "vue/multi-word-component-names": "off",
      "max-lines": [
        "warn",
        {
          max: 500,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      "max-lines-per-function": [
        "warn",
        {
          max: 150,
          skipBlankLines: true,
          skipComments: true,
          IIFEs: true,
        },
      ],
      complexity: ["warn", 18],
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportDeclaration[source.value=/^\\.\\.\\/\\.\\.\\//]",
          message:
            "Avoid relative imports deeper than one level (../../ or more). Use the @/ alias.",
        },
      ],
    },
  },
  {
    files: ["src/features/**/pages/**/*.vue"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/composables/useIpc", "../composables/useIpc", "**/composables/useIpc"],
              message:
                "Do not invoke IPC directly from feature pages. Use domain APIs and store/composable controllers.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/lib/i18n.messages.*.ts"],
    rules: {
      "max-lines": "off",
    },
  },
  {
    files: ["**/*.d.ts"],
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
