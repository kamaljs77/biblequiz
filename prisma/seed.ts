// Creates the admin account and a small sample quiz for local development.
// Run with `npm run db:seed` (or `--admin-only` for production). Safe to run more than once.
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db";
import { newShortId, publishQuiz } from "../lib/quizzes";

// A few WEB verses so the sample quiz works before the full WEB import
// (`npm run bible:import`), which overwrites these rows.
const SAMPLE_VERSES: [string, number, number, string][] = [
  ["Genesis", 1, 26, "God said, “Let’s make man in our image, after our likeness. Let them have dominion over the fish of the sea, and over the birds of the sky, and over the livestock, and over all the earth, and over every creeping thing that creeps on the earth.”"],
  ["Genesis", 1, 27, "God created man in his own image. In God’s image he created him; male and female he created them."],
  ["1 Corinthians", 10, 31, "Whether therefore you eat, or drink, or whatever you do, do all to the glory of God."],
  ["Romans", 11, 36, "For of him, and through him, and to him, are all things. To him be the glory for ever! Amen."],
  ["Psalms", 73, 25, "Whom do I have in heaven? There is no one on earth whom I desire besides you."],
  ["Psalms", 73, 26, "My flesh and my heart fails, but God is the strength of my heart and my portion forever."],
  ["Psalms", 73, 27, "For, behold, those who are far from you shall perish. You have destroyed all those who are unfaithful to you."],
  ["Psalms", 73, 28, "But it is good for me to come close to God. I have made the Lord Yahweh my refuge, that I may tell of all your works."],
  ["2 Timothy", 3, 16, "Every Scripture is God-breathed and profitable for teaching, for reproof, for correction, and for instruction in righteousness,"],
  ["Ephesians", 2, 20, "being built on the foundation of the apostles and prophets, Christ Jesus himself being the chief cornerstone;"],
  ["1 John", 1, 3, "that which we have seen and heard we declare to you, that you also may have fellowship with us. Yes, and our fellowship is with the Father and with his Son, Jesus Christ."],
  ["1 John", 1, 4, "And we write these things to you, that our joy may be fulfilled."],
];

type SampleQuestion = {
  prompt: string;
  explanation: string;
  sourceRef?: string;
  tags: string[];
  refs: [string, number, number, number][];
  options: [string, boolean][];
};

const SAMPLE_QUESTIONS: SampleQuestion[] = [
  {
    prompt: "What is the chief end of man?",
    explanation:
      "“Man’s chief end is to glorify God, and to enjoy him for ever.” (WSC Q1) We are to do all things to God’s glory, and God himself is the portion and delight of his people.",
    sourceRef: "WSC Q1",
    tags: ["WSC", "Man"],
    refs: [["1 Corinthians", 10, 31, 31], ["Romans", 11, 36, 36], ["Psalms", 73, 25, 28]],
    options: [
      ["To glorify God", true],
      ["To enjoy God forever", true],
      ["To gain wealth and comfort", false],
      ["To be free from all suffering in this life", false],
    ],
  },
  {
    prompt: "What rule has God given to direct us how we may glorify and enjoy him?",
    explanation:
      "“The Word of God, which is contained in the Scriptures of the Old and New Testaments, is the only rule to direct us how we may glorify and enjoy him.” (WSC Q2)",
    sourceRef: "WSC Q2",
    tags: ["WSC", "Scripture"],
    refs: [["2 Timothy", 3, 16, 16], ["Ephesians", 2, 20, 20], ["1 John", 1, 3, 4]],
    options: [
      ["The Word of God in the Scriptures of the Old and New Testaments", true],
      ["Our own feelings and conscience alone", false],
      ["Church tradition, as a rule equal to Scripture", false],
      ["New dreams and visions given to each believer", false],
    ],
  },
  {
    prompt: "God created man in whose image?",
    explanation: "Man was created in God’s own image (Genesis 1:26–27).",
    tags: ["Man", "Creation"],
    refs: [["Genesis", 1, 26, 27]],
    options: [
      ["The image of the angels", false],
      ["His own image", true],
      ["The image of the animals", false],
      ["No image at all", false],
    ],
  },
];

async function main() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env");

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const existing = await prisma.admin.findFirst();
  if (existing) {
    console.log(`Admin already exists (${existing.email}); leaving it unchanged.`);
  } else {
    const email = ADMIN_EMAIL.trim().toLowerCase(); // login compares lower-case emails
    await prisma.admin.create({ data: { email, name: ADMIN_NAME ?? "Admin", passwordHash } });
    console.log(`Created admin ${email}`);
  }

  // Production: create only the admin account, without the sample quiz.
  if (process.argv.includes("--admin-only")) return;

  for (const [book, chapter, verse, text] of SAMPLE_VERSES) {
    await prisma.bibleVerse.upsert({
      where: { book_chapter_verse: { book, chapter, verse } },
      create: { book, chapter, verse, text },
      update: {},
    });
  }

  const series = await prisma.series.upsert({
    where: { slug: "westminster-shorter-catechism" },
    create: {
      name: "Westminster Shorter Catechism",
      slug: "westminster-shorter-catechism",
      description: "The 107 questions of the Westminster Shorter Catechism (1647), with their proof texts.",
    },
    update: {},
  });

  if (await prisma.quiz.findUnique({ where: { slug: "sample-quiz" } })) {
    console.log("Sample quiz already exists.");
    return;
  }

  const questionIds: number[] = [];
  for (const q of SAMPLE_QUESTIONS) {
    const created = await prisma.question.create({
      data: {
        prompt: q.prompt,
        explanation: q.explanation,
        sourceRef: q.sourceRef,
        options: { create: q.options.map(([text, isCorrect], i) => ({ text, isCorrect, sortOrder: i })) },
        verseRefs: {
          create: q.refs.map(([book, chapter, verseStart, verseEnd], i) => ({
            book, chapter, verseStart, verseEnd, sortOrder: i,
          })),
        },
        tags: {
          create: q.tags.map((name) => ({
            tag: { connectOrCreate: { where: { name }, create: { name } } },
          })),
        },
      },
    });
    questionIds.push(created.id);
  }

  const quiz = await prisma.quiz.create({
    data: {
      slug: "sample-quiz",
      shortId: newShortId(),
      seriesId: series.id,
      title: "Sample Quiz: Man's Chief End",
      description: "A short sample quiz to try the app before the full catechism is imported.",
      questions: { create: questionIds.map((questionId, i) => ({ questionId, sortOrder: i })) },
    },
  });
  const problems = await publishQuiz(quiz.id);
  if (problems.length) throw new Error(problems.join("\n"));
  console.log("Created and published /quiz/sample-quiz");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
