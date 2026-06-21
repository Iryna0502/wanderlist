/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fully static, client-side app — export to plain HTML/JS for any static host (Vercel, etc.).
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
