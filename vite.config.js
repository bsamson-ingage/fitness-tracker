import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// This configuration ensures that the compiled app uses relative paths, 
// which is required when deploying to a subdirectory on GitHub Pages.

export default defineConfig({
  plugins: [react()],
  // IMPORTANT: 
  // 1. Change 'YOUR_REPO_NAME' below to the exact name of your GitHub repository 
  //    (e.g., if the URL is github.com/user/fitness-tracker, use '/fitness-tracker/').
  // 2. KEEP the leading and trailing slashes.
  base: '/YOUR_REPO_NAME/',
  build: {
    outDir: 'dist',
  },
});