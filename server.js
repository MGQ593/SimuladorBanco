import { serve } from '@hono/node-server';

const startServer = async () => {
  const { default: app } = await import('./src/index.tsx');
  
  const port = process.env.PORT || 3000;
  
  serve({
    fetch: app.fetch,
    port: port,
    hostname: '0.0.0.0'
  }, (info) => {
    console.log(`🚀 Simulador Chevy Plan corriendo!`);
    console.log(`📍 Puerto: ${info.port}`);
    console.log(`✅ Servidor listo\n`);
  });
};

startServer().catch(console.error);