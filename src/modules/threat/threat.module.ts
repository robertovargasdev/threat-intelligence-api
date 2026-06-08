import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ThreatService } from './threat.service';
import { ThreatController } from './threat.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 3,
    }),
  ],
  controllers: [ThreatController],
  providers: [ThreatService],
})
export class ThreatModule {}
