# CodeGen Core — one command to a running stack.
.DEFAULT_GOAL := up
SHELL := /bin/bash

COMPOSE := docker compose
UI_URL  := http://localhost:$(or $(CODEGEN_FRONTEND_PORT),5173)
API_URL := http://localhost:$(or $(CODEGEN_API_PORT),8000)

# Match the host user so files the agent writes stay editable on the Mac.
export CODEGEN_UID := $(shell id -u)
export CODEGEN_GID := $(shell id -g)

.PHONY: up
up: ## Build, start, wait for health, open the dashboard
	@./run.sh

.PHONY: down
down: ## Stop the stack, keep run data
	@$(COMPOSE) down --remove-orphans

.PHONY: clean
clean: ## Stop the stack and delete run data
	@$(COMPOSE) down --remove-orphans --volumes
	@echo "run data removed"

.PHONY: logs
logs: ## Follow both services
	@$(COMPOSE) logs -f --tail=80

.PHONY: ps
ps: ## Show service status
	@$(COMPOSE) ps

.PHONY: build
build: ## Rebuild images without starting
	@$(COMPOSE) build

.PHONY: rebuild
rebuild: ## Rebuild from scratch, ignoring the layer cache
	@$(COMPOSE) build --no-cache

.PHONY: shell
shell: ## Bash inside the backend container
	@$(COMPOSE) exec backend /bin/bash

.PHONY: cli
cli: ## Run a codegen-core command, e.g. make cli ARGS="status DEEP-2041-ab12cd"
	@$(COMPOSE) exec backend python -m codegen_core.cli $(ARGS)

.PHONY: run-story
run-story: ## Start a fresh run: make run-story STORY=DEEP-2041
	@$(COMPOSE) exec backend python -m codegen_core.cli run $(or $(STORY),DEEP-2041)

.PHONY: gates
gates: ## Show gates waiting on a human
	@$(COMPOSE) exec backend python -c "import json,urllib.request as u; \
	runs=json.load(u.urlopen('http://127.0.0.1:8000/api/runs')); \
	print(json.dumps([json.load(u.urlopen(f\"http://127.0.0.1:8000/api/runs/{r['jobId']}/gates\")) for r in runs], indent=2))"

.PHONY: test
test: ## Backend suite, then the sample project's suite
	@$(COMPOSE) exec backend python -m pytest tests -q
	@$(COMPOSE) exec -w /workspace backend python -m pytest -q

.PHONY: reset
reset: ## Delete run data and re-seed on next start
	@$(COMPOSE) down --volumes --remove-orphans
	@git checkout -- backend/sample-project 2>/dev/null || true
	@echo "reset. run 'make up' to start again"

.PHONY: help
help: ## List targets
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[38;5;179m%-12s\033[0m %s\n", $$1, $$2}'
