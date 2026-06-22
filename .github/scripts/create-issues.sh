#!/bin/bash
# GamDen V1.0 - GitHub Issues 批量创建脚本（Shell版，使用 GitHub CLI）
# 前置条件：已安装 gh CLI 并登录（gh auth login）

OWNER="${GITHUB_OWNER:-YOUR_USERNAME}"
REPO="${GITHUB_REPO:-GamDen}"

echo "📝 批量创建 GitHub Issues..."

# ===== 阶段一：基础设施与基础模块 =====
gh issue create --repo "$OWNER/$REPO" --title "[P0] 项目初始化 - Monorepo结构搭建" --body "## 所属阶段\n阶段一：基础设施与基础模块\n\n## 任务描述\n搭建 Monorepo，packages: backend / web / admin / mini-program / shared" --label "P0,infra"
gh issue create --repo "$OWNER/$REPO" --title "[P0] 数据库初始化 - 建表SQL执行" --body "## 所属阶段\n阶段一\n\n## 任务描述\n执行 users / invite_records / territory_evolution / clubs / club_posts / agent_dialogues / mini_programs 等表" --label "P0,backend,database"
gh issue create --repo "$OWNER/$REPO" --title "[P0] 认证模块API - 注册/登录/JWT" --body "## 所属阶段\n阶段一\n\n## 任务描述\nPOST /api/auth/register|login|refresh，邀请码校验，bcrypt密码加密，JWT Token" --label "P0,backend,api"
gh issue create --repo "$OWNER/$REPO" --title "[P0] 邀请码生成与校验逻辑" --body "## 所属阶段\n阶段一\n\n## 任务描述\n6位字母数字，有效期30天，唯一性校验，一次性使用" --label "P0,backend"
gh issue create --repo "$OWNER/$REPO" --title "[P0] 坐标分配算法实现" --body "## 所属阶段\n阶段一\n\n## 任务描述\n注册时分配坐标，保证与邀请人±10格内，防重叠（向右偏移+1），范围-1000~+1000" --label "P0,backend,algorithm"
gh issue create --repo "$OWNER/$REPO" --title "[P1] 环境变量与配置文件" --body "## 所属阶段\n阶段一\n\n## 任务描述\n.env 文件，数据库/Redis/第三方API配置" --label "P1,infra,config"
gh issue create --repo "$OWNER/$REPO" --title "[P1] Docker Compose 容器编排" --body "## 所属阶段\n阶段一\n\n## 任务描述\nbackend / mysql / redis / openim-server 容器化编排" --label "P1,infra,docker"
gh issue create --repo "$OWNER/$REPO" --title "[P1] 统一错误码体系" --body "## 所属阶段\n阶段一\n\n## 任务描述\n错误码 200~1008，统一响应格式" --label "P1,backend"

echo "✅ 阶段一 Issues 创建完成"

# ===== 阶段二：核心玩法功能 =====
gh issue create --repo "$OWNER/$REPO" --title "[P0] 领地信息API" --body "## 所属阶段\n阶段二：核心玩法功能\n\n## 任务描述\nGET /api/territory/info" --label "P0,backend,api"
gh issue create --repo "$OWNER/$REPO" --title "[P0] 领地升级逻辑与经验系统" --body "## 所属阶段\n阶段二\n\n## 任务描述\n经验值累计，等级阈值判断 Lv.1~Lv.5" --label "P0,backend"
gh issue create --repo "$OWNER/$REPO" --title "[P0] 地图邻居API" --body "## 所属阶段\n阶段二\n\n## 任务描述\nGET /api/map/nearby?range=10" --label "P0,backend,api"
gh issue create --repo "$OWNER/$REPO" --title "[P0] 守护灵话术系统" --body "## 所属阶段\n阶段二\n\n## 任务描述\nagent_templates 配置表，固定模板不接大模型" --label "P0,backend,agent"
gh issue create --repo "$OWNER/$REPO" --title "[P0] Agent通知推送（OpenIM自定义消息）" --body "## 所属阶段\n阶段二\n\n## 任务描述\ncustomType=1001，带守护灵头像" --label "P0,backend,openim"
gh issue create --repo "$OWNER/$REPO" --title "[P1] 签到功能" --body "## 所属阶段\n阶段二\n\n## 任务描述\n每日签到+10金币，连续签到额外+5" --label "P1,backend,feature"
gh issue create --repo "$OWNER/$REPO" --title "[P1] 野兽潮定时任务" --body "## 所属阶段\n阶段二\n\n## 任务描述\n每小时检查，20%概率触发，防御结算" --label "P1,backend,feature"
gh issue create --repo "$OWNER/$REPO" --title "[P1] 野兽潮配置后台接口" --body "## 所属阶段\n阶段二\n\n## 任务描述\nbeast_config 表 CRUD" --label "P1,backend,config"
gh issue create --repo "$OWNER/$REPO" --title "[P1] 领地元素图资源上传" --body "## 所属阶段\n阶段二\n\n## 任务描述\n3种守护灵 × 5级 = 15张像素图" --label "P1,assets"

echo "✅ 阶段二 Issues 创建完成"

# ===== 阶段三：邀请裂变与社交 =====
gh issue create --repo "$OWNER/$REPO" --title "[P0] 邀请记录API与进度接口" --body "## 所属阶段\n阶段三：邀请裂变与社交" --label "P0,backend,api"
gh issue create --repo "$OWNER/$REPO" --title "[P0] OpenIM Docker部署与基础对接" --body "## 所属阶段\n阶段三\n\n## 任务描述\nDocker部署OpenIM Server" --label "P0,infra,openim"
gh issue create --repo "$OWNER/$REPO" --title "[P0] OpenIM Webhook中间件" --body "## 所属阶段\n阶段三\n\n## 任务描述\n监听用户注册事件，同步创建领地" --label "P0,backend,openim"
gh issue create --repo "$OWNER/$REPO" --title "[P0] 单聊/群聊基础功能接入" --body "## 所属阶段\n阶段三\n\n## 任务描述\nOpenIM SDK 接入 App" --label "P0,frontend,openim"
gh issue create --repo "$OWNER/$REPO" --title "[P1] 俱乐部（贴吧）API" --body "## 所属阶段\n阶段三\n\n## 任务描述\n创建俱乐部，发帖/回帖" --label "P1,backend,api"
gh issue create --repo "$OWNER/$REPO" --title "[P1] 俱乐部对应OpenIM群组" --body "## 所属阶段\n阶段三\n\n## 任务描述\n创建俱乐部时自动创建群组" --label "P1,backend,openim"
gh issue create --repo "$OWNER/$REPO" --title "[P1] 腾讯云内容安全API接入" --body "## 所属阶段\n阶段三\n\n## 任务描述\n接入腾讯云TMS，AI初审" --label "P1,backend,security"
gh issue create --repo "$OWNER/$REPO" --title "[P1] 人工复审池后台接口" --body "## 所属阶段\n阶段三\n\n## 任务描述\n审核通过/拒绝，违规梯度执行" --label "P1,backend,moderation"

echo "✅ 阶段三 Issues 创建完成"

# ===== 阶段四：商城与后台管理 =====
gh issue create --repo "$OWNER/$REPO" --title "[P0] 金币系统完善" --body "## 所属阶段\n阶段四：商城与后台管理" --label "P0,backend,feature"
gh issue create --repo "$OWNER/$REPO" --title "[P0] 商城兑换API" --body "## 所属阶段\n阶段四\n\n## 任务描述\n头像框200金币/气泡150金币/特殊签名300金币" --label "P0,backend,api"
gh issue create --repo "$OWNER/$REPO" --title "[P0] 后台管理 - 用户管理页面" --body "## 所属阶段\n阶段四\n\n## 任务描述\nReact + Ant Design Pro" --label "P0,admin,frontend"
gh issue create --repo "$OWNER/$REPO" --title "[P0] 后台管理 - 内容审核页面" --body "## 所属阶段\n阶段四\n\n## 任务描述\n待审核池，通过/拒绝，违规梯度" --label "P0,admin,frontend"
gh issue create --repo "$OWNER/$REPO" --title "[P1] 后台管理 - 领地与地图监控" --body "## 所属阶段\n阶段四\n\n## 任务描述\n全局热力图，手动调整坐标" --label "P1,admin,frontend"
gh issue create --repo "$OWNER/$REPO" --title "[P1] 后台管理 - 俱乐部管理" --body "## 所属阶段\n阶段四" --label "P1,admin,frontend"
gh issue create --repo "$OWNER/$REPO" --title "[P1] 后台管理 - 数据看板" --body "## 所属阶段\n阶段四\n\n## 任务描述\nDAU/新增/留存/K因子，Recharts图表" --label "P1,admin,frontend"
gh issue create --repo "$OWNER/$REPO" --title "[P1] 后台管理 - 系统配置页面" --body "## 所属阶段\n阶段四\n\n## 任务描述\n敏感词库，野兽潮参数，金币规则" --label "P1,admin,frontend"
gh issue create --repo "$OWNER/$REPO" --title "[P1] 操作日志API与查看页面" --body "## 所属阶段\n阶段四" --label "P1,backend,admin"

echo "✅ 阶段四 Issues 创建完成"

# ===== 阶段五：营销H5与小程序 =====
gh issue create --repo "$OWNER/$REPO" --title "[P0] 营销H5首屏页面" --body "## 所属阶段\n阶段五：营销H5与小程序" --label "P0,frontend,h5"
gh issue create --repo "$OWNER/$REPO" --title "[P0] H5申请表单页" --body "## 所属阶段\n阶段五" --label "P0,frontend,h5"
gh issue create --repo "$OWNER/$REPO" --title "[P0] H5审核流程（自动+手动）" --body "## 所属阶段\n阶段五" --label "P0,backend,h5"
gh issue create --repo "$OWNER/$REPO" --title "[P0] H5邀请码输入与App下载页" --body "## 所属阶段\n阶段五" --label "P0,frontend,h5"
gh issue create --repo "$OWNER/$REPO" --title "[P0] 微信小程序 - 领地展示页" --body "## 所属阶段\n阶段五" --label "P0,frontend,miniprogram"
gh issue create --repo "$OWNER/$REPO" --title "[P0] 微信小程序 - 分享功能" --body "## 所属阶段\n阶段五" --label "P0,frontend,miniprogram"
gh issue create --repo "$OWNER/$REPO" --title "[P0] 微信小程序 - 引流策略" --body "## 所属阶段\n阶段五" --label "P0,frontend,miniprogram"
gh issue create --repo "$OWNER/$REPO" --title "[P1] 小程序自动生成逻辑" --body "## 所属阶段\n阶段五" --label "P1,backend,miniprogram"
gh issue create --repo "$OWNER/$REPO" --title "[P1] 数据统计埋点" --body "## 所属阶段\n阶段五" --label "P1,backend,analytics"

echo "✅ 阶段五 Issues 创建完成"

# ===== 阶段六：App多端开发 =====
gh issue create --repo "$OWNER/$REPO" --title "[P0] iOS App - 登录/注册页（SwiftUI）" --body "## 所属阶段\n阶段六：App多端开发" --label "P0,ios,frontend"
gh issue create --repo "$OWNER/$REPO" --title "[P0] iOS App - 领地主页（SwiftUI）" --body "## 所属阶段\n阶段六" --label "P0,ios,frontend"
gh issue create --repo "$OWNER/$REPO" --title "[P0] iOS App - 地图页（SwiftUI）" --body "## 所属阶段\n阶段六" --label "P0,ios,frontend"
gh issue create --repo "$OWNER/$REPO" --title "[P0] iOS App - 俱乐部/IM/商城/个人中心（SwiftUI）" --body "## 所属阶段\n阶段六" --label "P0,ios,frontend"
gh issue create --repo "$OWNER/$REPO" --title "[P0] Android App - 全功能（React Native）" --body "## 所属阶段\n阶段六\n\n## 任务描述\n与iOS功能对齐" --label "P0,android,frontend,rn"
gh issue create --repo "$OWNER/$REPO" --title "[P1] App全面屏适配" --body "## 所属阶段\n阶段六" --label "P1,ios,android,ui"

echo "✅ 阶段六 Issues 创建完成"

# ===== 阶段七：测试与部署 =====
gh issue create --repo "$OWNER/$REPO" --title "[P0] 接口联调与Postman自动化测试" --body "## 所属阶段\n阶段七：测试与部署" --label "P0,test"
gh issue create --repo "$OWNER/$REPO" --title "[P0] 功能测试 - 完整用户路径走通" --body "## 所属阶段\n阶段七" --label "P0,test"
gh issue create --repo "$OWNER/$REPO" --title "[P1] 性能测试" --body "## 所属阶段\n阶段七" --label "P1,test,performance"
gh issue create --repo "$OWNER/$REPO" --title "[P1] 安全测试" --body "## 所属阶段\n阶段七" --label "P1,test,security"
gh issue create --repo "$OWNER/$REPO" --title "[P0] Lighthouse部署 - docker compose up" --body "## 所属阶段\n阶段七" --label "P0,devops,deploy"
gh issue create --repo "$OWNER/$REPO" --title "[P1] 监控接入 - Sentry + Prometheus" --body "## 所属阶段\n阶段七" --label "P1,devops,monitoring"

echo "✅ 阶段七 Issues 创建完成"
echo "🎉 所有 Issues 创建完成！"
