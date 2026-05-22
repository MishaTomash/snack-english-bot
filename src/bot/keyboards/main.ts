import { Keyboard } from 'grammy';

export const createMainMenu = () => {
  return new Keyboard()
    .text('📚 Вчити слова').text('📝 Перевірка слів').row()
    .text('🎯 Міні-тести').text('📖 Тексти').row()
    .text('💾 Словничок').text('👤 Профіль').row()
    .text('⚙️ Налаштування').text('🎓 Курси')
    .resized();
};