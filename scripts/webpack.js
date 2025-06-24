// Fix webpack module resolution
const path = require('path');

// Look for webpack in the parent directory (project root)
const projectRoot = path.resolve(__dirname, '..');
const webpackPath = path.join(projectRoot, 'node_modules', 'webpack');

let webpack;
try {
  // Try to require webpack from project root
  webpack = require(webpackPath);
} catch (error) {
  // Fallback to standard require
  try {
    webpack = require('webpack');
  } catch (fallbackError) {
    console.error('Cannot find webpack module');
    console.error('Tried paths:', [webpackPath, 'webpack']);
    throw fallbackError;
  }
}

// Your existing webpack configuration code continues here...
// (Keep all your existing webpack.js content below this point)
