Remover o botão "Imprimir" do Drawer de Apólices.

### Alteração
- **`src/components/portfolio/PolicyDetailDrawer.tsx`**: remover o botão `<Button variant="outline" className="flex-1 rounded-xl">Imprimir</Button>` do bloco de ações inferiores do drawer.

### Notas
- O componente `Button` continuará sendo usado pelos botões de editar, excluir e renovar, então seu import permanece.
- O botão "Renovar" continua oculto para o ramo Saúde conforme regra já existente.