---
description: Automatically stages changes, generates a conventional commit message with emoji, and pushes to remote
---

# Auto Commit

Automatically stage changes, create a conventional commit with an appropriate emoji, and push to remote.

1. Run `git status` to see what files have been modified.
2. Stage all changes using `git add .` to include all modified files.
3. Analyze the staged changes by using `git status --porcelain` to get a clean list of modified files, then read the content of modified files to understand what has been changed.
4. Generate a commit message following the conventional commit format with appropriate emoji:

```
<type>(<scope>): <emoji> <description>
[optional body]
[optional footer(s)]
```

Types and Emojis:

- feat: ✨ A new feature
- fix: 🔧 A bug fix
- docs: 📚 Documentation only changes
- style: 💎 Changes that do not affect the meaning of the code
- refactor: ♻️ A code change that neither fixes a bug nor adds a feature
- perf: ⚡ A code change that improves performance
- test: ✅ Adding missing tests or correcting existing tests
- build: 📦 Changes that affect the build system or external dependencies
- ci: ⚙️ Changes to CI configuration files and scripts
- chore: 🔨 Other changes that don't modify src or test files
- revert: ⏪ Reverts a previous commit

Rules:

1. Use lowercase for type and description
2. Keep the description under 50 characters when possible
3. Use imperative mood ("add" not "added" or "adds")
4. Include scope when relevant (component, module, or area affected)
5. Always place the emoji after the colon, before the description
6. No period at the end of the description
7. Use body for additional context if needed (separate with blank line)

For breaking changes, add `!` after the type/scope and include `BREAKING CHANGE:` in the footer.

5. Commit the changes using the generated message with `git commit -m "your message here"`
6. Push the changes to the remote repository using `git push`
7. Report the results of these operations.

Execute these steps and provide a summary of what was done.
