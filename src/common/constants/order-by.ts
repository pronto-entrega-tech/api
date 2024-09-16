export type OrderBy = (typeof orderBy)[keyof typeof orderBy];
export const orderBy = {
  Default: 'DEFAULT',
  Rating: 'RATING',
  DeliveryTime: 'DELIVERY_TIME',
  Distance: 'DISTANCE',
} as const;
