/** @type {import("prettier").Config} */
export default {
  plugins: ["prettier-plugin-astro"],
  overrides: [
    {
      files: "src/data/analytics-campaigns.json",
      options: { parser: "json-stringify" },
    },
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
};
