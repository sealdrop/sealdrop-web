import { z } from "zod";
import { MAX_FILE_SIZE_BYTES, CHUNK_SIZE_BYTES } from "./limits.js";
import { SEND_EXPIRY_PRESETS, RECEIVE_EXPIRY_PRESETS } from "./expiry.js";

export const SendInitSchema = z.object({
  size_bytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
  expiry_preset: z.enum(SEND_EXPIRY_PRESETS),
  encrypted_metadata: z.string().min(1),
  metadata_iv: z.string().min(1),
  file_iv: z.string().min(1),
  chunk_count: z.number().int().positive(),
  want_delete_link: z.boolean().optional().default(false),
  turnstile_token: z.string().optional(),
});

export const ReceiveInitSchema = z.object({
  public_key: z.string().min(1),
  expiry_preset: z.enum(RECEIVE_EXPIRY_PRESETS),
  turnstile_token: z.string().optional(),
});

export const ReceiveFileInitSchema = z.object({
  size_bytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
  encrypted_metadata: z.string().min(1),
  metadata_iv: z.string().min(1),
  file_iv: z.string().min(1),
  chunk_count: z.number().int().positive().optional().default(1),
  wrapped_file_key: z.string().min(1),
  ephemeral_public_key: z.string().min(1),
  wrapped_key_iv: z.string().min(1),
});

export const CreateOpenLinkSchema = z.object({
  handoff_id: z.string().min(6).max(6),
  encrypted_payload: z.string().min(1).max(4096),
  payload_iv: z.string().min(1).max(64),
  kdf_salt: z.string().min(1).max(64),
  kdf_iterations: z.number().int().min(1).max(1_000_000),
});

export type SendInitInput = z.infer<typeof SendInitSchema>;
export type ReceiveInitInput = z.infer<typeof ReceiveInitSchema>;
export type ReceiveFileInitInput = z.infer<typeof ReceiveFileInitSchema>;
export type CreateOpenLinkInput = z.infer<typeof CreateOpenLinkSchema>;
