import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs"],
  // Planilhas de importação (até 5 MB) chegam por Server Action.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  images: {
    remotePatterns: [
      {
      protocol: "https",
      hostname: "res.cloudinary.com",
      },
    ], 
  },
};

export default withNextIntl(nextConfig);
