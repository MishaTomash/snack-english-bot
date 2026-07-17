import { Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';
import { config } from '../../config';
import { User } from '../../models/User';
import { ChatSession } from '../../models/ChatSession';
import { createChatMenu } from '../keyboards/chat';
import { createMainMenu } from '../keyboards/main';
import { getRandomTopic, getTopicById } from '../../services/chat/topics';
import { buildSystemPrompt } from '../../services/chat/promptBuilder';
import { startSession, getSession, endSession, enqueue, touchSession, registerInactivityHandler } from '../../services/chat/sessionManager';
import { Api } from 'grammy';
import { getRandomPersonality } from '../../services/chat/personas';
import { isNotEnglish } from '../../services/chat/languageCheck';
import { getAiChatReply, getAiChatTurn, getChatAnalysis, ChatAnalysisResult, getChatHint, translateToUkrainian } from '../../services/chat/chatAiService';
import {
    canSendChatMessage,
    incrementChatMessageCount,
    isOnCooldown,
    registerMessageTime,
    isMessageTooLong,
    isSuspiciousMessage,
} from '../../services/chat/rateLimiter';
import { transcribeVoiceMessage, MAX_VOICE_DURATION_SECONDS } from '../../services/chat/voiceService';


const api = new Api(config.BOT_TOKEN);

registerInactivityHandler(async (telegramId: number) => {
    try {
        await ChatSession.deleteOne({ telegramId });

        await api.sendMessage(
            telegramId,
            '⏰ Чат завершено через бездіяльність (15 хв). Натисни «💬 Чатік», щоб почати знову 👇',
            { reply_markup: createMainMenu() }
        );
    } catch (err) {
        console.error('Помилка авто-завершення чату:', err);
    }
});

export const handleStartChat = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await User.findOne({ telegramId });
    const level = user?.level || 'A2';
    const topic = getRandomTopic();
    const persona = getRandomPersonality(); // ← НОВЕ

    await ChatSession.findOneAndUpdate(
        { telegramId },
        { isActive: true, isPaused: false, topic: topic.id, startedAt: new Date(), messageCount: 0 },
        { upsert: true }
    );

    startSession(telegramId, topic, level, persona);

    await ctx.reply(
        `💬 <b>Режим "Чатік" активовано!</b>\n\n` +
        `Тема: <b>${topic.titleUa}</b>\n` +
        `Рівень: <b>${level}</b>\n\n` +
        `Пиши або надсилай голосові англійською — я твій співрозмовник для практики. Щоб вийти, натисни «❌ Завершити чат».`,
        { parse_mode: 'HTML', reply_markup: createChatMenu() }
    );

    await sendAiOpeningLine(ctx, telegramId);
};

const sendAiOpeningLine = async (ctx: Context, telegramId: number) => {
  const session = getSession(telegramId);
  if (!session) return;

  const systemPrompt = buildSystemPrompt(
    session.level,
    session.topic,
    session.persona,
    session.conversation.getFacts(),
  );
  const reply = await getAiChatReply(systemPrompt, []);
  session.conversation.addAssistantMessage(reply);

  await ctx.reply(reply);
};

const formatAnalysis = (analysis: ChatAnalysisResult): string => {
    const lines = [
        `📊 <b>Аналіз твоєї практики</b>`,
        ``,
        `✅ <b>Що вийшло добре:</b>`,
        analysis.strengths,
    ];

    if (analysis.mistakes.length > 0) {
        lines.push('', `📝 <b>Моменти для покращення:</b>`);
        analysis.mistakes.forEach((m, i) => {
            lines.push(
                `${i + 1}. ❌ "${m.original}" → ✅ "${m.correct}"`,
                `   💡 ${m.note}`
            );
        });
    }

    lines.push('', `🎯 <b>Порада:</b> ${analysis.tip}`);

    return lines.join('\n');
};

export const handleExitChat = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const session = getSession(telegramId);

    if (session) {
        const history = session.conversation.getHistory();
        const analysis = await getChatAnalysis(history, session.level);

        if (analysis) {
            await ctx.reply(formatAnalysis(analysis), { parse_mode: 'HTML' });
        }
    }

    await ChatSession.deleteOne({ telegramId });
    endSession(telegramId);
    await ctx.reply('✅ Чат завершено. Повертаю тебе у звичайний режим 👇', {
        reply_markup: createMainMenu(),
    });
};

const sendUpgradeMessage = async (ctx: Context) => {
    const keyboard = new InlineKeyboard().text('⭐ Оформити Premium', 'open_premium_menu');

    await ctx.reply(
        `❤️ Вам сподобалася практика?\n\n` +
        `Щоб продовжити розмову без обмежень, підтримайте розвиток проєкту, оформивши Premium.\n\n` +
        `Використання AI коштує грошей, тому Premium допомагає покривати витрати та дозволяє мені розвивати Snack English далі.\n\n` +
        `Дякую за підтримку ❤️`,
        { reply_markup: keyboard }
    );
};

const isTooShortToCheck = (text: string): boolean => {
    const words = text.trim().split(/\s+/);
    return words.length <= 1;
};

export const processChatMessage = async (ctx: Context, telegramId: number, text: string) => {
    touchSession(telegramId);

    if (isOnCooldown(telegramId)) return;
    registerMessageTime(telegramId);

    if (isMessageTooLong(text)) {
        await ctx.reply('✂️ Повідомлення занадто довге. Спробуй сказати коротше.');
        return;
    }

    const session = getSession(telegramId);
    if (!session) {
        await ctx.reply('⚠️ Схоже, сесія чату перервалась. Натисни «💬 Чатік», щоб почати знову.');
        return;
    }

    if (isSuspiciousMessage(text)) {
        await ctx.reply("Let's keep practicing English conversation 🙂 Tell me more about our topic!");
        return;
    }

    if (isNotEnglish(text)) {
        await ctx.reply('🇬🇧 Спробуй написати це англійською — так практика буде ефективнішою! Навіть якщо не знаєш якесь слово, просто сформулюй як можеш 💪');
        return;
    }

    const { allowed } = await canSendChatMessage(telegramId);
    if (!allowed) {
        await ChatSession.findOneAndUpdate({ telegramId }, { isPaused: true });
        await sendUpgradeMessage(ctx);
        return;
    }

await enqueue(telegramId, async () => {
    session.conversation.addUserMessage(text);

    const userTurnCount = session.conversation.getHistory().filter(t => t.role === 'user').length;
    const shouldCheck = userTurnCount > 0 && userTurnCount % 4 === 0 && !isTooShortToCheck(text);

    const systemPrompt = buildSystemPrompt(session.level, session.topic, session.persona, session.conversation.getFacts());

    const result = await getAiChatTurn(
      systemPrompt,
      session.conversation.getHistory(),
      shouldCheck,
      session.level,
      session.lastStyle,               // ← НОВЕ
      session.lastEndedWithQuestion    // ← НОВЕ
    );

    if (result.correction) {
      await ctx.reply(`📌 ${result.correction}`);
    }
    if (result.fact) {
      session.conversation.addFact(result.fact);
    }

    // ← НОВЕ: запам'ятовуємо стиль і чи закінчилось питанням, для наступного ходу
    session.lastStyle = result.style;
    session.lastEndedWithQuestion = result.reply.trim().endsWith('?');

    session.conversation.addAssistantMessage(result.reply);

    await incrementChatMessageCount(telegramId);
    await ChatSession.findOneAndUpdate({ telegramId }, { $inc: { messageCount: 1 } });

    const cleanAiMessage = (t: string) => t.replace(/\n\s*\n/g, '\n').trim();
    await ctx.reply(cleanAiMessage(result.reply));
  });
};
export const handleChatVoice = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    const voice = ctx.message?.voice;
    if (!telegramId || !voice) return;

    if (voice.duration > MAX_VOICE_DURATION_SECONDS) {
        await ctx.reply(`🎙️ Голосове занадто довге. Максимум — ${MAX_VOICE_DURATION_SECONDS} секунд.`);
        return;
    }

    const statusMsg = await ctx.reply('🎙️ Розпізнаю голосове...');

    try {
        const file = await ctx.getFile();
        const filePath = await downloadTelegramFile(file.file_path!, telegramId);
        const text = await transcribeVoiceMessage(filePath);

        await ctx.api.deleteMessage(ctx.chat!.id, statusMsg.message_id).catch(() => { });

        if (!text) {
            await ctx.reply('⚠️ Не вдалося розпізнати голосове. Спробуй ще раз або напиши текстом.');
            return;
        }

        await processChatMessage(ctx, telegramId, text);
    } catch (err) {
        console.error('Помилка розпізнавання голосового:', err);
        await ctx.api.deleteMessage(ctx.chat!.id, statusMsg.message_id).catch(() => { });
        await ctx.reply('⚠️ Сталася помилка при розпізнаванні голосового.');
    }
};

const downloadTelegramFile = (telegramFilePath: string, telegramId: number): Promise<string> => {
    const url = `https://api.telegram.org/file/bot${config.BOT_TOKEN}/${telegramFilePath}`;
    const localPath = path.join(os.tmpdir(), `voice_${telegramId}_${Date.now()}.oga`);

    return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(localPath);
        https
            .get(url, response => {
                response.pipe(fileStream);
                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve(localPath);
                });
            })
            .on('error', err => {
                fs.unlink(localPath, () => { });
                reject(err);
            });
    });
};

export const handleChatHint = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    touchSession(telegramId);

    const session = getSession(telegramId);
    if (!session) {
        await ctx.reply('⚠️ Немає активного чату. Натисни «💬 Чатік», щоб почати.');
        return;
    }

    const statusMsg = await ctx.reply('💡 Думаю над підказкою...');

    try {
        const systemPrompt = buildSystemPrompt(session.level, session.topic, session.persona, session.conversation.getFacts());
        const hint = await getChatHint(systemPrompt, session.conversation.getHistory());
        const hintUa = await translateToUkrainian(hint);

        await ctx.api.deleteMessage(ctx.chat!.id, statusMsg.message_id).catch(() => { });
        await ctx.reply(`💡 <b>Можеш відповісти так:</b>\n"${hint}"\n\n<i>${hintUa}</i>`, {
            parse_mode: 'HTML',
        });
    } catch (err) {
        console.error('Помилка підказки:', err);
        await ctx.api.deleteMessage(ctx.chat!.id, statusMsg.message_id).catch(() => { });
        await ctx.reply('⚠️ Не вдалося згенерувати підказку.');
    }
};

export const handleChatTranslate = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    touchSession(telegramId);

    const session = getSession(telegramId);
    if (!session) {
        await ctx.reply('⚠️ Немає активного чату. Натисни «💬 Чатік», щоб почати.');
        return;
    }

    const history = session.conversation.getHistory();
    const lastAiMessage = [...history].reverse().find(turn => turn.role === 'assistant');

    if (!lastAiMessage) {
        await ctx.reply('⚠️ Поки що нема що перекладати.');
        return;
    }

    const statusMsg = await ctx.reply('📝 Перекладаю...');

    try {
        const translation = await translateToUkrainian(lastAiMessage.content);
        await ctx.api.deleteMessage(ctx.chat!.id, statusMsg.message_id).catch(() => { });
        await ctx.reply(`📝 <b>Переклад:</b>\n${translation}`, { parse_mode: 'HTML' });
    } catch (err) {
        console.error('Помилка перекладу:', err);
        await ctx.api.deleteMessage(ctx.chat!.id, statusMsg.message_id).catch(() => { });
        await ctx.reply('⚠️ Не вдалося перекласти повідомлення.');
    }
};

export const handleChatTranslateStub = async (ctx: Context) => {
    await ctx.reply('📝 Переклад з\'явиться незабаром!');
};
export const handleChatVoiceoverStub = async (ctx: Context) => {
    await ctx.reply('🔊 Озвучення з\'явиться незабаром!');
};
