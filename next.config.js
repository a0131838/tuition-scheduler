﻿/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 15+: config keys moved out of `experimental`.
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/*": ["./fonts/**/*"],
  },
  // Avoid Next mis-detecting workspace root when other lockfiles exist on the machine.
  outputFileTracingRoot: __dirname,
};

module.exports = nextConfig;
