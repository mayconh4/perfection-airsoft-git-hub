import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore
import { melhorEnvioProxy } from './server/melhorEnvioProxy.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), melhorEnvioProxy()],
})
