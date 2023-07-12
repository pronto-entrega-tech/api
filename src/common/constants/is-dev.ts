const { NODE_ENV } = process.env;

export const isDev = NODE_ENV === 'development';
export const isTest = NODE_ENV === 'test';
export const isDevOrTest = NODE_ENV === 'development' || NODE_ENV === 'test';
