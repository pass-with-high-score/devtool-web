import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule);

    const port = process.env.PORT || 3001;
    await app.listen(port);

    logger.log(`🚀 Cleanup backend is running on port ${port}`);
    logger.log(`📅 Scheduled cleanup task will run every hour`);
}
bootstrap();
