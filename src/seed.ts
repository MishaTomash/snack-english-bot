import mongoose from 'mongoose';
import { Word } from './models/Word';
import { config } from './config/index';
import { Text } from './models/Text';
import { TestQuestion } from './models/TestQuestion';

const seedData = async () => {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log('⏳ Завантаження тестових слів...');

    // Додаємо кілька слів для рівня A1
    await Word.insertMany([
      { english: 'I want to eat', ukrainian: 'Я хочу їсти', transcription: 'Ай вонт ту іт', level: 'A1' },
      { english: 'Good morning', ukrainian: 'Доброго ранку', transcription: 'Гуд монінг', level: 'A1' },
      { english: 'How are you?', ukrainian: 'Як справи?', transcription: 'Хау ар ю?', level: 'A1' },
      { english: 'Thank you', ukrainian: 'Дякую', transcription: 'Сенк ю', level: 'A1' },
      { english: 'See you later', ukrainian: 'Побачимось пізніше', transcription: 'Сі ю лейтер', level: 'A1' },
      { english: 'Beautiful day', ukrainian: 'Гарний день', transcription: 'Бьютіфул дей', level: 'A1' },

      { english: 'I am looking for a job', ukrainian: 'Я шукаю роботу', transcription: 'Ай ем лукінг фор е джоб', level: 'A2' },
      { english: 'Could you help me?', ukrainian: 'Не могли б ви мені допомогти?', transcription: 'Куд ю хелп мі?', level: 'A2' },
      { english: 'It depends on the weather', ukrainian: 'Це залежить від погоди', transcription: 'Іт діпендз он зе везер', level: 'A2' },

      { english: 'This is my friend', ukrainian: 'Це мій друг', transcription: 'Зіс із май френд', level: 'A1' },
      { english: 'I am happy', ukrainian: 'Я щасливий', transcription: 'Ай ем хепі', level: 'A1' },
      { english: 'Where is the bathroom?', ukrainian: 'Де туалет?', transcription: 'Веа із зе баcрум?', level: 'A1' },
      { english: 'I don’t understand', ukrainian: 'Я не розумію', transcription: 'Ай донт андестенд', level: 'A1' },
      { english: 'Please sit down', ukrainian: 'Будь ласка, сідай', transcription: 'Пліз сіт даун', level: 'A1' },

      // ➕ нові A2
      { english: 'I have been waiting for you', ukrainian: 'Я тебе чекав', transcription: 'Ай хэв бін вейтінг фор ю', level: 'A2' },
      { english: 'What do you mean?', ukrainian: 'Що ти маєш на увазі?', transcription: 'Уот ду ю мін?', level: 'A2' },
      { english: 'I am interested in programming', ukrainian: 'Я цікавлюсь програмуванням', transcription: 'Ай ем інтересд ін програмінг', level: 'A2' },
      { english: 'Let’s go outside', ukrainian: 'Давай підемо надвір', transcription: 'Летс гоу аутсайд', level: 'A2' },
      { english: 'I will call you later', ukrainian: 'Я подзвоню тобі пізніше', transcription: 'Ай вил кол ю лейтер', level: 'A2' },
      { english: 'Do you speak English?', ukrainian: 'Ти розмовляєш англійською?', transcription: 'Ду ю спік інгліш?', level: 'A2' }
    ]);
    await Text.insertMany([
      {
        englishText: `My name is Alex. I am nineteen years old and I live in a big city with my parents and younger sister. Every morning I wake up at seven o’clock, take a shower, and drink a cup of coffee before going to college. I study programming because I want to become a web developer in the future. After classes, I usually go for a walk or spend time learning English. In the evening, I like watching YouTube videos, listening to music, and talking with my friends online.`,

        ukrainianTranslation: `Мене звати Алекс. Мені дев’ятнадцять років, і я живу у великому місті разом із батьками та молодшою сестрою. Щоранку я прокидаюся о сьомій годині, приймаю душ і п’ю чашку кави перед тим, як піти до коледжу. Я вивчаю програмування, тому що хочу стати веброзробником у майбутньому. Після занять я зазвичай гуляю або проводжу час за вивченням англійської мови. Увечері я люблю дивитися відео на YouTube, слухати музику та спілкуватися з друзями онлайн.`,

        level: 'A1'
      },

      {
        englishText: `Anna works in a small coffee shop near the city center. She starts working at eight o’clock in the morning and finishes at five in the evening. Every day she meets many different people and prepares coffee, tea, and desserts for customers. In her free time, Anna enjoys reading books, drawing pictures, and learning new languages. She dreams about traveling around Europe one day and visiting countries like France, Italy, and Spain.`,

        ukrainianTranslation: `Анна працює в маленькій кав’ярні біля центру міста. Вона починає працювати о восьмій ранку та закінчує о п’ятій вечора. Щодня вона зустрічає багато різних людей і готує каву, чай та десерти для клієнтів. У вільний час Анна любить читати книги, малювати картини та вивчати нові мови. Вона мріє одного дня подорожувати Європою та відвідати такі країни, як Франція, Італія та Іспанія.`,

        level: 'A1'
      },

      {
        englishText: `Last weekend my friends and I decided to spend time outside the city. We traveled by train to a small village near the mountains. The weather was warm and sunny, so we walked a lot, took beautiful photos, and cooked food near the river. In the evening, we sat around the fire, told funny stories, and listened to music. It was one of the best weekends I have had this year because I felt relaxed and happy.`,

        ukrainianTranslation: `Минулого вікенду ми з друзями вирішили провести час за містом. Ми поїхали потягом до маленького села біля гір. Погода була теплою та сонячною, тому ми багато гуляли, робили красиві фотографії та готували їжу біля річки. Увечері ми сиділи біля вогнища, розповідали смішні історії та слухали музику. Це були одні з найкращих вихідних цього року, тому що я почувався спокійним і щасливим.`,

        level: 'A2'
      },

      {
        englishText: `Technology has changed the way people communicate and work. Nowadays, many students study online and use applications to improve their skills. Some people believe that modern technology makes life easier, while others think that people spend too much time on their phones and computers. In my opinion, technology is very useful when used correctly because it helps people learn faster, find information quickly, and stay connected with friends and family.`,

        ukrainianTranslation: `Технології змінили спосіб спілкування та роботи людей. Сьогодні багато студентів навчаються онлайн і використовують додатки для покращення своїх навичок. Деякі люди вважають, що сучасні технології роблять життя легшим, тоді як інші думають, що люди проводять забагато часу в телефонах і за комп’ютерами. На мою думку, технології дуже корисні, якщо використовувати їх правильно, адже вони допомагають людям швидше навчатися, швидко знаходити інформацію та залишатися на зв’язку з друзями й родиною.`,

        level: 'B1'
      },

      {
        englishText: `When I was younger, I was afraid of speaking English with other people because I thought I would make too many mistakes. However, over time I realized that mistakes are a natural part of learning. I started practicing every day by reading articles, watching videos, and speaking with people online. Now I feel much more confident, and I can understand English better than before. This experience taught me that consistency and patience are the keys to improvement.`,

        ukrainianTranslation: `Коли я був молодшим, я боявся говорити англійською з іншими людьми, тому що думав, що робитиму занадто багато помилок. Проте з часом я зрозумів, що помилки — це природна частина навчання. Я почав практикуватися щодня, читаючи статті, дивлячись відео та спілкуючись з людьми онлайн. Тепер я почуваюся набагато впевненіше і можу розуміти англійську краще, ніж раніше. Цей досвід навчив мене, що регулярність і терпіння є ключем до розвитку.`,

        level: 'B1'
      }
    ]);

    await TestQuestion.deleteMany({});
    await TestQuestion.insertMany([
      {
        level: 'A2',
        question: 'Як буде “вода”?',
        options: ['school', 'water', 'window', 'bread'],
        correctOptionIndex: 1
      },
      {
        level: 'A1',
        question: 'Як перекласти “кіт”?',
        options: ['dog', 'cat', 'bird', 'fish'],
        correctOptionIndex: 1
      },
      {
        level: 'A1',
        question: 'Як буде “дім”?',
        options: ['home', 'car', 'tree', 'book'],
        correctOptionIndex: 0
      },
      {
        level: 'A2',
        question: 'Як перекласти “я йду до школи”?',
        options: [
          'I go to school',
          'I eat bread',
          'I drink water',
          'I sleep home'
        ],
        correctOptionIndex: 0
      },
      {
        level: 'A1',
        question: 'Як буде “книга”?',
        options: ['pen', 'table', 'book', 'phone'],
        correctOptionIndex: 2
      },
      {
        level: 'A2',
        question: 'Як перекласти “він працює”?',
        options: [
          'He works',
          'She sleeps',
          'They eat',
          'I drink'
        ],
        correctOptionIndex: 0
      },
      {
        level: 'A1',
        question: 'Як буде “яблуко”?',
        options: ['apple', 'orange', 'banana', 'grape'],
        correctOptionIndex: 0
      },
      {
        level: 'A2',
        question: 'Як перекласти “мені подобається музика”?',
        options: [
          'I like music',
          'I eat music',
          'I see music',
          'I play water'
        ],
        correctOptionIndex: 0
      },
      {
        level: 'A1',
        question: 'Як буде “стіл”?',
        options: ['chair', 'table', 'door', 'window'],
        correctOptionIndex: 1
      }
    ]);
    console.log('✅ Тести успішно додано!');

    console.log('✅ Слова успішно додано!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Помилка:', error);
    process.exit(1);
  }
};

seedData();