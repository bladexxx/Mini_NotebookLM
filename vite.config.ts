import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import process from 'process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), basicSsl()],
    // The 'define' option performs a direct text replacement at build time. This is the
    // most reliable way to inject environment variables.
    define: {
      // We use JSON.stringify to ensure the values are correctly quoted as strings.
      // We also provide a fallback to an empty string to avoid "undefined" being injected.
      'process.env.VITE_AI_PROVIDER': JSON.stringify(env.VITE_AI_PROVIDER || 'GEMINI'),
      'process.env.VITE_AI_GATEWAY_URL': JSON.stringify(env.VITE_AI_GATEWAY_URL || ''),
      'process.env.VITE_AI_GATEWAY_API_KEY': JSON.stringify(env.VITE_AI_GATEWAY_API_KEY || ''),
      'process.env.VITE_AI_GATEWAY_EMBEDDING_MODEL': JSON.stringify(env.VITE_AI_GATEWAY_EMBEDDING_MODEL || 'text-embedding-004'),
      'process.env.VITE_AI_GATEWAY_CHAT_MODEL': JSON.stringify(env.VITE_AI_GATEWAY_CHAT_MODEL || 'gemini-2.5-flash'),
      // The Gemini API key MUST come from the execution environment's `process.env.API_KEY`.
    }
  }
})
