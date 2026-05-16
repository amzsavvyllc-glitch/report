import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../drizzle/schema";
import { env } from "./env";

export function db() {
  return drizzle(env().DB, { schema });
}

export { schema };
