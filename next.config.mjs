/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enables full static export (replaces `next export`)
  output: 'export',

  // Optional but important if you use <Image /> anywhere
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
