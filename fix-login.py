import re
filepath = '/root/frontend/src/app/auth/login/page.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 修复所有 loginSuccess 调用
# 模式1: 第一个调用
patterns = [
    ('''        loginSuccess(
          response.data.token,
          response.data.refresh_token,
          {
            user_id: response.data.user_id,
            phone,
          },
          response.data.territory_coord_x || 0,

          response.data.territory_coord_y || 0
        );''',
     '''        loginSuccess(response.data);'''),
    ('''        loginSuccess(
          response.data.token,
          response.data.refresh_token,
          {
            user_id: response.data.user_id,
            phone: smsPhone,
          },
          response.data.territory_coord_x || 0,

          response.data.territory_coord_y || 0
        );''',
     '''        loginSuccess(response.data);'''),
]

count = 0
for old, new in patterns:
    if old in content:
        content = content.replace(old, new)
        count += 1

with open(filepath, 'w') as f:
    f.write(content)

print(f'Fixed {count} occurrences')
