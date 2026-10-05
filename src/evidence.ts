import { z } from 'zod';

export const evidenceSchema = z.object({
  termsHash: z.string().regex(/^0x[0-9a-f]{64}$/),
  assetSerial: z.string().min(1),
  accepted: z.boolean(),
  observedAt: z.number().int().positive().safe(),
  expiresAt: z.number().int().positive().safe(),
  evidenceId: z.string().min(1),
}).strict();

export interface GatePolicy {
  termsHash: string;
  assetSerial: string;
  deadline: number;
  maxAgeSeconds: number;
}

/** Candidate eligibility only. Caller must authenticate the evidence issuer separately. */
export function evaluateEvidence(policy: GatePolicy, input: unknown, now: number) {
  const parsed = evidenceSchema.safeParse(input);
  if (!parsed.success) return { eligible: false, reasons: ['Malformed evidence'] };
  const evidence = parsed.data;
  const reasons: string[] = [];
  if (evidence.termsHash !== policy.termsHash) reasons.push('Wrong terms version');
  if (evidence.assetSerial !== policy.assetSerial) reasons.push('Wrong asset');
  if (!evidence.accepted) reasons.push('Acceptance not confirmed');
  if (evidence.observedAt > now) reasons.push('Future evidence');
  if (now - evidence.observedAt > policy.maxAgeSeconds) reasons.push('Stale evidence');
  if (evidence.expiresAt <= now || evidence.expiresAt < evidence.observedAt) reasons.push('Expired evidence');
  if (now >= policy.deadline) reasons.push('Delivery deadline passed');
  return { eligible: reasons.length === 0, reasons };
}
