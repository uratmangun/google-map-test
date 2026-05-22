---
description: Create a new Windsurf workflow with proper structure and formatting
---

# Create Workflow

Create a new Windsurf workflow file with proper structure and formatting.

The user will provide a workflow name and description of what it should do. Parse their input to extract:
- The workflow name (kebab-case, e.g. "my-workflow")
- The description/purpose of what the workflow should do

If the user's input is missing or unclear, ask them for:
- A name for the workflow (in kebab-case format)
- What the workflow should accomplish

Create the workflow file following this structure:
- Location: `.windsurf/workflows/{workflow-name}.md`
- Format:

```markdown
---
description: Brief one-line description of what the workflow does
---

# Workflow Title

You are a [role] assistant that will [main purpose].

1. First step...
2. Second step...
3. Continue with more steps as needed...

[Optional: Additional context, rules, or examples]

Execute these steps and provide a summary of what was done.
```

Workflow conventions:
- Use natural language to reference user input instead of positional arguments
- Write clear, numbered steps
- Include examples when helpful
- Keep the description in frontmatter concise (under 100 characters)

After creating the workflow, verify the file was created successfully.

Report:
- The workflow name
- The file path
- How to use the workflow (e.g. `/workflow-name`)
