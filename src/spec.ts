import { keccak256, toUtf8Bytes } from 'ethers';
import { z } from 'zod';

export const hashSchema = z.string().regex(/^0x[0-9a-f]{64}$/);
export const addressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/).refine(
  (s) => !/^0x0{40}$/.test(s), 'Zero address is not permitted',
);
const sourceSchema = z.object({
  clause: z.string().min(1),
  quote: z.string().min(1),
}).strict();

/** A deliberately narrow v1 policy. Other agreement types require a new schema. */
export const specSchema = z.object({
  schemaVersion: z.literal('1'),
  policy: z.literal('equipment-sale-escrow-v1'),
  agreementId: z.string().min(1),
  documentHash: hashSchema,
  chainId: z.number().int().positive(),
  buyer: addressSchema,
  seller: addressSchema,
  inspector: addressSchema,
  arbitrator: addressSchema,
  amountWei: z.string().regex(/^[1-9][0-9]*$/).refine((s) => BigInt(s) < 2n ** 256n),
  assetSerial: z.string().min(1),
  deliveryDeadline: z.number().int().positive().safe(),
  evidenceMaxAgeSeconds: z.number().int().positive().max(86400),
  sources: z.object({
    payment: sourceSchema,
    delivery: sourceSchema,
    acceptance: sourceSchema,
    dispute: sourceSchema,
    refund: sourceSchema,
  }).strict(),
}).strict().superRefine((s, ctx) => {
  const parties = [s.buyer, s.seller, s.inspector, s.arbitrator].map((a) => a.toLowerCase());
  if (new Set(parties).size !== parties.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Demo roles must use distinct addresses' });
  }
});
export type ContractSpec = z.infer<typeof specSchema>;

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error('Non-JSON value');
  return encoded;
}
export const documentHash = (text: string): string => keccak256(toUtf8Bytes(text));
export const termsHash = (input: unknown): string => {
  const spec = specSchema.parse(input);
  return keccak256(toUtf8Bytes(canonicalJson(spec)));
};

/** Checks provenance only; this is NOT semantic/legal validation or extraction. */
export function validateSourceLinks(input: unknown, document: string): ContractSpec {
  const spec = specSchema.parse(input);
  if (documentHash(document) !== spec.documentHash) throw new Error('Document version mismatch');
  for (const [rule, source] of Object.entries(spec.sources)) {
    if (!document.includes(source.quote)) throw new Error(`Missing exact source for ${rule}`);
  }
  return spec;
}
