import {
  Injectable,
  Logger,
  Module,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ChatService } from './application/chat.service.js';
import { ChatController } from './controllers/chat.controller.js';
import { ChatRepository } from './infrastructure/repositories/chat.repository.js';

@Injectable()
class ChatRetention implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatRetention.name);
  private timer?: ReturnType<typeof setInterval>;
  constructor(private readonly repository: ChatRepository) {}
  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    const purge = () => {
      void this.repository
        .purgeExpired(new Date())
        .catch(() => this.logger.warn('CHAT_RETENTION_RETRY'));
    };
    purge();
    this.timer = setInterval(purge, 3600000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [ChatService, ChatRepository, ChatRetention],
})
export class ChatModule {}
