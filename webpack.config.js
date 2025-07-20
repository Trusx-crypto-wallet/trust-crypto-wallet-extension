const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Webpack configuration for Trust Crypto Wallet Extension
 * Handles background scripts, content scripts, popup, and worker compilation
 */
module.exports = {
  mode: isProduction ? 'production' : 'development',
  devtool: isProduction ? 'source-map' : 'cheap-module-source-map',
  
  entry: {
    // Extension core scripts
    'background/background': './extension/background/background.js',
    'content-scripts/contentScript': './extension/content-scripts/contentScript.js',
    'content-scripts/inpage': './extension/content-scripts/inpage.js',
    'content-scripts/web3Injector': './extension/content-scripts/web3Injector.js',
    'content-scripts/providerInjector': './extension/content-scripts/providerInjector.js',
    'content-scripts/remixDetector': './extension/content-scripts/remixDetector.js',
    'content-scripts/deploymentDetector': './extension/content-scripts/deploymentDetector.js',
    'content-scripts/contractDetector': './extension/content-scripts/contractDetector.js',
    'content-scripts/bridgeDetector': './extension/content-scripts/bridgeDetector.js',
    'content-scripts/dappBridge': './extension/content-scripts/dappBridge.js',
    'content-scripts/messageRelay': './extension/content-scripts/messageRelay.js',
    'content-scripts/detector': './extension/content-scripts/detector.js',
    
    // Popup scripts
    'popup/popup': './extension/popup/popup.js',
    
    // Background managers
    'background/messageHandler': './extension/background/messageHandler.js',
    'background/alarms': './extension/background/alarms.js',
    'background/dappManager': './extension/background/dappManager.js',
    'background/approvalManager': './extension/background/approvalManager.js',
    'background/web3Handler': './extension/background/web3Handler.js',
    'background/walletconnectHandler': './extension/background/walletconnectHandler.js',
    'background/permissionManager': './extension/background/permissionManager.js',
    'background/bridgeManager': './extension/background/bridgeManager.js',
    'background/deploymentManager': './extension/background/deploymentManager.js',
    'background/contractManager': './extension/background/contractManager.js',
    'background/compilationManager': './extension/background/compilationManager.js'
  },
  
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    chunkFilename: '[name].[contenthash].chunk.js',
    clean: true,
    publicPath: '/'
  },
  
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.sol'],
    alias: {
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
      '@templates': path.resolve(__dirname, 'src/contracts/templates'),
      
      // Node.js polyfills for browser environment
      'buffer': 'buffer',
      'stream': 'stream-browserify',
      'util': 'util',
      'process': 'process/browser',
      'path': 'path-browserify',
      'crypto': 'crypto-browserify',
      'http': 'stream-http',
      'https': 'https-browserify',
      'os': 'os-browserify/browser',
      'url': 'url',
      'assert': 'assert',
      'constants': 'constants-browserify',
      'punycode': 'punycode',
      'querystring': 'querystring-es3',
      'zlib': 'browserify-zlib',
      'timers': 'timers-browserify',
      'tty': 'tty-browserify',
      'vm': 'vm-browserify'
    },
    fallback: {
      'fs': false,
      'net': false,
      'tls': false,
      'child_process': false,
      'readline': false,
      'worker_threads': false,
      'perf_hooks': false,
      'inspector': false,
      'cluster': false,
      'dgram': false,
      'dns': false,
      'module': false,
      'repl': false,
      'async_hooks': false
    }
  },
  
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { 
                targets: { 
                  chrome: '102',
                  firefox: '91',
                  safari: '14',
                  edge: '102'
                },
                useBuiltIns: 'entry',
                corejs: 3
              }],
              '@babel/preset-react',
              '@babel/preset-typescript'
            ],
            plugins: [
              '@babel/plugin-proposal-class-properties',
              '@babel/plugin-proposal-object-rest-spread',
              '@babel/plugin-transform-runtime'
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
          'css-loader',
          'postcss-loader'
        ]
      },
      {
        test: /\.scss$/,
        use: [
          isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
          'css-loader',
          'postcss-loader',
          'sass-loader'
        ]
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name][ext]'
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name][ext]'
        }
      },
      {
        test: /\.json$/,
        type: 'json'
      },
      {
        test: /\.sol$/,
        type: 'asset/source'
      },
      {
        test: /\.md$/,
        type: 'asset/source'
      },
      {
        test: /\.txt$/,
        type: 'asset/source'
      }
    ]
  },
  
  plugins: [
    new CleanWebpackPlugin(),
    
    // Define environment variables
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.EXTENSION_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0'),
      'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
      'process.env.WALLETCONNECT_METADATA_URL': JSON.stringify(process.env.WALLETCONNECT_METADATA_URL || 'https://trust-crypto-wallet-extension.onrender.com'),
      'process.env.CDN_URL': JSON.stringify(process.env.CDN_URL || 'https://cdn.trust-crypto-wallet-extension.onrender.com'),
      'process.env.CHAINLINK_API_KEY': JSON.stringify(process.env.CHAINLINK_API_KEY || ''),
      'process.env.THEGRAPH_API_KEY': JSON.stringify(process.env.THEGRAPH_API_KEY || ''),
      'process.env.CRYPTOCOMPARE_API_KEY': JSON.stringify(process.env.CRYPTOCOMPARE_API_KEY || ''),
      global: 'globalThis'
    }),
    
    // Provide Node.js globals for browser
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
      global: 'global'
    }),
    
    // Copy static assets
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'manifest.json',
          to: 'manifest.json'
        },
        {
          from: 'public',
          to: 'public'
        },
        {
          from: 'extension/popup',
          to: 'extension/popup',
          globOptions: {
            ignore: ['**/*.js']
          }
        },
        {
          from: 'src/bridges/abis',
          to: 'src/bridges/abis'
        },
        {
          from: 'src/contracts/templates',
          to: 'src/contracts/templates'
        },
        {
          from: 'styles',
          to: 'styles'
        }
      ]
    }),
    
    // Extract CSS in production
    ...(isProduction ? [
      new MiniCssExtractPlugin({
        filename: 'styles/[name].[contenthash].css',
        chunkFilename: 'styles/[name].[contenthash].chunk.css'
      })
    ] : [])
  ],
  
  optimization: {
    minimize: isProduction,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: isProduction,
            drop_debugger: isProduction,
            pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug'] : []
          },
          mangle: {
            safari10: true
          },
          format: {
            comments: false
          }
        },
        extractComments: false
      })
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10
        },
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
        openzeppelin: {
          test: /[\\/]node_modules[\\/]@openzeppelin[\\/]/,
          name: 'openzeppelin',
          chunks: 'all',
          priority: 20
        },
        solc: {
          test: /[\\/]node_modules[\\/]solc[\\/]/,
          name: 'solc',
          chunks: 'all',
          priority: 20
        },
        crypto: {
          test: /[\\/]node_modules[\\/](crypto-js|secp256k1|elliptic|bip39|hdkey)[\\/]/,
          name: 'crypto',
          chunks: 'all',
          priority: 15
        },
        ui: {
          test: /[\\/]node_modules[\\/](react|react-dom|@reduxjs|react-redux)[\\/]/,
          name: 'ui',
          chunks: 'all',
          priority: 15
        },
        polyfills: {
          test: /[\\/]node_modules[\\/](buffer|stream-browserify|util|process|path-browserify|crypto-browserify)[\\/]/,
          name: 'polyfills',
          chunks: 'all',
          priority: 25
        }
      }
    },
    runtimeChunk: false,
    sideEffects: false
  },
  
  performance: {
    hints: isProduction ? 'warning' : false,
    maxEntrypointSize: 2500000, // 2.5MB
    maxAssetSize: 1500000 // 1.5MB
  },
  
  stats: {
    errorDetails: true,
    children: false,
    modules: false,
    chunks: false,
    chunkModules: false,
    entrypoints: false,
    excludeAssets: /\.(map|txt|md)$/
  },
  
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename]
    }
  },
  
  experiments: {
    topLevelAwait: true,
    asyncWebAssembly: true
  },
  
  target: ['web', 'es2020'],
  
  externals: {
    // Don't bundle these - they should be loaded separately
    'chrome-extension-async': 'chrome-extension-async'
  }
};
