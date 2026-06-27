import { Keyboard, InlineKeyboard } from 'grammy';

// 1. Нове компактне Головне меню (нижня панель)
export const createMainMenu = () => {
  return new Keyboard()
    .text('📚 Навчання').row()
    .text('👤 Профіль').text('⚙️ Налаштування').row()
    .text('🏆 Топчик').row()
    .resized();
};

// 2. Нове Inline-меню для розділу "Навчання" (з'являється в чаті)
export const createLearningMenu = () => {
return new InlineKeyboard()
.text('📚 Вчити слова', 'menu_learn_words')
.text('📝 Перевірка слів', 'menu_check_words').row()
.text('🎯 Міні-тести', 'menu_mini_tests')
.text('📚 Слова по темах', 'menu_words_topics').row()
.text('🎓 Курси', 'menu_courses')
.text('💾 Словничок', 'menu_saved_words').row()
.text('✍️ Скласти речення', 'menu_sentences');
};