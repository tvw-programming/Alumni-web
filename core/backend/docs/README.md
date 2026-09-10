# CodeGen Core Developer Documentation

Read in this order:

| Doc | What it answers |
|---|---|
| [01-concepts.md](01-concepts.md) | Why the system is shaped this way. Start here. |
| [10-running-and-configuring.md](10-running-and-configuring.md) | Configuring Jira/models, where the code lives, how a run actually starts |
| [02-architecture.md](02-architecture.md) | How the kernel fits together at runtime |
| [03-a2a-protocol.md](03-a2a-protocol.md) | How components talk without caring about modality |
| [04-configuration.md](04-configuration.md) | The single config file and what it controls |
| [05-steps-reference.md](05-steps-reference.md) | All 24 steps: concept, inputs, failure modes |
| [06-safety-model.md](06-safety-model.md) | Every safety property and where it is enforced |
| [07-extending.md](07-extending.md) | Adding steps, backends, plugins |
| [08-claude-code-workflow.md](08-claude-code-workflow.md) | Building on this with Claude Code |
| [09-visualization-variants.md](09-visualization-variants.md) | How the dashboard draws a run, and the card block that styles it |
| [11-mutation-inventory.md](11-mutation-inventory.md) | Every step that changes something, and what it may touch |
| [12-pull-request-target.md](12-pull-request-target.md) | Which repository step 22 opens the pull request against |
| [adr/](adr/) | Decisions and their reasoning |
