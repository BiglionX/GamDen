#!/usr/bin/env python3
"""
GamDen V1.0 - GitHub Project 自动创建脚本（Python版）
使用方法：
  python create-project.py
环境变量（需提前配置）：
  GITHUB_TOKEN   - GitHub Personal Access Token (需要 project:write 权限)
  GITHUB_OWNER  - GitHub 用户名或组织名
  GITHUB_REPO   - 仓库名（如 GamDen）
"""

import os
import json
import urllib.request
import urllib.error
import time

# ========== 配置区 ==========
TOKEN = os.environ.get('GITHUB_TOKEN', '')
OWNER = os.environ.get('GITHUB_OWNER', 'BiglionX')
REPO = os.environ.get('GITHUB_REPO', 'GamDen')

if not TOKEN:
    print('❌ 请设置环境变量 GITHUB_TOKEN')
    exit(1)

HEADERS = {
    'Authorization': f'Bearer {TOKEN}',
    'User-Agent': 'GamDen-Project-Creator',
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.github.antioch-preview+json',  # Project v2 API preview
}

GRAPHQL_URL = 'https://api.github.com/graphql'
REST_URL = f'https://api.github.com/repos/{OWNER}/{REPO}'

# ========== GitHub GraphQL API 助手 ==========
def graphql(query, variables=None):
    payload = {'query': query}
    if variables:
        payload['variables'] = variables
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        GRAPHQL_URL,
        data=data,
        headers={**HEADERS, 'Content-Length': str(len(data))},
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode('utf-8')
            result = json.loads(body)
            if 'errors' in result:
                raise Exception(f"GraphQL 错误:\n{json.dumps(result['errors'], indent=2)}")
            return result.get('data')
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f'❌ HTTP {e.code}: {body[:500]}')
        raise

def rest_api(method, path, body=None):
    url = f'https://api.github.com{path}' if path.startswith('/') else path
    data = json.dumps(body).encode('utf-8') if body else None
    headers = {**HEADERS}
    if data:
        headers['Content-Length'] = str(len(data))
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return {'status': resp.status, 'body': json.loads(resp.read().decode('utf-8'))}
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8') if e.fp else ''
        print(f'❌ HTTP {e.code}: {body[:500]}')
        return {'status': e.code, 'body': json.loads(body) if body else {}}

# ========== 主流程 ==========

def get_owner_node_id():
    print('🔍 查询 owner node ID...')
    query = '{ viewer { id login } }'
    data = graphql(query)
    login = data['viewer']['login']
    node_id = data['viewer']['id']
    if login.lower() != OWNER.lower():
        print(f'⚠️  警告：Token 所属用户({login}) 与配置的 owner({OWNER}) 不一致')
    print(f'✅ Owner: {login}, Node ID: {node_id}')
    return node_id

def create_project(owner_id):
    print('📦 创建 GitHub Project...')
    query = """
    mutation($ownerId: ID!, $title: String!, $description: String) {
      createProjectV2(input: { ownerId: $ownerId, title: $title, description: $description }) {
        projectV2 {
          id
          number
          url
          title
        }
      }
    }
    """
    variables = {
        'ownerId': owner_id,
        'title': 'GamDen V1.0 开发看板',
        'description': '游戏巢穴社区 V1.0 开发任务看板',
    }
    data = graphql(query, variables)
    project = data['createProjectV2']['projectV2']
    print(f'✅ Project 已创建: {project["url"]}')
    return project

def setup_project_fields(project_id):
    print('🏗️  配置 Project 字段...')
    # 创建优先级字段
    query = """
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
    """
    graphql(query, {'projectId': project_id})
    
    # 创建开发阶段字段
    query2 = """
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
    """
    graphql(query2, {'projectId': project_id})
    print('✅ 字段配置完成')

def create_issues():
    print('📝 批量创建 Issues...')
    
    issues = [
        # 阶段一：基础设施与基础模块
        ('[P0] 项目初始化 - Monorepo结构搭建', '阶段一：基础设施与基础模块\n\n搭建 Monorepo，packages: backend / web / admin / mini-program / shared', ['P0', 'infra']),
        ('[P0] 数据库初始化 - 建表SQL执行', '阶段一\n\n执行 users / invite_records / territory_evolution / clubs / club_posts / agent_dialogues / mini_programs 等表', ['P0', 'backend', 'database']),
        ('[P0] 认证模块API - 注册/登录/JWT', '阶段一\n\nPOST /api/auth/register|login|refresh，邀请码校验，bcrypt密码加密，JWT Token', ['P0', 'backend', 'api']),
        ('[P0] 邀请码生成与校验逻辑', '阶段一\n\n6位字母数字，有效期30天，唯一性校验，一次性使用', ['P0', 'backend', 'invite']),
        ('[P0] 坐标分配算法实现', '阶段一\n\n注册时分配坐标，保证与邀请人±10格内，防重叠（向右偏移+1），范围-1000~+1000', ['P0', 'backend', 'algorithm', 'territory']),
        ('[P1] 环境变量与配置文件', '阶段一\n\n.env 文件，数据库/Redis/第三方API配置，next.config.ts，docker-compose.yml', ['P1', 'infra', 'config']),
        ('[P1] Docker Compose 容器编排', '阶段一\n\nbackend / mysql / redis / openim-server 容器化编排，.env 文件挂载', ['P1', 'infra', 'docker']),
        ('[P1] 统一错误码体系', '阶段一\n\n错误码 200~1008，统一响应格式 { code, message, data }', ['P1', 'backend']),
        
        # 阶段二：核心玩法功能
        ('[P0] 领地信息API', '阶段二：核心玩法功能\n\nGET /api/territory/info，返回等级/经验/坐标/元素图URL/金币/签名', ['P0', 'backend', 'api', 'territory']),
        ('[P0] 领地升级逻辑与经验系统', '阶段二\n\n经验值累计，等级阈值判断 Lv.1~Lv.5，升级触发 Agent 通知', ['P0', 'backend', 'territory']),
        ('[P0] 地图邻居API', '阶段二\n\nGET /api/map/nearby?range=10，查看坐标±N格范围内邻居列表', ['P0', 'backend', 'api', 'map']),
        ('[P0] 守护灵话术系统', '阶段二\n\nagent_templates 配置表，按守护灵类型+触发事件读取话术，V1.0固定模板不接大模型', ['P0', 'backend', 'agent']),
        ('[P0] Agent通知推送（OpenIM自定义消息）', '阶段二\n\n通过 OpenIM 自定义消息 customType=1001 推送 Agent 通知，带守护灵头像', ['P0', 'backend', 'agent', 'openim']),
        ('[P1] 签到功能', '阶段二\n\n每日签到+10金币，连续签到额外+5（上限30），防止重复签到', ['P1', 'backend', 'feature']),
        ('[P1] 野兽潮定时任务', '阶段二\n\n每小时检查，20%概率触发，防御结算（Lv.3以上100%成功），金币奖励/等级扣除', ['P1', 'backend', 'feature', 'beast']),
        ('[P1] 野兽潮配置后台接口', '阶段二\n\nbeast_config 表 CRUD，刷新间隔/概率/强度范围/影响范围/防御失败概率', ['P1', 'backend', 'config', 'beast']),
        ('[P1] 领地元素图资源上传', '阶段二\n\n3种守护灵 × 5级 = 15张像素图，上传COS，记录URL到 territory_evolution', ['P1', 'assets', 'territory']),
        
        # 阶段三：邀请裂变与社交
        ('[P0] 邀请记录API与进度接口', '阶段三：邀请裂变与社交\n\n记录邀请关系 invite_records，is_active 标记（活跃7天变true），GET /api/invite/progress', ['P0', 'backend', 'api', 'invite']),
        ('[P0] OpenIM Docker部署与基础对接', '阶段三\n\nDocker部署OpenIM Server，用户体系与业务后台打通（相同userID）', ['P0', 'infra', 'openim']),
        ('[P0] OpenIM Webhook中间件', '阶段三\n\n监听 OpenIM 用户注册事件，同步创建领地，5秒内返回响应', ['P0', 'backend', 'openim', 'webhook']),
        ('[P0] 单聊/群聊基础功能接入', '阶段三\n\nOpenIM SDK 接入，单聊+群聊，App端聊天界面', ['P0', 'frontend', 'openim', 'chat']),
        ('[P1] 俱乐部（贴吧）API', '阶段三\n\n创建俱乐部（Lv.2+），发帖（500字）/回帖（200字），club_posts status 审核状态', ['P1', 'backend', 'api', 'club']),
        ('[P1] 俱乐部对应OpenIM群组', '阶段三\n\n创建俱乐部时自动创建 OpenIM 群组，owner 为群主，club_id ↔ group_id 映射', ['P1', 'backend', 'club', 'openim']),
        ('[P1] 腾讯云内容安全API接入 - AI初审', '阶段三\n\n接入腾讯云TMS，置信度>90%通过，70%~90%人工复审，<70%拒绝', ['P1', 'backend', 'security', 'ai']),
        ('[P1] 人工复审池后台接口', '阶段三\n\n置信度70%~90%进入复审池，后台审核通过/拒绝接口，违规梯度执行', ['P1', 'backend', 'moderation']),
        
        # 阶段四：商城与后台管理
        ('[P0] 金币系统完善', '阶段四：商城与后台管理\n\n注册/签到/发帖/回帖/邀请/防御野兽潮金币发放，余额上限99999，不可转账', ['P0', 'backend', 'feature', 'gold']),
        ('[P0] 商城兑换API', '阶段四\n\n头像框200金币/气泡150金币/特殊签名300金币30天，金币不足错误码1003', ['P0', 'backend', 'api', 'shop']),
        ('[P0] 后台管理 - 用户管理页面', '阶段四\n\nReact + Ant Design Pro，用户列表（筛选/搜索/导出），冻结/解冻，邀请关系链树状图', ['P0', 'admin', 'frontend']),
        ('[P0] 后台管理 - 内容审核页面', '阶段四\n\n待审核池，通过/拒绝操作，违规梯度执行（警告→禁言→冻结），appeals申诉表', ['P0', 'admin', 'frontend', 'moderation']),
        ('[P1] 后台管理 - 领地与地图监控', '阶段四\n\n全局热力图（ECharts），手动调整坐标（超级管理员），beast_config配置', ['P1', 'admin', 'frontend', 'map']),
        ('[P1] 后台管理 - 俱乐部管理', '阶段四\n\n创建/关闭俱乐部，指定管理员，活跃度查看（成员数/帖子数/最后活跃时间）', ['P1', 'admin', 'frontend', 'club']),
        ('[P1] 后台管理 - 数据看板', '阶段四\n\nDAU/新增用户/留存率/K因子/等级分布，折线图+饼图+数字卡片（Recharts）', ['P1', 'admin', 'frontend', 'dashboard']),
        ('[P1] 后台管理 - 系统配置页面', '阶段四\n\n敏感词库管理（增删改查/导入导出），野兽潮参数，金币规则配置，操作日志', ['P1', 'admin', 'frontend', 'config']),
        ('[P1] 操作日志API与查看页面', '阶段四\n\n所有敏感操作记录 operator_id/action/target/reason/old_value/new_value/timestamp，后台可筛选查看', ['P1', 'backend', 'admin', 'log']),
        
        # 阶段五：营销H5与小程序
        ('[P0] 营销H5首屏页面', '阶段五：营销H5与小程序\n\nReact+Taro，动态古风地图剪影CSS动画，主文案，CTA按钮，CDN加速，首屏≤1秒', ['P0', 'frontend', 'h5', 'marketing']),
        ('[P0] H5申请表单页', '阶段五\n\n昵称/手机号/设备型号/常用游戏表单，前端验证，后端重复性校验', ['P0', 'frontend', 'h5', 'marketing']),
        ('[P0] H5审核流程（自动+手动）', '阶段五\n\n自动审核：手机号合法即通过，生成邀请码，短信通知；手动审核：后台审核列表', ['P0', 'backend', 'h5', 'marketing']),
        ('[P0] H5邀请码输入与App下载页', '阶段五\n\n输入邀请码→验证→跳转下载页，iOS跳转TestFlight/App Store，Android下载APK', ['P0', 'frontend', 'h5', 'marketing']),
        ('[P0] 微信小程序 - 领地展示页', '阶段五\n\npages/territory/index，领地缩略图/名称/等级/入驻天数/邀请进度条/用户签名，像素风/古风', ['P0', 'frontend', 'miniprogram']),
        ('[P0] 微信小程序 - 分享功能', '阶段五\n\n生成带参数小程序码（user_id），调用wxacode.getUnlimited，分享到微信群/朋友圈', ['P0', 'frontend', 'miniprogram', 'wechat']),
        ('[P0] 微信小程序 - 引流策略', '阶段五\n\n所有按钮引导"打开GamDen App"，弹窗下载提示，小程序内不可注册/发帖/IM', ['P0', 'frontend', 'miniprogram', 'marketing']),
        ('[P1] 小程序自动生成逻辑', '阶段五\n\n邀请≥3人且is_active=true，自动生成小程序码并通知用户，mini_programs表记录，防止重复生成', ['P1', 'backend', 'miniprogram']),
        ('[P1] 数据统计埋点', '阶段五\n\nH5访问量/小程序访问量/App下载转化率/注册转化率，接入微信小程序数据分析', ['P1', 'backend', 'analytics']),
        
        # 阶段六：App多端开发
        ('[P0] iOS App - 登录/注册/领地主页（SwiftUI）', '阶段六：App多端开发\n\n邀请码输入，守护灵选择（机械师/精灵/占星师），注册成功跳转领地主页', ['P0', 'ios', 'frontend']),
        ('[P0] iOS App - 地图/俱乐部/IM/商城/个人中心（SwiftUI）', '阶段六\n\n地图页，俱乐部列表/详情/发帖，IM聊天（OpenIM SDK），商城，个人中心', ['P0', 'ios', 'frontend']),
        ('[P0] Android App - 全功能（React Native）', '阶段六\n\n与iOS功能对齐，RN实现，邀请码输入，守护灵选择，领地展示，地图，俱乐部，IM，商城', ['P0', 'android', 'frontend', 'rn']),
        ('[P1] App全面屏适配', '阶段六\n\niPhone刘海屏/Dynamic Island，Android挖孔屏，SafeArea适配', ['P1', 'ios', 'android', 'ui']),
        
        # 阶段七：测试与部署
        ('[P0] 接口联调与Postman自动化测试', '阶段七：测试与部署\n\n前后端接口联调，Postman Collection编写，自动化测试脚本', ['P0', 'test', 'api']),
        ('[P0] 功能测试 - 完整用户路径走通', '阶段七\n\n注册流程/邀请裂变/领地升级/IM聊天/内容审核 完整E2E测试', ['P0', 'test', 'e2e']),
        ('[P1] 性能测试', '阶段七\n\nAPI P95≤500ms，App冷启动≤2秒，地图页≤2秒，Redis缓存命中率≥90%', ['P1', 'test', 'performance']),
        ('[P1] 安全测试', '阶段七\n\nJWT过期/刷新，SQL注入防护，XSS防护，API限流（100次/分钟/用户）验证', ['P1', 'test', 'security']),
        ('[P0] Lighthouse部署 - docker compose up', '阶段七\n\n代码推送GitHub，Lighthouse Integration执行 git pull && docker compose up -d --build，检查容器状态', ['P0', 'devops', 'deploy']),
        ('[P1] 监控接入 - Sentry + Prometheus', '阶段七\n\nSentry错误监控（前端+后端），Prometheus性能指标（/metrics端点），Grafana仪表盘', ['P1', 'devops', 'monitoring']),
    ]
    
    created = []
    for i, (title, body, labels) in enumerate(issues):
        print(f'  [{i+1}/{len(issues)}] 创建: {title}')
        payload = {
            'title': title,
            'body': f'## 所属阶段\n{body}',
            'labels': labels,
        }
        result = rest_api('POST', f'/repos/{OWNER}/{REPO}/issues', payload)
        if result['status'] == 201:
            issue_num = result['body']['number']
            created.append(issue_num)
            print(f'  ✅ #{issue_num}')
        else:
            print(f'  ❌ 失败: {result["body"]}')
        time.sleep(0.5)  # 避免触发 GitHub API 限流
    
    print(f'\n✅ 共创建 {len(created)} 个 Issues')
    return created

def main():
    try:
        # 0. 获取 owner node ID
        owner_id = get_owner_node_id()
        
        # 1. 创建 Project
        project = create_project(owner_id)
        
        # 2. 配置 Project 字段
        setup_project_fields(project['id'])
        
        # 3. 批量创建 Issues
        issue_numbers = create_issues()
        
        print('\n🎉 完成！')
        print(f'Project: {project["url"]}')
        print(f'Issues: {len(issue_numbers)} 个')
        print('\n下一步：在 GitHub Project 页面手动将 Issues 添加到看板')
        print('提示：可在 Project 设置中创建看板视图（按状态分列）')
    except Exception as e:
        print(f'\n❌ 错误: {e}')
        exit(1)

if __name__ == '__main__':
    main()
