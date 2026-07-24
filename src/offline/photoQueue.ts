import * as FileSystem from "expo-file-system";
import { getDb } from "./db";
import { generateIdempotencyKey } from "@/lib/uuid";
import { uploadsApi, type UploadContentType, type UploadPurpose } from "@/api/uploads";

export type PhotoStatus = "pending" | "uploading" | "uploaded" | "failed";

export interface QueuedPhoto {
  id: string;
  localUri: string;
  contentType: UploadContentType;
  purpose: UploadPurpose;
  remoteKey: string | null;
  status: PhotoStatus;
  errorMessage: string | null;
  createdAt: string;
}

export async function enqueuePhoto(
  localUri: string,
  contentType: UploadContentType,
  purpose: UploadPurpose
): Promise<string> {
  const db = await getDb();
  const id = generateIdempotencyKey();
  await db.runAsync(
    "INSERT INTO photo_queue (id, localUri, contentType, purpose, status, createdAt) VALUES (?, ?, ?, ?, 'pending', ?)",
    id,
    localUri,
    contentType,
    purpose,
    new Date().toISOString()
  );
  return id;
}

export async function getPhotoById(id: string): Promise<QueuedPhoto | null> {
  const db = await getDb();
  return db.getFirstAsync<QueuedPhoto>("SELECT * FROM photo_queue WHERE id = ?", id);
}

export async function getPendingPhotos(): Promise<QueuedPhoto[]> {
  const db = await getDb();
  return db.getAllAsync<QueuedPhoto>(
    "SELECT * FROM photo_queue WHERE status IN ('pending', 'failed') ORDER BY createdAt ASC"
  );
}

async function markPhotoStatus(id: string, status: PhotoStatus, remoteKey?: string, errorMessage?: string) {
  const db = await getDb();
  await db.runAsync(
    "UPDATE photo_queue SET status = ?, remoteKey = COALESCE(?, remoteKey), errorMessage = ? WHERE id = ?",
    status,
    remoteKey ?? null,
    errorMessage ?? null,
    id
  );
}

async function uploadOnePhoto(photo: QueuedPhoto): Promise<void> {
  const { uploadUrl, publicUrl } = await uploadsApi.presign(photo.contentType, photo.purpose);

  const result = await FileSystem.uploadAsync(uploadUrl, photo.localUri, {
    httpMethod: "PUT",
    headers: { "Content-Type": photo.contentType },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed with status ${result.status}`);
  }

  await markPhotoStatus(photo.id, "uploaded", publicUrl);
}

export async function drainPhotoQueue(): Promise<void> {
  const pending = await getPendingPhotos();
  for (const photo of pending) {
    try {
      await markPhotoStatus(photo.id, "uploading");
      await uploadOnePhoto(photo);
    } catch (err) {
      await markPhotoStatus(photo.id, "failed", undefined, err instanceof Error ? err.message : "Upload failed");
      return;
    }
  }
}