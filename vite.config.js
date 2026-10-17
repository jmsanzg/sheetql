import { defineConfig, createLogger } from 'vite';

// The `--base=/sheetql/` flag on `npm run build` sets the deployment base for
// GitHub Pages; it is not set here so `npm run dev` serves from `/`.

// Silence Vite 8's sourcemap warnings for @duckdb/duckdb-wasm's prebuilt
// worker bundles. Their `.map` files reference `@duckdb/apache-arrow` (a
// build-time fork of apache-arrow) which isn't installed here — we depend on
// the real `apache-arrow` package — so Vite's "source file outside its
// package" warning is harmless noise.
const logger = createLogger();
const warnOnce = logger.warnOnce.bind(logger);
logger.warnOnce = (msg, options) => {
  if (
    typeof msg === 'string' &&
    msg.includes('@duckdb/duckdb-wasm') &&
    msg.includes('Sourcemap for') &&
    (msg.includes('points to a source file outside its package') ||
      msg.includes('points to missing source files'))
  ) {
    return;
  }
  warnOnce(msg, options);
};

export default defineConfig({
  customLogger: logger,
  build: {
    target: 'esnext',
  },
});
