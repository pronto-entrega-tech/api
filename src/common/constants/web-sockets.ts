export const WS_PORT = 3002;

export enum WsEvent {
  Orders = 'orders',
  ActiveOrder = 'active-orders',
  Items = 'items',
  ItemsActivities = 'items-activities',
  ChatMsg = 'chatMsg',
}

type WsRoom = 'customer' | 'market' | 'order' | 'item' | 'item-activity';
export const wsRoom = (room: WsRoom, key: string | bigint) => `${room}:${key}`;
