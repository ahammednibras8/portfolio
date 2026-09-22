export default {
  extends: ["stylelint-config-standard", "stylelint-config-html/astro"],
  ignoreFiles: [
    ".astro/**",
    "coverage/**",
    "dist/**",
    "node_modules/**",
    "playwright-report/**",
    "test-results/**",
  ],
};
