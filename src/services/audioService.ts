import * as googleTTS from 'google-tts-api';

export const getAudioUrl = (text: string): string => {
    // Генеруємо посилання на аудіо (мова: англійська)
    const url = googleTTS.getAudioUrl(text, {
        lang: 'en',
        slow: false,
        host: 'https://translate.google.com',
    });
    
    return url;
};