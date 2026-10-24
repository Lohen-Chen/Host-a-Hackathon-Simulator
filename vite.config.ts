import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `base: './'` keeps every URL relative, so the same build works on GitHub Pages
// (served from /Host-a-Hackathon-Simulator/), on any static host, and from a laptop.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [preact(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  define: { __SINGLE_FILE__: JSON.stringify(mode === 'single') },
  build: { target: 'es2019', assetsInlineLimit: 8192, reportCompressedSize: false },
}));
