const CYRILLIC_REGEX = /[а-яА-ЯіІїЇєЄґҐ]/g;

export const isNotEnglish = (text: string): boolean => {
  const cyrillicMatches = text.match(CYRILLIC_REGEX);
  if (!cyrillicMatches) return false;

  const letters = text.replace(/[^a-zA-Zа-яА-ЯіІїЇєЄґҐ]/g, '');
  if (letters.length === 0) return false;

  return cyrillicMatches.length / letters.length > 0.3;
};