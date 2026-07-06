# Correções na aba Quadro (Pipeline + Tarefas)

## Problema 1 — Botão de edição do card no Pipeline não abre modal de edição

Hoje, clicar no ícone de lápis do card em `KanbanModule.tsx` chama `setDetailId(t.id)`, que abre o **`OpportunityDetailDialog`** — um drawer de timeline/comentários com os campos apenas em leitura na coluna lateral. Não existe formulário de edição de oportunidade (só existe `NewOpportunityDialog`), então o usuário percebe corretamente que "o modal de edição não abre".

**Correção:** criar um `EditOpportunityDialog` espelhando o `NewOpportunityDialog` e ligar o botão de lápis a ele.

- Novo arquivo: `src/components/pipeline/EditOpportunityDialog.tsx`
  - Formulário com: título, cliente, ramo, valor estimado (aceitando `,` e `.`, arredondado a 2 casas), data de prazo, responsável, etapa.
  - Reaproveita os mesmos componentes/UI (`Dialog`, `Input`, `Select`, `DatePicker` existentes no `NewOpportunityDialog`).
  - Ao salvar, chama `usePipelineStore().updateOpportunity(id, patch)` (função já existente).
  - Cancelar fecha sem alterar.
- `KanbanModule.tsx`
  - Novo estado `editingId`.
  - Botão lápis (desktop + versão mobile) passa a chamar `setEditingId(t.id)` em vez de `setDetailId`.
  - Clique no corpo do card continua abrindo o drawer de detalhe (comportamento atual preservado).
  - Renderizar `<EditOpportunityDialog>` controlado por `editingId`.
- O botão de excluir e o drawer `OpportunityDetailDialog` continuam intactos.

## Problema 2 — Áudios abrem em nova aba em vez de tocar no chat

Todos os anexos, inclusive áudio (`audio/webm` gerado pelo `AudioRecorder`), são renderizados pelo `AttachmentChip` em `src/components/shared/Timeline.tsx` como `<a href={url} target="_blank">`, o que faz o navegador abrir uma guia com o player nativo.

**Correção:** detectar anexos de áudio e renderizar um player embutido estilo WhatsApp diretamente na bolha da mensagem, em ambas as abas (Pipeline usa `OpportunityDetailDialog`, Tarefas usam `TaskDetailDialog` — os dois consomem o mesmo `AttachmentChip`, então basta uma alteração).

- `src/components/shared/Timeline.tsx`
  - Nova função `isAudio(type) = type.startsWith("audio/")`.
  - Novo componente `AudioBubble` (usado dentro de `AttachmentChip` quando `isAudio(a.type)`):
    - `<audio src={a.url}>` interno controlado por `useRef` — nunca `target="_blank"`.
    - UI compacta: botão Play/Pause, barra de progresso clicável (seek), tempo decorrido / duração total, tamanho.
    - Apenas um áudio toca por vez: ao dar play, pausa qualquer outro `<audio>` já em reprodução (via evento `play` global) — comportamento típico do WhatsApp.
    - Estado local: `playing`, `currentTime`, `duration`, atualizados pelos eventos `timeupdate`, `loadedmetadata`, `ended`.
    - Cliques nos controles usam handlers síncronos no gesto do usuário (compatível com autoplay policies do navegador).
    - Botão "remover" (`onRemove`) continua funcionando quando fornecido.
  - `AttachmentChip` passa a delegar para `AudioBubble` quando o anexo é áudio; comportamento atual (link para abrir) permanece para arquivos e imagens.
- `TaskDetailDialog.tsx` (timeline row `kind === "attachment"`):
  - Também renderizar `AudioBubble` inline quando o anexo é áudio, em vez do link atual `<a target="_blank">`.
- `OpportunityDetailDialog.tsx` (mesmo ponto, timeline row `kind === "attachment"`):
  - Idem: usar `AudioBubble` quando áudio, link para os demais.

## Fora do escopo (não altero)

- Gravação de áudio (`AudioRecorder`) continua igual.
- Persistência dos anexos (`dataURL` no store local) continua igual.
- Nenhuma alteração no `opportunityStore` / `taskStore`, exceto o uso já existente de `updateOpportunity`.
- Demais funcionalidades da aba Quadro permanecem intactas.

## Critérios de aceite

- Clicar no lápis de um card do Pipeline abre um modal de edição com os campos preenchidos; salvar atualiza o card na coluna correta.
- Clicar no corpo do card continua abrindo o drawer de detalhe/timeline.
- Áudios enviados em comentários (Pipeline e Tarefas) são reproduzidos dentro da própria conversa, sem abrir nova aba, com play/pause, progresso e tempo.
- Anexos que não são áudio continuam abrindo normalmente.
