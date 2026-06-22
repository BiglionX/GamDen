// 演示模式：模拟数据（无需数据库）

export const mockUser = {
  user_id: 123456,
  phone: '13800138000',
  nickname: '测试玩家',
  avatar: '',
  guardian_type: 'mechanic', // mechanic | elf | astrologer
  level: 3,
  exp: 250,
  next_level_exp: 300,
  territory_coord_x: 100,
  territory_coord_y: 200,
  icon_url: 'https://gamden.com/icons/mechanic/lv3.png',
  signature: '欢迎来到我的领地！',
  gold_coins: 580,
  role: 'player',
  status: 'active',
  last_login_at: new Date().toISOString(),
  created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString()
};

export const mockNeighbors = [
  {
    user_id: 123457,
    territory_coord_x: 105,
    territory_coord_y: 202,
    level: 2,
    signature: '精灵守护者',
    guardian_type: 'elf',
    nickname: '玩家B',
    avatar: ''
  },
  {
    user_id: 123458,
    territory_coord_x: 95,
    territory_coord_y: 198,
    level: 4,
    signature: '星辰指引我',
    guardian_type: 'astrologer',
    nickname: '玩家C',
    avatar: ''
  },
  {
    user_id: 123459,
    territory_coord_x: 110,
    territory_coord_y: 195,
    level: 1,
    signature: '',
    guardian_type: 'mechanic',
    nickname: '新手玩家',
    avatar: ''
  }
];

export const mockClubs = [
  {
    id: 1,
    name: '原神讨论组',
    game_name: '原神',
    description: '讨论原神游戏的俱乐部',
    owner_id: 123456,
    openim_group_id: 'club_1_1234567890',
    member_count: 15,
    post_count: 8,
    last_active_at: new Date().toISOString(),
    status: 'active',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    name: '王者荣耀战队',
    game_name: '王者荣耀',
    description: '王者荣耀交流群',
    owner_id: 123457,
    openim_group_id: 'club_2_1234567891',
    member_count: 8,
    post_count: 3,
    last_active_at: new Date().toISOString(),
    status: 'active',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const mockPosts = [
  {
    id: 1,
    club_id: 1,
    user_id: 123456,
    content: '大家好！欢迎来到原神讨论组，一起交流游戏心得吧！',
    like_count: 5,
    reply_count: 2,
    status: 'approved',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    nickname: '测试玩家',
    avatar: '',
    guardian_type: 'mechanic'
  },
  {
    id: 2,
    club_id: 1,
    user_id: 123457,
    content: '原神4.0版本什么时候出啊？期待新角色！',
    like_count: 3,
    reply_count: 1,
    status: 'approved',
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    nickname: '玩家B',
    avatar: '',
    guardian_type: 'elf'
  }
];

export const mockInviteProgress = {
  invited_count: 2,
  total_count: 10,
  is_mini_program_unlocked: false,
  invite_list: [
    {
      invitee_id: 123457,
      invitee_nickname: '玩家B',
      invited_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true
    },
    {
      invitee_id: 123458,
      invitee_nickname: '玩家C',
      invited_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: false
    }
  ]
};

export const mockAgentDialogues = [
  {
    id: 1,
    user_id: 123456,
    agent_type: 'mechanic',
    trigger_event: 'welcome',
    response_text: '检测到新信号。欢迎归巢，编号123456。',
    delivered_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 2,
    user_id: 123456,
    agent_type: 'mechanic',
    trigger_event: 'sign_in_remind',
    response_text: '今日补给未领取，建议执行。',
    delivered_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 3,
    user_id: 123456,
    agent_type: 'mechanic',
    trigger_event: 'invite_success',
    response_text: '新坐标已校准，盟友已就位。',
    delivered_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const mockTransactions = [
  {
    id: 1,
    user_id: 123456,
    transaction_type: 'earn',
    amount: 10,
    source: 'sign_in',
    balance_after: 580,
    description: '签到奖励',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 2,
    user_id: 123456,
    transaction_type: 'earn',
    amount: 5,
    source: 'post',
    balance_after: 570,
    description: '发帖奖励',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 3,
    user_id: 123456,
    transaction_type: 'spend',
    amount: 150,
    source: 'exchange_chat_bubble',
    balance_after: 420,
    description: '兑换聊天气泡',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// API模拟响应
export const mockApiResponse = (data: any, delay: number = 500) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        code: 200,
        message: 'success',
        data
      });
    }, delay);
  });
};
