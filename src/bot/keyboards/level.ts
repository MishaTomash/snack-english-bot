import { InlineKeyboard } from 'grammy';

export const levelKeyboard = new InlineKeyboard()
  .text('A1 - Початківець', 'level_A1').row()
  .text('A2 - Елементарний', 'level_A2').row()
  .text('B1 - Середній', 'level_B1').row()
  .text('B2 - Вище середнього', 'level_B2');