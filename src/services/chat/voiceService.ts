import OpenAI from 'openai';
import fs from 'fs';
import { config } from '../../config';

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

export const MAX_VOICE_DURATION_SECONDS = 30;

export const transcribeVoiceMessage = async (filePath: string): Promise<string> => {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      language: 'en',
    });
    return transcription.text.trim();
  } finally {
    fs.unlink(filePath, () => {});
  }
};