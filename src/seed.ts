import mongoose from 'mongoose';
import { Word } from './models/Word'; 
import { config } from './config/index';

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
    ]);

    console.log('✅ Слова успішно додано!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Помилка:', error);
    process.exit(1);
  }
};

seedData();