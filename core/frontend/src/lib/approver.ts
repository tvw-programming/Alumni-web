/**
 * Who is deciding, remembered per browser.
 *
 * The orchestrator records a name against every gate decision and every
 * replacement document, so the dashboard has to ask for one. Asking once per
 * browser rather than once per decision is the difference between a control
 * people use and a control people work around.
 */

const APPROVER_KEY = 'codegen_core.approver';

export function storedApprover(): string {
  try {
    return window.localStorage.getItem(APPROVER_KEY) ?? '';
  } catch {
    return ''; // Private browsing, or storage disabled. Not worth failing over.
  }
}

export function rememberApprover(name: string): void {
  try {
    window.localStorage.setItem(APPROVER_KEY, name);
  } catch {
    /* nothing to do — the decision still carries the name */
  }
}
