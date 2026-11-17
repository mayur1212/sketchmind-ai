import {
  errorResponse,
  generate,
  lessonJsonSchema,
  lessonPrompt,
  PublicError,
  readRequest,
} from "@/lib/ai";
import { topicSchema } from "@/lib/lesson";
import { prepareGeneratedLesson } from "@/lib/lessonQuality";
export const maxDuration = 120;
export async function POST(request: Request) {
  try {
    const { topic, followUp } = topicSchema.parse(await readRequest(request));
    let feedback = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      // Two bounded generation passes, including SDK transient retries, fit the function budget.
      const raw = await generate(
        lessonPrompt(topic, followUp) + feedback,
        lessonJsonSchema,
        { timeoutMs: 25000 },
      );
      try {
        return Response.json(prepareGeneratedLesson(JSON.parse(raw)));
      } catch (error) {
        if (attempt === 1)
          throw new PublicError(
            "The AI could not create a clear two-minute lesson. Please try again.",
            502,
          );
        const details =
          error instanceof Error ? error.message : "Invalid lesson structure.";
        feedback = `\nThe previous attempt failed validation: ${details.slice(0, 1400)}. Generate a complete corrected lesson as JSON, with 320–350 narration words and valid diagram geometry.`;
      }
    }
    throw new PublicError("Please try generating the lesson again.", 502);
  } catch (e) {
    return errorResponse(e);
  }
}
