/**
 * Login page path
 */
export const LOGIN_PATH = '/auth/login';

export interface LanguageOption {
  label: string;
  value: 'en-US' | 'vi-VN';
}

/**
 * Supported languages shown in the UI.
 */
export const SUPPORT_LANGUAGES: LanguageOption[] = [
  {
    label: 'Ti\u1ebfng Vi\u1ec7t',
    value: 'vi-VN',
  },
  {
    label: 'English',
    value: 'en-US',
  },
];
