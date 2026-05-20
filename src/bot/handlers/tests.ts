import { Context, InlineKeyboard } from 'grammy';
import { User } from '../../models/User';
import { getRandomTest } from '../../services/testService';
import { createTestKeyboard } from '../keyboards/test';
import { getAudioUrl } from '../../services/audioService';
import { updateUserProgress } from '../../services/progressService';

const escapeMarkdownV2 = (text: string): string =>
  text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');

// Видача тесту
export const sendRandomTest = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  // ✅ answerCallbackQuery — ЗАВЖДИ ПЕРШИМ
  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery().catch(() => {});
  }

  try {
    const user = await User.findOne({ telegramId });
    if (!user || !user.level) {
      return ctx.reply('Будь ласка, спочатку обери свій рівень: /start');
    }

    const testData = await getRandomTest(user);
    if (!testData) {
      return ctx.reply('На жаль, для твого рівня поки немає тестів 😔');
    }

    const questionText = testData.question.replace(/___/g, '…');
    const safeQuestion = escapeMarkdownV2(questionText);
    const message = `🧠 *Міні\\-тест*\n\n${safeQuestion}`;

    const keyboard = createTestKeyboard(
      testData._id.toString(),
      testData.options,
      testData.correctOptionIndex,
    );

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        reply_markup: keyboard,
        parse_mode: 'MarkdownV2',
      }).catch((error: any) => {
        if (error?.description?.includes('message is not modified')) {
          // Тост вже не надсилаємо — answerCallbackQuery викликано вище без тексту
          // Можна зробити окремий виклик з текстом якщо потрібно
        }
      });
    } else {
      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'MarkdownV2',
      });
    }

  } catch (error: any) {
    console.error('Помилка при видачі тесту:', error);
    await ctx.reply('Вибач, сталася помилка. Спробуй ще раз.').catch(() => {});
  }
};

// Обробка відповіді
export const handleTestAnswer = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData || !telegramId) return;

  const parts = callbackData.split('_');
  const isCorrect = parts[2] === '1';

  // ✅ answerCallbackQuery з текстом результату — одразу першим
  await ctx.answerCallbackQuery({
    text: isCorrect ? '✅ Правильно! Молодець!' : '❌ Неправильно. Спробуй ще раз!',
    show_alert: true,
  }).catch(() => {});

  if (isCorrect) {
    await updateUserProgress(telegramId, 'test');

    const user = await User.findOne({ telegramId });
    if (user?.isPremium) {
      const wordToPronounce = ctx.callbackQuery?.message?.reply_markup?.inline_keyboard
        .flat()
        .find((btn) => 'callback_data' in btn && btn.callback_data === callbackData)?.text;

      if (wordToPronounce) {
        await ctx
          .replyWithVoice(getAudioUrl(wordToPronounce), {
            caption: `🔊 Вимова: ${wordToPronounce}`,
          })
          .catch((err) => console.error('Помилка відправки аудіо для тесту:', err));
      }
    }
  }

  // Замінюємо клавіатуру на кнопку "Наступне питання"
  const nextKeyboard = new InlineKeyboard().text('🔄 Наступне питання', 'next_test');
  await ctx
    .editMessageReplyMarkup({ reply_markup: nextKeyboard })
    .catch(() => {});
};