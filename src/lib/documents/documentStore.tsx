import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { policies } from "@/lib/mock/data";

export type DocFolder = {
  id: string;
  name: string;
  parentId: string | null; // null = raiz da apólice
  policyId: string;
  clientName: string;
  createdAt: string;
};

export type DocFile = {
  id: string;
  name: string;
  folderId: string;
  policyId: string;
  clientName: string;
  mime: string;
  sizeKB: number;
  uploadedAt: string;
};

type Ctx = {
  folders: DocFolder[];
  files: DocFile[];
  // queries
  rootFolderOf: (policyId: string) => DocFolder | undefined;
  childrenOf: (folderId: string) => DocFolder[];
  filesIn: (folderId: string) => DocFile[];
  countByPolicy: (policyId: string) => number;
  countByClient: (clientName: string) => number;
  // mutations
  createFolder: (input: { name: string; parentId: string; policyId: string; clientName: string }) => DocFolder;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  addFile: (input: { name: string; folderId: string; mime?: string; sizeKB?: number }) => DocFile | null;
  renameFile: (id: string, name: string) => void;
  deleteFile: (id: string) => void;
};

const DocCtx = createContext<Ctx | null>(null);

const today = () => new Date().toISOString().slice(0, 10);

function seed(): { folders: DocFolder[]; files: DocFile[] } {
  const folders: DocFolder[] = [];
  const files: DocFile[] = [];
  const defaults = ["Proposta", "Boletos", "Endossos"];
  policies.forEach((p, idx) => {
    const rootId = `f-root-${p.id}`;
    folders.push({
      id: rootId,
      name: p.number,
      parentId: null,
      policyId: p.id,
      clientName: p.clientName,
      createdAt: p.startDate,
    });
    defaults.forEach((name, j) => {
      const fid = `f-${p.id}-${j}`;
      folders.push({
        id: fid,
        name,
        parentId: rootId,
        policyId: p.id,
        clientName: p.clientName,
        createdAt: p.startDate,
      });
      // 1-2 arquivos fake por subpasta nas primeiras apólices
      if (idx < 8) {
        const n = (idx + j) % 2 === 0 ? 2 : 1;
        for (let k = 0; k < n; k++) {
          files.push({
            id: `file-${p.id}-${j}-${k}`,
            name: `${name.toLowerCase()}_${p.number}_${k + 1}.pdf`,
            folderId: fid,
            policyId: p.id,
            clientName: p.clientName,
            mime: "application/pdf",
            sizeKB: 120 + ((idx * 31 + j * 17 + k * 7) % 800),
            uploadedAt: p.startDate,
          });
        }
      }
    });
  });
  return { folders, files };
}

export function DocumentStoreProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(seed, []);
  const [folders, setFolders] = useState<DocFolder[]>(initial.folders);
  const [files, setFiles] = useState<DocFile[]>(initial.files);

  const rootFolderOf = useCallback(
    (policyId: string) => folders.find((f) => f.policyId === policyId && f.parentId === null),
    [folders],
  );

  const childrenOf = useCallback(
    (folderId: string) => folders.filter((f) => f.parentId === folderId),
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

  const createFolder = useCallback(
    (input: { name: string; parentId: string; policyId: string; clientName: string }) => {
      const folder: DocFolder = {
        id: `f-${Date.now()}`,
        name: input.name.trim() || "Nova pasta",
        parentId: input.parentId,
        policyId: input.policyId,
        clientName: input.clientName,
        createdAt: today(),
      };
      setFolders((arr) => [...arr, folder]);
      return folder;
    },
    [],
  );

  const renameFolder = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setFolders((arr) => arr.map((f) => (f.id === id ? { ...f, name: trimmed } : f)));
  }, []);

  const deleteFolder = useCallback((id: string) => {
    setFolders((arr) => {
      // não permitir excluir raiz
      const target = arr.find((f) => f.id === id);
      if (!target || target.parentId === null) return arr;
      // coletar descendentes recursivamente
      const toDelete = new Set<string>([id]);
      let changed = true;
      while (changed) {
        changed = false;
        arr.forEach((f) => {
          if (f.parentId && toDelete.has(f.parentId) && !toDelete.has(f.id)) {
            toDelete.add(f.id);
            changed = true;
          }
        });
      }
      setFiles((fs) => fs.filter((file) => !toDelete.has(file.folderId)));
      return arr.filter((f) => !toDelete.has(f.id));
    });
  }, []);

  const addFile = useCallback(
    (input: { name: string; folderId: string; mime?: string; sizeKB?: number }) => {
      const folder = folders.find((f) => f.id === input.folderId);
      if (!folder) return null;
      const file: DocFile = {
        id: `file-${Date.now()}`,
        name: input.name.trim() || "documento.pdf",
        folderId: folder.id,
        policyId: folder.policyId,
        clientName: folder.clientName,
        mime: input.mime ?? "application/pdf",
        sizeKB: input.sizeKB ?? 200,
        uploadedAt: today(),
      };
      setFiles((arr) => [file, ...arr]);
      return file;
    },
    [folders],
  );

  const renameFile = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setFiles((arr) => arr.map((f) => (f.id === id ? { ...f, name: trimmed } : f)));
  }, []);

  const deleteFile = useCallback((id: string) => {
    setFiles((arr) => arr.filter((f) => f.id !== id));
  }, []);

  const value: Ctx = {
    folders,
    files,
    rootFolderOf,
    childrenOf,
    filesIn,
    countByPolicy,
    countByClient,
    createFolder,
    renameFolder,
    deleteFolder,
    addFile,
    renameFile,
    deleteFile,
  };

  return <DocCtx.Provider value={value}>{children}</DocCtx.Provider>;
}

export function useDocumentStore() {
  const c = useContext(DocCtx);
  if (!c) throw new Error("useDocumentStore must be used within DocumentStoreProvider");
  return c;
}

export const formatFileSize = (kb: number) =>
  kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`;
