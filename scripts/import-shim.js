// Import shim for LavaMoat build process
// This file provides Node.js module compatibility during webpack builds

// Handle ES modules in Node.js environment
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(...args) {
  try {
    return originalRequire.apply(this, args);
  } catch (error) {
    // Handle module resolution errors gracefully
    if (error.code === 'MODULE_NOT_FOUND') {
      console.warn(`Warning: Could not resolve module: ${args[0]}`);
      return {};
    }
    throw error;
  }
};

// Support for ESM imports in CommonJS context
if (typeof globalThis === 'undefined') {
  global.globalThis = global;
}

// Buffer polyfill for browser environment
if (typeof global.Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}

// Process polyfill
if (typeof global.process === 'undefined') {
  global.process = require('process');
}
