import { Module } from '@nestjs/common';

import { ComsController } from './coms.controller';
import { ComsService } from './coms.service';

@Module({
  controllers: [ComsController],
  providers: [ComsService],
})
export class ComsModule {}
