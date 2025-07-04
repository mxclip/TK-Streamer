import re

with open('.github/workflows/ci.yml', 'r') as f:
    content = f.read()

# 修复所有Python多行字符串的缩进
# 找到所有 python -c " ... " 的块
def fix_python_block(match):
    full_match = match.group(0)
    lines = full_match.split('\n')
    
    fixed_lines = []
    for i, line in enumerate(lines):
        if i == 0:  # 第一行 python -c "
            fixed_lines.append(line)
        elif i == len(lines) - 1:  # 最后一行 "
            fixed_lines.append(line)
        else:  # Python代码行
            # 移除YAML缩进，保留Python代码缩进
            if line.startswith('          '):  # 移除10个空格
                fixed_lines.append(line[10:])
            elif line.startswith('        '):   # 移除8个空格
                fixed_lines.append(line[8:])
            else:
                fixed_lines.append(line)
    
    return '\n'.join(fixed_lines)

# 使用正则表达式找到并修复所有Python块
pattern = r'python -c ".*?"'
content = re.sub(pattern, fix_python_block, content, flags=re.DOTALL)

with open('.github/workflows/ci.yml', 'w') as f:
    f.write(content)

print("✅ 重新修复了Python字符串格式")
