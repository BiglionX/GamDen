import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnboardingEvent } from '@/entities/onboarding-event.entity';

/**
 * Agent 模块（守护灵体系）V1.0
 *
 * 职责：
 * - 提供入驻引导话术配置
 * - 记录用户入驻流程事件
 * - 守护灵相关业务逻辑
 */
@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    @InjectRepository(OnboardingEvent)
    private readonly onboardingEventRepo: Repository<OnboardingEvent>,
  ) {}

  getStatus() {
    return { status: 'ok', message: 'Agent 模块运行中' };
  }

  /**
   * 获取话术配置（V1.0 硬编码，V1.1+ 支持数据库配置）
   */
  async getDialogues(scene?: string) {
    // 硬编码话术配置（与前端 agent-lines.ts 保持一致）
    const dialogues = {
      mechanical: {
        firstEncounter: '信号同步中。我的编号是[M-07]，GamDen巢穴的守夜人。',
        askName: '你的领地坐标已锁定，等待指挥官确认身份——请告诉我你的名字。',
        selectGuardian: '机械不会说谎。我会用数据为你守护每一寸领地。',
        alliance: '指令确认。人机绑定完成。欢迎归队，指挥官。',
        territoryLanding: '领地已落地，坐标已锁定。这是你的起点，请开始建设。',
        newUserTask: '建议执行初始任务：浏览集市。寻找领地升级所需资源。是否立即执行？',
        taskComplete: '任务完成。初步建设已启动。继续前进。',
      },
      elf: {
        firstEncounter: '终于，你走过来了。我叫[灵]，这片森林的守护者。',
        askName: '你的领地在等你。但在这之前，告诉我你的名字。',
        selectGuardian: '风会带来远方的消息。我陪你等每一个邻居到来。',
        alliance: '你选了我。真好。那么——欢迎回家。',
        territoryLanding: '你看，这里就是你的领地了。现在它很小，但风会帮你带来邻居。我保证。',
        newUserTask: '要不要先去集市看看？那里有可以让领地变漂亮的东西。我陪你。',
        taskComplete: '你去了集市！真好。领地会一天天变好看的。',
      },
      astrologer: {
        firstEncounter: '星辰已经等到了它的观星者。我等你很久了。',
        askName: '请告诉我，我该用什么名字呼唤你？',
        selectGuardian: '星辰的轨迹里，我已经看到了你的未来。跟我来。',
        alliance: '命运之线，从此缠绕。我陪你看未来的每一颗星。',
        territoryLanding: '第一个坐标，是命运给你的礼物。以后这里会开满属于你的故事。',
        newUserTask: '你的第一步，应该是去集市看看那些为你准备的"星尘"。走吧，我引路。',
        taskComplete: '第一步已经迈出。星途漫漫，我陪你走。',
      },
    };

    if (scene) {
      return dialogues[scene as keyof typeof dialogues] ?? dialogues.mechanical;
    }
    return dialogues;
  }

  /**
   * 记录用户入驻完成
   */
  async completeOnboarding(userId: string) {
    try {
      const event = this.onboardingEventRepo.create({
        userId,
        event: 'onboarding_completed',
        properties: {
          completedAt: new Date().toISOString(),
        },
      });
      await this.onboardingEventRepo.save(event);
      this.logger.log(`用户 ${userId} 入驻完成`);
      return { success: true };
    } catch (error) {
      this.logger.error(`记录入驻完成失败: ${error}`);
      return { success: false, error: '记录失败' };
    }
  }

  /**
   * 记录入驻流程事件（用于分析流失节点）
   */
  async recordOnboardingEvent(
    userId: string,
    event: string,
    properties?: Record<string, any>,
  ) {
    try {
      const onboardingEvent = this.onboardingEventRepo.create({
        userId,
        event,
        properties: properties ?? {},
      });
      await this.onboardingEventRepo.save(onboardingEvent);
      this.logger.log(`用户 ${userId} 入驻事件: ${event}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`记录入驻事件失败: ${error}`);
      return { success: false, error: '记录失败' };
    }
  }
}
