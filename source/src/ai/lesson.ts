import { LANGS } from '../i18n';
import { FamilyConfig, lessonViaFamily } from '../sync/family';
import { Lang } from '../types';
import { GeminiError, generateAny } from './gemini';
import { LESSON_PROMPT, LESSON_SCHEMA, LessonCandidate, LessonPlanAI, RawLessonPlan, checkPlan } from './lessonPlan';

export * from './lessonPlan';

type GenerateResponse = { candidates?: { content?: { parts?: { text?: string }[] } }[] };

/** Asks Gemini (the family's Edge Function, or the owner's own key) for a lesson plan. Throws GeminiError / FamilyError. */
export async function planLessonAI(dishes: LessonCandidate[], lang: Lang, via: { family: FamilyConfig | null; key: string | null }): Promise<LessonPlanAI> {
  let raw: RawLessonPlan;
  if (via.family) {
    raw = await lessonViaFamily(via.family, dishes, lang);
  } else if (via.key) {
    const { data } = await generateAny<GenerateResponse>(via.key, {
      contents: [{ role: 'user', parts: [{ text: LESSON_PROMPT(dishes, lang) }] }],
      generationConfig: { temperature: 0.3, responseMimeType: 'application/json', responseSchema: LESSON_SCHEMA },
    });
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    try { raw = JSON.parse(text); } catch { throw new GeminiError('Gemini sent back something unreadable.'); }
  } else {
    throw new GeminiError('Gemini is off.');
  }
  const plan = checkPlan(raw, dishes, lang);
  if (!plan) throw new GeminiError('Gemini picked dishes that weren\'t on the list, so the app picked by its own rules.');
  return plan;
}

export const langLabel = (l: Lang) => LANGS.find((x) => x.key === l)?.label ?? l;
