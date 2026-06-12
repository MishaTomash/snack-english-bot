

import { Keyboard } from 'grammy';

export const createAdminMenu = () => {
  return new Keyboard()
    .text('➕ Додати слово').text('➕ Додати тест').text('📚 Теми (Адмін)').row()
    .text('➕ Додати текст').text('📊 Статистика бази').row()
    .text('🎓 Керування курсами').row()
    .text('👥 Користувачі').text('📢 Розсилка').row()
    .text('🏆 Сезон рейтингу').row()
    .text('🚪 Вийти з адмінки').text('🔄 Оновити меню')
    .resized();
};