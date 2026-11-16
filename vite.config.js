import { defineConfig } from 'vite';

export default defineConfig({
  // Compile JSX for Preact without a plugin
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'preact' },
  },
});
