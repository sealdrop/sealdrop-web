import { padToBlock } from "./padding.js";

export const CHUNK_SIZE_BYTES = 10 * 1024 * 1024; // 10 MiB

const IV_BYTES = 12;
const GCM_TAG_BYTES = 16;

export function encryptedChunkLength(plaintextLength: number): number {
  return plaintextLength + GCM_TAG_BYTES;
}

function deriveChunkIv(baseIv: Uint8Array<ArrayBuffer>, chunkIndex: number): Uint8Array<ArrayBuffer> {
  const iv = new Uint8Array(IV_BYTES) as Uint8Array<ArrayBuffer>;
  iv.set(baseIv, 0);
  for (let i = 0; i < 8; i++) {
    iv[IV_BYTES - 1 - i] = (baseIv[IV_BYTES - 1 - i]! ^ ((chunkIndex >> (i * 8)) & 0xff)) as number;
  }
  return iv;
}

export async function encryptChunk(
  plaintext: ArrayBuffer,
  key: CryptoKey,
  baseIv: Uint8Array<ArrayBuffer>,
  chunkIndex: number,
): Promise<ArrayBuffer> {
  const iv = deriveChunkIv(baseIv, chunkIndex);
  return crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
}

export async function decryptChunk(
  ciphertext: ArrayBuffer,
  key: CryptoKey,
  baseIv: Uint8Array<ArrayBuffer>,
  chunkIndex: number,
): Promise<ArrayBuffer> {
  const iv = deriveChunkIv(baseIv, chunkIndex);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
}

export interface Chunk {
  index: number;
  data: ArrayBuffer;
  byteLength: number;
}

export function chunkFile(file: ArrayBuffer, pad = false): Chunk[] {
  const chunks: Chunk[] = [];
  const total = file.byteLength;
  if (total === 0) return chunks;
  let offset = 0;
  let index = 0;
  while (offset < total) {
    let size = Math.min(CHUNK_SIZE_BYTES, total - offset);
    let data = file.slice(offset, offset + size);
    if (pad && offset + size >= total) {
      data = padToBlock(data);
      size = data.byteLength;
    }
    chunks.push({
      index,
      data,
      byteLength: size,
    });
    offset += size;
    index++;
  }
  return chunks;
}

export function encryptStream(
  input: ReadableStream<Uint8Array>,
  key: CryptoKey,
  baseIv: Uint8Array<ArrayBuffer>,
  onProgress?: (chunkIndex: number) => void,
): ReadableStream<Uint8Array> {
  let chunkIndex = 0;
  let buffer = new Uint8Array(0);
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let inputExhausted = false;

  return new ReadableStream({
    start() {
      reader = input.getReader();
    },
    async pull(controller) {
      try {
        while (!inputExhausted && buffer.length < CHUNK_SIZE_BYTES) {
          const { done, value } = await reader!.read();
          if (done) {
            inputExhausted = true;
            break;
          }
          const newBuf = new Uint8Array(buffer.length + value.length);
          newBuf.set(buffer);
          newBuf.set(value, buffer.length);
          buffer = newBuf;
        }

        if (buffer.length === 0) {
          controller.close();
          return;
        }

        const chunkSize = inputExhausted ? buffer.length : CHUNK_SIZE_BYTES;
        const chunk = buffer.slice(0, chunkSize);
        buffer = buffer.slice(chunkSize);
        const encrypted = await encryptChunk(chunk.buffer as ArrayBuffer, key, baseIv, chunkIndex);
        chunkIndex++;
        onProgress?.(chunkIndex);
        controller.enqueue(new Uint8Array(encrypted));
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      reader?.releaseLock();
    },
  });
}

export function decryptStream(
  input: ReadableStream<Uint8Array>,
  key: CryptoKey,
  baseIv: Uint8Array<ArrayBuffer>,
  plaintextLength: number,
  onProgress?: (bytesDecrypted: number) => void,
): ReadableStream<Uint8Array> {
  let chunkIndex = 0;
  let buffer = new Uint8Array(0);
  let bytesDecrypted = 0;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let inputExhausted = false;

  return new ReadableStream({
    start() {
      reader = input.getReader();
    },
    async pull(controller) {
      try {
        const chunkEncLen = encryptedChunkLength(
          Math.min(CHUNK_SIZE_BYTES, plaintextLength - bytesDecrypted),
        );

        while (!inputExhausted && buffer.length < chunkEncLen) {
          const { done, value } = await reader!.read();
          if (done) {
            inputExhausted = true;
            break;
          }
          const newBuf = new Uint8Array(buffer.length + value.length);
          newBuf.set(buffer);
          newBuf.set(value, buffer.length);
          buffer = newBuf;
        }

        if (buffer.length < chunkEncLen) {
          controller.close();
          return;
        }

        const encChunk = buffer.slice(0, chunkEncLen);
        buffer = buffer.slice(chunkEncLen);
        const decrypted = await decryptChunk(encChunk.buffer as ArrayBuffer, key, baseIv, chunkIndex);
        chunkIndex++;
        bytesDecrypted += decrypted.byteLength;
        onProgress?.(bytesDecrypted);
        controller.enqueue(new Uint8Array(decrypted));
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      reader?.releaseLock();
    },
  });
}