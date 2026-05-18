import { Keyboard } from 'grammy';

export const createAdminMenu = () => {
    return new Keyboard()
        .text('➕ Додати слово').text('➕ Додати тест')
        .row()
        .text('➕ Додати текст').text('📊 Статистика бази')
        .row()
        .text('🚪 Вийти з адмінки').text('👥 Користувачі').text('📢 Розсилка')
        .resized();
};