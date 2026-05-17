import { Context } from 'grammy';
import { User } from '../../models/User';

export const showProfile = async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const user = await User.findOne({ telegramId });
    if (!user) {
        return ctx.reply('Будь ласка, спочатку обери свій рівень: /start');
    }

    const streak = user.streak || 1;
    const wordsLearned = user.wordsLearned || 0;
    const testsPassed = user.testsPassed || 0;
    const wordsToday = user.wordsLearnedToday || 0;
    
    let accountStatus = '🆓 Базовий';
    let premiumInfo = '';

    if (user.isPremium) {
        if (user.premiumExpiresAt && new Date() > user.premiumExpiresAt) {
            user.isPremium = false;
            user.premiumExpiresAt = undefined;
            await user.save();
            accountStatus = '🆓 Базовий';
        } else {
            accountStatus = '💎 Premium';
            
            if (user.premiumExpiresAt) {
                const formattedDate = user.premiumExpiresAt.toLocaleDateString('uk-UA', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                premiumInfo = `\n📅 *Діє до:* ${formattedDate}`;
            }
        }
    }

    // Чистий шаблонний рядок без жодних конкатенацій та \n
    const message = `👤 *Твій профіль SnackEnglish*

🎓 *Рівень:* ${user.level || 'Не обрано'}
⭐️ *Статус:* ${accountStatus}${premiumInfo}

📊 *Статистика:*
🔥 Дні поспіль: ${streak}
📚 Вивчено слів всього: ${wordsLearned}
📖 Слів вивчено сьогодні: ${wordsToday}
✅ Пройдено тестів: ${testsPassed}

${user.isPremium ? 'Дякуємо за підтримку! Насолоджуйся безлімітним навчанням 🚀' : '💡 Отримай Premium, щоб прибрати ліміти та відкрити озвучку!'}`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
};