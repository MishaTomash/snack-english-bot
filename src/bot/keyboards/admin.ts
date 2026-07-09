import { Keyboard } from 'grammy';

export const createAdminMenu = () => {
  return new Keyboard()
    .text('➕ Додати слово').text('➕ Додати тест').text('📚 Теми (Адмін)').row()
    .text('📊 Статистика бази').text('✍️ Додати речення').row()
    .text('🎓 Керування курсами').text('🏆 Сезон рейтингу').row()
    .text('👥 Користувачі').text('💎 Premium юзери').text('🧹заблокованих').row()
    .text('🚪 Вийти з адмінки').row()
    .text('📢 Розсилка').text('🔗 Реф. розсилка').text('🔄 Оновити меню') // 👈 додано
    .resized();
};