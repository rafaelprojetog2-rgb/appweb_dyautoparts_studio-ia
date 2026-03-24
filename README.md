# DY Auto Parts Ops - PWA

Sistema operacional enxuto para gestão de estoque, separação e conferência.

## Funcionalidades
- **Login**: 4 usuários fixos para operação rápida.
- **Produtos**: Consulta de estoque e preços com busca.
- **Separação**: Fluxo de separação por canais com bipagem simulada.
- **Conferência**: Validação de itens separados com status de divergência.
- **Inventário**: Contagem de estoque (Inicial, Parcial, Geral, Ajustes).
- **Offline First**: Funciona sem internet, salvando dados localmente.
- **Sincronização**: Fila de sincronização automática ao detectar conexão.

## Stack
- React + Vite + TypeScript
- Zustand (Estado Global + Persistência)
- Tailwind CSS
- React Router
- Lucide React (Ícones)
- Vite PWA Plugin

## Como usar
1. Selecione um usuário na tela inicial.
2. Navegue pelas opções do menu.
3. Utilize o campo de busca ou digite o código de barras (ex: `789101112001`) nas telas operacionais.
4. O status de conexão é exibido no cabeçalho.

## Estrutura de Pastas
- `src/components`: Componentes reutilizáveis.
- `src/pages`: Telas do sistema.
- `src/store`: Gerenciamento de estado com Zustand.
- `src/services`: Mock de dados e lógica de sincronização.
- `src/types.ts`: Definições de tipos TypeScript.
