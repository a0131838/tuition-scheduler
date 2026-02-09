﻿/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
    outputFileTracingIncludes: {
      "/*": ["./fonts/**/*"],
    },
  },
};

module.exports = nextConfig;
