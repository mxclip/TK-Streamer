#!/usr/bin/env python3
"""
YAML Validation Script for TK Streamer GitHub Actions
Validates all workflow YAML files to prevent syntax errors before pushing to GitHub.
"""

import yaml
import sys
import os
from pathlib import Path


def validate_yaml_file(file_path):
    """Validate a single YAML file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            yaml.safe_load(f)
        return True, None
    except yaml.YAMLError as e:
        return False, str(e)
    except Exception as e:
        return False, f"Error reading file: {str(e)}"


def main():
    """Main validation function"""
    print("🔍 TK Streamer YAML Validation")
    print("=" * 50)
    
    # Find all workflow files
    workflows_dir = Path(".github/workflows")
    if not workflows_dir.exists():
        print("❌ .github/workflows directory not found")
        return False
    
    yaml_files = list(workflows_dir.glob("*.yml")) + list(workflows_dir.glob("*.yaml"))
    
    if not yaml_files:
        print("⚠️ No YAML files found in .github/workflows/")
        return True
    
    all_valid = True
    
    for yaml_file in yaml_files:
        print(f"Validating {yaml_file.name}...", end=" ")
        is_valid, error = validate_yaml_file(yaml_file)
        
        if is_valid:
            print("✅ Valid")
        else:
            print("❌ Invalid")
            print(f"   Error: {error}")
            all_valid = False
    
    print("=" * 50)
    
    if all_valid:
        print("🎉 All YAML files are valid!")
        print("✅ Safe to push to GitHub")
        return True
    else:
        print("💥 YAML validation failed!")
        print("❌ Fix errors before pushing to GitHub")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 