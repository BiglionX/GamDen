import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { OnboardingEvent } from '@/entities/onboarding-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OnboardingEvent])],
  providers: [AgentService],
  controllers: [AgentController],
})
export class AgentModule {}
