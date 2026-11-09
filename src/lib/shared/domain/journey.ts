import { z } from "zod";

export const JourneyActionSchema = z.enum([
  "goto",
  "click",
  "fill",
  "select",
  "pressKey",
  "waitForSelector",
  "assertVisible",
  "assertText",
  "assertUrl",
]);

export type JourneyAction = z.infer<typeof JourneyActionSchema>;

export const JourneyStepSchema = z.object({
  id: z.string().min(1),
  action: JourneyActionSchema,
  selector: z.string().optional(),
  value: z.string().optional(),
  url: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
  optional: z.boolean().optional(),
});

export type JourneyStep = z.infer<typeof JourneyStepSchema>;

export const JourneyStepOutcomeSchema = z.object({
  stepId: z.string(),
  action: JourneyActionSchema,
  status: z.enum(["passed", "failed", "skipped"]),
  durationMs: z.number(),
  error: z.string().optional(),
  screenshotUrl: z.string().optional(),
});

export type JourneyStepOutcome = z.infer<typeof JourneyStepOutcomeSchema>;

export type JourneyExecutionResult = {
  outcomes: JourneyStepOutcome[];
  passed: boolean;
  error?: string;
  stepsTotal: number;
  stepsPassed: number;
  stepsFailed: number;
};
