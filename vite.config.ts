
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Este bloco é crucial para que o código entenda process.env.API_KEY no navegador
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});
