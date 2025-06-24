// Fix webpack module resolution for LavaMoat
const path = require('path');

// Resolve webpack from project root
let webpack;
try {
  // Try to require from project root node_modules
  const projectRoot = path.resolve(__dirname, '..');
  webpack = require(path.join(projectRoot, 'node_modules', 'webpack'));
} catch (error) {
  try {
    // Fallback to standard require
    webpack = require('webpack');
  } catch (fallbackError) {
    console.error('Cannot find webpack module');
    console.error('Current directory:', __dirname);
    console.error('Project root:', path.resolve(__dirname, '..'));
    throw new Error(`Webpack not found. Original error: ${fallbackError.message}`);
  }
}

// Replace the line that was causing the error (around line 16)
// The rest of your existing webpack.js content should go here unchanged
// Just replace the line: const webpack = require('webpack');
// with the webpack variable we've already defined above

// Example of how your existing code might look:
const webpackConfig = {
  // your existing webpack configuration
};

module.exports = webpack(webpackConfig);
