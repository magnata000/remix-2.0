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
  parentId: string | null; // null = raiz (cliente ou apólice)
  policyId: string | null; // null quando é raiz "Geral do Cliente"
  clientName: string;
  createdAt: string;
  /** Raiz fixa "Geral do Cliente" (não renomeável/removível). */
  isClientRoot?: boolean;
};

export type DocFile = {
  id: string;
  name: string;
  folderId: string;
  policyId: string | null;
  clientName: string;
  mime: string;
  sizeKB: number;
  uploadedAt: string;
};

export type DocSearchHit = {
  file: DocFile;
  folder: DocFolder;
  rootFolder: DocFolder;
};

type Ctx = {
  folders: DocFolder[];
  files: DocFile[];
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
  createFolder: (input: {
    name: string;
    parentId: string;
    policyId: string | null;
    clientName: string;
  }) => DocFolder;
  ensurePolicyRoots: (input: {
    policyId: string;
    policyNumber: string;
    branch: string;
    clientName: string;
    startDate?: string;
  }) => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  moveFolder: (id: string, newParentId: string) => boolean;
  addFile: (input: { name: string; folderId: string; mime?: string; sizeKB?: number }) => DocFile | null;
  renameFile: (id: string, name: string) => void;
  deleteFile: (id: string) => void;
};


const DocCtx = createContext<Ctx | null>(null);

const today = () => new Date().toISOString().slice(0, 10);

type ProductKind = "Saúde" | "Seguros" | "Consórcio";

function productOf(branch: string): ProductKind {
  if (branch === "Saúde") return "Saúde";
  if (branch === "Consórcio") return "Consórcio";
  return "Seguros";
}

function rootNameFor(branch: string, policyNumber: string): string {
  return `${productOf(branch)} · Apólice ${policyNumber} — ${branch}`;
}

function yearOf(iso?: string): string {
  if (iso && /^\d{4}/.test(iso)) return iso.slice(0, 4);
  return String(new Date().getFullYear());
}

/**
 * Template tree (sub-folders only — root already exists).
 * Each item: [name, children]. ID is composed by caller.
 */
type TreeNode = [string, TreeNode[]];

const SAUDE_TREE: TreeNode[] = [
  ["Documentação Preliminar", [
    ["Empresa", []],
    ["Titular", []],
    ["Beneficiários", []],
    ["Cartas de Permanência e Carteirinhas", []],
    ["Documentação Complementar", []],
    ["Informações Pessoais", []],
  ]],
  ["Pós-venda", [
    ["Acesso", []],
    ["Cotações", []],
    ["Proposta Contratada", []],
    ["Demonstrativos", []],
    ["Outros", []],
  ]],
];

const SEGUROS_YEAR_TREE: TreeNode[] = [
  ["Boletos", []],
  ["Cotações", []],
  ["Endossos", []],
  ["Proposta Contratada", []],
];

const CONSORCIO_TREE: TreeNode[] = [
  ["Geral", []],
];

function expandTree(
  nodes: TreeNode[],
  parentId: string,
  ctx: { policyId: string; clientName: string; createdAt: string; prefix: string },
): DocFolder[] {
  const out: DocFolder[] = [];
  nodes.forEach(([name, children], i) => {
    const id = `${ctx.prefix}-${i}-${name.replace(/[^a-z0-9]+/gi, "").slice(0, 12)}`;
    out.push({
      id,
      name,
      parentId,
      policyId: ctx.policyId,
      clientName: ctx.clientName,
      createdAt: ctx.createdAt,
    });
    if (children.length) {
      out.push(...expandTree(children, id, { ...ctx, prefix: id }));
    }
  });
  return out;
}

function seed(): { folders: DocFolder[]; files: DocFile[] } {
  const folders: DocFolder[] = [];
  const files: DocFile[] = [];

  // 1) "Geral do Cliente" para cada cliente único
  const clientsSeen = new Set<string>();
  policies.forEach((p) => {
    if (clientsSeen.has(p.clientName)) return;
    clientsSeen.add(p.clientName);
    folders.push({
      id: `f-client-${p.clientName}`,
      name: "Geral do Cliente",
      parentId: null,
      policyId: null,
      clientName: p.clientName,
      createdAt: p.startDate,
      isClientRoot: true,
    });
  });

  // 2) raiz por apólice + template específico do produto
  policies.forEach((p, idx) => {
    const rootId = `f-root-${p.id}`;
    folders.push({
      id: rootId,
      name: rootNameFor(p.branch, p.number),
      parentId: null,
      policyId: p.id,
      clientName: p.clientName,
      createdAt: p.startDate,
    });

    const product = productOf(p.branch);
    const ctxBase = {
      policyId: p.id,
      clientName: p.clientName,
      createdAt: p.startDate,
    };

    let subfolders: DocFolder[] = [];
    if (product === "Saúde") {
      subfolders = expandTree(SAUDE_TREE, rootId, { ...ctxBase, prefix: `f-${p.id}` });
    } else if (product === "Consórcio") {
      subfolders = expandTree(CONSORCIO_TREE, rootId, { ...ctxBase, prefix: `f-${p.id}` });
    } else {
      // Seguros: pasta do ano vigente com subpastas
      const year = yearOf(p.startDate);
      const yearId = `f-${p.id}-${year}`;
      subfolders.push({
        id: yearId,
        name: year,
        parentId: rootId,
        policyId: p.id,
        clientName: p.clientName,
        createdAt: p.startDate,
      });
      subfolders.push(
        ...expandTree(SEGUROS_YEAR_TREE, yearId, { ...ctxBase, prefix: yearId }),
      );
    }
    folders.push(...subfolders);

    // arquivos fake leves nas folhas das primeiras apólices
    if (idx < 6) {
      const leaves = subfolders.filter(
        (f) => !subfolders.some((c) => c.parentId === f.id),
      );
      leaves.slice(0, 2).forEach((leaf, k) => {
        files.push({
          id: `file-${p.id}-${leaf.id}-${k}`,
          name: `${leaf.name.toLowerCase().replace(/\s+/g, "_")}_${p.number}.pdf`,
          folderId: leaf.id,
          policyId: p.id,
          clientName: p.clientName,
          mime: "application/pdf",
          sizeKB: 120 + ((idx * 31 + k * 17) % 800),
          uploadedAt: p.startDate,
        });
      });
    }
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

  const clientRootOf = useCallback(
    (clientName: string) =>
      folders.find((f) => f.isClientRoot && f.clientName === clientName),
    [folders],
  );

  const rootFoldersByClient = useCallback(
    (clientName: string) => {
      const roots = folders.filter((f) => f.parentId === null && f.clientName === clientName);
      // "Geral do Cliente" primeiro, depois apólices por nome
      return roots.sort((a, b) => {
        if (a.isClientRoot && !b.isClientRoot) return -1;
        if (!a.isClientRoot && b.isClientRoot) return 1;
        return a.name.localeCompare(b.name, "pt-BR");
      });
    },
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

  const findFolder = useCallback(
    (id: string) => folders.find((f) => f.id === id),
    [folders],
  );

  const searchFilesByClient = useCallback(
    (clientName: string, query: string): DocSearchHit[] => {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      const rootOfFolder = (folderId: string): DocFolder | undefined => {
        let cur = folders.find((f) => f.id === folderId);
        while (cur && cur.parentId) {
          cur = folders.find((f) => f.id === cur!.parentId);
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

  const createFolder = useCallback(
    (input: { name: string; parentId: string; policyId: string | null; clientName: string }) => {
      const folder: DocFolder = {
        id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

  const ensurePolicyRoots = useCallback(
    (input: {
      policyId: string;
      policyNumber: string;
      branch: string;
      clientName: string;
      startDate?: string;
    }) => {
      setFolders((arr) => {
        const next = [...arr];
        const hasClientRoot = next.some((f) => f.isClientRoot && f.clientName === input.clientName);
        if (!hasClientRoot) {
          next.push({
            id: `f-client-${input.clientName}-${Date.now()}`,
            name: "Geral do Cliente",
            parentId: null,
            policyId: null,
            clientName: input.clientName,
            createdAt: today(),
            isClientRoot: true,
          });
        }

        const product = productOf(input.branch);
        const createdAt = today();
        const ctxBase = {
          policyId: input.policyId,
          clientName: input.clientName,
          createdAt,
        };

        let rootId = next.find(
          (f) => f.parentId === null && f.policyId === input.policyId,
        )?.id;

        if (!rootId) {
          rootId = `f-root-${input.policyId}`;
          next.push({
            id: rootId,
            name: rootNameFor(input.branch, input.policyNumber),
            parentId: null,
            policyId: input.policyId,
            clientName: input.clientName,
            createdAt,
          });

          if (product === "Saúde") {
            next.push(...expandTree(SAUDE_TREE, rootId, { ...ctxBase, prefix: `f-${input.policyId}` }));
          } else if (product === "Consórcio") {
            next.push(...expandTree(CONSORCIO_TREE, rootId, { ...ctxBase, prefix: `f-${input.policyId}` }));
          } else {
            const year = yearOf(input.startDate);
            const yearId = `f-${input.policyId}-${year}`;
            next.push({
              id: yearId,
              name: year,
              parentId: rootId,
              policyId: input.policyId,
              clientName: input.clientName,
              createdAt,
            });
            next.push(...expandTree(SEGUROS_YEAR_TREE, yearId, { ...ctxBase, prefix: yearId }));
          }
        } else if (product === "Seguros") {
          // Renovação: adicionar pasta do ano vigente se ainda não existir
          const year = yearOf(input.startDate);
          const hasYear = next.some(
            (f) => f.parentId === rootId && f.policyId === input.policyId && f.name === year,
          );
          if (!hasYear) {
            const yearId = `f-${input.policyId}-${year}-${Date.now()}`;
            next.push({
              id: yearId,
              name: year,
              parentId: rootId,
              policyId: input.policyId,
              clientName: input.clientName,
              createdAt,
            });
            next.push(...expandTree(SEGUROS_YEAR_TREE, yearId, { ...ctxBase, prefix: yearId }));
          }
        }
        return next;
      });
    },
    [],
  );




  const renameFolder = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setFolders((arr) =>
      arr.map((f) => {
        if (f.id !== id) return f;
        // bloquear renomear raízes (cliente ou apólice)
        if (f.parentId === null) return f;
        return { ...f, name: trimmed };
      }),
    );
  }, []);

  const deleteFolder = useCallback((id: string) => {
    setFolders((arr) => {
      const target = arr.find((f) => f.id === id);
      if (!target || target.parentId === null) return arr; // não excluir raízes
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

  const moveFolder = useCallback((id: string, newParentId: string): boolean => {
    if (id === newParentId) return false;
    let ok = false;
    setFolders((arr) => {
      const target = arr.find((f) => f.id === id);
      const parent = arr.find((f) => f.id === newParentId);
      if (!target || !parent) return arr;
      if (target.parentId === null) return arr; // não mover raízes
      if (target.clientName !== parent.clientName) return arr;
      if ((target.policyId ?? null) !== (parent.policyId ?? null)) return arr;
      if (target.parentId === newParentId) return arr;
      // impedir ciclo: newParent não pode ser descendente do target
      const descendants = new Set<string>([id]);
      let changed = true;
      while (changed) {
        changed = false;
        arr.forEach((f) => {
          if (f.parentId && descendants.has(f.parentId) && !descendants.has(f.id)) {
            descendants.add(f.id);
            changed = true;
          }
        });
      }
      if (descendants.has(newParentId)) return arr;
      ok = true;
      return arr.map((f) => (f.id === id ? { ...f, parentId: newParentId } : f));
    });
    return ok;
  }, []);

  const addFile = useCallback(
    (input: { name: string; folderId: string; mime?: string; sizeKB?: number }) => {
      const folder = folders.find((f) => f.id === input.folderId);
      if (!folder) return null;
      const file: DocFile = {
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
    clientRootOf,
    rootFoldersByClient,
    childrenOf,
    filesIn,
    countByPolicy,
    countByClient,
    searchFilesByClient,
    findFolder,
    createFolder,
    ensurePolicyRoots,

    renameFolder,
    deleteFolder,
    moveFolder,
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
