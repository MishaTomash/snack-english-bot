import { Bot } from 'grammy';
import { checkWordLimits, checkSentenceLimits } from '../middlewares/limits';

import { handleLevelSelection } from '../handlers/level';
import { handleChangeLevelClick } from '../handlers/settings';
import { handleWordAudio, handleSetReminder, handleReminderTomorrow, handleWords } from '../handlers/words';
import { handleSaveWord, handleDeleteSavedWord, handleNextSavedWord, handleSavedWords } from '../handlers/saved';
import { handleStarsInvoice } from '../handlers/support';
import { showProfile } from '../handlers/profile';
import { handleTopMenu } from '../handlers/rating';

import {
  handleTestAnswer, handleExplainTest, handleBackToTest,
  sendRandomTest, sendLearnedWordsTest, handleNextRepeatTest,
  handleLearnedTestRepeat, checkTestLimits
} from '../handlers/tests';

import {
  handleCoursesList, handleCourseOpen, handleMarkVideoViewed,
  handleCourseTestQuestion, handleCourseTestAnswer
} from '../handlers/courses';

import {
  handleAdminCoursesMenu, handleAdminCourseSelect, handleAdminCourseActionPrompt
} from '../handlers/adminCourses';

import { handleAdminUsersPagination, handleAdminMessages } from '../handlers/admin';

import { handleTopicsMenu, handleTopicOpen, handleTopicWordAction, handleTopicReset } from '../handlers/topics';
import {
  handleAdminTopicsMenu, handleAdminTopicSelect, handleAdminAddWordsPrompt, handleAdminTopicNew
} from '../handlers/adminTopics';

import {
  sendPremiumMenu, sendCardPremiumOffer, sendStarsInvoice,
  handlePaidButton, handlePremiumApproval, handlePremiumRejection
} from '../handlers/premium';
import { handleReferralMenu } from '../handlers/referrals';

import { registerSeasonAdminHandlers } from '../handlers/seasonAdmin';

import {
  handleSentenceExercise,
  handleSentenceWordTap,
  handleSentenceReset,
  handleSentenceRetry,
} from '../handlers/sentences';

export const registerCallbacks = (bot: Bot) => {
  // Загальні
  bot.callbackQuery(/^level_/, handleLevelSelection);
  bot.callbackQuery('change_level', handleChangeLevelClick);
  bot.callbackQuery(/^audio_/, handleWordAudio);
  bot.callbackQuery(/^save_word_/, handleSaveWord);
  bot.callbackQuery(/^del_saved_/, handleDeleteSavedWord);
  bot.callbackQuery(/^next_saved_/, handleNextSavedWord);
  bot.callbackQuery(/^stars_/, handleStarsInvoice);
  bot.callbackQuery(/^set_reminder_/, handleSetReminder);
  bot.callbackQuery('reminder_tomorrow', handleReminderTomorrow);
  bot.callbackQuery(/^next_word(_.+)?$/, checkWordLimits, handleWords);
  bot.callbackQuery('show_profile_btn', showProfile);
  bot.callbackQuery('show_top', handleTopMenu);

  // Тести
  bot.callbackQuery(/^answer_/, handleTestAnswer);
  bot.callbackQuery(/^explain_test_(.+)$/, handleExplainTest);
  bot.callbackQuery(/^back_to_test_(.+)$/, handleBackToTest);
  bot.callbackQuery('next_test', checkTestLimits, sendRandomTest);
  bot.callbackQuery('next_learned_test', sendLearnedWordsTest);
  bot.callbackQuery('next_repeat_test', handleNextRepeatTest);
  bot.callbackQuery('learned_test_repeat', handleLearnedTestRepeat);

  // Курси (користувач)
  bot.callbackQuery('courses_list', handleCoursesList);
  bot.callbackQuery(/^c_open_/, (ctx) => handleCourseOpen(ctx));
  bot.callbackQuery(/^c_view_/, handleMarkVideoViewed);
  bot.callbackQuery(/^ct_/, handleCourseTestQuestion);
  bot.callbackQuery(/^ca_/, handleCourseTestAnswer);
  bot.callbackQuery('noop', async (ctx) => ctx.answerCallbackQuery());

  // Курси (адмін)
  bot.callbackQuery('adm_c_back', handleAdminCoursesMenu);
  bot.callbackQuery(/^adm_c_open_/, handleAdminCourseSelect);
  bot.callbackQuery(/^(adm_c_new|adm_c_addvid_|adm_c_addtest_|adm_c_del_)/, handleAdminCourseActionPrompt);

  // Адмін: користувачі
  bot.callbackQuery(/^admin_users_\d+$/, handleAdminUsersPagination);
  bot.callbackQuery('admin_messages', handleAdminMessages);

  // Сезон рейтингу
  registerSeasonAdminHandlers(bot);

  // Теми
  bot.callbackQuery(/^topic_open_/, handleTopicOpen);
  bot.callbackQuery(/^topic_reset_/, handleTopicReset);
  bot.callbackQuery(/^topic_(know|dontknow)_/, handleTopicWordAction);
  bot.callbackQuery('topics_back', async (ctx) => {
    await ctx.deleteMessage().catch(() => { });
    await handleTopicsMenu(ctx);
  });
  bot.callbackQuery(/^adm_topic_([a-f0-9]{24})$/, handleAdminTopicSelect);
  bot.callbackQuery(/^adm_addwords_([a-f0-9]{24})$/, handleAdminAddWordsPrompt);
  bot.callbackQuery('adm_topics_back', handleAdminTopicsMenu);
  bot.callbackQuery('adm_topic_new', handleAdminTopicNew);

  // Premium
  bot.callbackQuery('open_premium_menu', sendPremiumMenu);
  bot.callbackQuery('pay_card', sendCardPremiumOffer);
  bot.callbackQuery('pay_stars', sendStarsInvoice);
  bot.callbackQuery('pay_referral', handleReferralMenu);
  bot.callbackQuery(/paid_prem_/, handlePaidButton);
  bot.callbackQuery(/approve_prem_/, handlePremiumApproval);
  bot.callbackQuery(/reject_prem_/, handlePremiumRejection);

  bot.callbackQuery('menu_learn_words', checkWordLimits, handleWords);
  bot.callbackQuery('menu_check_words', sendLearnedWordsTest);
  bot.callbackQuery('menu_mini_tests', checkTestLimits, sendRandomTest);
  bot.callbackQuery('menu_words_topics', handleTopicsMenu);
  bot.callbackQuery('menu_courses', handleCoursesList);
  bot.callbackQuery('menu_saved_words', handleSavedWords);

  // Sentences
  bot.callbackQuery('menu_sentences', checkSentenceLimits, handleSentenceExercise);
  bot.callbackQuery('sentence_next', checkSentenceLimits, handleSentenceExercise);
  bot.callbackQuery('sentence_next', handleSentenceExercise);
  bot.callbackQuery('sentence_skip', handleSentenceExercise);
  bot.callbackQuery('sentence_reset', handleSentenceReset);
  bot.callbackQuery('sentence_retry', handleSentenceRetry);
  bot.callbackQuery(/^sentence_word_\d+$/, handleSentenceWordTap);
  bot.callbackQuery('sentence_noop', async (ctx) => ctx.answerCallbackQuery());
};