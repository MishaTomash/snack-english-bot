import { Context, InlineKeyboard } from 'grammy';
import { Topic } from '../../models/Topic';
import { Word } from '../../models/Word';
import { User } from '../../models/User';


// 1. Показуємо список тем
export const handleTopicsMenu = async (ctx: Context) => {
    const topics = await Topic.find().lean();
    if (!topics.length) {
        return ctx.reply('Тематичні слова ще не додані 😔');
    }

    const keyboard = new InlineKeyboard();
    topics.forEach((t) => {
        keyboard.text(`${t.emoji} ${t.title}`, `topic_open_${t._id}`).row();
    });

    await ctx.reply('📚 Обери тему для вивчення:', { reply_markup: keyboard });
};

// 2. Відкриваємо тему (перше слово)
export const handleTopicOpen = async (ctx: Context) => {
    const topicId = ctx.callbackQuery?.data?.split('_')[2];
    if (!topicId) return;

    await sendNextTopicWord(ctx, topicId);
};

// 3. Обробка кнопок "Знаю" / "Не знаю" (Наступне слово)
export const handleTopicWordAction = async (ctx: Context) => {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    const [_, action, topicId, wordId] = data.split('_');
    const telegramId = ctx.from?.id;

    const user = await User.findOne({ telegramId });
    if (!user) return;

    // Перевірка ліміту (якщо не преміум і дія "Знаю")
    if (!user.isPremium && action === 'know' && user.freeTopicWordsLearned >= 10) {
        return ctx.editMessageText(
            '🔒 Ви вивчили 10 безкоштовних слів з тем.\n\nОформіть Premium, щоб вчити всі слова (1000+).',
            { reply_markup: new InlineKeyboard().text('💎 Купити Premium', 'open_premium_menu') }
        );
    }

    // 2️⃣ ВИПРАВЛЕННЯ: Видаляємо голосове повідомлення, якщо воно є в чаті
    if (user.lastAudioMessageId && ctx.chat?.id) {
        await ctx.api.deleteMessage(ctx.chat.id, user.lastAudioMessageId).catch(() => { });
        user.lastAudioMessageId = null as any;
    }

    // Оновлюємо статистику
    if (!user.seenTopicWords.includes(wordId as any)) {
        user.seenTopicWords.push(wordId as any);
    }

    if (action === 'know' && !user.isPremium) {
        user.freeTopicWordsLearned += 1;
    }

    await user.save();

    // Видаємо наступне слово
    await sendNextTopicWord(ctx, topicId);
};
// 5. Скидання прогресу теми, щоб пройти її заново
export const handleTopicReset = async (ctx: Context) => {
    const topicId = ctx.callbackQuery?.data?.split('_')[2];
    if (!topicId) return;

    const telegramId = ctx.from?.id;
    const user = await User.findOne({ telegramId });
    if (!user) return;

    // Знаходимо всі слова, які належать саме цій темі
    const topicWords = await Word.find({ topicId }).select('_id').lean();
    const topicWordIds = topicWords.map(w => w._id.toString());

    // Видаляємо слова цієї теми з історії переглядів юзера, інші теми не чіпаємо
    user.seenTopicWords = user.seenTopicWords.filter(
        (id) => !topicWordIds.includes(id.toString())
    );

    await user.save();
    await ctx.answerCallbackQuery({ text: '🔄 Тему скинуто! Починаємо заново.' }).catch(() => { });

    // Запускаємо вивчення цієї теми з першого слова
    await sendNextTopicWord(ctx, topicId);
};

// --- Допоміжна функція для видачі слова ---
const sendNextTopicWord = async (ctx: Context, topicId: string) => {
    const telegramId = ctx.from?.id;
    const user = await User.findOne({ telegramId });
    if (!user) return;

    // Перевірка ліміту для безкоштовних користувачів
    if (!user.isPremium && user.freeTopicWordsLearned >= 10) {
        const limitKeyboard = new InlineKeyboard().text('💎 Купити Premium', 'open_premium_menu');
        const limitText = '🔒 Ви вивчили 10 безкоштовних слів з тем.\n\nОформіть Premium, щоб вчити всі слова (1000+).';
        if (ctx.callbackQuery) return ctx.editMessageText(limitText, { reply_markup: limitKeyboard });
        return ctx.reply(limitText, { reply_markup: limitKeyboard });
    }

    // Шукаємо слово з цієї теми, яке юзер ЩЕ НЕ бачив у цьому циклі
    const word = await Word.findOne({
        topicId,
        _id: { $nin: user.seenTopicWords as any[] }
    });

    // 👇 ТУТ ОНОВЛЕНО: Якщо слова закінчилися, додаємо кнопку "Вчити заново"
    if (!word) {
        const endText = '🎉 Ти вивчил всі слова з цієї теми!';
        const endKeyboard = new InlineKeyboard()
            .text('🔄 Вчити заново', `topic_reset_${topicId}`).row()
            .text('🔙 До списку тем', 'topics_back');

        if (ctx.callbackQuery) return ctx.editMessageText(endText, { reply_markup: endKeyboard });
        return ctx.reply(endText, { reply_markup: endKeyboard });
    }

    // Картка слова (як ти просив: дизайн як у "Вчити слова" + кнопка повернення)
    const keyboard = new InlineKeyboard()
        .text('🔊 Вимова', `audio_${word._id}`)
        .text('💾 Зберегти', `save_word_${word._id}`).row()
        .text('➡️ Наступне слово', `topic_know_${topicId}_${word._id}`).row()
        .text('🔙 До списку тем', 'topics_back');

    const text = `📚 <b>Тема: Та ну, думаєш, я справді знаю? Давай вчи!</b>\n\n🇬🇧 <b>${word.english}</b>\n🔤 [${word.transcription}]\n\n👇 Українською:\n🇺🇦 ${word.ukrainian}`;

    if (ctx.callbackQuery) {
        await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard }).catch(() => { });
    } else {
        await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
};