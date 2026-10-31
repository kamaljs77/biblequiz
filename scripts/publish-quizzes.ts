// Publishes (freezes) every draft quiz in a series, in order, with the same checks as the
// admin "Save and publish" button. Usage:
//   npm run quizzes:publish -- <series-slug>         (e.g. westminster-shorter-catechism)
//   npm run prod:quizzes:publish -- <series-slug>    (against production)
// Add --dry-run to only list what would be published and any problems.
import { prisma } from "../lib/db";
import { publishQuiz } from "../lib/quizzes";
import { validateForPublish } from "../lib/snapshot";

async function main() {
  const seriesSlug = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (!seriesSlug || seriesSlug.startsWith("--")) throw new Error("Usage: npm run quizzes:publish -- <series-slug> [--dry-run]");

  const series = await prisma.series.findUnique({ where: { slug: seriesSlug } });
  if (!series) throw new Error(`No series with slug "${seriesSlug}".`);
  const drafts = await prisma.quiz.findMany({
    where: { seriesId: series.id, status: "draft" },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  if (drafts.length === 0) return console.log(`No draft quizzes in "${series.name}".`);

  let published = 0;
  for (const quiz of drafts) {
    const problems = dryRun ? await validateForPublish(quiz.id) : await publishQuiz(quiz.id);
    if (problems.length) {
      console.log(`✗ ${quiz.title}\n  - ${problems.join("\n  - ")}`);
      continue;
    }
    published++;
    console.log(`${dryRun ? "ready" : "✓ published"}  /quiz/${quiz.slug}  (${quiz.title})`);
  }
  console.log(`${dryRun ? "Ready to publish" : "Published"} ${published} of ${drafts.length} draft quizzes.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
