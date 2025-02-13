/**
 * @see https://prettier.io/docs/en/configuration.html
 * @type {import("prettier").Config}
 */
export default {
    parser: "babel",
    trailingComma: "all",
    tabWidth: 4,
    semi: true,
    singleQuote: false,
    endOfLine: "lf",
    useTabs: false,
    /**
    My PrintWidth Preferences:
    Default: 80
    1080p Screen with VS Code Zoom Level 0: 211
    1080p Screen with VS Code Zoom Level 1: 172
    */
    printWidth: 172,
    quoteProps: "always",
    experimentalTernaries: true,
    arrowParens: "always",
    bracketSpacing: true,
    objectWrap: "preserve",
};
