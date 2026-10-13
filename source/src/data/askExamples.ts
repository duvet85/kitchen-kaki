import { Ask, Need, Topic, itemsNamed } from '../engine/hiccup';

/** What a reading of a message should come to. Only the fields given are checked. */
export interface Expect {
  kind: 'adjust' | 'add' | 'topic' | 'unclear';
  needs?: Need[];
  /** plain words for what is missing; each must map to a shop item that Kaki marks as missing */
  missing?: string[];
  /** weekday (Mon = 0) the message names */
  day?: number;
  /** words that must be among the dish words for "add" */
  want?: string[];
  topic?: Topic;
}
export interface Example { q: string; expect: Expect }

const add = (q: string, extra: Partial<Expect> = {}): Example => ({ q, expect: { kind: 'add', ...extra } });
const adj = (q: string, extra: Partial<Expect> = {}): Example => ({ q, expect: { kind: 'adjust', ...extra } });
const top = (q: string, topic: Topic, extra: Partial<Expect> = {}): Example => ({ q, expect: { kind: 'topic', topic, ...extra } });

/** Common things owners and helpers say to Ask Kaki. Used by the rule-reader test and the "Try common questions" tester in Settings. */
export const ASK_EXAMPLES: Example[] = [
  add('I want to add prawn dish for thursday', { day: 3, want: ['prawn'] }),
  add('Add a chicken dish on Friday', { day: 4, want: ['chicken'] }),
  add('Can we have curry on Saturday', { day: 5, want: ['curry'] }),
  add('Add soup on Monday', { day: 0, want: ['soup'] }),
  add('One more vegetable dish on Wednesday', { day: 2, want: ['vegetable'] }),
  add('Please add a quick vegetarian dish for Tuesday', { day: 1, needs: ['quick', 'vegetarian'] }),
  add('I want fish tomorrow', { want: ['fish'] }),
  top('Swap Tuesday dish', 'swap', { day: 1 }),
  top('Remove the pork dish on Friday', 'remove', { day: 4 }),
  top('Cancel Thursday dinner', 'remove', { day: 3 }),
  top('Replace the fish with something else', 'swap'),
  adj('Someone has a fever', { needs: ['light'] }),
  adj('Grandma is sick today, need porridge', { needs: ['light'] }),
  adj('The child has a cough and sore throat', { needs: ['light'] }),
  adj('Someone has a stomach flu', { needs: ['light'] }),
  adj('No prawns at the shop', { missing: ['prawn'] }),
  adj('We ran out of chicken', { missing: ['chicken'] }),
  adj("Couldn't find kangkong today", { missing: ['kangkong'] }),
  adj('No eggs left', { missing: ['egg'] }),
  adj('Sold out of tofu and fish', { missing: ['tofu', 'fish'] }),
  adj('No time to cook tonight', { needs: ['quick'] }),
  adj("I'm running late, cook something quick", { needs: ['quick'] }),
  adj('Make tomorrow vegetarian', { needs: ['vegetarian'] }),
  adj('No chilli today please', { needs: ['mild'] }),
  adj('Less spicy for Friday', { needs: ['mild'], day: 4 }),
  adj('No meat on Wednesday', { needs: ['vegetarian'], day: 2 }),
  adj('Light food for tomorrow, someone is unwell', { needs: ['light'] }),
  adj("Can't buy kailan and no time tonight", { missing: ['kailan'], needs: ['quick'] }),
  top('Guests coming on Saturday', 'guests', { day: 5 }),
  top('Relatives are visiting, need more food', 'guests'),
  top('Can we spend less this week?', 'cheaper'),
  top('Make the food cheaper', 'cheaper'),
  top('I want it spicier', 'spicier'),
  top('Chinese New Year dinner on Sunday', 'festival', { day: 6 }),
  top("It's Ramadan, we are fasting", 'fasting'),
  top('Thanks Kaki!', 'thanks'),
  { q: 'Good morning', expect: { kind: 'unclear' } },
  { q: 'asdf', expect: { kind: 'unclear' } },
  { q: 'What is the weather like?', expect: { kind: 'unclear' } },
];

/** The kind of answer a reading amounts to. */
export const kindOf = (a: Ask | null): Expect['kind'] => (!a ? 'unclear' : a.topic ? 'topic' : a.add ? 'add' : 'adjust');

/** What is different from what was expected, in plain words. Empty when the reading is as expected. */
export function differences(e: Expect, a: Ask | null): string[] {
  const out: string[] = [];
  const kind = kindOf(a);
  if (kind !== e.kind) out.push(`understood as "${kind === 'topic' ? `${a!.topic} (pointer only)` : kind}", expected "${e.kind === 'topic' ? `${e.topic} (pointer only)` : e.kind}"`);
  if (!a || kind !== e.kind) return out;
  if (e.topic && a.topic !== e.topic) out.push(`topic ${a.topic}, expected ${e.topic}`);
  if (e.day != null && a.day !== e.day) out.push(`day ${a.day == null ? 'not found' : a.day}, expected ${e.day}`);
  if (e.needs && !e.needs.every((n) => (kind === 'add' ? a.needs : a.needs).includes(n))) out.push(`needs ${a.needs.join(', ') || 'none'}, expected ${e.needs.join(', ')}`);
  if (e.missing) {
    const bad = e.missing.filter((w) => !itemsNamed(w).some((k) => a.missing.includes(k)));
    if (bad.length) out.push(`missing ${a.missing.length ? a.missing.join(', ') : 'nothing'}, expected ${bad.join(', ')}`);
  }
  if (kind === 'add' && e.want && !e.want.every((w) => (a.add?.words ?? []).some((x) => x.startsWith(w.slice(0, 4))))) out.push(`dish words ${(a.add?.words ?? []).join(', ') || 'none'}, expected ${e.want.join(', ')}`);
  if (kind === 'adjust' && !e.missing && a.missing.length && !e.needs) out.push(`invented missing items: ${a.missing.join(', ')}`);
  return out;
}

/** What a Gemini plan (Kaki's reply plus proposed edits) gets wrong against what was expected. Empty when fine. */
export function planDifferences(e: Expect, plan: { actions: { kind: string; day: number }[]; reply: string }): string[] {
  const out: string[] = [];
  const kinds = plan.actions.map((a) => a.kind);
  const has = (...k: string[]) => kinds.some((x) => k.includes(x));
  if (e.kind === 'add' && !has('add')) out.push('expected a dish to be offered to add');
  if (e.kind === 'adjust' && !plan.actions.length) out.push('expected a swap or an adapted dish');
  if (e.kind === 'adjust' && has('add')) out.push('added a dish, but the message was about changing what is cooked');
  if (e.kind === 'unclear' && plan.actions.length) out.push(`proposed ${plan.actions.length} change(s) for a message that asks for none`);
  if (e.kind === 'topic') {
    if (e.topic === 'remove' && !has('remove')) out.push('expected a dish to be taken off');
    if (e.topic === 'swap' && !has('swap', 'adapt')) out.push('expected a swap');
    if (e.topic === 'thanks' && plan.actions.length) out.push('changed the menu for a thank-you');
    if (e.topic !== 'remove' && has('remove')) out.push('proposed taking a dish off, which was not asked');
  }
  if (e.day != null) {
    const off = plan.actions.filter((a) => a.day !== e.day);
    if (off.length) out.push(`changed days other than the one named (${off.length} edit(s))`);
  }
  if (!plan.reply.trim()) out.push('no reply written');
  return out;
}
