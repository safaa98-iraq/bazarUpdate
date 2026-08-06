import 'dotenv/config';
import { createApp } from './app';

const PORT = process.env.PORT ?? 4000;

async function bootstrap() {
  const app = createApp();

  app.listen(PORT, () => {
    console.log(`🚀 API server running at http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV ?? 'development'}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
