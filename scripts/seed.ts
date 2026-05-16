#!/usr/bin/env tsx
// Seed the local D1 with a handful of test riders. Useful while developing
// the manager UI without typing them by hand.
//   pnpm seed [--remote]

import { execSync } from "node:child_process";

const RIDERS: { name: string; phone: string; locale: "en" | "ur" | "hi" | "bn"; plate: string }[] = [
  { name: "Ahmed Al-Saud", phone: "+966500000001", locale: "ur", plate: "RYD-1234" },
  { name: "Bilal Khan", phone: "+966500000002", locale: "ur", plate: "RYD-1235" },
  { name: "Suresh Patel", phone: "+966500000003", locale: "hi", plate: "RYD-1236" },
  { name: "Rakib Hasan", phone: "+966500000004", locale: "bn", plate: "RYD-1237" },
  { name: "John Smith", phone: "+966500000005", locale: "en", plate: "RYD-1238" },
];

function cuid2(): string {
  return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function main() {
  const remote = process.argv.includes("--remote");
  const flag = remote ? "--remote" : "--local";
  const now = Math.floor(Date.now() / 1000);

  const values = RIDERS.map((r) =>
    `('${cuid2()}', '${r.name.replace(/'/g, "''")}', '${r.phone}', 'active', '${r.plate}', '${r.locale}', ${now}, ${now})`,
  ).join(", ");

  const sql = `INSERT INTO riders (id, full_name, phone, status, bike_plate, preferred_locale, created_at, updated_at) VALUES ${values};`;
  execSync(`wrangler d1 execute keeta-rider-ops ${flag} --command "${sql.replace(/"/g, '\\"')}"`, { stdio: "inherit" });
  console.log(`Seeded ${RIDERS.length} riders.`);
}

main();
