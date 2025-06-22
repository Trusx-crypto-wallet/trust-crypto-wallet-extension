/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const { resolve } = require('path');
const { EnvironmentPlugin } = require('webpack');
// Commented out problematic webpack extension reloader
// const ExtensionReloader = require('webpack-extension-reloader');
const manifest = require('./static/manifest.json');
const config = require('./webpack.config');
const basicPermissions = manifest.permissions;

// Any key we want to override for dev builds we can do it here
const manifestOverride = {
  ...manifest,
  permissions: basicPermissions.concat(['contextMenus']),
};

const manifestFilePath = resolve(__dirname, './build/manifest.json');
const manifestForBuild = require(manifestFilePath);
const allowedPlugins = [];

if (manifestForBuild.background.scripts) {
  console.log('building for firefox! disabling hot reload');
} else {
  // Temporarily disabled extension reloader for webpack 5 compatibility
  console.log('Extension reloader disabled for webpack 5 compatibility');
  
  // TODO: Replace with webpack 5 compatible hot reload solution
  // For now, manual refresh required during development
  
  /* Original code - commented out for webpack 5 compatibility:
  allowedPlugins.push(
    new ExtensionReloader({
      manifest: manifestFilePath,
      reloadPage: true,
      entries: {
        background: 'background',
        contentScript: 'contentscript',
        extensionPage: 'popup',
      },
    }),
  );
  */
}

module.exports = {
  ...config,
  mode: 'development',
  devtool: false,
  plugins: [
    ...config.plugins,
    new EnvironmentPlugin({
      PLAYGROUND: process.env.PLAYGROUND
        ? JSON.stringify(process.env.PLAYGROUND)
        : null,
    }),
    ...allowedPlugins,
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap('AfterEmitPlugin', () => {
          if (
            fs.writeFileSync(
              manifestFilePath,
              JSON.stringify(manifestOverride, null, 2),
            )
          ) {
            process.stdout.write('manifest overwritten successfuly');
          } else {
            process.stderr.write('manifest override failed');
          }
        });
      },
    },
  ],
};
