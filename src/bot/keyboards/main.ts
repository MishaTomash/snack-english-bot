import { Keyboard } from 'grammy';

export const createMainMenu = () => {
  return new Keyboard()
    .text('📚 Вчити слова').text('📚 Слова по темах').row()
    .text('📝 Перевірка слів').text('🎯 Міні-тести').row()
    .text('💾 Словничок').text('🎓 Курси').row()
    .text('👤 Профіль').text('⚙️ Налаштування').row()
    .text('💎 Premium').text('🏆 Топчик').row()
    .resized();
};