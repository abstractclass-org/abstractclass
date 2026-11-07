// A review or the Analysis board's lines as an annotated record (Hedge School's designs 13 and 21, design 33): the
// shared record (@abstractclass/analysis/annotate.ts), with Blueprints' moves. A move played is written with its
// capture mark (`2@-3,1x+24`), and the engine's choice by its name ("1@0,2 was best.").
import * as shared from "@abstractclass/analysis/annotate.ts";
import { blueprints, playedText, type Blueprints } from "./blueprints.ts";

export type AnnotateInput = shared.AnnotateInput<Blueprints>;

/** The annotated record, each move played with its capture mark (playedText). */
export const annotatedRecord = (input: AnnotateInput): string => shared.annotatedRecord(blueprints, playedText, input);
