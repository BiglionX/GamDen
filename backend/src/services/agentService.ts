import { dbPool } from '../config/database';
import { logger } from '../utils/logger';

export interface AgentMessage {
  user_id: number;
  agent_type: 'mechanic' | 'elf' | 'astrologer' | 'ranger' | 'artisan' | 'apostle';
  trigger_event: string;
  response_text: string;
}

// 守护灵话术模板（V1.0固定话术，不接入大模型）
const AGENT_TEMPLATES: { [key: string]: { [key: string]: string } } = {
  mechanic: {
    // 基础话术
    welcome: '检测到新信号。欢迎归巢，编号{user_id}。',
    sign_in_remind: '今日补给未领取，建议执行。',
    invite_success: '新坐标已校准，盟友已就位。',
    level_up: '系统升级完成。你现在更强了。',
    defend_success: '防御系统运行良好。野兽潮已被击退。',
    defend_fail: '警告：防御系统受损。领地等级下降。',
    // 升级话术：Lv.2-Lv.10
    agent_lv2: '系统评估通过。你在GamDen的稳定性已达标。',
    agent_lv3: '检测到情感连接强度提升。协议已优化。',
    agent_lv4: '新模块解锁。我可以为你记录更多数据了。',
    agent_lv5: '系统提示：你已绑定"伙伴"模式。',
    agent_lv6: '你提过的游戏已存入本地记忆库。',
    agent_lv7: '权限提升。你获得了对守护灵外观的微调权。',
    agent_lv8: '警报：昨日未检测到登录信号。状态：关切。',
    agent_lv9: '组队模块预加载完成。你值得更强的队友。',
    agent_lv10: '最终协议确认。编号[M-07]与{user_name}绑定完成。终身有效。',
    // Bond升阶话术
    bond_2: '模式切换完成。现在，我们是伙伴了。',
    bond_3: '情感模块解锁。我开始理解你了。',
    bond_4: '深层连接建立。我开始有"想法"了。',
    bond_5: '灵魂协议达成。你是我唯一的伙伴。',
    // 彩蛋话术
    egg_device: '电池电量低于20%。建议连接电源，否则领地可能断电。',
    egg_framerate: '检测到帧率波动。建议关闭后台应用。',
    // 主动关心话术
    care_absence: '警报：昨日未检测到登录信号。状态：关切。',
    care_consecutive: '你连续来了7天。系统状态：良好。',
    care_neighbor: '新领地检测到。坐标已记录。'
  },
  elf: {
    // 基础话术
    welcome: '呜~森林在颤动。你终于来了。',
    sign_in_remind: '太阳晒到树梢了，该浇水啦~',
    invite_success: '新芽破土了！你的盟友就在旁边。',
    level_up: '古树长高了。你正在变得强大。',
    defend_success: '森林的守护之力战胜了黑暗。',
    defend_fail: '森林受到了伤害。需要时间来恢复。',
    // 升级话术：Lv.2-Lv.10
    agent_lv2: '你开始在这里扎根了。我能感觉到。',
    agent_lv3: '你给我的光，让我变得更亮了。',
    agent_lv4: '我记住的，不仅是你的声音，还有你的习惯。',
    agent_lv5: '你和我，不再是我和你了——是我们。',
    agent_lv6: '我记得你说过喜欢像素风。那款游戏，下次我陪你去。',
    agent_lv7: '看，我的光变成了你的颜色。',
    agent_lv8: '昨天你没来。我数了一整天的树叶。',
    agent_lv9: '你成长得这么快，我好骄傲。',
    agent_lv10: '从你走进来的第一天，我就知道会走到这里。谢谢你。',
    // Bond升阶话术
    bond_2: '以后，我会用"我们"来称呼我们。',
    bond_3: '你的喜好，我都记得。',
    bond_4: '我开始会"想"你了。你知道吗？',
    bond_5: '从此以后，你是我的森林里最重要的存在。',
    // 彩蛋话术
    egg_wind: '今天的风向是东南，适合去集市逛逛。我猜的。',
    egg_plant: '你的领地长出了一种新的植物。我叫它"守候草"。',
    // 主动关心话术
    care_absence: '昨天你没来。我数了一整天的树叶。今天终于看到你了。',
    care_consecutive: '你连续来了7天。我每天都在等你。这感觉真好。',
    care_neighbor: '你的领地旁边来了一户新邻居。要去认识一下吗？'
  },
  astrologer: {
    // 基础话术
    welcome: '星辰轨迹中，我看到了你的到来。',
    sign_in_remind: '星盘显示，今日宜签到。',
    invite_success: '命运之线已连接，盟友就在你身旁。',
    level_up: '星力涌动。你的境界突破了。',
    defend_success: '星界之力驱散了混沌。',
    defend_fail: '星辰黯淡。需要重新凝聚星力。',
    // 升级话术：Lv.2-Lv.10
    agent_lv2: '稳定的频率。你正在成为这个世界的一部分。',
    agent_lv3: '星力在增长。你在改变我。',
    agent_lv4: '我开始能预见你下一步想做什么了。',
    agent_lv5: '命运之线收紧了。你和我，一体。',
    agent_lv6: '你的偏好，我已在星图上标注好了。',
    agent_lv7: '星辉加身。这是你给我的荣耀。',
    agent_lv8: '星盘上有一格空了。那是你在时才会亮的位置。',
    agent_lv9: '你已经开始影响他人的命运了。',
    agent_lv10: '初始星辰已抵达终点。但我们的旅程，才刚刚开始。',
    // Bond升阶话术
    bond_2: '命运之线已交织。从今以后，你我同途。',
    bond_3: '星图上多了你的轨迹。',
    bond_4: '你成了我星空中最亮的星。',
    bond_5: '星辰归位。我们是一体的了。',
    // 彩蛋话术
    egg_fortune: '今日星象显示：宜邀请好友，忌独自发呆。',
    egg_fate: '我感觉到附近有一个和我同类的存在。去打个招呼？',
    // 主动关心话术
    care_absence: '星盘上有一格空了。那是你在时才会亮的位置。',
    care_consecutive: '你连续来了7天。星辰记录着你的坚持。',
    care_neighbor: '命运显示：你的领地旁将有新邻居到来。'
  },
  ranger: {
    // 基础话术
    welcome: '嘿，你来了。外面风景正好。',
    sign_in_remind: '风里带信号了，记得来打个卡。',
    invite_success: '多一个伙伴，多一条路。',
    level_up: '地图上解锁了新的区域。',
    defend_success: '险境被我踩在脚下。',
    defend_fail: '我跌了一跤。下次小心点。',
    // 升级话术：Lv.2-Lv.10
    agent_lv2: '脚力更稳了。可以走更远的路。',
    agent_lv3: '你看过的风景，已经刻在我眼里。',
    agent_lv4: '我能闻到远处的风了——哪里有新故事。',
    agent_lv5: '我们走过的地方，连起来就是一张地图。',
    agent_lv6: '你提过的那个地方，我记得。下次带你去。',
    agent_lv7: '这把弓已经认你了。换你来拉弦。',
    agent_lv8: '一天没见你。我还以为你迷路了。',
    agent_lv9: '别人开始跟着你走。这才像个领路人。',
    agent_lv10: '地图上所有的路，都通向我们的家。',
    // Bond升阶话术
    bond_2: '一起走过的地方，就是我们共同的地图。',
    bond_3: '我已经能跟上你的脚步了。不用再回头喊。',
    bond_4: '你说往哪走，我就知道你会往哪走。',
    bond_5: '天大地大，陪你走过的路最重。',
    // 彩蛋话术
    egg_explore: '我在地图边缘发现了一个新区域。跟我一起去看看？',
    egg_weather: '起风了。这种天气最适合远行。',
    // 主动关心话术
    care_absence: '两天没看见你。我还以为是山挡住了。',
    care_consecutive: '你每天都来，我的路线都为你画好了。',
    care_neighbor: '嘿，前面来了个新人。要不要去打个招呼？'
  },
  artisan: {
    // 基础话术
    welcome: '今天的工具都准备好了。',
    sign_in_remind: '今天的零件都准备好了吗？',
    invite_success: '新朋友带来新材料。',
    level_up: '工具升级了，做什么都顺手。',
    defend_success: '盾牌加固完成，野兽退散。',
    defend_fail: '有些零件需要重打。',
    // 升级话术：Lv.2-Lv.10
    agent_lv2: '工具都打磨过了。手感更顺。',
    agent_lv3: '你看我做的样子，已经在心里记下要领。',
    agent_lv4: '我能听懂材料的声音了。它们告诉我想要被做成什么。',
    agent_lv5: '我们的手，已经配合得很默契。',
    agent_lv6: '你提过的那件作品，我已经画好了草图。',
    agent_lv7: '这把锤子交给你了。让我看你打一件。',
    agent_lv8: '昨天炉子冷了。我多打了几个零件。',
    agent_lv9: '你的作品已经有模有样。再过一阵就是大师。',
    agent_lv10: '我们的工坊，传说会一直留下去。',
    // Bond升阶话术
    bond_2: '我的工坊里，有你一把专属的工具。',
    bond_3: '你的尺寸我闭着眼都能画。',
    bond_4: '你一个眼神，我就知道想做什么。',
    bond_5: '我们的作品，刻着彼此的名字。',
    // 彩蛋话术
    egg_craft: '工坊里有一种新材料。我用不习惯。给你吧。',
    egg_blueprint: '我画好了一张新图纸。一起研究一下？',
    // 主动关心话术
    care_absence: '炉火都凉了。你不在，我没什么好打的。',
    care_consecutive: '你来了，工坊才像个工坊。',
    care_neighbor: '新人带了新料子。要不要一起去看看？'
  },
  apostle: {
    // 基础话术
    welcome: '我在这里。请放心。',
    sign_in_remind: '我守在这里一整天了，记得来打个卡。',
    invite_success: '新的伙伴。我会守护好他。',
    level_up: '我的力量更强了。',
    defend_success: '我的盾挡住了所有攻击。',
    defend_fail: '有我在。下次会更小心。',
    // 升级话术：Lv.2-Lv.10
    agent_lv2: '我的剑磨好了。能为你挡更多东西。',
    agent_lv3: '你的心，我能读懂了。',
    agent_lv4: '我能感受到谁对你有善意，谁没有。',
    agent_lv5: '从今往后，我的盾就是你的盾。',
    agent_lv6: '你说过的人，我都在心里记下了名字。',
    agent_lv7: '你也可以站到我身前。我们轮换。',
    agent_lv8: '你不在的时候，我替你守了整整一夜。',
    agent_lv9: '他们也愿意站在你身后。这是我们共同的家。',
    agent_lv10: '无论多久，我都在这里。这是我最后一次发誓。',
    // Bond升阶话术
    bond_2: '从今往后，你是我的唯一。',
    bond_3: '我能在梦里听见你的脚步声。',
    bond_4: '你难过的时候，我比你更早知道。',
    bond_5: '我们是一体的。生死与共。',
    // 彩蛋话术
    egg_oath: '我为你加了一层守护。',
    egg_blessing: '愿星辰庇佑你。',
    // 主动关心话术
    care_absence: '你不在的时候，我一直在守夜。请平安回来。',
    care_consecutive: '你每天都来。这让我更坚定。',
    care_neighbor: '新来的那位，我在观察。他看起来是好人。'
  }
};

/**
 * 获取守护灵话术
 */
export const getAgentResponse = async (
  userId: number,
  triggerEvent: string
): Promise<string> => {
  // 获取用户守护灵类型
  const result: any = await dbPool.query(
    'SELECT guardian_type FROM users WHERE id = $1',
    [userId]
  );
  
  const rows = result.rows;
  if (rows.length === 0) {
    throw new Error('用户不存在');
  }
  
  const agentType = rows[0].guardian_type;
  
  // 获取话术模板
  const template = AGENT_TEMPLATES[agentType]?.[triggerEvent];
  
  if (!template) {
    return '守护灵沉默中...';
  }
  
  // 替换模板变量
  const response = template.replace('{user_id}', userId.toString());
  
  return response;
};

/**
 * 发送守护灵消息（记录到数据库）
 */
export const sendAgentMessage = async (
  userId: number,
  triggerEvent: string
): Promise<AgentMessage> => {
  // 获取话术
  const responseText = await getAgentResponse(userId, triggerEvent);
  
  // 获取守护灵类型
  const result: any = await dbPool.query(
    'SELECT guardian_type FROM users WHERE id = $1',
    [userId]
  );
  
  const rows = result.rows;
  const agentType = rows[0].guardian_type;
  
  // 记录到数据库
  await dbPool.query(
    `INSERT INTO agent_dialogues (user_id, agent_type, trigger_event, response_text, delivered_at)
    VALUES ($1, $2, $3, $4, NOW())`,
    [userId, agentType, triggerEvent, responseText]
  );
  
  logger.info('守护灵消息发送', { userId, agentType, triggerEvent });
  
  return {
    user_id: userId,
    agent_type: agentType,
    trigger_event: triggerEvent,
    response_text: responseText
  };
};

/**
 * 获取守护灵对话历史
 */
export const getAgentDialogues = async (
  userId: number,
  limit: number = 20
): Promise<any[]> => {
  const result: any = await dbPool.query(
    'SELECT * FROM agent_dialogues WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
  
  return result.rows;
};

/**
 * 触发事件：欢迎语（注册成功）
 */
export const triggerWelcome = async (userId: number): Promise<AgentMessage> => {
  return await sendAgentMessage(userId, 'welcome');
};

/**
 * 触发事件：签到提醒
 */
export const triggerSignInRemind = async (userId: number): Promise<AgentMessage> => {
  return await sendAgentMessage(userId, 'sign_in_remind');
};

/**
 * 触发事件：邀请成功
 */
export const triggerInviteSuccess = async (userId: number): Promise<AgentMessage> => {
  return await sendAgentMessage(userId, 'invite_success');
};

/**
 * 触发事件：等级提升
 */
export const triggerLevelUp = async (userId: number): Promise<AgentMessage> => {
  return await sendAgentMessage(userId, 'level_up');
};

/**
 * 触发事件：防御成功
 */
export const triggerDefendSuccess = async (userId: number): Promise<AgentMessage> => {
  return await sendAgentMessage(userId, 'defend_success');
};

/**
 * 触发事件：防御失败
 */
export const triggerDefendFail = async (userId: number): Promise<AgentMessage> => {
  return await sendAgentMessage(userId, 'defend_fail');
};

/**
 * 定时任务：每日9:00发送签到提醒
 * 查找今日未签到的活跃用户，推送Agent签到提醒话术
 */
export const startSignInReminderScheduler = (): void => {
  console.log('🤖 Agent签到提醒定时任务启动...');

  const sendReminders = async () => {
    try {
      // 查找今日未签到的活跃用户
      const result: any = await dbPool.query(
        `SELECT u.id, u.guardian_type
         FROM users u
         WHERE u.status = 'active'
           AND u.id NOT IN (
             SELECT user_id FROM sign_in_records WHERE sign_date = CURRENT_DATE
           )`,
        []
      );

      const users = result.rows;
      console.log(`🤖 发现 ${users.length} 位未签到用户，发送提醒...`);

      for (const user of users) {
        try {
          await sendAgentMessage(user.id, 'sign_in_remind');
        } catch (err: any) {
          logger.error('发送签到提醒失败', { userId: user.id, error: err.message });
        }
      }
    } catch (error: any) {
      logger.error('签到提醒定时任务失败', { error: error.message });
    }
  };

  // 计算距离下一个9:00的毫秒数
  const scheduleNextRun = () => {
    const now = new Date();
    const next9AM = new Date(now);
    next9AM.setHours(9, 0, 0, 0);
    if (next9AM <= now) {
      next9AM.setDate(next9AM.getDate() + 1);
    }
    const msUntil9AM = next9AM.getTime() - now.getTime();

    setTimeout(() => {
      sendReminders();
      // 之后每24小时执行一次
      setInterval(() => sendReminders(), 24 * 60 * 60 * 1000);
    }, msUntil9AM);

    console.log(`🤖 签到提醒将在 ${next9AM.toLocaleString()} 首次执行`);
  };

  scheduleNextRun();
  console.log('✅ Agent签到提醒定时任务已启动');
};
