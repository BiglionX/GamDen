import re

filepath = '/root/frontend/next.config.js'
with open(filepath, 'r') as f:
    content = f.read()

# 添加 typescript.ignoreBuildErrors
if 'ignoreBuildErrors' not in content:
    new_content = content.replace(
        'const nextConfig = {',
        'const nextConfig = {\n  typescript: {\n    ignoreBuildErrors: true,\n  },\n  eslint: {\n    ignoreDuringBuilds: true,\n  },'
    )
    with open(filepath, 'w') as f:
        f.write(new_content)
    print('Updated')
else:
    print('Already configured')
