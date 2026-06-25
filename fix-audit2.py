filepath = '/root/backend/src/services/contentAuditService.ts'
with open(filepath, 'r') as f:
    content = f.read()

# 注释 tencentcloud 引用
content = content.replace(
    "import tencentcloud from 'tencentcloud-sdk-nodejs';",
    "// import tencentcloud from 'tencentcloud-sdk-nodejs'; // 暂未启用"
)
content = content.replace(
    "const CmsClient = tencentcloud.tms.v20201229.Client;",
    "const CmsClient: any = null; // 暂未启用"
)
content = content.replace(
    "let cmsClient: any = null;",
    "let cmsClient: any = null; // 暂未启用腾讯云内容审核"
)

with open(filepath, 'w') as f:
    f.write(content)

print('Updated')
