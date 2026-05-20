import { InlineKeyboard } from 'grammy';

export const levelKeyboard = new InlineKeyboard()
  .text('A1', 'level_A1').text('A2', 'level_A2').row()
  .text('B1', 'level_B1').text('B2', 'level_B2').row()
  .text('C1', 'level_C1').text('C2', 'level_C2'); // Додаємо нові рівні