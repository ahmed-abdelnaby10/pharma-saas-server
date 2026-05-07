import { z } from "zod";
import { PlatformLoginDto } from "../dto/platform-login.dto";

const platformLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().trim().min(1),
  rememberMe: z.boolean().default(false),
});

const platformRefreshSchema = z.object({
  refreshToken: z.string().trim().min(1),
});

export const parsePlatformLoginDto = (input: unknown): PlatformLoginDto => {
  const result = platformLoginSchema.parse(input);

  return {
    email: result.email.toLowerCase(),
    password: result.password,
    rememberMe: result.rememberMe,
  };
};

export const parsePlatformRefreshDto = (input: unknown): { refreshToken: string } => {
  return platformRefreshSchema.parse(input);
};
