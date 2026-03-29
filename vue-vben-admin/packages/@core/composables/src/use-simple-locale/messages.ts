export type Locale = 'en-US' | 'vi-VN';

export const messages: Record<Locale, Record<string, string>> = {
  'en-US': {
    cancel: 'Cancel',
    collapse: 'Collapse',
    confirm: 'Confirm',
    expand: 'Expand',
    prompt: 'Prompt',
    reset: 'Reset',
    submit: 'Submit',
  },
  'vi-VN': {
    cancel: 'H\u1ee7y',
    collapse: 'Thu g\u1ecdn',
    confirm: 'X\u00e1c nh\u1eadn',
    expand: 'M\u1edf r\u1ed9ng',
    prompt: 'Nh\u1eafc nh\u1edf',
    reset: '\u0110\u1eb7t l\u1ea1i',
    submit: 'G\u1eedi',
  },
};

export const getMessages = (locale: Locale) => messages[locale];
