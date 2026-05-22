import { Keyboard } from 'grammy';

export const createMainMenu = () => {
  return new Keyboard()
    .text('📚 Нові слова').text('📝 Тексти для перекладу').text('🎯 Міні-тести').row()
    .text('📚 Словничок').text('🎓 Курси').row()
    .text('⚙️ Налаштування').text('👤 Мій профіль')
    .resized();
};