import { z } from "zod";
import { PlatformLoginDto } from "../dto/platform-login.dto";

const platformLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().trim().min(1),
});

export const parsePlatformLoginDto = (input: unknown): PlatformLoginDto => {
  const result = platformLoginSchema.parse(input);

  return {
    email: result.email.toLowerCase(),
    password: result.password,
  };
};
