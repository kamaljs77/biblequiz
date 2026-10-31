import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedSnapshot } from "@/lib/snapshot";
import { Unavailable } from "@/components/Unavailable";
import { QuizPlayer } from "./QuizPlayer";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await getPublishedSnapshot((await params).slug);
  return found ? { title: found.content.quiz.title, robots: { index: false } } : {};
}

export default async function PlayPage({ params }: Props) {
  const { slug } = await params;
  const found = await getPublishedSnapshot(slug);
  if (!found) notFound();
  if (found.archived) return <Unavailable newer={found.supersededBy} />;
  return <QuizPlayer slug={slug} title={found.content.quiz.title} />;
}
