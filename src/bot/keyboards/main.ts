import { Keyboard } from 'grammy';

export const createMainMenu = () => {
  return new Keyboard()
    .text('📚 Нові слова').text('🧪 Тести до слів').row()
    .text('🎯 Міні-тести').text('📝 Тексти для перекладу').row()
    .text('📚 Словничок').text('🎓 Курси').row()
    .text('⚙️ Налаштування').text('👤 Мій профіль')
    .resized();
};