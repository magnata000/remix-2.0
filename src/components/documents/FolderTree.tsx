import { useMemo, useState, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Upload,
  FolderPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useDocumentStore,
  formatFileSize,
  type DocFolder,
  type DocFile,
} from "@/lib/documents/documentStore";
import { formatDateShort } from "@/lib/mock/data";
import { cn } from "@/lib/utils";

type Props = {
  /** Lista de pastas raiz a renderizar (uma por apólice). */
  rootFolders: DocFolder[];
  /** Mostrar nome da raiz como título do nó (true por padrão). */
  showRootNames?: boolean;
  /** Compacto: usado dentro de drawers. */
  dense?: boolean;
};

export function FolderTree({ rootFolders, showRootNames = true, dense = false }: Props) {
  const store = useDocumentStore();
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(rootFolders.map((f) => f.id)),
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    rootFolders[0]?.id ?? null,
  );
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<DocFolder | null>(null);
  const [newFolderParent, setNewFolderParent] = useState<DocFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadTo, setUploadTo] = useState<DocFolder | null>(null);
  const [uploadName, setUploadName] = useState("");

  // Garantir seleção válida quando rootFolders mudar
  useEffect(() => {
    if (selectedId && !store.folders.find((f) => f.id === selectedId)) {
      setSelectedId(rootFolders[0]?.id ?? null);
    }
  }, [store.folders, selectedId, rootFolders]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selected = useMemo(
    () => (selectedId ? store.folders.find((f) => f.id === selectedId) ?? null : null),
    [selectedId, store.folders],
  );

  const selectedFiles = useMemo(
    () => (selected ? store.filesIn(selected.id) : []),
    [selected, store],
  );

  const startRename = (folder: DocFolder) => {
    setRenaming(folder.id);
    setRenameValue(folder.name);
  };

  const commitRename = () => {
    if (renaming) store.renameFolder(renaming, renameValue);
    setRenaming(null);
  };

  return (
    <div className={cn("grid gap-4", dense ? "md:grid-cols-[260px_1fr]" : "md:grid-cols-[300px_1fr]")}>
      {/* Tree */}
      <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-muted/40">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Pastas
          </span>
          {selected && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setNewFolderParent(selected);
                setNewFolderName("");
              }}
            >
              <FolderPlus className="h-3.5 w-3.5 mr-1" /> Nova
            </Button>
          )}
        </div>
        <div className={cn("overflow-y-auto p-1", dense ? "max-h-[320px]" : "max-h-[520px]")}>
          {rootFolders.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Nenhuma pasta disponível.
            </div>
          ) : (
            <ul role="tree" className="space-y-0.5">
              {rootFolders.map((root) => (
                <TreeNode
                  key={root.id}
                  node={root}
                  depth={0}
                  expanded={expanded}
                  onToggle={toggle}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  renaming={renaming}
                  renameValue={renameValue}
                  onRenameChange={setRenameValue}
                  onRenameCommit={commitRename}
                  onRenameCancel={() => setRenaming(null)}
                  showRootName={showRootNames}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Painel direito */}
      <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col min-h-[280px]">
        <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 bg-muted/40">
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">Pasta selecionada</div>
            <div className="text-sm font-semibold truncate">
              {selected ? selected.name : "—"}
            </div>
          </div>
          {selected && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-lg"
                onClick={() => {
                  setUploadTo(selected);
                  setUploadName("");
                }}
              >
                <Upload className="h-3.5 w-3.5 mr-1" /> Upload
              </Button>
              {selected.parentId !== null && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    title="Renomear"
                    onClick={() => startRename(selected)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    title="Excluir"
                    onClick={() => setConfirmDelete(selected)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Selecione uma pasta para ver os arquivos.
            </div>
          ) : selectedFiles.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <p className="text-xs text-muted-foreground mt-2">Pasta vazia</p>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 h-8 text-xs"
                onClick={() => {
                  setUploadTo(selected);
                  setUploadName("");
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar arquivo
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {selectedFiles.map((file) => (
                <FileRow key={file.id} file={file} />
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Dialog: nova pasta */}
      <Dialog
        open={!!newFolderParent}
        onOpenChange={(o) => !o && setNewFolderParent(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova pasta</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Dentro de <span className="font-medium">{newFolderParent?.name}</span>
            </p>
            <Input
              autoFocus
              placeholder="Nome da pasta"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newFolderParent) {
                  const created = store.createFolder({
                    name: newFolderName,
                    parentId: newFolderParent.id,
                    policyId: newFolderParent.policyId,
                    clientName: newFolderParent.clientName,
                  });
                  setExpanded((prev) => new Set(prev).add(newFolderParent.id));
                  setSelectedId(created.id);
                  setNewFolderParent(null);
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderParent(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!newFolderParent) return;
                const created = store.createFolder({
                  name: newFolderName,
                  parentId: newFolderParent.id,
                  policyId: newFolderParent.policyId,
                  clientName: newFolderParent.clientName,
                });
                setExpanded((prev) => new Set(prev).add(newFolderParent.id));
                setSelectedId(created.id);
                setNewFolderParent(null);
              }}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: upload mock */}
      <Dialog open={!!uploadTo} onOpenChange={(o) => !o && setUploadTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar arquivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Em <span className="font-medium">{uploadTo?.name}</span>
            </p>
            <Input
              autoFocus
              placeholder="nome-do-arquivo.pdf"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Upload real estará disponível quando o backend for habilitado.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadTo(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!uploadTo) return;
                store.addFile({ name: uploadName, folderId: uploadTo.id });
                setUploadTo(null);
              }}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta?</AlertDialogTitle>
            <AlertDialogDescription>
              A pasta <span className="font-medium">{confirmDelete?.name}</span> e todo o seu
              conteúdo (subpastas e arquivos) serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) {
                  store.deleteFolder(confirmDelete.id);
                  setSelectedId(confirmDelete.parentId ?? rootFolders[0]?.id ?? null);
                }
                setConfirmDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type NodeProps = {
  node: DocFolder;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  renaming: string | null;
  renameValue: string;
  onRenameChange: (v: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  showRootName: boolean;
};

function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
  selectedId,
  onSelect,
  renaming,
  renameValue,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  showRootName,
}: NodeProps) {
  const store = useDocumentStore();
  const children = store.childrenOf(node.id);
  const fileCount = store.filesIn(node.id).length;
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const isRenaming = renaming === node.id;
  const hasChildren = children.length > 0;
  const isRoot = node.parentId === null;

  return (
    <li role="treeitem" aria-expanded={isOpen} aria-selected={isSelected}>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-lg px-1.5 py-1 cursor-pointer text-sm",
          isSelected ? "bg-brand/15 text-foreground" : "hover:bg-muted/60",
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={() => onSelect(node.id)}
      >
        <button
          type="button"
          className="h-5 w-5 flex items-center justify-center shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(node.id);
          }}
          aria-label={isOpen ? "Recolher" : "Expandir"}
        >
          {hasChildren ? (
            isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )
          ) : (
            <span className="h-3.5 w-3.5" />
          )}
        </button>
        {isOpen && hasChildren ? (
          <FolderOpen className="h-4 w-4 text-brand shrink-0" />
        ) : (
          <Folder className={cn("h-4 w-4 shrink-0", isRoot ? "text-brand" : "text-muted-foreground")} />
        )}
        {isRenaming ? (
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            onBlur={onRenameCommit}
            onKeyDown={(e) => {
              if (e.key === "Enter") onRenameCommit();
              else if (e.key === "Escape") onRenameCancel();
            }}
            className="h-6 px-1.5 text-sm"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={cn(
              "flex-1 truncate",
              isRoot && showRootName ? "font-semibold" : "",
            )}
            title={node.name}
          >
            {node.name}
          </span>
        )}
        {fileCount > 0 && !isRenaming && (
          <span className="text-[10px] text-muted-foreground tabular-nums">{fileCount}</span>
        )}
      </div>
      {isOpen && hasChildren && (
        <ul role="group" className="space-y-0.5">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedId={selectedId}
              onSelect={onSelect}
              renaming={renaming}
              renameValue={renameValue}
              onRenameChange={onRenameChange}
              onRenameCommit={onRenameCommit}
              onRenameCancel={onRenameCancel}
              showRootName={showRootName}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function FileRow({ file }: { file: DocFile }) {
  const store = useDocumentStore();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(file.name);

  return (
    <li className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/40">
      <div className="h-8 w-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
        <FileText className="h-4 w-4 text-brand" />
      </div>
      <div className="min-w-0 flex-1">
        {renaming ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              store.renameFile(file.id, name);
              setRenaming(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                store.renameFile(file.id, name);
                setRenaming(false);
              } else if (e.key === "Escape") {
                setName(file.name);
                setRenaming(false);
              }
            }}
            className="h-7 text-sm"
          />
        ) : (
          <div className="text-sm font-medium truncate">{file.name}</div>
        )}
        <div className="text-[11px] text-muted-foreground">
          {formatFileSize(file.sizeKB)} • {formatDateShort(file.uploadedAt)}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          title="Renomear"
          onClick={() => setRenaming(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive"
          title="Excluir"
          onClick={() => store.deleteFile(file.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}
