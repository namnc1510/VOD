import sharedConfig from '@vben/tailwind-config';

export default {
  ...sharedConfig,
  theme: {
    ...sharedConfig.theme,
    extend: {
      ...sharedConfig.theme?.extend,
      colors: {
        ...sharedConfig.theme?.extend?.colors,
        "primary": "var(--primary-color, #1f90f9)",
        "background-light": "#f5f7f8",
        "background-dark": "#0f1923",
      },
      fontFamily: {
        ...sharedConfig.theme?.extend?.fontFamily,
        "display": ["Inter"]
      }
    }
  }
};
