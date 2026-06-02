## Problema

`src/styles.css` quebra o transform do Vite (HTTP 500 em `/src/styles.css`), o que faz a página renderizar sem nenhum estilo (screenshot em anexo). A causa é o `@import url("https://fonts.googleapis.com/...")` dentro do CSS:

- Antes da última edição: vinha depois de `@import "tailwindcss"`, violando a regra do lightningcss de que `@import` precisa vir antes de qualquer outra regra.
- Depois da edição: foi para o topo, mas o lightningcss (usado pelo Tailwind v4) não busca URLs remotas — tenta `fs.readFileSync` na URL e falha com `ENOENT`.

Ou seja, **nenhuma posição do `@import url(...)` funciona** com a configuração atual. A fonte precisa ser carregada fora do CSS.

## Mudanças

### 1. `src/styles.css`
Remover a linha:
```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap");
```
Restaurar a ordem original:
```css
@import "tailwindcss" source(none);
@import "tw-animate-css";

@source "../src";
...
```

### 2. `src/routes/__root.tsx`
Adicionar as tags `<link>` do Google Fonts no `head()` do root route (com `preconnect` para performance), assim a fonte Inter é carregada pelo navegador, não pelo bundler CSS:

```ts
head: () => ({
  links: [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
    },
    // ...links existentes
  ],
  // ...meta existente
})
```
(Se já houver `links` no `head()`, apenas concatenar os 3 novos.)

## Validação

- Após o restart, `/src/styles.css` retorna 200 e a UI volta a renderizar com Tailwind/tema aplicados.
- Verificar nos logs do Vite que não há mais `Internal server error` em `vite:css`.
- Confirmar visualmente no preview que a fonte Inter aparece (em vez do serif default que está no screenshot).
