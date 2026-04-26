export interface QueryPatientsDto {
  search?: string;
  isActive?: boolean;
  /** ISO 8601 string — return only patients with updatedAt > this value (delta sync support) */
  updatedSince?: string;
}
