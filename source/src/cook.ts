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
