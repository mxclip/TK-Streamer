with open('.github/workflows/release.yml', 'r') as f:
    lines = f.readlines()

# 找到Heredoc的JSON部分并修复缩进
fixed_lines = []
inside_heredoc = False
heredoc_start_line = -1

for i, line in enumerate(lines):
    if "cat << 'EOF' > build-info.json" in line:
        inside_heredoc = True
        heredoc_start_line = i
        fixed_lines.append(line)
    elif inside_heredoc and line.strip() == 'EOF':
        inside_heredoc = False
        fixed_lines.append(line)
    elif inside_heredoc:
        # 移除额外的缩进，保持JSON格式
        if line.strip():
            fixed_lines.append(line.lstrip())
        else:
            fixed_lines.append('\n')
    else:
        fixed_lines.append(line)

# 写回文件
with open('.github/workflows/release.yml', 'w') as f:
    f.writelines(fixed_lines)

print("✅ 修复了release.yml的Heredoc缩进")
