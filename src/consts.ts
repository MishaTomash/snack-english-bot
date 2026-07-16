export const insertManyWord = [
  // A1 (базові повсякденні фрази)
  { english: 'I want to eat', ukrainian: 'Я хочу їсти', transcription: 'Ай вонт ту іт', level: 'A1' },
  { english: 'Where is the station?', ukrainian: 'Де знаходиться вокзал?', transcription: 'Веар із зе стейшн?', level: 'A1' },
  { english: 'My name is John', ukrainian: 'Мене звати Джон', transcription: 'Май нейм із Джон', level: 'A1' },

  // A2 (прості розмовні фрази)
  { english: 'I am looking for a job', ukrainian: 'Я шукаю роботу', transcription: 'Ай ем лукінг фор е джоб', level: 'A2' },
  { english: 'How was your day?', ukrainian: 'Як пройшов твій день?', transcription: 'Хау воз юа дей?', level: 'A2' },


  // B1 (середній рівень)
  { english: 'I have been working on this project for a week', ukrainian: 'Я працюю над цим проектом вже тиждень', transcription: 'Ай хев бін воркінг он діс проджект фор е вік', level: 'B1' },
  { english: 'Could you tell me how to get to the airport?', ukrainian: 'Не підкажете, як дістатися до аеропорту?', transcription: 'Куд ю тел мі хау ту гет ту ді еарпорт?', level: 'B1' },


  // B2 (вище середнього)
  { english: 'I would appreciate it if you could help me', ukrainian: 'Я був би вдячний, якби ви допомогли мені', transcription: 'Ай вуд епрішіейт іт іф ю куд хелп мі', level: 'B2' },
  { english: 'He managed to pull it off against all odds', ukrainian: 'Йому вдалося зробити це всупереч усьому', transcription: 'Хі менеджмент ту пул іт оф егейнст ол одс', level: 'B2' },

];





export const insertManyTest = [
  // A1
  {
    level: 'A1',
    question: 'Як буде “вода”?',
    options: ['school', 'water', 'window', 'bread'],
    correctOptionIndex: 1
  },

  {
    level: 'A1',
    question: 'Як буде “гроші”?',
    options: ['time', 'money', 'love', 'peace'],
    correctOptionIndex: 1
  },


  {
    level: 'B1',
    question: 'Як перекласти “чи не могли б ви говорити повільніше?”?',
    options: ['Can you speak faster?', 'Could you speak more slowly please?', 'Do you speak slowly?', 'You must speak slow'],
    correctOptionIndex: 1
  },

  {
    level: 'B2',
    question: 'Як перекласти “це не варто обговорювати”?',
    options: ['It is not worth to discuss', 'It is not worth discussing', 'It is not worth discuss', 'It is not worth for discussing'],
    correctOptionIndex: 1
  }
];