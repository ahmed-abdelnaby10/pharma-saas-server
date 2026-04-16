import { AuthContext } from "./auth.types";
import { Language, Translator } from "./locale.types";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      lang?: Language;
      auth?: AuthContext;
      accessToken?: string;
      t?: Translator;
      translate?: Translator;
    }
  }
}

export {};
