import { serve } from '@hono/node-server';

// Usar import dinámico para TypeScript
const startServer = async () => {
  const { default: app } = await import('./src/index.tsx');
  
  serve({
    fetch: app.fetch,
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    hostname: '0.0.0.0'
  }, (info) => {
    console.log(`\n🚀 Simulador Chevy Plan corriendo!`);
    console.log(`📍 Local: http://localhost:${info.port}`);
    console.log(`🌐 Red: http://192.168.68.58:${info.port}`);
    console.log(`\n✅ Presiona Ctrl+C para detener\n`);
  });
};

startServer().catch(console.error);