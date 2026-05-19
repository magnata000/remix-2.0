## Objetivo
1. Impedir menção duplicada do mesmo colaborador na mesma caixa de texto.
2. Adicionar opção especial **@Todos** no topo da lista de sugestões, que representa todos os colaboradores.

## Alterações em `src/components/tasks/MentionInput.tsx`

### Detectar menções já presentes
Helper local que extrai os nomes já mencionados a partir do `value` atual, ignorando o trecho da menção em digitação (do `@` em `mentionStart` até o cursor):

```ts
const mentionedNames = useMemo(() => {
  const scan = mentionStart != null
    ? value.slice(0, mentionStart) + value.slice((ref.current?.selectionStart ?? value.length))
    : value;
  const set = new Set<string>();
  // match @Nome ou @Nome Sobrenome (até 2 palavras), seguido por fim/espaço/pontuação
  const re = /@([A-Za-zÀ-ÿ]+(?:\s[A-Za-zÀ-ÿ]+)?)(?=\s|$|[.,;:!?])/g;
  const known = new Set<string>(["Todos", ...team.map(m => m.name)]);
  let m: RegExpExecArray | null;
  while ((m = re.exec(scan))) {
    // tenta forma completa "Nome Sobrenome", senão cai para "Nome"
    if (known.has(m[1])) set.add(m[1]);
    else {
      const first = m[1].split(" ")[0];
      if (known.has(first)) set.add(first);
    }
  }
  return set;
}, [value, mentionStart]);
```

### Lista filtrada com opção "Todos"
Substituir o atual `filtered` por uma estrutura unificada `options: { id, name, role }[]`:

```ts
const ALL_OPTION = { id: "__all__", name: "Todos", role: "Toda a corretora" };
const hasAll = mentionedNames.has("Todos");

const baseOptions = [ALL_OPTION, ...team.map(t => ({ id: t.id, name: t.name, role: t.role }))];

const options = baseOptions
  .filter(o => o.name.toLowerCase().includes(query.toLowerCase()))
  .filter(o => {
    if (hasAll) return false;                // @Todos já cobre tudo → some todas as sugestões
    return !mentionedNames.has(o.name);      // remove já mencionados
  })
  .slice(0, 6);
```

- Quando `options.length === 0`, mantém o estado vazio "Nenhum colaborador encontrado" (mensagem ajustada para "Nenhuma menção disponível" quando filtro vazio por já-mencionados).
- `hoverIndex` continua trabalhando sobre `options`; `insertMention(name)` permanece igual — `@Todos ` é inserido como qualquer outro nome.
- A opção "Todos" recebe um leve destaque visual (avatar com ícone `Users` em vez de iniciais) para diferenciá-la dos colaboradores reais.

### Render visual da opção Todos
Pequeno ajuste no `map(options)`:
- Se `o.id === "__all__"`: avatar renderiza ícone `Users` (lucide-react) sobre `bg-brand` + texto "Todos" com `font-semibold`.
- Demais: comportamento atual (iniciais + nome + role).

## Alteração em `renderMentions` (mesmo arquivo)
Reconhecer `@Todos` como menção válida, com mesmo estilo do brand:

```ts
const KNOWN = new Set<string>(["Todos", ...team.map(m => m.name)]);
const parts = text.split(/(@[A-Za-zÀ-ÿ]+(?:\s[A-Za-zÀ-ÿ]+)?)/g);
return parts.map((p, i) =>
  p.startsWith("@") && KNOWN.has(p.slice(1))
    ? <strong key={i} className="text-brand font-semibold">{p}</strong>
    : <span key={i}>{p}</span>
);
```

## Fora de escopo
- Não dispara notificação real para "Todos" (UI apenas, igual às demais menções).
- Não toca em `taskStore`, `TaskDetailDialog` nem em outros componentes — toda a lógica fica encapsulada em `MentionInput`.
- Comportamento na edição de comentários (`CommentBubble`) herda automaticamente as mudanças, pois usa o mesmo `MentionInput`.
