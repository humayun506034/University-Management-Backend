import { Module } from '@nestjs/common';
import { MessagingGateway } from './messaging.gateway';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';

@Module({
    imports: [PrismaModule],
    providers: [MessagingGateway, MessagingService],
    controllers: [MessagingController],
})
export class MessagingModule {}
