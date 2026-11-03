import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    cssCodeSplit: false,
  },
  server: {
    allowedHosts: [
      "8e51-62-107-213-50.ngrok-free.app",
      "localhost",
      "*.ngrok-free.app"
    ]
  }
  
});
