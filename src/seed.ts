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
      { english: 'It depends on the weather', ukrainian: 'Це залежить від погоди', transcription: 'Іт діпендз он зе везер', level: 'A2' }
    ]);
    await Text.insertMany([
      {
        englishText: "My name is Alex. I live in a big city. Every morning I drink coffee and go to work.",
        ukrainianTranslation: "Мене звати Алекс. Я живу у великому місті. Щоранку я п'ю каву і йду на роботу.",
        level: 'A1'
      },
      {
        englishText: "She likes to read books in the evening. Her favorite book is about space.",
        ukrainianTranslation: "Вона любить читати книги вечорами. Її улюблена книга — про космос.",
        level: 'A1'
      },
      {
        englishText: "Yesterday I went to the cinema with my friends. The movie was absolutely fantastic.",
        ukrainianTranslation: "Вчора я ходив у кіно з друзями. Фільм був просто фантастичний.",
        level: 'A2'
      }
    ]);

    await TestQuestion.deleteMany({});
    await TestQuestion.insertMany([
      {
        level: 'A2',
        question: 'Як буде “вода”?',
        options: ['school', 'water', 'window', 'bread'],
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