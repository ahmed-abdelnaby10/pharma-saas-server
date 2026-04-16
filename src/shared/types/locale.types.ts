export const supportedLanguages = ["en", "ar"] as const;

export type Language = (typeof supportedLanguages)[number];

export type TranslationParams = Record<string, unknown>;

export type Translator = (
  key: string,
  params?: TranslationParams,
) => string;
