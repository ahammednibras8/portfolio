const kilobytes = (value) => value * 1024;

module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist",
      numberOfRuns: 3,
      maxAutodiscoverUrls: 0,
      settings: {
        onlyCategories: [
          "performance",
          "accessibility",
          "best-practices",
          "seo",
        ],
      },
    },
    assert: {
      aggregationMethod: "median-run",
      includePassedAssertions: true,
      assertions: {
        "categories:performance": ["error", { minScore: 0.95 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:seo": ["error", { minScore: 0.95 }],
        "resource-summary:script:size": [
          "error",
          { maxNumericValue: kilobytes(20) },
        ],
        "resource-summary:stylesheet:size": [
          "error",
          { maxNumericValue: kilobytes(40) },
        ],
        "resource-summary:image:size": [
          "error",
          { maxNumericValue: kilobytes(400) },
        ],
        "resource-summary:font:size": ["error", { maxNumericValue: 0 }],
        "resource-summary:total:size": [
          "error",
          { maxNumericValue: kilobytes(500) },
        ],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./.lighthouseci/reports",
    },
  },
};
