/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Use SWC for faster builds
  swcMinify: true,

  // Optimize for production
  poweredByHeader: false,
  generateEtags: false,

  // Handle wallet-specific requirements
  experimental: {
    // ✅ Safer for browser polyfills than `true`
    esmExternals: false,
    // Optimize for serverless functions
    outputFileTracingRoot: undefined,
  },

  // Webpack configuration for crypto libraries and browser-extension compatibility
  webpack: (config, { isServer, webpack }) => {
    // Handle crypto libraries in browser environment
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // Node-specific modules that need polyfills in the browser
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer'),
        process: require.resolve('process/browser'),
        path: require.resolve('path-browserify'),
        os: require.resolve('os-browserify/browser'),
        assert: require.resolve('assert'),
        url: require.resolve('url'),
        querystring: require.resolve('querystring-es3'),
        util: require.resolve('util'),
        zlib: false,
        http: false,
        https: false,
      };

      // Add global Buffer and process for Web3 libraries
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        }),
      );
    }

    // Handle WebAssembly for crypto operations
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Treat *.wasm files as async WebAssembly
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Allow importing ESM without file-extension specifiers
    config.module.rules.push({
      test: /\.m?js$/,
      type: 'javascript/auto',
      resolve: { fullySpecified: false },
    });

    return config;
  },

  // Environment variables for web app
  env: {
    NEXT_PUBLIC_APP_NAME: 'Rainbow Wallet',
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.5.108',
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },

  // Security headers for crypto-wallet application
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https: wss: blob:",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With' },
        ],
      },
      // Cache static assets
      {
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // Cache images
      {
        source: '/(.*\\.(png|jpg|jpeg|gif|webp|svg|ico))',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
    ];
  },

  // API routes configuration
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },

  // Redirects (none active)
  async redirects() {
    return [];
  },

  // Image optimisation
  images: {
    // Required for `output: 'export'`
    unoptimized: true,
    domains: [
      'assets.coingecko.com',
      'token-icons.s3.amazonaws.com',
      'raw.githubusercontent.com',
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // ✅ Static export build (generates `out/` folder)
  output: 'export',

  // Disable telemetry
  telemetry: false,
};

module.exports = nextConfig;
