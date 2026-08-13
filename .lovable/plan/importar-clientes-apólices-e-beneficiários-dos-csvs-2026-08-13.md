# Importar clientes, apólices e beneficiários dos CSVs

Objetivo: carregar no banco (hoje vazio: 0 clientes, 0 apólices) os 138 clientes, 152 apólices e 124 beneficiários enviados, preservando os IDs originais para manter os vínculos entre as três planilhas.

## O que os arquivos têm e o banco ainda não aceita

Verificado nos CSVs e no banco:

- **Corretores (assignee)**: as planilhas apontam para 3 responsáveis que não existem na equipe. Serão criados 3 membros "placeholder" (nome "Corretor importado 1/2/3", e-mail interno `importado-1@...`), depois você renomeia na página Configurações.
- **Seguradoras**: hoje o sistema aceita 5. Os CSVs trazem 15 — faltam Suhai, Amil, Tokio Marine, Azul, Prevent Sênior, MedSênior, São Cristóvão, Transmontano, São Miguel, Itaú Seguros, NotreDame, Aliro.
- **Ramos**: hoje 6. Os CSVs trazem também Embarcador, Transporte, Viagem, Porto RC Profissional, Tuba/Instrumento. "Plano de Saúde" será tratado como o ramo **Saúde** já existente (para manter as regras de vigência vitalícia e faixas etárias). 1 apólice sem ramo vai para **Auto** — nada é descartado (ajustável depois na tela).
- **Status**: `active`→ativa, `cancelled`→cancelada, `expired`→vencida (apólices); `active`→ativo, `lost`→inativo (clientes).

## Dados que ficarão vazios/neutros (nenhuma linha é descartada)

- CPF/CNPJ dos clientes: vazio em 100% das linhas → gravado como vazio.
- Número da apólice: vazio em 100% → gravado como `IMP-0001`, `IMP-0002`… (o campo é obrigatório e único).
- CPF dos beneficiários: não existe no arquivo → vazio.
- Telefone (10), e-mail (17) e data de nascimento (80) em branco → ficam vazios/nulos.
- Colunas `type` (PF/PJ) e `notes` não existem no cadastro atual e serão ignoradas.
- Títulos dos beneficiários convertidos: Titular→titular, Cônjuge→conjuge, Filho(a)→filho, Pai/Mãe→pai_mae, Outro→outro.

## Passos

1. **Migração**: adicionar os novos valores de seguradora e de ramo aos catálogos do banco.
2. **Carga de dados**: inserir os 3 corretores, 138 clientes, 152 apólices e 124 beneficiários, mantendo IDs e datas originais de criação.
3. **Código**: atualizar as listas de seguradoras/ramos no app (tipos e catálogos em `src/lib/mock/data.ts`, `insurerStore`, `branchStore`) para que os novos valores apareçam nos filtros e formulários sem quebrar a tipagem.
4. **Verificação**: conferir contagens no banco e abrir a Carteira no navegador para confirmar que clientes, apólices e beneficiários aparecem.

## Detalhes técnicos

- Enums estendidos via `ALTER TYPE ... ADD VALUE` (insurer, branch) em uma migração.
- Inserts gerados a partir dos CSVs com IDs originais (`policies.number` sintético para respeitar `NOT NULL`/`UNIQUE`).
- `comissao_liquida` e `taxa_imposto` usarão os defaults do banco; regras de comissão por apólice permanecem nulas (herdam a configuração da seguradora).
