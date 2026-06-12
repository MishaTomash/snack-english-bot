import { Keyboard } from 'grammy';

export const createMainMenu = () => {
  return new Keyboard()
    .text('📚 Вчити слова').text('📝 Перевірка слів').row()
    .text('📚 Слова по темах').text('🎯 Міні-тести').row()
    .text('💾 Словничок').text('🎓 Курси').row()
    .text('👤 Профіль').text('⚙️ Налаштування').row()
    .text('💎 Premium').text('🏆 Топчик').row()
    .resized();
};