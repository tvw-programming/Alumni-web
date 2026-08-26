---
description: Add an LLM backend to config.json, writing code only if the protocol is new
argument-hint: <backend-id> <vendor-or-endpoint>
---

Add backend `$1` for $2.

First decide whether this needs code at all:

- Speaks the OpenAI wire protocol (Together, Groq, vLLM, LM Studio, OpenRouter,
  most internal gateways)? → `"driver": "openai_compatible"` with a different
  `base_url`. **No code.**
- Is a headless CLI that edits files (Cursor, Copilot, Claude Code)? →
  `"driver": "cli_agent"` with `command`, `argv`, `result_json_path`. **No code.**
- Genuinely new protocol? → add a class in `src/codegen_core/llm/backends/`
  subclassing `BaseBackend`, implement `_invoke`, register in
  `llm/factory.DRIVERS`. Import the SDK lazily inside the method so the package
  stays installable without it.

Then, in `config/config.json`:
- Add the backend under `backends` with `driver`, `tier`, `model`,
  `capabilities`, `params`, `limits`, `cost_per_1k_usd`, `enabled`.
- Reference secrets as `"token_env": "SOME_VAR"` — never a literal. The config
  validator refuses to boot if it finds one.
- Add it to the relevant `routing.fallback_chains` entries.
- Add the variable to `.env.example`.

Verify with `codegen-core config validate && codegen-core config health && codegen-core config
explain --step 12`.
