import { Keyboard } from 'grammy';

export const createMainMenu = () => {
  return new Keyboard()
    .text('📚 Вчити слова').text('📝 Перевірка слів').row()
    .text('🎯 Міні-тести').text('🎓 Курси').row()
    .text('💾 Словничок')    .text('⚙️ Налаштування').row()
    .text('👤 Профіль').text('🏆 Топ')
    .resized();
};