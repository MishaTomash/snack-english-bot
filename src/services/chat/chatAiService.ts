import OpenAI from 'openai';
import { config } from '../../config';

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_RESPONSE_TOKENS = 120;
const MODEL = 'gpt-4o-mini';

export const getAiChatReply = async (
  systemPrompt: string,
  history: ChatTurn[]
): Promise<string> => {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: MAX_RESPONSE_TOKENS,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.map(turn => ({ role: turn.role, content: turn.content })),
      ],
    });

    const reply = response.choices[0]?.message?.content?.trim();
    return reply || "Sorry, could you say that again?";
  } catch (err) {
    console.error('❌ Помилка запиту до OpenAI:', err);
    return "Sorry, I'm having trouble right now. Could you try again in a moment?";
  }
};

export interface ChatAnalysisResult {
  strengths: string;
  mistakes: { original: string; correct: string; note: string }[];
  tip: string;
}

export const getChatAnalysis = async (
  history: ChatTurn[],
  level: string
): Promise<ChatAnalysisResult | null> => {
  const hasUserMessages = history.some(t => t.role === 'user');
  if (!hasUserMessages) return null;

  try {
    const analysisPrompt = [
      `You are an English teacher reviewing a short practice conversation with a ${level}-level student.`,
      `Respond ONLY with a valid JSON object, nothing else, in this exact format:`,
      `{"strengths": string, "mistakes": [{"original": string, "correct": string, "note": string}], "tip": string}`,
      ``,
      `- "strengths": one short encouraging sentence in Ukrainian about what the student did well.`,
      `- "mistakes": up to 3 REAL mistakes the student made (grammar or word choice). Each "note" is a short reason in Ukrainian. If there were no real mistakes, return an empty array — do not invent mistakes.`,
      `- "tip": one short, concrete, actionable tip in Ukrainian for what to practice next time.`,
      `Keep everything short and warm, not harsh.`,
    ].join('\n');

    const conversationText = history
      .map(turn => `${turn.role === 'user' ? 'Student' : 'Teacher'}: ${turn.content}`)
      .join('\n');

    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 400,
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: analysisPrompt },
        { role: 'user', content: conversationText },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() || '{}';
    const parsed = JSON.parse(raw);

    return {
      strengths: parsed.strengths || 'Ти молодець, що практикувався!',
      mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
      tip: parsed.tip || 'Спробуй наступного разу писати трохи довші речення.',
    };
  } catch (err) {
    console.error('❌ Помилка аналізу розмови:', err);
    return null;
  }
};
export const getChatHint = async (
  systemPrompt: string,
  history: ChatTurn[]
): Promise<string> => {
  try {
    const lastAiMessage = [...history].reverse().find(turn => turn.role === 'assistant');

    const hintPrompt =
      `${systemPrompt}\n\n` +
      `The student doesn't know how to reply to your last message: "${lastAiMessage?.content || ''}". ` +
      `Write ONE short, simple example ANSWER the student could send, matching their level. ` +
      `It must be a direct answer to your last message — NOT a new question, NOT a topic change. ` +
      `Respond with ONLY that example answer — no quotes, no explanation, nothing else.`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 60,
      temperature: 0.5,
      messages: [{ role: 'system', content: hintPrompt }],
    });

    return response.choices[0]?.message?.content?.trim() || 'Yes, I like it.';
  } catch (err) {
    console.error('❌ Помилка отримання підказки:', err);
    return "Sorry, I couldn't come up with a hint right now.";
  }
};

export const translateToUkrainian = async (text: string): Promise<string> => {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 200,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: 'Translate the following English text into natural Ukrainian. Respond ONLY with the translation, nothing else.',
        },
        { role: 'user', content: text },
      ],
    });

    return response.choices[0]?.message?.content?.trim() || text;
  } catch (err) {
    console.error('❌ Помилка перекладу:', err);
    return 'Не вдалося перекласти. Спробуй ще раз.';
  }
};

export interface ChatReplyResult {
  reply: string;
  correction: string | null;
}

const CORRECTION_INSTRUCTIONS = `
Respond ONLY with a valid JSON object, nothing else, in this exact format:
{"correction": string or null, "reply": string}

- "reply": your conversational English reply, following all the level and style rules above (1-3 sentences). NEVER leave this empty.
- "correction": Check the STUDENT's very last message for a real, clear grammar or word-choice mistake.
  - Set "correction" to null if: the message is correct, the message is too short/simple to judge (like "yes", "no", "ok", a single word), or you are not fully sure it's actually wrong. When in doubt — null. Do NOT invent a mistake just to have something to say.
  - Only if there IS a clear, real mistake, write a short explanation in UKRAINIAN in this exact format (use \\n for line breaks):
    "❌ Ти написав: \\"<exact student text>\\"\\n✅ Правильно: \\"<corrected version>\\"\\n💡 <one short reason, in Ukrainian, one sentence>"
`;

export const getAiChatReplyWithCorrection = async (
  systemPrompt: string,
  history: ChatTurn[]
): Promise<ChatReplyResult> => {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 300,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt + '\n' + CORRECTION_INSTRUCTIONS },
        ...history.map(turn => ({ role: turn.role, content: turn.content })),
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() || '{}';
    const parsed = JSON.parse(raw);

    // ← ДОДАНО: якщо модель повернула порожню repl, робимо окремий звичайний запит
    // замість заглушки "Sorry, could you say that again?"
    if (!parsed.reply || !parsed.reply.trim()) {
      const fallbackReply = await getAiChatReply(systemPrompt, history);
      return { reply: fallbackReply, correction: parsed.correction || null };
    }

    return {
      reply: parsed.reply,
      correction: parsed.correction || null,
    };
  } catch (err) {
    console.error('❌ Помилка запиту з перевіркою помилок:', err);
    const reply = await getAiChatReply(systemPrompt, history);
    return { reply, correction: null };
  }
};

