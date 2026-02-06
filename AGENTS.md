# Guidelines

- Always install jdx/mise before touching anything in code. Make sure intermediary files are gitignored or ausent.
- Don't ever inline icons
- Don't touch the headers
- Don't format code that you are not creating
- Prefer using well known solutions for validation instead of trying to implement your own
- If you are a open scope housekeeping agent start with deviations from these guidelines before looking for anything else

## Tooling & Execution

- Check `mise.toml` before running commands to see if a task already exists.
- Never try to install anything globally or use sudo.
- Don't forget `-y` when using `npx`.
- If using `systemd`, specify the unit name.

## Styling & Layout

- Use only Tailwind and DaisyUI components for styling. Prefer using DaisyUI directly.
- If the task is related to layout or styling, only do it with the aid of Playwright MCP.
- Do not just say it's beautiful, responsive, or functional; prove it in a way that cannot be contested.
- Prefer using Selenium (or Playwright) for taking screenshots to avoid issues.

## Dev Server

- Gemini cannot put processes in background.
  - Systemd: `systemd-run -d --user --unit=dev-margea mise dev`

## Communication

- If something is missing or not possible, ask for additional instructions.
