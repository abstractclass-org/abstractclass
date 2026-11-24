// The PTN of a finished playtak game by its number, for the import (docs/design/34-tak-site.md, "The check of CORS"): a
// Pages Function on Mistak's own Cloudflare project, at /api/playtak/ptn/<number>. It needs no setting and no secret.
import { playtakProxy } from "../../../src/lib/import/playtakProxy.ts";

export const onRequest = playtakProxy();
