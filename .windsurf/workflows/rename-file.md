---
description: Rename a file based on its content and context
---

# Rename File

Rename a file based on its content and purpose.

The user will provide a file path. Read the content of that file, then:

1. Analyze the code to understand its primary purpose, class name, component name, or main export.
2. Determine the most appropriate filename based on the project's existing naming conventions (e.g. kebab-case, PascalCase, matching the main component).
3. If the current name is different from the ideal name:
   - Get the sequential number by checking existing files in the same folder that match the pattern (number-name.md)
   - Use the next available number (1, 2, 3, etc.) that hasn't been used yet
   - Analyze the file content to extract a meaningful name based on the primary topic, subject, or purpose
   - Rename the file to "{number}-{name}.md" where {number} is the next available sequential number and {name} is derived from the content
   - Explain why you chose the new name
4. If the current name is already correct, simply state that no change is needed.
