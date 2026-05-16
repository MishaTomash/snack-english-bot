import { InlineKeyboard } from 'grammy';

export const createTextKeyboard = (textId: string) => {
  return new InlineKeyboard()
    .text('📖 Показати переклад', `trans_${textId}`).row()
    .text('🔄 Інший текст', 'next_text');
};