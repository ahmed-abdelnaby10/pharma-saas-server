export interface QueryNotificationsDto {
  isRead?: boolean;
  limit?: number;
  cursor?: string; // createdAt ISO string for cursor-based pagination
}
