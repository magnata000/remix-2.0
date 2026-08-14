export type DocFolder = {
  id: string;
  name: string;
  parentId: string | null;
  policyId: string | null;
  clientId: string;
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
  clientId: string;
  clientName: string;
  mime: string;
  sizeKB: number;
  uploadedAt: string;
  storagePath: string | null;
};

export type DocSearchHit = {
  file: DocFile;
  folder: DocFolder;
  rootFolder: DocFolder;
};

export type DocumentsData = {
  folders: DocFolder[];
  files: DocFile[];
};

export const DOCUMENTS_BUCKET = "client-documents";
