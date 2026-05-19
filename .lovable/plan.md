## Objetivo
No `TaskDetailDialog`, corrigir o corte visual da caixa de comentário e simplificar a anexação de arquivos, transformando-a num ícone discreto de clipe ao lado do botão de envio.

## Alterações em `src/components/tasks/TaskDetailDialog.tsx`

### 1. Remover a dropzone de arquivos
Remover o bloco `<div onDragOver=... className="mt-3 rounded-xl border-2 border-dashed ...">` inteiro (área "Arraste arquivos aqui ou / Selecionar"). O estado `dragOver` e seu `useState` também saem.

O `<input ref={fileInput} type="file" multiple hidden ... />` permanece (movido para junto do botão de clipe).

### 2. Adicionar ícone de clipe ao lado do enviar
Na barra de ação inferior (`<div className="mt-3 flex items-end gap-2">`), inserir entre o `MentionInput` e o botão de envio um novo botão:

- `Button` `variant="ghost"` `size="icon"` com `Paperclip` (já importado).
- `onClick={() => fileInput.current?.click()}`.
- Mesma altura/estilo do botão de envio (`rounded-xl`), cor `text-muted-foreground hover:text-foreground` para ficar sútil.
- Tooltip/`aria-label="Anexar arquivo"`.

O `<input>` hidden fica logo após esse botão, mantendo `onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}`.

### 3. Corrigir corte da caixa de texto
Causa: o `<section>` usa `flex flex-col overflow-hidden` e o `MentionInput` (textarea) com `rows={2}` + popover de menções extrapola o limite inferior do dialog quando a timeline cresce, fazendo a borda inferior aparecer cortada.

Correções mínimas:
- No container do input (`<div className="mt-3 flex items-end gap-2">`) adicionar `shrink-0 pb-1` para garantir que não seja comprimido pelo flex e tenha respiro inferior.
- No `MentionInput` wrapper (`<div className="flex-1">`), garantir `min-w-0` para não estourar largura.
- Conferir que o `DialogContent` mantenha `max-h-[85vh]` (já existe) e que a `<section>` tenha `min-h-0` para o `overflow-y-auto` da timeline funcionar sem empurrar o input para fora — adicionar `min-h-0` à `<section className="flex flex-col overflow-hidden border-l ...">`.

## Resultado esperado
- Caixa de comentário totalmente visível, sem corte na borda inferior, mesmo com timeline longa.
- Sem dropzone visível; anexar arquivos passa a ser feito por um discreto ícone de clipe ao lado do avião de papel (drag-and-drop direto no dialog sai do escopo desta tarefa).
