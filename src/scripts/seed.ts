import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from '../config/seed.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('SeedCLI');
  logger.log('Starting TrueLabel standalone seeding CLI...');

  let app;
  try {
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['log', 'error', 'warn'],
    });

    const seedService = app.get(SeedService);
    await seedService.runSeed();
    logger.log('Database seeding process finished successfully.');
  } catch (error) {
    logger.error('Failed to complete database seeding:', error);
    process.exitCode = 1;
  } finally {
    if (app) {
      await app.close();
    }
  }
}

bootstrap();
