import { Keyboard } from 'grammy';

export const createChatMenu = () => {
  return new Keyboard()
    .text('💡 Підказка').text('📝 Перекласти').row()
    .text('❌ Завершити чат').row()
    .resized();
};