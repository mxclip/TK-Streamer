import re

# 读取release.yml
with open('.github/workflows/release.yml', 'r') as f:
    content = f.read()

# 修复trailing spaces和缩进问题
lines = content.split('\n')
fixed_lines = []

for i, line in enumerate(lines):
    # 移除trailing spaces
    line = line.rstrip()
    fixed_lines.append(line)

# 确保文件以换行符结束
if fixed_lines and fixed_lines[-1]:
    fixed_lines.append('')

# 写回文件
with open('.github/workflows/release.yml', 'w') as f:
    f.write('\n'.join(fixed_lines))

print("✅ 修复了release.yml的trailing spaces")

# 修复ci.yml
with open('.github/workflows/ci.yml', 'r') as f:
    content = f.read()

lines = content.split('\n')
fixed_lines = []

for i, line in enumerate(lines):
    # 移除trailing spaces
    line = line.rstrip()
    fixed_lines.append(line)

# 确保文件以换行符结束
if fixed_lines and fixed_lines[-1]:
    fixed_lines.append('')

# 写回文件
with open('.github/workflows/ci.yml', 'w') as f:
    f.write('\n'.join(fixed_lines))

print("✅ 修复了ci.yml的trailing spaces")
