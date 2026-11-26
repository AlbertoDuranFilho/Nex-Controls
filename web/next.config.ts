import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs"],
  // Planilhas de importação (até 4 MB) chegam por Server Action; a Vercel limita o corpo a 4,5 MB.
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
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
