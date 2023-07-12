export type Session = {
  session_id: string;
  user_id: string;
  expires_in: Date;
};

export type SaveSessionDto = {
  session_id?: string;
  user_id: string;
  expires_in: Date;
};
