/**
 * What this family calls the person who cooks ("Cook" by default). The owner can change it in Settings. It is set from the
 * state each time the app renders (see StateProvider), so any screen can use cook() / cookL() inside its text.
 */
export const DEFAULT_COOK = 'Cook';
let label = DEFAULT_COOK;

export const setCookLabel = (v: string | undefined) => { label = (v ?? '').trim().slice(0, 20) || DEFAULT_COOK; };

/** The label as typed, for titles and tab names ("Cook", "Helper", "Kaki"). */
export const cook = () => label;

/** The label inside a sentence: "Cook" and "Helper" are common nouns so they go lower case ("your cook"); a name stays as typed. */
export const cookL = () => (/^(cook|helper|maid|kaki)$/i.test(label) && label.toLowerCase() !== 'kaki' ? label.toLowerCase() : label);

/** Plural for sentences ("Many cooks already cook well"). */
export const cooksL = () => (cookL() === label.toLowerCase() ? `${cookL()}s` : `${label}'s cooks`);

import { LANGS } from './i18n';
import { AppState, Lang } from './types';

/** The cook's own language: the one the owner chose in Settings, else the one already in use. undefined = not chosen yet. */
export const cookLangOf = (st: Pick<AppState, 'settings'>): Lang | undefined => st.settings.cookLang ?? (st.settings.helperLang !== 'en' ? st.settings.helperLang : undefined);

/** Languages to offer for the cook's screens: English plus the cook's own language only (all of them until one is chosen). */
export const langOptions = (st: Pick<AppState, 'settings'>) => {
  const own = cookLangOf(st);
  return own ? LANGS.filter((l) => l.key === 'en' || l.key === own) : LANGS;
};
