import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/candidate/onboarding": ["./src/lib/fonts/**/*"],
    "/candidate/disc-quiz": ["./src/lib/fonts/**/*"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://use.typekit.net https://widgets.resy.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://use.typekit.net https://p.typekit.net https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://*.supabase.co https://daddybao.co.uk",
              "font-src 'self' https://use.typekit.net https://p.typekit.net https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io https://*.ingest.sentry.io https://www.onemap.gov.sg https://performance.typekit.net",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
