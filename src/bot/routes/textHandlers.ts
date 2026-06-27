import { Bot } from 'grammy';
import { config } from '../../config';
import { Word } from '../../models/Word';

import { handleAdminTextInbound, handleAdminMessages } from '../handlers/admin';
import { adminTopicStates } from '../handlers/adminTopics';
import { adminCourseStates, handleAdminCourseTextInput } from '../handlers/adminCourses';
import { handlePendingTextInput } from '../handlers/seasonAdmin';
import { SentenceExercise } from '../../models/SentenceExercise';


export const registerTextHandlers = (bot: Bot) => {
  // Режими адміна: теми / курси / старі команди word:/text:/test:
  bot.on('message:text', async (ctx, next) => {
    const telegramId = ctx.from.id;
    const text = ctx.message.text;

    if (text === '/cancel_topic') {
      adminTopicStates.delete(telegramId);
      return ctx.reply('❌ Режим додавання слів скасовано.');
    }
    if (text === '/cancel_course') {
      adminCourseStates.delete(telegramId);
      return ctx.reply('❌ Режим керування курсом скасовано.');
    }

    if (adminTopicStates.has(telegramId)) {
      const topicId = adminTopicStates.get(telegramId);
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      let addedCount = 0;
      for (const line of lines) {
        const parts = line.split('|').map(s => s.trim());
        if (parts.length >= 3) {
          const [english, ukrainian, transcription] = parts;
          await Word.create({ topicId, english, ukrainian, transcription });
          addedCount++;
        }
      }
      return addedCount > 0
        ? ctx.reply(`✅ Додано ${addedCount} слів!\nКидай ще, або /cancel_topic`)
        : ctx.reply('⚠️ Не зміг розпізнати слова. Формат: англ | укр | транскрипція');
    }

    if (adminCourseStates.has(telegramId)) {
      return handleAdminCourseTextInput(ctx);
    }
    // ── Адмін: додавання речень (sentence: ...) ──────────────
    if (ctx.from.id === config.ADMIN_ID && text.includes('sentence:')) {
      const lines = text.split('\n').filter(l => l.trim().startsWith('sentence:'));
      if (lines.length === 0) return next();

      let added = 0;
      const errors: string[] = [];
      const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

      for (const line of lines) {
        const parts = line.replace('sentence:', '').trim().split('|').map(s => s.trim());
        // Мінімум: sentence | translation
        if (parts.length < 2) {
          errors.push(`⚠️ Мало полів: <code>${line.substring(0, 30)}</code>`);
          continue;
        }
        const [sentence, translation, explanation, inputLevel] = parts;

        const level = inputLevel && validLevels.includes(inputLevel)
          ? inputLevel as 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
          : undefined;

        await SentenceExercise.create({ sentence, translation, explanation, level });
        added++;
      }

      let reply = `✅ <b>Додано речень: ${added}</b>\n`;
      if (errors.length > 0) reply += `\n⚠️ Помилки:\n${errors.join('\n')}`;
      return ctx.reply(reply, { parse_mode: 'HTML' });
    }
    // ─────────────────────────────────────────────────────────
    if (ctx.from.id === config.ADMIN_ID && (text.startsWith('word:') || text.startsWith('text:') || text.startsWith('test:'))) {
      return handleAdminTextInbound(ctx, next);
    }

    return next();
  });

  // Інбокс повідомлень для адміна
  bot.on('message', handleAdminMessages);

  // Сезон: очікування дати/наклейки від адміна
  bot.on('message:text', async (ctx, next) => {
    const handled = await handlePendingTextInput(ctx);
    if (!handled) return next();
  });

};