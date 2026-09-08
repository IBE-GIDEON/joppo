/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No next/image usage in the app, and a wildcard remotePatterns entry is the
  // exact configuration the Image Optimizer denial-of-service advisory targets.
  // If company logos are added later, list the specific hosts here.
};
export default nextConfig;
