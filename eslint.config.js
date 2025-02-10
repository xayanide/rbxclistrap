const globals = require("globals");
const pluginJs = require("@eslint/js");
const eslintConfigPrettier = require("eslint-config-prettier");

/**
 * @see https://eslint.org/docs/latest/rules
 * @see https://eslint.org/docs/latest/use/configure/
 * @type {import('eslint').Linter.Config[]}
 */
module.exports = [
    pluginJs.configs.recommended,
    eslintConfigPrettier,
    { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.es2025,
            },
        },
    },
    {
        ignores: [
            "**/logs/",
            "**/dist/",
            "**/node_modules/",
            "**/.git/",
            "**/PlayerVersions",
            "**/StudioVersions",
            "**/version-*/",
        ],
    },
];
