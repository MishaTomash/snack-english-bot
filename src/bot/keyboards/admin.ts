

import { Keyboard } from 'grammy';

export const createAdminMenu = () => {
  return new Keyboard()
    .text('➕ Додати слово').text('➕ Додати тест').text('📚 Теми (Адмін)').row()
    .text('📊 Статистика бази').text('🧹заблокованих').row()
    .text('🎓 Керування курсами').text('🏆 Сезон рейтингу').row()
    .text('👥 Користувачі').text('📢 Розсилка').row()
    .text('🚪 Вийти з адмінки').text('🔄 Оновити меню')
    .resized();
};