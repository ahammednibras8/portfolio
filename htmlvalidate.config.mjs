import { defineConfig } from "html-validate";

export default defineConfig({
  extends: ["html-validate:recommended"],
  rules: {
    "doctype-style": ["error", { style: "uppercase" }],
    "no-inline-style": "off",
    "void-style": ["error", { style: "omit" }],
  },
});
