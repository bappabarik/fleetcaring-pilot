import { apiRequest } from "./client";

export type UploadContentType = "image/jpeg" | "image/png" | "image/webp";
export type UploadPurpose = "precheck" | "postcheck" | "issue" | "avatar";

export interface PresignedUpload {
  uploadUrl: string;
  publicUrl: string;
}

export const uploadsApi = {
  presign: (contentType: UploadContentType, purpose: UploadPurpose) =>
    apiRequest<PresignedUpload>("/uploads/presign", { method: "POST", body: { contentType, purpose } }),
};