---
description: Search the web using Exa AI via mcporter MCP
---

# Exa Search

Search the web using the Exa MCP server via mcporter.

The user will provide a search query or topic. If no query is provided, ask the user what they want to search for.

1. Use the Bash tool to run:
   ```
   npx mcporter call exa-search.web_search_exa query="<query>" numResults=5 type=auto
   ```
   - For simple factual lookups, use `type=fast`
   - For complex or research-heavy topics, use `type=auto` with `numResults=8`
   - Use the current year when searching for recent or current information

2. Review the search results and provide a clear, concise summary that:
   - Answers the user's question directly
   - Includes relevant facts, data, or key points
   - Cites sources with URLs when available
   - Highlights if information may be outdated or uncertain

3. If the initial results are insufficient, perform follow-up searches with refined queries.

Provide the summarized results.
