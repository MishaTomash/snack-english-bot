import { Keyboard } from 'grammy';

export const mainMenuKeyboard = new Keyboard()
    .text('📚 Нові слова')
    .text('📝 Тексти для перекладу')
    .row()
    .text('🎯 Міні-тести')
    .text('👤 Мій профіль')
    .row()
    .text('💎 Premium')
    .resized(); // робить кнопки акуратними