import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({mode}) => {
  // Proxy requests stay same-origin in the browser, including session cookies.
  const env = loadEnv(mode, process.cwd(), '');
  const backend = env.VITE_PROXY_TARGET || 'http://127.0.0.1:5000';
  const proxy = {target: backend, changeOrigin: false};
  return {plugins:[react()], server:{host:'0.0.0.0',allowedHosts:true,port:5173,proxy:{'/api':proxy,'/uploads':proxy}}};
});
