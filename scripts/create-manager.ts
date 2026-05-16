#!/usr/bin/env tsx
// Bootstrap the first manager account. Run after applying migrations:
//   pnpm create-manager -- --email you@example.com --password 'Strong-Pass-1' --remote
// Without --remote, runs against the local D1 .wrangler/state DB.

import { execSync } from "node:child_process";
import { argon2id } from "@noble/hashes/argon2";
import { randomBytes, bytesToHex } from "@noble/hashes/utils";

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i === -1 ? null : args[i + 1];
  };
  return {
    email: get("--email"),
    password: get("--password"),
    remote: args.includes("--remote"),
    locale: get("--locale") ?? "en",
  };
}

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = argon2id(password, salt, { t: 3, m: 19456, p: 1, dkLen: 32 });
  return `${bytesToHex(salt)}:${bytesToHex(hash)}`;
}

function cuid2(): string {
  // tiny inline cuid2-like generator to avoid pulling the dep in scripts
  return "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function main() {
  const { email, password, remote, locale } = parseArgs();
  if (!email || !password) {
    console.error("Usage: pnpm create-manager -- --email <email> --password <password> [--remote] [--locale en|ur|hi|bn]");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const id = cuid2();
  const hash = hashPassword(password);
  const now = Math.floor(Date.now() / 1000);

  const sql = `INSERT INTO users (id, role, email, password_hash, locale, created_at, updated_at) VALUES ('${id}', 'manager', '${email.replace(/'/g, "''")}', '${hash}', '${locale}', ${now}, ${now});`;

  const flag = remote ? "--remote" : "--local";
  const cmd = `wrangler d1 execute keeta-rider-ops ${flag} --command "${sql.replace(/"/g, '\\"')}"`;
  console.log(`Creating manager ${email} (${remote ? "remote" : "local"})…`);
  execSync(cmd, { stdio: "inherit" });
  console.log(`Done. id=${id}`);
}

main();
