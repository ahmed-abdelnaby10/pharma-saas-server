export type TenantLoginDto = {
  slug: string;   // human-readable tenant identifier e.g. "green-valley-pharmacy"
  email: string;
  password: string;
};
