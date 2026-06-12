import { Keyboard } from 'grammy';

export const createMainMenu = () => {
  return new Keyboard()
    .text('📚 Вчити слова').text('📝 Перевірка слів').text('📚 Слова по темах').row()
    .text('🎯 Міні-тести').text('🎓 Курси').row()
    .text('💾 Словничок').text('⚙️ Налаштування').row()
    .text('👤 Профіль').text('👥 Запросити друзів').row()
    .text('💎 Premium').row()
    .resized();
};