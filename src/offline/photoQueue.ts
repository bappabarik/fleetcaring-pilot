import * as FileSystem from "expo-file-system/legacy";
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

/** Everything not yet successfully uploaded — used to show "still
 * syncing" feedback on whatever screen the pilot is actually looking at,
 * not just the Home screen. */
export async function getUnresolvedPhotos(): Promise<QueuedPhoto[]> {
  const db = await getDb();
  return db.getAllAsync<QueuedPhoto>(
    "SELECT * FROM photo_queue WHERE status IN ('pending', 'uploading', 'failed') ORDER BY createdAt ASC"
  );
}

export async function getFailedPhotos(): Promise<QueuedPhoto[]> {
  const db = await getDb();
  return db.getAllAsync<QueuedPhoto>("SELECT * FROM photo_queue WHERE status = 'failed' ORDER BY createdAt ASC");
}

/** Puts a failed photo back in line to be retried on the next drain —
 * mirrors retryAction()'s role for the action queue. */
export async function retryPhoto(id: string): Promise<void> {
  await markPhotoStatus(id, "pending");
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
    // console.log("R2 error body:", result.body);
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
      // Mark this one failed and move on to the NEXT pending photo rather
      // than bailing out of the whole batch — a single persistently-bad
      // photo (corrupt file, expired presign, etc.) shouldn't be able to
      // block every other photo behind it, forever, on every drain cycle.
      // This one stays "failed" and gets picked up again on the next
      // drainPhotoQueue() call (getPendingPhotos selects pending+failed).
      await markPhotoStatus(photo.id, "failed", undefined, err instanceof Error ? err.message : "Upload failed");
    }
  }
}