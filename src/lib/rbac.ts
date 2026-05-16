import { redirect } from "next/navigation";
import { getSession } from "./auth";

export async function requireManager() {
  const { user } = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "manager") redirect("/r/home");
  return user;
}

export async function requireRider() {
  const { user } = await getSession();
  if (!user) redirect("/r/login");
  if (user.role !== "rider") redirect("/dashboard");
  return user;
}

export async function requireAnyUser() {
  const { user } = await getSession();
  if (!user) redirect("/login");
  return user;
}
