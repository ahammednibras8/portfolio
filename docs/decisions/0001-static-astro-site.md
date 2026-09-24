# 0001: Build a static Astro site

- Status: Accepted
- Date: 2026-09-22

## Why this decision exists

The portfolio must load quickly, work without JavaScript, and be easy to move between hosts.

It needs reusable pages, checked content, and optimized images. It does not need a server or database.

## Decision

Use Astro with static output and strict TypeScript.

Astro builds the pages as complete HTML. JavaScript is added only when a real feature needs it and plain HTML and CSS cannot do the job.

The built `dist/` folder is the product that gets deployed. Cloudflare setup waits until real pages exist and the full path can be tested.

## What this means

- Visitors can read and navigate the site without JavaScript.
- Content and code are checked during the build.
- Production has no application server, database, or login system.
- The site can move to another static host.
- Adding a client framework, server code, or database needs a new decision record.
