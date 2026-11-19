# The reports in PostHog

Design 17's six reports ([design 17](../design/17-measurement.md), "The reports") are PostHog insights on one
dashboard, in the one PostHog project of all the sites ([hosting.md](../hosting.md), section 4). This folder keeps
the record of each one, so that the next change is made the same way.

- **The dashboard:** "The reports (design 17)",
  [us.posthog.com/project/721449/dashboard/2379239](https://us.posthog.com/project/721449/dashboard/2379239). Each
  report is one group of its tiles, under the report's heading.
- **The record:** [reports.json](reports.json). It holds the dashboard (its name, description, id, address and
  groups) and, for each report, its insights. Each insight has its name, description, id, short id and address, its
  tile (the tile's id and its box on the desktop grid) and its query as PostHog holds it.

## What each insight holds

- **The name:** the report's number and name, and the row's name, as design 17 gives them: `1. Funnel: From the
  visit`, `6. Imports and exports: Exports`. The name finds the insight: no other insight of the project has it.
- **The kind, the events, the value and the breakdown:** as the row of design 17's table gives them. "Count" is the
  number of events (`total`). "Visitors" is PostHog's unique users (`dau`): the sites make no person profiles, so each
  daily hash is one user. A row with two values ("count, and visitors") has two series of the same event.
- **The filter of internal and test users:** on (`filterTestAccounts`), in each insight.
- **The dates:** the last 30 days, by day. A dashboard's own date filter can change them.
- **The view:** a table for a Trends insight with a breakdown, which gives each value over the whole range. A line
  for one with no breakdown. A funnel's steps for a Funnel insight.

PostHog adds its defaults to a query that it saves (a funnel's window of 14 days, a chart's settings). The record
keeps the query with those defaults. Sent again, it gives the same query back, so a second pass changes nothing.

## How to change them

The insights are made with the tools of PostHog's MCP server (`https://mcp.posthog.com/mcp`) in a Claude Code
session, with no API key: `insights-list`, `insight-create`, `insight-update`, `insight-query`, `dashboard-get` and
`dashboard-update`. The tools act as the PostHog user who connected the server.

1. Change the report's table in design 17 first.
2. Change the insight's `query` in `reports.json`. Test a new query with `query-trends` or `query-funnel` first.
3. Find the insight by its name: `insights-list` with `search` set to the name. Use the result whose name is the
   same.
4. If it is there, send `insight-update` with its `id`, and the record's `name`, `description` and `query`. If it is
   not there, send `insight-create` with the record's `name`, `description` and `query`, and with `dashboards` set
   to the dashboard's id. Then read the new tile's id with `dashboard-get`, and send `dashboard-update` with the
   tile's `id`, its `group_key` (the report's) and its `layouts.sm` box.
5. Copy the query that PostHog gives back into the record, with the insight's id, short id and tile.
6. Check the insight's result with `insight-query` and its short id.

Make no other change in the project from such a session: its settings, the filter of internal and test users, and
the other insights stay as they are.
