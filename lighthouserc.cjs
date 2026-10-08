/** Lighthouse CI gate (QA-CHECKLIST): all four categories 100 on the home page, desktop, median of 3. */
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      url: ['http://localhost/index.html', 'http://localhost/pricing.html', 'http://localhost/product/seating.html', 'http://localhost/blog/service-fees-in-ticket-sales-size-matters.html'],
      numberOfRuns: 3,
      settings: { preset: 'desktop', chromeFlags: '--no-sandbox --headless=new' },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 1, aggregationMethod: 'median-run' }],
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:best-practices': ['error', { minScore: 1 }],
        'categories:seo': ['error', { minScore: 1 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
