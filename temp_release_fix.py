with open('.github/workflows/release.yml', 'r') as f:
    content = f.read()

# 替换有问题的Heredoc部分
old_heredoc = '''          # Create build info using Heredoc to avoid YAML syntax conflicts
          cat << 'EOF' > build-info.json
{
"version": "${{ needs.create-release.outputs.tag_name }}",
"buildTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
"commit": "${{ github.sha }}"
}
EOF'''

new_simple = '''          # Create build info using simple echo commands
          echo '{' > build-info.json
          echo '  "version": "${{ needs.create-release.outputs.tag_name }}",' >> build-info.json
          echo '  "buildTime": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",' >> build-info.json
          echo '  "commit": "${{ github.sha }}"' >> build-info.json
          echo '}' >> build-info.json'''

content = content.replace(old_heredoc, new_simple)

with open('.github/workflows/release.yml', 'w') as f:
    f.write(content)

print("✅ 重写了release.yml的build info部分")
