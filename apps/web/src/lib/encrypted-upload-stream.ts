import {
  CHUNK_SIZE_BYTES,
  encryptChunk,
  fillRandom,
  padToBlock,
  padToSize,
} from "@sealdrop/crypto";
export { TRANSPORT_CHUNKS_PER_PART } from "@sealdrop/shared";

interface EncryptedUploadStreamOptions {
  file: File;
  key: CryptoKey;
  fileIv: Uint8Array<ArrayBuffer>;
  chunkCount: number;
  startChunkIndex?: number;
  endChunkIndex?: number;
  paddedSizeBytes?: number;
  onProgress?: (uploadedChunks: number) => void;
}

export function createEncryptedUploadStream({
  file,
  key,
  fileIv,
  chunkCount,
  startChunkIndex = 0,
  endChunkIndex = chunkCount,
  paddedSizeBytes,
  onProgress,
}: EncryptedUploadStreamOptions): ReadableStream<Uint8Array> {
  const realChunkCount = Math.max(1, Math.ceil(file.size / CHUNK_SIZE_BYTES));
  let chunkIndex = startChunkIndex;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (chunkIndex >= endChunkIndex) {
        controller.close();
        return;
      }

      const index = chunkIndex;
      chunkIndex++;

      let chunkData: ArrayBuffer | undefined;
      let encrypted: ArrayBuffer | undefined;

      try {
        if (paddedSizeBytes !== undefined) {
          const thisChunkSize = Math.min(CHUNK_SIZE_BYTES, paddedSizeBytes - index * CHUNK_SIZE_BYTES);
          if (index < realChunkCount) {
            const start = index * CHUNK_SIZE_BYTES;
            const end = Math.min(start + CHUNK_SIZE_BYTES, file.size);
            const realData = await file.slice(start, end).arrayBuffer();
            chunkData = padToSize(realData, thisChunkSize);
          } else {
            const padding = new Uint8Array(thisChunkSize);
            fillRandom(padding);
            chunkData = padding.buffer as ArrayBuffer;
          }
        } else {
          const start = index * CHUNK_SIZE_BYTES;
          const end = Math.min(start + CHUNK_SIZE_BYTES, file.size);
          chunkData = await file.slice(start, end).arrayBuffer();
          if (index === chunkCount - 1) chunkData = padToBlock(chunkData);
        }

        encrypted = await encryptChunk(chunkData, key, fileIv, index);
        controller.enqueue(new Uint8Array(encrypted));
        onProgress?.(index + 1);
      } catch (err) {
        controller.error(err);
      } finally {
        chunkData = undefined;
        encrypted = undefined;
      }
    },
  });
}

export async function createEncryptedUploadPartBlob(options: EncryptedUploadStreamOptions): Promise<Blob> {
  const reader = createEncryptedUploadStream(options).getReader();
  const chunks: BlobPart[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer);
    }
  } finally {
    reader.releaseLock();
  }
  return new Blob(chunks, { type: "application/octet-stream" });
}
