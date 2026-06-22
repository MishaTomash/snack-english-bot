import mongoose from 'mongoose';
import { Word } from './models/Word';
import { config } from './config/index';
import { TestQuestion } from './models/TestQuestion';
import { insertManyWord, insertManyTest } from './consts';

const seedData = async () => {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log('⏳ Завантаження тестових слів...');

    // Додаємо кілька слів для рівня A1
    await Word.insertMany(insertManyWord);
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