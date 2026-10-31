"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function changePassword(_prev: { error?: string; ok?: boolean } | null, form: FormData) {
  const adminId = await requireAdmin();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (next.length < 10) return { error: "The new password must be at least 10 characters." };
  if (next !== confirm) return { error: "The new passwords do not match." };
  const admin = await prisma.admin.findUniqueOrThrow({ where: { id: adminId } });
  if (!(await bcrypt.compare(current, admin.passwordHash))) return { error: "The current password is incorrect." };
  await prisma.admin.update({ where: { id: adminId }, data: { passwordHash: await bcrypt.hash(next, 12) } });
  return { ok: true };
}
