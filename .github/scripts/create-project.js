#!/usr/bin/env node
/**
 * GamDen V1.0 - GitHub Project 自动创建脚本
 * 
 * 使用方式：
 *   node create-project.js
 *
 * 环境变量（需提前配置）：
 *   GITHUB_TOKEN   - GitHub Personal Access Token (需要 project:write 权限)
 *   GITHUB_OWNER  - GitHub 用户名或组织名
 *   GITHUB_REPO   - 仓库名（如 GamDen）
 */

const https = require('https');

// ========== 配置区 ==========
const CONFIG = {
  owner: process.env.GITHUB_OWNER || 'YOUR_USERNAME',
  repo: process.env.GITHUB_REPO || 'GamDen',
  token: process.env.GITHUB_TOKEN || '',
  projectName: 'GamDen V1.0 开发看板',
  projectDesc: '游戏巢穴社区 V1.0 开发任务看板',
};

// ========== GitHub GraphQL API 助手 ==========
function githubGraphQL(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });
    const options = {
      hostname: 'api.github.com',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.token}`,
        'User-Agent': 'GamDen-Project-Creator',
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(body);
        } catch (e) {
          reject(new Error(`GitHub API 返回非 JSON 响应（HTTP ${res.statusCode}）:\n${body.substring(0, 500)}`));
          return;
        }
        if (json.errors) {
          reject(new Error(`GitHub API 错误:\n${JSON.stringify(json.errors, null, 2)}`));
        } else {
          resolve(json.data);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function githubREST(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `token ${CONFIG.token}`,
        'User-Agent': 'GamDen-Project-Creator',
        'Accept': 'application/vnd.github.inertia-preview+json',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': data.length } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: body ? JSON.parse(body) : {} });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ========== 主流程 ==========

// 获取用户的 Node ID（GitHub GraphQL 需要 node ID 而不是用户名）
async function getOwnerNodeId() {
  console.log('🔍 查询 owner node ID...');
  const query = `
    query {
      viewer {
        id
        login
      }
    }
  `;
  const data = await githubGraphQL(query, {});
  if (data.viewer.login.toLowerCase() !== CONFIG.owner.toLowerCase()) {
    console.warn(`⚠️  警告：Token 所属用户(${data.viewer.login}) 与配置的 owner(${CONFIG.owner}) 不一致`);
  }
  console.log(`✅ Owner Node ID: ${data.viewer.id}`);
  return data.viewer.id;
}

// Step 1: 创建 GitHub Project (v2 / Projects Next)
async function createProject(ownerId) {
  console.log('📦 创建 GitHub Project...');
  const mutation = `
    mutation($ownerId: ID!, $title: String!, $description: String) {
      createProjectV2(input: { ownerId: $ownerId, title: $title, description: $description }) {
        projectV2 {
          id
          number
          url
        }
      }
    }
  `;
  const data = await githubGraphQL(mutation, {
    ownerId: ownerId,
    title: CONFIG.projectName,
    description: CONFIG.projectDesc,
  });
  if (!data.createProjectV2) {
    throw new Error('创建 Project 失败：' + JSON.stringify(data));
  }
  const project = data.createProjectV2.projectV2;
  console.log(`✅ Project 已创建: ${project.url}`);
  return project;
}

// Step 2: 创建自定义字段（迭代/优先级）
async function setupProjectFields(projectId) {
  console.log('🏗️  配置 Project 字段...');

  const mutations = [
    // 优先级字段（单选）
    {
      query: `
        mutation($projectId: ID!) {
          createProjectV2Field(input: {
            projectId: $projectId
            dataType: SINGLE_SELECT
            name: "优先级"
            singleSelectOptions: [
              { name: "🔴 P0 - 核心阻塞", color: RED },
              { name: "🟠 P1 - 高优先级", color: ORANGE },
              { name: "🟡 P2 - 中优先级", color: YELLOW },
              { name: "🟢 P3 - 低优先级", color: GREEN }
            ]
          }) {
            projectV2Field { ... on ProjectV2SingleSelectField { id } }
          }
        }
      `,
      vars: { projectId },
    },
    // 阶段字段（单选）
    {
      query: `
        mutation($projectId: ID!) {
          createProjectV2Field(input: {
            projectId: $projectId
            dataType: SINGLE_SELECT
            name: "开发阶段"
            singleSelectOptions: [
              { name: "📋 待规划", color: GRAY },
              { name: "🔄 进行中", color: BLUE },
              { name: "👀 待评审", color: YELLOW },
              { name: "✅ 已完成", color: GREEN },
              { name: "🚫 已阻塞", color: RED }
            ]
          }) {
            projectV2Field { ... on ProjectV2SingleSelectField { id } }
          }
        }
      `,
      vars: { projectId },
    },
  ];

  for (const m of mutations) {
    await githubGraphQL(m.query, m.vars);
  }
  console.log('✅ 字段配置完成');
}

// Step 3: 批量创建 Issues
async function createIssues() {
  console.log('📝 批量创建 Issues...');

  const issues = [
    // ===== 阶段一：基础设施与基础模块 =====
    { title: '[P0] 项目初始化 - Monorepo结构搭建', body: issueBody('阶段一', '搭建 Monorepo，packages: backend / web / admin / mini-program / shared', ['infra']), labels: ['P0', 'infra'] },
    { title: '[P0] 数据库初始化 - 建表SQL执行', body: issueBody('阶段一', '执行 users / invite_records / territory_evolution / clubs / club_posts / agent_dialogues / mini_programs 等表', ['infra', 'backend']), labels: ['P0', 'backend', 'database'] },
    { title: '[P0] 认证模块API - 注册/登录/JWT', body: issueBody('阶段一', 'POST /api/auth/register|login|refresh，邀请码校验，bcrypt密码加密，JWT Token', ['backend', 'auth']), labels: ['P0', 'backend', 'api'] },
    { title: '[P0] 邀请码生成与校验逻辑', body: issueBody('阶段一', '6位字母数字，有效期30天，唯一性校验，一次性使用', ['backend', 'invite']), labels: ['P0', 'backend'] },
    { title: '[P0] 坐标分配算法实现', body: issueBody('阶段一', '注册时分配坐标，保证与邀请人±10格内，防重叠（向右偏移+1），范围-1000~+1000', ['backend', 'territory']), labels: ['P0', 'backend', 'algorithm'] },
    { title: '[P1] 环境变量与配置文件', body: issueBody('阶段一', '.env 文件，数据库/Redis/第三方API配置，next.config.ts，docker-compose.yml', ['infra', 'config']), labels: ['P1', 'infra'] },
    { title: '[P1] Docker Compose 容器编排', body: issueBody('阶段一', 'backend / mysql / redis / openim-server 容器化编排，.env 文件挂载', ['infra', 'docker']), labels: ['P1', 'infra'] },
    { title: '[P1] 统一错误码体系', body: issueBody('阶段一', '错误码 200~1008，统一响应格式 { code, message, data }', ['backend']), labels: ['P1', 'backend'] },

    // ===== 阶段二：核心玩法功能 =====
    { title: '[P0] 领地信息API', body: issueBody('阶段二', 'GET /api/territory/info，返回等级/经验/坐标/元素图URL/金币/签名', ['backend', 'territory', 'api']), labels: ['P0', 'backend', 'api'] },
    { title: '[P0] 领地升级逻辑与经验系统', body: issueBody('阶段二', '经验值累计，等级阈值判断 Lv.1~Lv.5，升级触发 Agent 通知', ['backend', 'territory']), labels: ['P0', 'backend'] },
    { title: '[P0] 地图邻居API', body: issueBody('阶段二', 'GET /api/map/nearby?range=10，查看坐标±N格范围内邻居列表', ['backend', 'map', 'api']), labels: ['P0', 'backend', 'api'] },
    { title: '[P0] 守护灵话术系统', body: issueBody('阶段二', 'agent_templates 配置表，按守护灵类型+触发事件读取话术，V1.0固定模板不接大模型', ['backend', 'agent']), labels: ['P0', 'backend'] },
    { title: '[P0] Agent通知推送（OpenIM自定义消息）', body: issueBody('阶段二', '通过 OpenIM 自定义消息 customType=1001 推送 Agent 通知，带守护灵头像', ['backend', 'agent', 'openim']), labels: ['P0', 'backend', 'openim'] },
    { title: '[P1] 签到功能', body: issueBody('阶段二', '每日签到+10金币，连续签到额外+5（上限30），防止重复签到', ['backend', 'feature']), labels: ['P1', 'backend', 'feature'] },
    { title: '[P1] 野兽潮定时任务', body: issueBody('阶段二', '每小时检查，20%概率触发，防御结算（Lv.3以上100%成功），金币奖励/等级扣除', ['backend', 'beast', 'cron']), labels: ['P1', 'backend', 'feature'] },
    { title: '[P1] 野兽潮配置后台接口', body: issueBody('阶段二', 'beast_config 表 CRUD，刷新间隔/概率/强度范围/影响范围/防御失败概率', ['backend', 'config']), labels: ['P1', 'backend'] },
    { title: '[P1] 领地元素图资源上传', body: issueBody('阶段二', '3种守护灵 × 5级 = 15张像素图，上传COS，记录URL到 territory_evolution', ['assets', 'backend']), labels: ['P1', 'assets'] },

    // ===== 阶段三：邀请裂变与社交 =====
    { title: '[P0] 邀请记录API与进度接口', body: issueBody('阶段三', '记录邀请关系 invite_records，is_active 标记（活跃7天变true），GET /api/invite/progress', ['backend', 'invite', 'api']), labels: ['P0', 'backend', 'api'] },
    { title: '[P0] OpenIM Docker部署与基础对接', body: issueBody('阶段三', 'Docker部署OpenIM Server，用户体系与业务后台打通（相同userID）', ['infra', 'openim']), labels: ['P0', 'infra', 'openim'] },
    { title: '[P0] OpenIM Webhook中间件', body: issueBody('阶段三', '监听 OpenIM 用户注册事件，同步创建领地，5秒内返回响应', ['backend', 'openim', 'webhook']), labels: ['P0', 'backend', 'openim'] },
    { title: '[P0] 单聊/群聊基础功能接入', body: issueBody('阶段三', 'OpenIM SDK 接入，单聊+群聊，App端聊天界面', ['frontend', 'openim', 'chat']), labels: ['P0', 'frontend', 'openim'] },
    { title: '[P1] 俱乐部（贴吧）API', body: issueBody('阶段三', '创建俱乐部（Lv.2+），发帖（500字）/回帖（200字），club_posts status 审核状态', ['backend', 'club', 'api']), labels: ['P1', 'backend', 'api'] },
    { title: '[P1] 俱乐部对应OpenIM群组', body: issueBody('阶段三', '创建俱乐部时自动创建 OpenIM 群组，owner 为群主，club_id ↔ group_id 映射', ['backend', 'club', 'openim']), labels: ['P1', 'backend', 'openim'] },
    { title: '[P1] 腾讯云内容安全API接入 - AI初审', body: issueBody('阶段三', '接入腾讯云TMS，置信度>90%通过，70%~90%人工复审，<70%拒绝', ['backend', 'security', 'ai']), labels: ['P1', 'backend', 'security'] },
    { title: '[P1] 人工复审池后台接口', body: issueBody('阶段三', '置信度70%~90%进入复审池，后台审核通过/拒绝接口，违规梯度执行', ['backend', 'moderation']), labels: ['P1', 'backend'] },

    // ===== 阶段四：商城与后台管理 =====
    { title: '[P0] 金币系统完善', body: issueBody('阶段四', '注册/签到/发帖/回帖/邀请/防御野兽潮金币发放，余额上限99999，不可转账', ['backend', 'gold', 'feature']), labels: ['P0', 'backend', 'feature'] },
    { title: '[P0] 商城兑换API', body: issueBody('阶段四', '头像框200金币/气泡150金币/特殊签名300金币30天，金币不足错误码1003', ['backend', 'shop', 'api']), labels: ['P0', 'backend', 'api'] },
    { title: '[P0] 后台管理 - 用户管理页面', body: issueBody('阶段四', 'React + Ant Design Pro，用户列表（筛选/搜索/导出），冻结/解冻，邀请关系链树状图', ['admin', 'frontend']), labels: ['P0', 'admin', 'frontend'] },
    { title: '[P0] 后台管理 - 内容审核页面', body: issueBody('阶段四', '待审核池，通过/拒绝操作，违规梯度执行（警告→禁言→冻结），appeals申诉表', ['admin', 'frontend', 'moderation']), labels: ['P0', 'admin', 'frontend'] },
    { title: '[P1] 后台管理 - 领地与地图监控', body: issueBody('阶段四', '全局热力图（ECharts），手动调整坐标（超级管理员），beast_config配置', ['admin', 'frontend']), labels: ['P1', 'admin', 'frontend'] },
    { title: '[P1] 后台管理 - 俱乐部管理', body: issueBody('阶段四', '创建/关闭俱乐部，指定管理员，活跃度查看（成员数/帖子数/最后活跃时间）', ['admin', 'frontend']), labels: ['P1', 'admin', 'frontend'] },
    { title: '[P1] 后台管理 - 数据看板', body: issueBody('阶段四', 'DAU/新增用户/留存率/K因子/等级分布，折线图+饼图+数字卡片（Recharts）', ['admin', 'frontend', 'dashboard']), labels: ['P1', 'admin', 'frontend'] },
    { title: '[P1] 后台管理 - 系统配置页面', body: issueBody('阶段四', '敏感词库管理（增删改查/导入导出），野兽潮参数，金币规则配置，操作日志', ['admin', 'frontend', 'config']), labels: ['P1', 'admin', 'frontend'] },
    { title: '[P1] 操作日志API与查看页面', body: issueBody('阶段四', '所有敏感操作记录 operator_id/action/target/reason/old_value/new_value/timestamp，后台可筛选查看', ['backend', 'admin', 'log']), labels: ['P1', 'backend', 'admin'] },

    // ===== 阶段五：营销H5与小程序 =====
    { title: '[P0] 营销H5首屏页面', body: issueBody('阶段五', 'React+Taro，动态古风地图剪影CSS动画，主文案，CTA按钮，CDN加速，首屏≤1秒', ['frontend', 'h5', 'marketing']), labels: ['P0', 'frontend', 'h5'] },
    { title: '[P0] H5申请表单页', body: issueBody('阶段五', '昵称/手机号/设备型号/常用游戏表单，前端验证，后端重复性校验', ['frontend', 'h5', 'marketing']), labels: ['P0', 'frontend', 'h5'] },
    { title: '[P0] H5审核流程（自动+手动）', body: issueBody('阶段五', '自动审核：手机号合法即通过，生成邀请码，短信通知；手动审核：后台审核列表', ['backend', 'h5', 'marketing']), labels: ['P0', 'backend', 'h5'] },
    { title: '[P0] H5邀请码输入与App下载页', body: issueBody('阶段五', '输入邀请码→验证→跳转下载页，iOS跳转TestFlight/App Store，Android下载APK', ['frontend', 'h5', 'marketing']), labels: ['P0', 'frontend', 'h5'] },
    { title: '[P0] 微信小程序 - 领地展示页', body: issueBody('阶段五', 'pages/territory/index，领地缩略图/名称/等级/入驻天数/邀请进度条/用户签名，像素风/古风', ['frontend', 'miniprogram']), labels: ['P0', 'frontend', 'miniprogram'] },
    { title: '[P0] 微信小程序 - 分享功能', body: issueBody('阶段五', '生成带参数小程序码（user_id），调用wxacode.getUnlimited，分享到微信群/朋友圈', ['frontend', 'miniprogram', 'wechat']), labels: ['P0', 'frontend', 'miniprogram'] },
    { title: '[P0] 微信小程序 - 引流策略', body: issueBody('阶段五', '所有按钮引导"打开GamDen App"，弹窗下载提示，小程序内不可注册/发帖/IM', ['frontend', 'miniprogram', 'marketing']), labels: ['P0', 'frontend', 'miniprogram'] },
    { title: '[P1] 小程序自动生成逻辑', body: issueBody('阶段五', '邀请≥3人且is_active=true，自动生成小程序码并通知用户，mini_programs表记录，防止重复生成', ['backend', 'miniprogram']), labels: ['P1', 'backend', 'miniprogram'] },
    { title: '[P1] 数据统计埋点', body: issueBody('阶段五', 'H5访问量/小程序访问量/App下载转化率/注册转化率，接入微信小程序数据分析', ['backend', 'analytics']), labels: ['P1', 'backend', 'analytics'] },

    // ===== 阶段六：App多端开发 =====
    { title: '[P0] iOS App - 登录/注册页（SwiftUI）', body: issueBody('阶段六', '邀请码输入，守护灵选择（机械师/精灵/占星师），注册成功跳转领地主页', ['ios', 'frontend']), labels: ['P0', 'ios', 'frontend'] },
    { title: '[P0] iOS App - 领地主页（SwiftUI）', body: issueBody('阶段六', '领地元素图展示，等级/经验进度条，签到按钮，金币余额，守护灵话术气泡', ['ios', 'frontend']), labels: ['P0', 'ios', 'frontend'] },
    { title: '[P0] iOS App - 地图页（SwiftUI）', body: issueBody('阶段六', '查看周围邻居（±10格），邻居头像+签名+等级，点击查看详情', ['ios', 'frontend', 'map']), labels: ['P0', 'ios', 'frontend'] },
    { title: '[P0] iOS App - 俱乐部列表/详情/发帖（SwiftUI）', body: issueBody('阶段六', '俱乐部列表，创建俱乐部（Lv.2+），俱乐部详情页，发帖/回帖，点赞', ['ios', 'frontend', 'club']), labels: ['P0', 'ios', 'frontend'] },
    { title: '[P0] iOS App - IM聊天页（SwiftUI + OpenIM SDK）', body: issueBody('阶段六', '单聊列表，群聊列表，聊天界面（文本消息），OpenIM iOS SDK接入', ['ios', 'frontend', 'chat', 'openim']), labels: ['P0', 'ios', 'frontend', 'openim'] },
    { title: '[P0] iOS App - 商城页（SwiftUI）', body: issueBody('阶段六', '金币余额展示，道具列表（头像框/气泡/特殊签名），兑换确认弹窗', ['ios', 'frontend', 'shop']), labels: ['P0', 'ios', 'frontend'] },
    { title: '[P0] iOS App - 个人中心（SwiftUI）', body: issueBody('阶段六', '用户信息展示，邀请进度，邀请码分享，设置（修改密码/注销账号）', ['ios', 'frontend']), labels: ['P0', 'ios', 'frontend'] },
    { title: '[P0] Android App - 登录/注册页（React Native）', body: issueBody('阶段六', '与iOS功能对齐，RN实现，邀请码输入，守护灵选择', ['android', 'frontend', 'rn']), labels: ['P0', 'android', 'frontend'] },
    { title: '[P0] Android App - 领地主页（React Native）', body: issueBody('阶段六', '领地元素图展示，等级/经验进度条，签到，金币，守护灵话术', ['android', 'frontend', 'rn']), labels: ['P0', 'android', 'frontend'] },
    { title: '[P0] Android App - 地图页（React Native）', body: issueBody('阶段六', '查看周围邻居，邻居详情，与iOS体验一致', ['android', 'frontend', 'map', 'rn']), labels: ['P0', 'android', 'frontend'] },
    { title: '[P0] Android App - 俱乐部/IM/商城/个人中心（RN）', body: issueBody('阶段六', '俱乐部列表/详情/发帖，IM聊天（OpenIM RN SDK），商城，个人中心，与iOS功能对齐', ['android', 'frontend', 'rn']), labels: ['P0', 'android', 'frontend'] },
    { title: '[P1] App全面屏适配', body: issueBody('阶段六', 'iPhone刘海屏/S dynamic Island，Android挖孔屏，SafeArea适配', ['ios', 'android', 'ui']), labels: ['P1', 'ios', 'android', 'ui'] },

    // ===== 阶段七：测试与部署 =====
    { title: '[P0] 接口联调与Postman自动化测试', body: issueBody('阶段七', '前后端接口联调，Postman Collection编写，自动化测试脚本', ['test', 'api']), labels: ['P0', 'test'] },
    { title: '[P0] 功能测试 - 完整用户路径走通', body: issueBody('阶段七', '注册流程/邀请裂变/领地升级/IM聊天/内容审核 完整E2E测试', ['test', 'e2e']), labels: ['P0', 'test'] },
    { title: '[P1] 性能测试', body: issueBody('阶段七', 'API P95≤500ms，App冷启动≤2秒，地图页≤2秒，Redis缓存命中率≥90%', ['test', 'performance']), labels: ['P1', 'test'] },
    { title: '[P1] 安全测试', body: issueBody('阶段七', 'JWT过期/刷新，SQL注入防护，XSS防护，API限流（100次/分钟/用户）验证', ['test', 'security']), labels: ['P1', 'test', 'security'] },
    { title: '[P0] Lighthouse部署 - docker compose up', body: issueBody('阶段七', '代码推送GitHub，Lighthouse Integration执行 git pull && docker compose up -d --build，检查容器状态', ['devops', 'deploy']), labels: ['P0', 'devops', 'deploy'] },
    { title: '[P1] 监控接入 - Sentry + Prometheus', body: issueBody('阶段七', 'Sentry错误监控（前端+后端），Prometheus性能指标（/metrics端点），Grafana仪表盘', ['devops', 'monitoring']), labels: ['P1', 'devops', 'monitoring'] },
  ];

  const created = [];
  for (const issue of issues) {
    console.log(`  创建: ${issue.title}`);
    const res = await githubREST('POST', `/repos/${CONFIG.owner}/${CONFIG.repo}/issues`, {
      title: issue.title,
      body: issue.body,
      labels: issue.labels,
    });
    if (res.status === 201) {
      created.push(res.body.number);
      console.log(`  ✅ #${res.body.number}`);
    } else {
      console.log(`  ❌ 失败: ${JSON.stringify(res.body)}`);
    }
    // 避免触发 GitHub API 限流
    await new Promise(r => setTimeout(r, 500));
  }
  console.log(`\n✅ 共创建 ${created.length} 个 Issues`);
  return created;
}

// Issue 内容模板
function issueBody(phase, description, labels) {
  return `## 所属阶段\n${phase}\n\n## 任务描述\n${description}\n\n## 验收标准\n- [ ] API接口实现并完成自测\n- [ ] 单元测试覆盖核心逻辑\n- [ ] 代码提交并通过ESLint/Prettier检查\n- [ ] 关联PR合并到main分支\n\n## 相关文档\n- 产品需求说明书（PRD）V1.0\n- 技术架构与接口文档 V1.0\n\n## 标签\n${labels.join(', ')}`;
}

// ========== 入口 ==========
async function main() {
  if (!CONFIG.token || CONFIG.token === '') {
    console.error('❌ 请设置环境变量 GITHUB_TOKEN');
    process.exit(1);
  }

  try {
    // 0. 获取 owner node ID（GitHub GraphQL 需要）
    const ownerId = await getOwnerNodeId();
    
    // 1. 创建 Project
    const project = await createProject(ownerId);
    
    // 2. 配置 Project 字段
    await setupProjectFields(project.id);
    
    // 3. 批量创建 Issues
    const issueNumbers = await createIssues();
    
    console.log('\n🎉 完成！');
    console.log(`Project: ${project.url}`);
    console.log(`Issues: ${issueNumbers.length} 个`);
    console.log('\n下一步：在 GitHub Project 页面手动将 Issues 添加到看板');
    console.log('提示：可在 Project 设置中创建看板视图（按状态分列）');
  } catch (err) {
    console.error('❌ 错误:', err.message);
    if (err.response) console.error('响应详情:', err.response);
    process.exit(1);
  }
}

main();
