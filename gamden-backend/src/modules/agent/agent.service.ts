import { Injectable } from '@nestjs/common';

/**
 * Agent 模块（运营/代理体系）V1.0 占位
 * 后续用于：代理推广统计、佣金结算、用户归属关系
 */
@Injectable()
export class AgentService {
  getStatus() {
    return { status: 'pending', message: 'V1.0 暂未上线' };
  }
}
