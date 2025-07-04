with open('.github/workflows/ci.yml', 'r') as f:
    lines = f.readlines()

fixed_lines = []
inside_python_string = False
python_indent_level = 0

for i, line in enumerate(lines):
    line_num = i + 1
    
    # 检测Python字符串开始
    if 'python -c "' in line:
        inside_python_string = True
        fixed_lines.append(line)
        continue
    
    # 检测Python字符串结束
    if inside_python_string and line.strip() == '"':
        inside_python_string = False
        fixed_lines.append(line)
        continue
    
    # 如果在Python字符串内部，移除额外的YAML缩进
    if inside_python_string:
        # 移除YAML的缩进（通常是8-10个空格），保留Python代码的缩进
        if line.startswith('          '):  # 10个空格的YAML缩进
            fixed_lines.append(line[10:])
        elif line.startswith('        '):   # 8个空格的YAML缩进
            fixed_lines.append(line[8:])
        else:
            fixed_lines.append(line)
    else:
        fixed_lines.append(line)

# 写回文件
with open('.github/workflows/ci.yml', 'w') as f:
    f.writelines(fixed_lines)

print("✅ 修复了ci.yml的Python字符串缩进")
