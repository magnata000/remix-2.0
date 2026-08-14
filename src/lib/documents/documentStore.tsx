/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  createDocFile,
  createDocFolder,
  deleteDocFile,
  deleteDocFolder,
  deleteDocsByPolicy,
  getDocFileUrl,
  listDocuments,
  moveDocFile,
  moveDocFolder,
  renameDocFile,
  renameDocFolder,
} from "./documents.functions";
import { DOCUMENTS_BUCKET, type DocFile, type DocFolder, type DocSearchHit } from "./types";

export type { DocFile, DocFolder, DocSearchHit } from "./types";

type Ctx = {
  folders: DocFolder[];
  files: DocFile[];
  loading: boolean;
  // queries
  rootFolderOf: (policyId: string) => DocFolder | undefined;
  clientRootOf: (clientName: string) => DocFolder | undefined;
  rootFoldersByClient: (clientName: string) => DocFolder[];
  childrenOf: (folderId: string) => DocFolder[];
  filesIn: (folderId: string) => DocFile[];
  countByPolicy: (policyId: string) => number;
  countByClient: (clientName: string) => number;
  searchFilesByClient: (clientName: string, query: string) => DocSearchHit[];
  findFolder: (id: string) => DocFolder | undefined;
  // mutations
  createFolder: (input: { name: string; parentId: string }) => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  moveFolder: (id: string, newParentId: string) => boolean;
  uploadFile: (input: { file: File; folderId: string }) => Promise<void>;
  renameFile: (id: string, name: string) => void;
  deleteFile: (id: string) => void;
  moveFile: (id: string, newFolderId: string) => boolean;
  openFile: (id: string) => Promise<void>;
  deleteByPolicy: (policyId: string) => void;
  refresh: () => void;
};

const DocCtx = createContext<Ctx | null>(null);
const QK = ["documents"] as const;

export function DocumentStoreProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listDocuments);
  const createFolderFn = useServerFn(createDocFolder);
  const renameFolderFn = useServerFn(renameDocFolder);
  const deleteFolderFn = useServerFn(deleteDocFolder);
  const moveFolderFn = useServerFn(moveDocFolder);
  const createFileFn = useServerFn(createDocFile);
  const renameFileFn = useServerFn(renameDocFile);
  const deleteFileFn = useServerFn(deleteDocFile);
  const moveFileFn = useServerFn(moveDocFile);
  const fileUrlFn = useServerFn(getDocFileUrl);
  const deleteByPolicyFn = useServerFn(deleteDocsByPolicy);

  const { data, isLoading } = useQuery({
    queryKey: QK,
    queryFn: () => fetchAll(),
    staleTime: 30_000,
  });

  const folders = data?.folders ?? [];
  const files = data?.files ?? [];

  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: QK });
  }, [qc]);

  const opts = { onSuccess: invalidate };

  const mCreateFolder = useMutation({
    mutationFn: (input: { name: string; parentId: string }) => createFolderFn({ data: input }),
    ...opts,
  });
  const mRenameFolder = useMutation({
    mutationFn: (input: { id: string; name: string }) => renameFolderFn({ data: input }),
    ...opts,
  });
  const mDeleteFolder = useMutation({
    mutationFn: (input: { id: string }) => deleteFolderFn({ data: input }),
    ...opts,
  });
  const mMoveFolder = useMutation({
    mutationFn: (input: { id: string; newParentId: string }) => moveFolderFn({ data: input }),
    ...opts,
  });
  const mRenameFile = useMutation({
    mutationFn: (input: { id: string; name: string }) => renameFileFn({ data: input }),
    ...opts,
  });
  const mDeleteFile = useMutation({
    mutationFn: (input: { id: string }) => deleteFileFn({ data: input }),
    ...opts,
  });
  const mMoveFile = useMutation({
    mutationFn: (input: { id: string; newFolderId: string }) => moveFileFn({ data: input }),
    ...opts,
  });
  const mDeleteByPolicy = useMutation({
    mutationFn: (input: { policyId: string }) => deleteByPolicyFn({ data: input }),
    ...opts,
  });


  /* ------------------------------------------------------------- queries */

  const rootFolderOf = useCallback(
    (policyId: string) => folders.find((f) => f.policyId === policyId && f.parentId === null),
    [folders],
  );

  const clientRootOf = useCallback(
    (clientName: string) => folders.find((f) => f.isClientRoot && f.clientName === clientName),
    [folders],
  );

  const rootFoldersByClient = useCallback(
    (clientName: string) => {
      const roots = folders.filter((f) => f.parentId === null && f.clientName === clientName);
      return roots.sort((a, b) => {
        if (a.isClientRoot && !b.isClientRoot) return -1;
        if (!a.isClientRoot && b.isClientRoot) return 1;
        return a.name.localeCompare(b.name, "pt-BR");
      });
    },
    [folders],
  );

  const childrenOf = useCallback(
    (folderId: string) =>
      folders
        .filter((f) => f.parentId === folderId)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [folders],
  );

  const filesIn = useCallback(
    (folderId: string) => files.filter((f) => f.folderId === folderId),
    [files],
  );

  const countByPolicy = useCallback(
    (policyId: string) => files.filter((f) => f.policyId === policyId).length,
    [files],
  );

  const countByClient = useCallback(
    (clientName: string) => files.filter((f) => f.clientName === clientName).length,
    [files],
  );

  const findFolder = useCallback((id: string) => folders.find((f) => f.id === id), [folders]);

  const searchFilesByClient = useCallback(
    (clientName: string, query: string): DocSearchHit[] => {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      const rootOfFolder = (folderId: string): DocFolder | undefined => {
        let cur = folders.find((f) => f.id === folderId);
        while (cur && cur.parentId) {
          const parentId: string = cur.parentId;
          cur = folders.find((f) => f.id === parentId);
        }
        return cur;
      };
      const hits: DocSearchHit[] = [];
      files.forEach((file) => {
        if (file.clientName !== clientName) return;
        if (!file.name.toLowerCase().includes(q)) return;
        const folder = folders.find((f) => f.id === file.folderId);
        const root = rootOfFolder(file.folderId);
        if (folder && root) hits.push({ file, folder, rootFolder: root });
      });
      return hits.slice(0, 50);
    },
    [folders, files],
  );

  /* ----------------------------------------------------------- mutations */

  const createFolder = useCallback(
    (input: { name: string; parentId: string }) => mCreateFolder.mutate(input),
    [mCreateFolder],
  );

  const renameFolder = useCallback(
    (id: string, name: string) => {
      const folder = folders.find((f) => f.id === id);
      if (!folder || folder.parentId === null || !name.trim()) return;
      mRenameFolder.mutate({ id, name });
    },
    [folders, mRenameFolder],
  );

  const deleteFolder = useCallback(
    (id: string) => {
      const folder = folders.find((f) => f.id === id);
      if (!folder || folder.parentId === null) return;
      mDeleteFolder.mutate({ id });
    },
    [folders, mDeleteFolder],
  );

  const moveFolder = useCallback(
    (id: string, newParentId: string): boolean => {
      if (id === newParentId) return false;
      const target = folders.find((f) => f.id === id);
      const parent = folders.find((f) => f.id === newParentId);
      if (!target || !parent) return false;
      if (target.parentId === null) return false;
      if (target.clientId !== parent.clientId) return false;
      if ((target.policyId ?? null) !== (parent.policyId ?? null)) return false;
      if (target.parentId === newParentId) return false;

      const descendants = new Set<string>([id]);
      let changed = true;
      while (changed) {
        changed = false;
        folders.forEach((f) => {
          if (f.parentId && descendants.has(f.parentId) && !descendants.has(f.id)) {
            descendants.add(f.id);
            changed = true;
          }
        });
      }
      if (descendants.has(newParentId)) return false;

      mMoveFolder.mutate({ id, newParentId });
      return true;
    },
    [folders, mMoveFolder],
  );

  const uploadFile = useCallback(
    async ({ file, folderId }: { file: File; folderId: string }) => {
      const folder = folders.find((f) => f.id === folderId);
      if (!folder) return;
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${folder.clientId}/${folderId}/${crypto.randomUUID()}-${safe}`;
      const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (error) throw new Error(error.message);
      await createFileFn({
        data: {
          name: file.name,
          folderId,
          mime: file.type || "application/octet-stream",
          sizeKB: Math.max(1, Math.round(file.size / 1024)),
          storagePath: path,
        },
      });
      invalidate();
    },
    [folders, createFileFn, invalidate],
  );

  const renameFile = useCallback(
    (id: string, name: string) => {
      if (!name.trim()) return;
      mRenameFile.mutate({ id, name });
    },
    [mRenameFile],
  );

  const deleteFile = useCallback((id: string) => mDeleteFile.mutate({ id }), [mDeleteFile]);

  const moveFile = useCallback(
    (id: string, newFolderId: string): boolean => {
      const file = files.find((f) => f.id === id);
      const parent = folders.find((f) => f.id === newFolderId);
      if (!file || !parent || file.folderId === newFolderId) return false;
      if (parent.clientId !== file.clientId) return false;
      mMoveFile.mutate({ id, newFolderId });
      return true;
    },
    [files, folders, mMoveFile],
  );

  const openFile = useCallback(
    async (id: string) => {
      const url = await fileUrlFn({ data: { id } });
      if (url) window.open(url, "_blank", "noopener");
    },
    [fileUrlFn],
  );

  const deleteByPolicy = useCallback(
    (policyId: string) => mDeleteByPolicy.mutate({ policyId }),
    [mDeleteByPolicy],
  );

  const value = useMemo<Ctx>(
    () => ({
      folders,
      files,
      loading: isLoading,
      rootFolderOf,
      clientRootOf,
      rootFoldersByClient,
      childrenOf,
      filesIn,
      countByPolicy,
      countByClient,
      searchFilesByClient,
      findFolder,
      createFolder,
      renameFolder,
      deleteFolder,
      moveFolder,
      uploadFile,
      renameFile,
      deleteFile,
      moveFile,
      openFile,
      deleteByPolicy,
      refresh: invalidate,
    }),
    [
      folders,
      files,
      isLoading,
      rootFolderOf,
      clientRootOf,
      rootFoldersByClient,
      childrenOf,
      filesIn,
      countByPolicy,
      countByClient,
      searchFilesByClient,
      findFolder,
      createFolder,
      renameFolder,
      deleteFolder,
      moveFolder,
      uploadFile,
      renameFile,
      deleteFile,
      moveFile,
      openFile,
      deleteByPolicy,
      invalidate,
    ],
  );

  return <DocCtx.Provider value={value}>{children}</DocCtx.Provider>;
}

export function useDocumentStore(): Ctx {
  const ctx = useContext(DocCtx);
  if (!ctx) throw new Error("useDocumentStore deve ser usado dentro de DocumentStoreProvider");
  return ctx;
}

export function formatFileSize(sizeKB: number): string {
  if (sizeKB < 1024) return `${sizeKB} KB`;
  return `${(sizeKB / 1024).toFixed(1)} MB`;
}
