// Disables noisy console outputs in production builds while keeping warnings and errors.
// React Native/Expo sets __DEV__ to false in production.

/* eslint-disable no-console */

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : true;

if (!isDev) {
  // Keep references to original methods if needed for future piping
  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);

  // No-op for chatty logs in production
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
  console.trace = () => {};

  // Preserve warn and error in production
  console.warn = (...args: unknown[]) => originalWarn(...args as []);
  console.error = (...args: unknown[]) => originalError(...args as []);
}

export {};


