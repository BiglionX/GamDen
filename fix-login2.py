import re

filepath = '/root/frontend/src/app/auth/login/page.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 用正则匹配多行 loginSuccess 调用
pattern = re.compile(r'loginSuccess\([^)]*?\);', re.DOTALL)
new_content, count = pattern.subn('loginSuccess(response.data);', content)

with open(filepath, 'w') as f:
    f.write(new_content)

print(f'Replaced {count} occurrences')
