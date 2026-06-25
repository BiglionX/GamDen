import re

filepath = '/root/backend/src/services/contentAuditService.ts'
with open(filepath, 'r') as f:
    content = f.read()

# 替换 tencentcloud SDK 引用为简化版本
content = content.replace(
    "import tencentcloud from 'tencentcloud-sdk-nodejs';",
    "// import tencentcloud from 'tencentcloud-sdk-nodejs'; // 已禁用"
)
content = content.replace(
    "const CmsClient = tencentcloud.tms.v20201229.Client;",
    "const CmsClient: any = null; // 简化版本：暂不启用腾讯云内容审核"
)

# 让函数返回 noop
content = content.replace(
    "try {\n    const secretId = process.env.TENCENT_CLOUD_SECRET_ID;",
    "return null; // 简化版本：暂不启用\n  /* try {\n    const secretId = process.env.TENCENT_CLOUD_SECRET_ID;"
)
content = content.replace(
    "console.warn('⚠️ 腾讯云内容审核客户端未配置');\n    return null;\n  }",
    "console.warn('⚠️ 腾讯云内容审核客户端未配置');\n    return null;\n  } */"
)

with open(filepath, 'w') as f:
    f.write(content)

print('Updated')
