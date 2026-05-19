import { Keyboard } from 'grammy';

export const createMainMenu = () => {
    return new Keyboard()
        .text('📚 Нові слова').text('📝 Тексти для перекладу').row()
        .text('🎯 Міні-тести').text('📚 Словничок').row()
        .text('👤 Мій профіль').text('⚙️ Налаштування').row()
        .text('💖 Підтримати')
        .resized();
};