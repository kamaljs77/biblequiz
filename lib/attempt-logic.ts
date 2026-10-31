// Quiz-taking rules shared by the server (app/api/attempts) and the admin preview,
// which runs them in the browser. No database or Node-only imports here.
import type { QuizSnapshotContent, SnapshotQuestion } from "@/lib/snapshot";

/** Per-attempt state. On the server it is never sent to the browser as a whole. */
export type AttemptState = {
  questionOrder: string[];
  optionOrder: Record<string, string[]>;
  /** When each question was first shown, used to enforce the thinking time. */
  shownAt: Record<string, number>;
  revealed: Record<string, boolean>;
};

export type ActionBody =
  | { action: "question"; index: number }
  | { action: "reveal"; index: number }
  | { action: "answer"; index: number; selected: string[] }
  | { action: "finish" };

export type AttemptContext = {
  content: QuizSnapshotContent;
  state: AttemptState;
  /** Answers already given, by question key. */
  answers: Map<string, string[]>;
  completed: boolean;
  participantName: string;
};

export type ActionResult = {
  status: number;
  data: Record<string, unknown>;
  /** The caller must persist `ctx.state` (it was changed in place). */
  stateChanged?: boolean;
  recordAnswer?: { questionKey: string; selected: string[]; isCorrect: boolean };
  complete?: { score: number };
};

// A little slack for network latency when checking that the thinking time has passed.
const REVEAL_TOLERANCE_MS = 2000;

function shuffle<T>(items: T[], randomInt: (max: number) => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function initialState(content: QuizSnapshotContent, randomInt: (max: number) => number): AttemptState {
  const keys = content.questions.map((q) => q.key);
  const optionOrder: Record<string, string[]> = {};
  for (const q of content.questions) {
    const optKeys = q.options.map((o) => o.key);
    optionOrder[q.key] = content.quiz.shuffleOptions ? shuffle(optKeys, randomInt) : optKeys;
  }
  return {
    questionOrder: content.quiz.shuffleQuestions ? shuffle(keys, randomInt) : keys,
    optionOrder,
    shownAt: {},
    revealed: {},
  };
}

function questionAt(content: QuizSnapshotContent, state: AttemptState, index: number) {
  const key = state.questionOrder[index];
  return key ? content.questions.find((q) => q.key === key) ?? null : null;
}

/** Question as shown during the thinking stage: prompt and verses only. */
function publicQuestion(q: SnapshotQuestion) {
  return { key: q.key, prompt: q.prompt, type: q.type, thinkTimeSeconds: q.thinkTimeSeconds, verses: q.verses };
}

/** Options in this attempt's order, without the correct flags. */
function publicOptions(q: SnapshotQuestion, state: AttemptState) {
  const order = state.optionOrder[q.key] ?? q.options.map((o) => o.key);
  return order
    .map((k) => q.options.find((o) => o.key === k))
    .filter((o): o is NonNullable<typeof o> => !!o)
    .map((o) => ({ key: o.key, text: o.text }));
}

/** FR-3.5: every correct option and no wrong option. */
export function grade(q: SnapshotQuestion, selected: string[]) {
  const correct = new Set(q.options.filter((o) => o.isCorrect).map((o) => o.key));
  const chosen = new Set(selected);
  const isCorrect = correct.size === chosen.size && [...correct].every((k) => chosen.has(k));
  return {
    isCorrect,
    correctKeys: [...correct],
    missedKeys: [...correct].filter((k) => !chosen.has(k)),
    wrongKeys: [...chosen].filter((k) => !correct.has(k)),
  };
}

function feedback(q: SnapshotQuestion, selected: string[]) {
  return { ...grade(q, selected), selected, explanation: q.explanation };
}

function review(ctx: AttemptContext) {
  return ctx.state.questionOrder.map((key) => {
    const q = ctx.content.questions.find((x) => x.key === key)!;
    const selected = ctx.answers.get(key) ?? [];
    return {
      key,
      prompt: q.prompt,
      verses: q.verses,
      explanation: q.explanation,
      options: q.options.map((o) => ({ key: o.key, text: o.text, isCorrect: o.isCorrect })),
      selected,
      isCorrect: grade(q, selected).isCorrect,
    };
  });
}

const fail = (error: string, status = 400): ActionResult => ({ status, data: { error } });

export function handleAction(ctx: AttemptContext, body: ActionBody, now: number): ActionResult {
  const { content, state, answers } = ctx;
  const showFeedback = content.quiz.feedbackMode === "immediate";

  if (body.action === "finish") {
    if (answers.size < state.questionOrder.length) return fail("Some questions are not answered yet.");
    const items = review(ctx);
    const score = items.filter((r) => r.isCorrect).length;
    return {
      status: 200,
      data: { name: ctx.participantName, score, maxScore: state.questionOrder.length, review: items },
      complete: ctx.completed ? undefined : { score },
    };
  }

  const q = questionAt(content, state, body.index);
  if (!q) return fail("Question not found", 404);
  if (ctx.completed) return fail("This attempt is already finished.", 409);

  if (body.action === "question") {
    let stateChanged = false;
    if (!state.shownAt[q.key]) {
      state.shownAt[q.key] = now;
      stateChanged = true;
    }
    const prior = answers.get(q.key);
    return {
      status: 200,
      stateChanged,
      data: {
        index: body.index,
        total: state.questionOrder.length,
        allowEarlyReveal: content.quiz.allowEarlyReveal,
        question: publicQuestion(q),
        options: state.revealed[q.key] ? publicOptions(q, state) : null,
        feedback: prior ? (showFeedback ? feedback(q, prior) : { selected: prior }) : null,
      },
    };
  }

  if (body.action === "reveal") {
    const shownAt = state.shownAt[q.key];
    if (!shownAt) return fail("Question has not been shown yet.");
    if (!content.quiz.allowEarlyReveal && now - shownAt + REVEAL_TOLERANCE_MS < q.thinkTimeSeconds * 1000) {
      return fail("Please take the full thinking time.", 403);
    }
    const stateChanged = !state.revealed[q.key];
    state.revealed[q.key] = true;
    return { status: 200, stateChanged, data: { options: publicOptions(q, state) } };
  }

  // answer
  if (!state.revealed[q.key]) return fail("Options have not been shown yet.");
  if (answers.has(q.key)) return fail("This question is already answered.", 409);
  const validKeys = new Set(q.options.map((o) => o.key));
  const selected = [...new Set(body.selected)].filter((k) => validKeys.has(k));
  if (selected.length === 0) return fail("Please choose an answer.");
  if (q.type === "single" && selected.length > 1) return fail("Choose only one answer.");
  const result = grade(q, selected);
  answers.set(q.key, selected);
  return {
    status: 200,
    data: { feedback: showFeedback ? feedback(q, selected) : { selected } },
    recordAnswer: { questionKey: q.key, selected, isCorrect: result.isCorrect },
  };
}
