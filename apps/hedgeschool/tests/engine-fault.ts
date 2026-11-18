// A fault of the engine's workers, for the cases of a page that fails (engine-failure.spec.ts). No page makes the engine
// fail by itself, so the page's Worker gives the fault to one request, once in the tab: the worker's own error reply
// (the engine's worker.ts), and the request never reaches its worker. As practice-stop.spec.ts fails a request.
import type { Page } from "./page-log.ts";

/** The error's message of the fault: the code's, which the page does not show. */
export const FAULT_MESSAGE = "the test failed this request";

/** The key that arms the fault before a page loads again (armFault). */
const ARM = "engine-fault-armed";

/** Fails the first request of `type` that the page's workers get, once in the tab (sessionStorage: a page loaded again
 *  runs its requests): "init", a worker's start (the first is the rules engine's), or "search", a search of a
 *  position. `armed` false: only once the page has armed it (armFault), so that the page loads well first. */
export const failOnce = (page: Page, type: "init" | "search", armed = true) => page.addInitScript(([type, armed, ARM, text]) => {
  const DONE = "engine-fault-test";
  const Real = window.Worker;
  window.Worker = class extends Real {
    postMessage(message: unknown, options?: Transferable[] | StructuredSerializeOptions) {
      const m = message as { id?: number; type?: string } | null;
      if (m?.type === type && !sessionStorage.getItem(DONE) && (armed || sessionStorage.getItem(ARM))) {
        sessionStorage.setItem(DONE, type);
        setTimeout(() => this.dispatchEvent(new MessageEvent("message",
          { data: { type: "error", id: m.id, message: text } })));
        return;
      }
      // Both of Worker's forms, as in cyanotype-home.spec.ts: the if only picks super's overload for each form.
      if (Array.isArray(options)) super.postMessage(message, options); else super.postMessage(message, options);
    }
  };
}, [type, armed, ARM, FAULT_MESSAGE] as const);

/** Arms a fault that failOnce made with `armed` false: it comes at the next load of the page. */
export const armFault = (page: Page) => page.evaluate(key => sessionStorage.setItem(key, "1"), ARM);
