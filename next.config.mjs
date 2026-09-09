/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Needed by the container image; harmless on other hosts.
  output: process.env.BUILD_STANDALONE === '1' ? 'standalone' : undefined,

  // No next/image usage in the app, and a wildcard remotePatterns entry is the
  // exact configuration the Image Optimizer denial-of-service advisory targets.
  // If company logos are added later, list the specific hosts here.

  // Prisma ships a native engine and the Workers driver imports a Cloudflare
  // built-in module. Neither can be bundled by webpack, so both are left as
  // runtime requires and resolved by whichever runtime is actually loading them.
  serverExternalPackages: [
    '@prisma/client',
    '@prisma/adapter-pg-worker',
    '@prisma/pg-worker',
    '.prisma/client',
  ],

  webpack: (config) => {
    config.externals = [
      ...(config.externals ?? []),
      // Only exists inside a Worker. Webpack cannot resolve the scheme during
      // a Node build and fails the compile.
      'cloudflare:sockets',
      // The wasm Prisma build pulls in a .wasm binary that webpack tries to
      // parse as JavaScript. Left external so the Worker bundler, which does
      // understand WebAssembly imports, handles it instead.
      '.prisma/client/wasm',
    ];
    return config;
  },
};

export default nextConfig;
