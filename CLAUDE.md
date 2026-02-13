# Claude Code Instructions

## Documentation Policy

**IMPORTANT**: Do NOT commit any reports, documentation, diagrams, or analysis files unless explicitly requested by the user.

This includes:
- Investigation reports
- Bug analysis documents
- Diagrams and visualizations
- Summary files
- Any files in `docs/` directories created for analysis purposes

### Why?

- Analysis and debugging output should be shown directly to the user in conversation
- Documentation should only be committed when it serves the project's long-term needs
- Temporary investigation artifacts clutter the repository

### What TO commit:

- Code changes and fixes
- Tests
- README updates when explicitly requested
- Configuration files when needed
- Documentation explicitly requested by the user

### Default behavior:

When investigating bugs or analyzing code:
1. Show findings directly in the conversation
2. Use diagrams, code snippets, and explanations inline
3. Only create files if they're part of the fix implementation
4. Ask before committing any documentation

Remember: **Show, don't save** - unless asked otherwise.
