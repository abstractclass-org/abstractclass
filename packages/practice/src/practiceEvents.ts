// What PostHog receives about a practice game (Hedge School's design 17): its settings, the network by its
// name, with `cores` and the bot's form (gpu, cpu, single), as `practice_start` and `practice_end` both carry them.
// Never a move or the player's name. A site gives its networks' names.
import { BOT_SECOND_RANGES, CORE_RANGES, EDGE_RANGES, TAKEBACK_RANGES, range } from "@abstractclass/site/measure.ts";
import type { KeptPractice, PracticeOutcome } from "./practice.ts";

/** The events' parameters, with the site's names of its networks. */
export function practiceEvents(networkName: (id: string) => string) {
  /** `practice_start`'s parameters, which `practice_end` carries too. */
  function practiceParams(k: KeptPractice, form: string, cores: number): Record<string, string | number> {
    return {
      network: networkName(k.bot.network), bot_visits: k.bot.visits, bot_variety: k.bot.variety,
      practice_side: k.human === 0 ? "blue" : "red", bot_form: form, cores: range(cores || 1, CORE_RANGES),
    };
  }
  /** `practice_end`'s parameters: the game's settings, its outcome, its moves (`edges`, the name that every event
   *  gives a game's length), its takebacks, and the bot's average seconds a turn, as ranges ("none" before the bot's
   *  first turn). */
  function practiceEndParams(k: KeptPractice, form: string, cores: number, outcome: PracticeOutcome, edges: number) {
    const turns = k.botTurns ?? 0;
    return {
      ...practiceParams(k, form, cores), practice_outcome: outcome, edges: range(edges, EDGE_RANGES),
      practice_takebacks: range(k.takebacks ?? 0, TAKEBACK_RANGES),
      bot_seconds: turns ? range(Math.floor((k.botMs ?? 0) / turns / 1000), BOT_SECOND_RANGES) : "none",
    };
  }
  return { practiceParams, practiceEndParams };
}
