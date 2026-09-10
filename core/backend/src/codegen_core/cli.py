"""CodeGen Core command line.

    codegen-core config validate|explain|diff|health
    codegen-core steps list
    codegen-core run <JIRA-ID> [--title T --description D --criteria C ...] [--start N] [--stop N]
    codegen-core resume <JOB-ID>
    codegen-core retry  <JOB-ID> <STEP> [--only]
    codegen-core gates list <JOB-ID>
    codegen-core approve <JOB-ID> <STEP> --as <user> --role <role> [--reject]
    codegen-core revise  <JOB-ID> <STEP> <FILE> --as <user> --role <role>
    codegen-core status <JOB-ID>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .core import story_input
from .core.config import ConfigLoader
from .core.context import JobContext
from .core.errors import CodeGenCoreError, DocumentRejected
from .core.telemetry import configure
from .llm.factory import build_backends
from .llm.router import LLMRouter
from .orchestrator.gates import GateService
from .orchestrator.runner import PipelineRunner
from .steps._loader import describe_steps, load_steps


def _load(args) -> object:
    return ConfigLoader.load(getattr(args, "config", None), getattr(args, "profile", None))


def _resume_ctx(cfg, job_id: str) -> JobContext:
    jira_id = job_id.split("-")[1] if "-" in job_id else job_id
    return JobContext.create(cfg, jira_id, job_id=job_id)


# --------------------------------------------------------------------------- #
def cmd_config(args) -> int:
    cfg = _load(args)
    if args.action == "validate":
        # Resolving the project path is part of the check: an unusable checkout
        # fails here with a readable message instead of at step 12.
        project = cfg.validate_project_path()
        print(f"OK  profile={cfg.active_profile}  backends={len(cfg.backends)}  "
              f"steps={len(cfg.steps)}  gates={sorted(cfg.gates)}")
        print(f"    project={project}"
              f"{'' if cfg.app.project.path else '  (from app.paths.workspace)'}")
        return 0
    if args.action == "explain":
        ctx = JobContext.create(cfg, "EXPLAIN")
        router = LLMRouter(cfg, build_backends(cfg), ctx.journal)
        steps = [args.step] if args.step else sorted(int(s) for s in cfg.routing.steps)
        print(json.dumps([router.explain(s) for s in steps], indent=2))
        return 0
    if args.action == "health":
        rows = []
        for bid, b in build_backends(cfg).items():
            rows.append({"backend": bid, "driver": b.cfg.driver, "tier": b.tier,
                         "model": b.model_id, "capabilities": sorted(c.value for c in b.capabilities)})
        print(json.dumps(rows, indent=2))
        return 0
    if args.action == "diff":
        raw = json.loads(Path(args.config or "config/config.json").read_text())
        print(json.dumps(raw.get("profiles", {}).get(args.other or cfg.active_profile, {}), indent=2))
        return 0
    return 1


def cmd_steps(args) -> int:
    cfg = _load(args)
    rows = describe_steps(load_steps(cfg))
    if args.json:
        print(json.dumps(rows, indent=2))
    else:
        for r in rows:
            print(f"{r['step']:02d}  {r['kind']:<7} {r['name']:<34} {r['category']}")
    return 0


def cmd_run(args) -> int:
    cfg = _load(args)
    configure(cfg)
    ctx = JobContext.create(cfg, args.jira_id)
    # Story details given here stand in for the tracker; give none and step 01
    # fetches from whatever config.json has configured, as it always has.
    if args.title or args.criteria:
        story_input.save(ctx, {
            "key": args.jira_id,
            "title": args.title or args.jira_id,
            "description": args.description,
            "acceptance_criteria": args.criteria,
            "entered_by": args.user or "",
        })
    if args.user:
        # Recorded the same way the dashboard records it, so whoever asks later
        # — including the commit author at step 22 — has one place to look.
        # Without this, `--as` only survived when story details were typed too.
        ctx.journal.append_event(
            "run_requested", jira_id=args.jira_id, started_by=args.user, story_source="cli"
        )
    print(f"job {ctx.job_id}  profile={cfg.active_profile}")
    result = PipelineRunner(cfg).run(ctx, start=args.start, stop=args.stop)
    print(json.dumps({"job_id": result.job_id, "ok": result.ok,
                      "halted_at": result.halted_at, "reason": result.reason,
                      "cost_usd": ctx.journal.total_cost_usd()}, indent=2))
    return 0 if result.ok else 2


def cmd_resume(args) -> int:
    cfg = _load(args)
    configure(cfg)
    ctx = _resume_ctx(cfg, args.job_id)
    runner = PipelineRunner(cfg)
    # The first *unfinished* step, which is not the same as the last recorded
    # one plus one: a rejected gate holds a record and still has to be re-run.
    start = runner.resume_point(ctx)
    print(f"resuming {ctx.job_id} from step {start:02d}")
    result = runner.run(ctx, start=start)
    print(json.dumps({"job_id": result.job_id, "ok": result.ok, "reason": result.reason}, indent=2))
    return 0 if result.ok else 2


def cmd_retry(args) -> int:
    """Re-run one failed step from the beginning, then carry the run on."""
    cfg = _load(args)
    configure(cfg)
    ctx = _resume_ctx(cfg, args.job_id)
    print(f"retrying {ctx.job_id} step {args.step:02d}")
    result = PipelineRunner(cfg).retry(ctx, args.step, resume=not args.only)
    print(json.dumps({"job_id": result.job_id, "ok": result.ok,
                      "halted_at": result.halted_at, "reason": result.reason}, indent=2))
    return 0 if result.ok else 2


def cmd_gates(args) -> int:
    cfg = _load(args)
    ctx = _resume_ctx(cfg, args.job_id)
    print(json.dumps(GateService(cfg).pending(ctx), indent=2))
    return 0


def cmd_approve(args) -> int:
    cfg = _load(args)
    ctx = _resume_ctx(cfg, args.job_id)
    status = "REJECTED" if args.reject else "APPROVED"
    decision = GateService(cfg).decide(ctx, args.step, status, args.user, args.role, args.comment)
    print(json.dumps(decision, indent=2))
    return 0


def cmd_revise(args) -> int:
    """Answer a rejected gate with a replacement document."""
    cfg = _load(args)
    ctx = _resume_ctx(cfg, args.job_id)
    path = Path(args.file)
    if not path.is_file():
        raise DocumentRejected(f"no such file: {path}")
    record = GateService(cfg).revise(
        ctx,
        args.step,
        filename=path.name,
        data=path.read_bytes(),
        uploaded_by=args.user,
        uploaded_role=args.role,
        comment=args.comment,
    )
    print(json.dumps(record, indent=2, default=str))
    print(
        f"gate {args.step:02d} re-opened against {record['file']}. "
        f"Decide it with `codegen-core approve {args.job_id} {args.step} --as ... --role {args.role}`."
    )
    return 0


def cmd_status(args) -> int:
    cfg = _load(args)
    ctx = _resume_ctx(cfg, args.job_id)
    entries = ctx.journal.entries()
    steps = [e for e in entries if e.get("type") == "step"]
    print(json.dumps({
        "job_id": ctx.job_id,
        "steps_completed": [e["step"] for e in steps if e["status"] in ("OK", "APPROVED", "PASSED")],
        "last_step": ctx.journal.last_step(),
        "approvals": [e for e in entries if e.get("type") == "approval"],
        "cost_usd": ctx.journal.total_cost_usd(),
        "artifacts": len(ctx.artifacts.index()),
    }, indent=2, default=str))
    return 0


# --------------------------------------------------------------------------- #
def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="codegen-core", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--config", help="path to config.json")
    p.add_argument("--profile", help="override CODEGEN_PROFILE")
    sub = p.add_subparsers(dest="cmd", required=True)

    c = sub.add_parser("config", help="inspect and validate configuration")
    c.add_argument("action", choices=["validate", "explain", "health", "diff"])
    c.add_argument("--step", type=int)
    c.add_argument("--other", help="profile name for diff")
    c.set_defaults(fn=cmd_config)

    s = sub.add_parser("steps", help="list the loaded step registry")
    s.add_argument("action", nargs="?", default="list", choices=["list"])
    s.add_argument("--json", action="store_true")
    s.set_defaults(fn=cmd_steps)

    r = sub.add_parser("run", help="run the pipeline for a Jira id")
    r.add_argument("jira_id")
    r.add_argument("--start", type=int)
    r.add_argument("--stop", type=int)
    r.add_argument("--title", default="", help="story title; omit to read the tracker")
    r.add_argument("--description", default="", help="story description")
    r.add_argument("--criteria", action="append", default=[],
                   help="an acceptance criterion; repeat for each one")
    r.add_argument("--as", dest="user", default="",
                   help="email of whoever is starting this run; required once "
                        "plugins.vcs.repo is set, because it authors the commits")
    r.set_defaults(fn=cmd_run)

    rs = sub.add_parser("resume", help="resume a halted job")
    rs.add_argument("job_id")
    rs.set_defaults(fn=cmd_resume)

    rt = sub.add_parser("retry", help="re-run one failed step, then continue the run")
    rt.add_argument("job_id")
    rt.add_argument("step", type=int)
    rt.add_argument("--only", action="store_true",
                    help="run just that step and stop, instead of continuing the run")
    rt.set_defaults(fn=cmd_retry)

    g = sub.add_parser("gates", help="list pending human gates")
    g.add_argument("action", nargs="?", default="list", choices=["list"])
    g.add_argument("job_id")
    g.set_defaults(fn=cmd_gates)

    a = sub.add_parser("approve", help="record a gate decision")
    a.add_argument("job_id")
    a.add_argument("step", type=int)
    a.add_argument("--as", dest="user", required=True)
    a.add_argument("--role", required=True)
    a.add_argument("--comment", default="")
    a.add_argument("--reject", action="store_true")
    a.set_defaults(fn=cmd_approve)

    v = sub.add_parser("revise", help="replace the document a gate rejected")
    v.add_argument("job_id")
    v.add_argument("step", type=int)
    v.add_argument("file", help="path to the replacement document (.md, .pdf, .docx)")
    v.add_argument("--as", dest="user", required=True)
    v.add_argument("--role", required=True)
    v.add_argument("--comment", default="")
    v.set_defaults(fn=cmd_revise)

    st = sub.add_parser("status", help="show job progress")
    st.add_argument("job_id")
    st.set_defaults(fn=cmd_status)
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return args.fn(args)
    except CodeGenCoreError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
