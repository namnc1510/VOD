export const UserRole = {
  SUPER: 'super',
  ADMIN: 'admin',
  EDITOR: 'editor',
  MODERATOR: 'moderator',
  USER: 'user',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

export const MovieStatus = {
  RELEASED: 'released',
  COMING_SOON: 'coming_soon',
  HIDDEN: 'hidden',
} as const;

export type MovieStatusType = typeof MovieStatus[keyof typeof MovieStatus];

export const MovieQuality = {
  HD: 'HD',
  FHD: 'FHD',
  UHD_4K: '4K',
  CAM: 'CAM',
} as const;

export type MovieQualityType = typeof MovieQuality[keyof typeof MovieQuality];

export const MovieType = {
  MOVIE: 'movie',
  SERIES: 'series',
} as const;

export type MovieTypeType = typeof MovieType[keyof typeof MovieType];
