import { InlineKeyboard } from 'grammy';

export const createTestKeyboard = (questionId: string, options: string[], correctOptionIndex: number) => {
    const keyboard = new InlineKeyboard();
    
    options.forEach((text, index) => {
        // Якщо поточний індекс збігається з правильним, ставимо '1', інакше '0'
        const isCorrectFlag = index === correctOptionIndex ? '1' : '0';
        keyboard.text(text, `test_${questionId}_${isCorrectFlag}`).row();
    });
    
    return keyboard;
};
