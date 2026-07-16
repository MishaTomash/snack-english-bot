export interface ChatTopic {
  id: string;
  title: string;      
  titleUa: string;    
  description: string;
}


export const CHAT_TOPICS: ChatTopic[] = [
  { id: 'travel', title: 'Travel', titleUa: '✈️ Подорожі', description: 'talking about trips, airports, hotels and travel plans' },
  { id: 'restaurant', title: 'Restaurant', titleUa: '🍽️ Ресторан', description: 'ordering food, talking to a waiter, discussing menus' },
  { id: 'shopping', title: 'Shopping', titleUa: '🛍️ Шопінг', description: 'shopping for clothes, asking about prices and sizes' },
  { id: 'movies', title: 'Movies', titleUa: '🎬 Кіно', description: 'discussing favorite movies, actors and genres' },
  { id: 'programming', title: 'Programming', titleUa: '💻 Технології', description: 'casual talk about technology and everyday use of computers (not writing code)' },
  { id: 'friends', title: 'Friends', titleUa: '👬 Друзі', description: 'talking about friendships and hanging out' },
  { id: 'family', title: 'Family', titleUa: "👨‍👩‍👧 Сім'я", description: 'talking about family members and relationships' },
  { id: 'sport', title: 'Sport', titleUa: '⚽ Спорт', description: 'discussing sports, games and fitness' },
  { id: 'music', title: 'Music', titleUa: '🎵 Музика', description: 'talking about favorite music, artists and concerts' },
  { id: 'school', title: 'School', titleUa: '🏫 Школа', description: 'talking about school, studying and exams' },
];

export const getRandomTopic = (): ChatTopic =>
  CHAT_TOPICS[Math.floor(Math.random() * CHAT_TOPICS.length)];

export const getTopicById = (id: string): ChatTopic | undefined =>
  CHAT_TOPICS.find(t => t.id === id);