/** @type {import('next').NextConfig} */
const nextConfig = {
  // CRITICAL: Static export configuration for Render
  output: 'export',
  trailingSlash: true,
  assetPrefix: './',
  
  // Your existing environment variable exposure (NODE_ENV REMOVED)
  env: {
    TARGET_BROWSER: process.env.TARGET_BROWSER,
    MANIFEST_VERSION: process.env.MANIFEST_VERSION,
    PORT: process.env.PORT,
    IS_DEV: process.env.IS_DEV,
    IS_TESTING: process.env.IS_TESTING,
    // Additional build-time variables (NODE_ENV removed - it's automatically available)
    HUSKY: process.env.HUSKY,
    // Add wallet-specific variables
    CRYPTO_WALLET_VERSION: process.env.npm_package_version || 'v3',
  },
  
  // REQUIRED: Image optimization for static export
  images: {
    unoptimized: true,
    domains: [
      'github.com',
      'raw.githubusercontent.com',
      'avatars.githubusercontent.com',
      'user-images.githubusercontent.com',
    ],
    // Allow loading from your specific token list repository
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/Trusx-crypto-wallet/trust-crypto-wallet-tokenlist/**',
      },
    ],
  },
  
  // Build optimizations
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // Handle build errors during development
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Web3 compatibility
  experimental: {
    esmExternals: true,
  },
  
  // CRITICAL: Webpack configuration for crypto wallet
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Handle crypto libraries in browser environment
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // Node.js modules that need polyfills in browser
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
        })
      );
    }
    
    // Handle WebAssembly for crypto operations
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    
    // Optimize for wallet libraries
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });
    
    // Handle ES modules properly
    config.module.rules.push({
      test: /\.m?js$/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    });
    
    return config;
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Optional: Customize output directory (default is 'out')
  distDir: 'out',
};

module.exports = nextConfig;
