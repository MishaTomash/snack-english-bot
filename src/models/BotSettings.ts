import mongoose, { Schema, Document } from 'mongoose';

export interface IBotSettings extends Document {}

const BotSettingsSchema = new Schema({});

export const BotSettings = mongoose.model<IBotSettings>('BotSettings', BotSettingsSchema);

export const getSettings = async () => {
    let settings = await BotSettings.findOne();
    if (!settings) settings = await BotSettings.create({});
    return settings;
};