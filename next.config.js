const path = require('path');

/**
 * Next.js Configuration for Trust Crypto Wallet
 * Handles Web3, crypto libraries, and browser polyfills
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Enable experimental features
  experimental: {
    appDir: false,
    serverComponentsExternalPackages: ['ethers', 'web3', 'solc'],
    esmExternals: 'loose'
  },
  
  // Webpack configuration for crypto and Web3 libraries
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // Handle fallbacks for Node.js modules in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      url: require.resolve('url'),
      zlib: require.resolve('browserify-zlib'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      assert: require.resolve('assert'),
      os: require.resolve('os-browserify/browser'),
      path: require.resolve('path-browserify'),
      querystring: require.resolve('querystring-es3'),
      punycode: require.resolve('punycode'),
      process: require.resolve('process/browser'),
      util: require.resolve('util'),
      buffer: require.resolve('buffer'),
      events: require.resolve('events'),
      string_decoder: require.resolve('string_decoder'),
      constants: require.resolve('constants-browserify'),
      timers: require.resolve('timers-browserify'),
      console: require.resolve('console-browserify'),
      vm: require.resolve('vm-browserify'),
      child_process: false,
      cluster: false,
      dgram: false,
      dns: false,
      module: false,
      readline: false,
      repl: false,
      tty: require.resolve('tty-browserify')
    };
    
    // Add aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@config': path.resolve(__dirname, 'config'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@components': path.resolve(__dirname, 'src/ui/components'),
      '@hooks': path.resolve(__dirname, 'src/ui/hooks'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@bridges': path.resolve(__dirname, 'src/bridges'),
      '@contracts': path.resolve(__dirname, 'src/contracts'),
      '@wallet': path.resolve(__dirname, 'src/wallet'),
      '@web3': path.resolve(__dirname, 'src/web3'),
      '@gas': path.resolve(__dirname, 'src/gas'),
      '@tokens': path.resolve(__dirname, 'src/tokens'),
      '@storage': path.resolve(__dirname, 'src/storage'),
      '@security': path.resolve(__dirname, 'src/security'),
      '@messaging': path.resolve(__dirname, 'src/messaging'),
      '@broadcasting': path.resolve(__dirname, 'src/broadcasting'),
      '@dapp-integration': path.resolve(__dirname, 'src/dapp-integration'),
      '@lib': path.resolve(__dirname, 'src/lib'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@errors': path.resolve(__dirname, 'src/errors'),
      '@abis': path.resolve(__dirname, 'src/bridges/abis'),
      '@templates': path.resolve(__dirname, 'src/contracts/templates')
    };
    
    // Provide globals for browser
    config.plugins.push(
      new webpack.ProvidePlugin({
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer'],
        global: 'global'
      })
    );
    
    // Define environment variables
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.CUSTOM_NODE_ENV': JSON.stringify(process.env.NODE_ENV),
        'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
        'process.env.BUILD_ID': JSON.stringify(buildId),
        global: 'globalThis'
      })
    );
    
    // Handle specific libraries
    config.module.rules.push({
      test: /\.sol$/,
      type: 'asset/source'
    });
    
    // Ignore specific warnings
    config.ignoreWarnings = [
      /Module not found: Can't resolve 'encoding'/,
      /Module not found: Can't resolve 'lokijs'/,
      /Module not found: Can't resolve 'pino-pretty'/,
      /Critical dependency: the request of a dependency is an expression/
    ];
    
    // Externalize large libraries in production for better performance
    if (!isServer && !dev) {
      config.externals = {
        ...config.externals,
        // These will be loaded via CDN or separate chunks
      };
    }
    
    // Handle Web Assembly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      topLevelAwait: true
    };
    
    // Optimize chunks
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          ethers: {
            test: /[\\/]node_modules[\\/]ethers[\\/]/,
            name: 'ethers',
            chunks: 'all',
            priority: 20
          },
          web3: {
            test: /[\\/]node_modules[\\/]web3[\\/]/,
            name: 'web3',
            chunks: 'all',
            priority: 20
          },
          layerzero: {
            test: /[\\/]node_modules[\\/]@layerzerolabs[\\/]/,
            name: 'layerzero',
            chunks: 'all',
            priority: 20
          },
          wormhole: {
            test: /[\\/]node_modules[\\/]@wormhole-foundation[\\/]/,
            name: 'wormhole',
            chunks: 'all',
            priority: 20
          },
          axelar: {
            test: /[\\/]node_modules[\\/]@axelar-network[\\/]/,
            name: 'axelar',
            chunks: 'all',
            priority: 20
          },
          chainlink: {
            test: /[\\/]node_modules[\\/]@chainlink[\\/]/,
            name: 'chainlink',
            chunks: 'all',
            priority: 20
          },
          crypto: {
            test: /[\\/]node_modules[\\/](crypto-js|secp256k1|elliptic|bip39|hdkey)[\\/]/,
            name: 'crypto',
            chunks: 'all',
            priority: 15
          },
          solc: {
            test: /[\\/]node_modules[\\/]solc[\\/]/,
            name: 'solc',
            chunks: 'all',
            priority: 20
          },
          polyfills: {
            test: /[\\/]node_modules[\\/](buffer|stream-browserify|util|process|path-browserify|crypto-browserify)[\\/]/,
            name: 'polyfills',
            chunks: 'all',
            priority: 25
          }
        }
      }
    };
    
    return config;
  },
  
  // Headers for security and CORS
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'development' ? '*' : 'https://trustcryptowallet.com'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  },
  
  // Redirects for better UX
  async redirects() {
    return [
      {
        source: '/wallet',
        destination: '/',
        permanent: true
      },
      {
        source: '/home',
        destination: '/',
        permanent: true
      }
    ];
  },
  
  // Rewrites for API routes
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: '/api/:path*'
      }
    ];
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_ENVIRONMENT: process.env.NODE_ENV || 'development'
  },
  
  // Image optimization
  images: {
    domains: [
      'assets.coingecko.com',
      'logos.covalenthq.com', 
      'raw.githubusercontent.com',
      'bridge-api.polygon.technology',
      'bridge.arbitrum.io',
      'gateway.optimism.io',
      'assets.layer3.xyz',
      'cryptologos.cc',
      'tokens.1inch.io',
      'info.uniswap.org',
      'app.uniswap.org',
      'api.thegraph.com',
      'assets.chainlink.com'
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  },
  
  // Compiler options
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false
  },
  
  // Output configuration
  output: 'standalone',
  trailingSlash: false,
  
  // Performance optimizations
  poweredByHeader: false,
  compress: true,
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false
  },
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['src', 'pages', 'config', 'extension']
  },
  
  // Analyze bundle in production
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, options) => {
      if (!options.isServer) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: '../analyze/client.html'
          })
        );
      }
      return config;
    }
  })
};

module.exports = nextConfig;
