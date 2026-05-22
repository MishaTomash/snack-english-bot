import { Bot } from 'grammy';
import { config } from '../config';
import { handleStart } from './handlers/start';
import { handleLevelSelection } from './handlers/level';
import { handleWords, handleWordAudio } from './handlers/words';
import { sendRandomText, handleShowTranslation } from './handlers/texts';
import { sendRandomTest, handleTestAnswer } from './handlers/tests';
import { trackActivity } from './middlewares/activity';
import { showProfile } from './handlers/profile';
import { checkWordLimits } from './middlewares/limits';
import { sendPremiumOffer } from './handlers/premium';
import { showSettings, handleChangeLevelClick } from './handlers/settings';
import {
  handleAdminCommand, handleExitAdmin, handleAddWordPrompt, handleAddTestPrompt,
  handleAddTextPrompt, handleAdminTextInbound, handleAdminUsers, handleAdminUsersPagination,
  handleAdminMessages, handleAdminStats, handleBroadcastStart,
} from './handlers/admin';
import { handleSavedWords, handleNextSavedWord, handleDeleteSavedWord, handleSaveWord } from './handlers/saved';
import { handleSupportMenu, handleStarsInvoice, handlePreCheckout, handleSuccessfulPayment } from './handlers/support';

// ─── Курси (користувач) ───────────────────────────────────────────────────────
import {
  handleCoursesList, handleCourseOpen, handleLessonTheory, handleLessonExamples,
  handleLessonTest, handleCourseAnswer, handleCourseNextQuestion, handleCourseFinish,
  handleCourseReminder, handleCourseBuy, handleCoursePay, handleCoursePaymentSuccess,
} from './handlers/courses';

// ─── Курси (адмін) ────────────────────────────────────────────────────────────
import {
  handleAdminCoursesList, handleAdminCourseNew, handleAdminCourseEdit, handleAdminCourseToggle,
  handleAdminCourseDel, handleAdminCourseDelConfirm, handleAdminLessonAdd, handleAdminLessonEdit,
  handleAdminLessonDel, handleAdminLessonDelConfirm, handleAdminTheoryEdit,
  handleAdminExamplesList, handleAdminExampleAdd, handleAdminExampleEdit, handleAdminExampleDel,
  handleAdminExampleDelConfirm, handleAdminTestsList, handleAdminTestAdd, handleAdminTestEdit,
  handleAdminTestDel, handleAdminTestDelConfirm, handleAdminCourseTextInbound, handleForceMenuUpdate
} from './handlers/adminCourses';

export const bot = new Bot(config.BOT_TOKEN);
bot.use(trackActivity);

// ─── Команди ──────────────────────────────────────────────────────────────────
bot.command('start', handleStart);
bot.command('words', checkWordLimits, handleWords);
bot.command('text', sendRandomText);
bot.command('test', sendRandomTest);
bot.command('profile', showProfile);
bot.command('stats', showProfile);
bot.command('premium', sendPremiumOffer);
bot.command('admin', handleAdminCommand);
bot.command('courses', handleCoursesList);

// ─── Callback: базові ────────────────────────────────────────────────────────
bot.callbackQuery(/^stars_/, handleStarsInvoice);
bot.callbackQuery(/^level_/, handleLevelSelection);
bot.callbackQuery(/^trans_/, handleShowTranslation);
bot.callbackQuery(/^test_/, handleTestAnswer);
bot.callbackQuery(/^audio_/, handleWordAudio);
bot.callbackQuery(/^next_saved_/, handleNextSavedWord);
bot.callbackQuery(/^del_saved_/, handleDeleteSavedWord);
bot.callbackQuery(/^save_word_/, handleSaveWord);
bot.callbackQuery(/^admin_users_\d+$/, handleAdminUsersPagination);
bot.callbackQuery('next_text', sendRandomText);
bot.callbackQuery('next_test', sendRandomTest);
bot.callbackQuery('next_word', checkWordLimits, handleWords);
bot.callbackQuery('buy_premium', sendPremiumOffer);
bot.callbackQuery('change_level', handleChangeLevelClick);

// ─── Callback: курси (користувач) ─────────────────────────────────────────────
bot.callbackQuery('courses_list', handleCoursesList);
bot.callbackQuery(/^course_open_/, handleCourseOpen);
bot.callbackQuery(/^course_buy_/, handleCourseBuy);
bot.callbackQuery(/^course_pay_/, handleCoursePay);
bot.callbackQuery(/^course_finish_/, handleCourseFinish);
bot.callbackQuery(/^course_remind_/, handleCourseReminder);
bot.callbackQuery(/^lesson_theory_/, handleLessonTheory);
bot.callbackQuery(/^lesson_examples_/, handleLessonExamples);
bot.callbackQuery(/^lesson_test_/, handleLessonTest);
bot.callbackQuery(/^course_answer_/, handleCourseAnswer);
bot.callbackQuery(/^course_nextq_/, handleCourseNextQuestion);

// ─── Callback: курси (адмін) ──────────────────────────────────────────────────
bot.callbackQuery('adm_courses_list', handleAdminCoursesList);
bot.callbackQuery('adm_course_new', handleAdminCourseNew);
bot.callbackQuery(/^adm_course_edit_/, handleAdminCourseEdit);
bot.callbackQuery(/^adm_course_toggle_/, handleAdminCourseToggle);
bot.callbackQuery(/^adm_course_del_(?!confirm)/, handleAdminCourseDel);
bot.callbackQuery(/^adm_course_delconfirm_/, handleAdminCourseDelConfirm);
bot.callbackQuery(/^adm_lesson_add_/, handleAdminLessonAdd);
bot.callbackQuery(/^adm_lesson_edit_/, handleAdminLessonEdit);
bot.callbackQuery(/^adm_lesson_del_(?!confirm)/, handleAdminLessonDel);
bot.callbackQuery(/^adm_lesson_delconfirm_/, handleAdminLessonDelConfirm);
bot.callbackQuery(/^adm_theory_edit_/, handleAdminTheoryEdit);
bot.callbackQuery(/^adm_examples_list_/, handleAdminExamplesList);
bot.callbackQuery(/^adm_example_add_/, handleAdminExampleAdd);
bot.callbackQuery(/^adm_example_edit_/, handleAdminExampleEdit);
bot.callbackQuery(/^adm_example_del_(?!confirm)/, handleAdminExampleDel);
bot.callbackQuery(/^adm_example_delconfirm_/, handleAdminExampleDelConfirm);
bot.callbackQuery(/^adm_tests_list_/, handleAdminTestsList);
bot.callbackQuery(/^adm_test_add_/, handleAdminTestAdd);
bot.callbackQuery(/^adm_test_edit_/, handleAdminTestEdit);
bot.callbackQuery(/^adm_test_del_(?!confirm)/, handleAdminTestDel);
bot.callbackQuery(/^adm_test_delconfirm_/, handleAdminTestDelConfirm);

// ─── Платежі ─────────────────────────────────────────────────────────────────
bot.on('pre_checkout_query', handlePreCheckout);
bot.on('message:successful_payment', async (ctx) => {
  const payload = ctx.message?.successful_payment?.invoice_payload ?? '';
  if (payload.startsWith('course_')) {
    await handleCoursePaymentSuccess(ctx);
  } else {
    await handleSuccessfulPayment(ctx);
  }
});

// ─── Текстові повідомлення (порядок важливий!) ────────────────────────────────
bot.on('message:text', async (ctx, next) => {
  await handleAdminCourseTextInbound(ctx, async () => {
    await handleAdminTextInbound(ctx, next);
  });
});
bot.on('message', handleAdminMessages);

// ─── Кнопки головного меню ───────────────────────────────────────────────────
bot.hears('📚 Нові слова', checkWordLimits, handleWords);
bot.hears('📝 Тексти для перекладу', sendRandomText);
bot.hears('🎯 Міні-тести', sendRandomTest);
bot.hears('🎓 Курси', handleCoursesList);
bot.hears('👤 Мій профіль', showProfile);
bot.hears('💎 Premium', sendPremiumOffer);
bot.hears('⚙️ Налаштування', showSettings);
bot.hears('🚪 Вийти з адмінки', handleExitAdmin);
bot.hears('➕ Додати слово', handleAddWordPrompt);
bot.hears('➕ Додати тест', handleAddTestPrompt);
bot.hears('➕ Додати текст', handleAddTextPrompt);
bot.hears('📊 Статистика бази', handleAdminStats);
bot.hears('🎓 Керування курсами', handleAdminCoursesList);
bot.hears('📚 Словничок', handleSavedWords);
bot.hears('👥 Користувачі', handleAdminUsers);
bot.hears('📢 Розсилка', handleBroadcastStart);
bot.hears('💖 Підтримати', handleSupportMenu);
bot.hears('🔄 Оновити меню', handleForceMenuUpdate);