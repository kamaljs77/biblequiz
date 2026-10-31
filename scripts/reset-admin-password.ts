// Resets the admin password when it has been forgotten (FR-6.4).
// Usage: npm run admin:reset-password -- <new-password>
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db";

async function main() {
  const password = process.argv[2];
  if (!password || password.length < 10) throw new Error("Give a new password of at least 10 characters.");
  const admin = await prisma.admin.findFirst();
  if (!admin) throw new Error("No admin account exists. Run `npm run db:seed` first.");
  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(password, 12) } });
  console.log(`Password reset for ${admin.email}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
