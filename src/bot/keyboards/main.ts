import { Keyboard } from 'grammy';

export const createMainMenu = () => {
    return new Keyboard()
        .text('📚 Нові слова').text('📝 Тексти для перекладу')
        .row()
        .text('🎯 Міні-тести').text('👤 Мій профіль')
        .row()
        .text('💎 Premium').text('⚙️ Налаштування') // Додали кнопку налаштувань
        .row()
        .resized();
};