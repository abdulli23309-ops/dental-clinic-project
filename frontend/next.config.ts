import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  reactCompiler: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [70, 75, 80, 85, 90, 100],
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "127.0.0.1",
      },
      {
        protocol: "https",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8001",
        pathname: "/media/**",
      },
    ],
  },
  async rewrites() {
    return [
      // Receptionist role rewrites
      { source: "/receptionist", destination: "/admin/appointments" },
      { source: "/receptionist/:path*", destination: "/admin/:path*" },

      // Cleaner role rewrites
      { source: "/cleaner", destination: "/admin/my-schedule" },
      { source: "/cleaner/:path*", destination: "/admin/:path*" },

      // Nurse / Dental Assistant role rewrites
      { source: "/nurse", destination: "/admin/appointments" },
      { source: "/nurse/:path*", destination: "/admin/:path*" },

      // Doctor role modern workspace rewrites
      { source: "/doctor/appointments", destination: "/admin/appointments" },
      { source: "/doctor/team", destination: "/admin/team" },
      { source: "/doctor/note-templates", destination: "/admin/note-templates" },
      { source: "/doctor/account", destination: "/admin/account" },
      { source: "/doctor/my-schedule", destination: "/admin/my-schedule" },
      { source: "/doctor/unauthorized", destination: "/admin/unauthorized" },
    ];
  },
};

export default nextConfig;
