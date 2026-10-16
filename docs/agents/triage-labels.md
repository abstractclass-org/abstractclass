# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the "Label in our tracker" column to match whatever vocabulary you actually use.

In beads these are ordinary labels (`bd label add`, `bd label remove`, `bd list -l <label>`).

- `ready-for-agent` is a different thing from `bd ready`. `bd ready` lists open issues with no open blocker. An agent
  that works alone takes `bd ready -l site,ready-for-agent`.
- `wontfix`: apply the label, then `bd close <id> --reason "wontfix: <why>"`.
- The two category roles are the beads issue type: `bug` for a bug, and `task` or `feature` for an enhancement
  (`bd update <id> --type bug`). No `bug` or `enhancement` label.
