import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { mapFile, mapFolder, type Row } from "./documents.mapper";
import { DOCUMENTS_BUCKET, type DocFile, type DocFolder, type DocumentsData } from "./types";

/* --------------------------------------------------------------- leitura */

const PAGE = 1000;

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DocumentsData> => {
    const { supabase } = context;

    const fetchAll = async (table: "doc_folders" | "doc_files"): Promise<Row[]> => {
      const rows: Row[] = [];
      for (let page = 0; ; page += 1) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .order("id")
          .range(page * PAGE, page * PAGE + PAGE - 1);
        if (error) throw new Error(error.message);
        const chunk = (data ?? []) as Row[];
        rows.push(...chunk);
        if (chunk.length < PAGE) break;
      }
      return rows;
    };

    const [clients, folderRows, fileRows] = await Promise.all([
      supabase.from("clients").select("id, name"),
      fetchAll("doc_folders"),
      fetchAll("doc_files"),
    ]);
    if (clients.error) throw new Error(clients.error.message);

    const names = new Map<string, string>();
    (clients.data ?? []).forEach((c) => names.set(c.id, c.name));

    return {
      folders: folderRows.map((r) => mapFolder(r, names.get(String(r["client_id"])) ?? "")),
      files: fileRows.map((r) => mapFile(r, names.get(String(r["client_id"])) ?? "")),
    };
  });


export const getDocFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }): Promise<string | null> => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("doc_files")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const path = (row as Row | null)?.["storage_path"];
    if (typeof path !== "string" || !path) return null;
    const signed = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(path, 60 * 10);
    return signed.data?.signedUrl ?? null;
  });

/* --------------------------------------------------------------- pastas */

export const createDocFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; parentId: string }) => d)
  .handler(async ({ data, context }): Promise<DocFolder> => {
    const { supabase } = context;
    const parent = await supabase
      .from("doc_folders")
      .select("client_id, policy_id")
      .eq("id", data.parentId)
      .maybeSingle();
    if (parent.error) throw new Error(parent.error.message);
    if (!parent.data) throw new Error("Pasta pai não encontrada");

    const { data: row, error } = await supabase
      .from("doc_folders")
      .insert({
        name: data.name.trim() || "Nova pasta",
        parent_id: data.parentId,
        policy_id: parent.data.policy_id,
        client_id: parent.data.client_id,
        is_client_root: false,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapFolder(row as Row, "");
  });

export const renameDocFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; name: string }) => d)
  .handler(async ({ data, context }) => {
    const name = data.name.trim();
    if (!name) return { ok: false };
    const { error } = await context.supabase
      .from("doc_folders")
      .update({ name })
      .eq("id", data.id)
      .not("parent_id", "is", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const moveDocFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; newParentId: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("doc_folders")
      .update({ parent_id: data.newParentId })
      .eq("id", data.id)
      .not("parent_id", "is", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDocFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const all = await supabase.from("doc_folders").select("id, parent_id, is_client_root");
    if (all.error) throw new Error(all.error.message);
    const rows = (all.data ?? []) as Row[];
    const target = rows.find((r) => r["id"] === data.id);
    if (!target || target["parent_id"] === null) return { ok: false };

    const ids = new Set<string>([data.id]);
    let changed = true;
    while (changed) {
      changed = false;
      rows.forEach((r) => {
        const parent = r["parent_id"];
        const id = String(r["id"]);
        if (typeof parent === "string" && ids.has(parent) && !ids.has(id)) {
          ids.add(id);
          changed = true;
        }
      });
    }
    const list = [...ids];

    const files = await supabase
      .from("doc_files")
      .select("id, storage_path")
      .in("folder_id", list);
    if (files.error) throw new Error(files.error.message);
    const paths = ((files.data ?? []) as Row[])
      .map((r) => r["storage_path"])
      .filter((p): p is string => typeof p === "string" && !!p);
    if (paths.length) await supabase.storage.from(DOCUMENTS_BUCKET).remove(paths);

    const delFiles = await supabase.from("doc_files").delete().in("folder_id", list);
    if (delFiles.error) throw new Error(delFiles.error.message);
    const delFolders = await supabase.from("doc_folders").delete().in("id", list);
    if (delFolders.error) throw new Error(delFolders.error.message);
    return { ok: true };
  });

/* -------------------------------------------------------------- arquivos */

export const createDocFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      name: string;
      folderId: string;
      mime: string;
      sizeKB: number;
      storagePath: string;
    }) => d,
  )
  .handler(async ({ data, context }): Promise<DocFile> => {
    const { supabase } = context;
    const folder = await supabase
      .from("doc_folders")
      .select("client_id, policy_id")
      .eq("id", data.folderId)
      .maybeSingle();
    if (folder.error) throw new Error(folder.error.message);
    if (!folder.data) throw new Error("Pasta não encontrada");

    const { data: row, error } = await supabase
      .from("doc_files")
      .insert({
        name: data.name,
        folder_id: data.folderId,
        policy_id: folder.data.policy_id,
        client_id: folder.data.client_id,
        storage_path: data.storagePath,
        mime: data.mime,
        size_kb: data.sizeKB,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapFile(row as Row, "");
  });

export const renameDocFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; name: string }) => d)
  .handler(async ({ data, context }) => {
    const name = data.name.trim();
    if (!name) return { ok: false };
    const { error } = await context.supabase.from("doc_files").update({ name }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const moveDocFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; newFolderId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const folder = await supabase
      .from("doc_folders")
      .select("policy_id")
      .eq("id", data.newFolderId)
      .maybeSingle();
    if (folder.error) throw new Error(folder.error.message);
    if (!folder.data) return { ok: false };
    const { error } = await supabase
      .from("doc_files")
      .update({ folder_id: data.newFolderId, policy_id: folder.data.policy_id })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDocFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row } = await supabase
      .from("doc_files")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    const path = (row as Row | null)?.["storage_path"];
    if (typeof path === "string" && path) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]);
    }
    const { error } = await supabase.from("doc_files").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDocsByPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { policyId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const files = await supabase
      .from("doc_files")
      .select("storage_path")
      .eq("policy_id", data.policyId);
    if (files.error) throw new Error(files.error.message);
    const paths = ((files.data ?? []) as Row[])
      .map((r) => r["storage_path"])
      .filter((p): p is string => typeof p === "string" && !!p);
    if (paths.length) await supabase.storage.from(DOCUMENTS_BUCKET).remove(paths);

    const delFiles = await supabase.from("doc_files").delete().eq("policy_id", data.policyId);
    if (delFiles.error) throw new Error(delFiles.error.message);
    const delFolders = await supabase.from("doc_folders").delete().eq("policy_id", data.policyId);
    if (delFolders.error) throw new Error(delFolders.error.message);
    return { ok: true };
  });
