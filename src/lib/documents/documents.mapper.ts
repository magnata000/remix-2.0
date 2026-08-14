import type { DocFile, DocFolder } from "./types";

export type Row = Record<string, unknown>;

const str = (v: unknown) => (typeof v === "string" ? v : "");
const nullableStr = (v: unknown) => (typeof v === "string" ? v : null);

export function mapFolder(row: Row, clientName: string): DocFolder {
  return {
    id: str(row["id"]),
    name: str(row["name"]),
    parentId: nullableStr(row["parent_id"]),
    policyId: nullableStr(row["policy_id"]),
    clientId: str(row["client_id"]),
    clientName,
    createdAt: str(row["created_at"]).slice(0, 10),
    isClientRoot: row["is_client_root"] === true,
  };
}

export function mapFile(row: Row, clientName: string): DocFile {
  return {
    id: str(row["id"]),
    name: str(row["name"]),
    folderId: str(row["folder_id"]),
    policyId: nullableStr(row["policy_id"]),
    clientId: str(row["client_id"]),
    clientName,
    mime: str(row["mime"]) || "application/octet-stream",
    sizeKB: typeof row["size_kb"] === "number" ? row["size_kb"] : 0,
    uploadedAt: str(row["uploaded_at"]).slice(0, 10),
    storagePath: nullableStr(row["storage_path"]),
  };
}
