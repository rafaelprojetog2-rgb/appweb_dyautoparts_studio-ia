export interface User {
  id: number;
  nome: string;
  usuario: string;
  perfil: string;
  status: string;
}

export interface Menu {
  id: number;
  nome: string;
  chave: string;
  ordem: number;
  status: string;
}

export interface Channel {
  id: number;
  nome: string;
  chave: string;
  status: string;
}

export interface Product {
  id_interno: string;
  ean: string;
  sku_fornecedor: string;
  descricao_base: string;
  marca: string;
  cor: string;
  categoria: string;
  subcategoria: string;
  atributo1?: string;
  valor1?: string;
  atributo2?: string;
  valor2?: string;
  atributo3?: string;
  valor3?: string;
  atributo4?: string;
  valor4?: string;
  unidade: string;
  preco_custo?: number;
  preco_varejo: number;
  preco_atacado: number;
  qtd_minima_atacado: number;
  status: string;
  observacoes?: string;
  url_imagem?: string;
  url_pdf_manual?: string;
  descricao_completa?: string;
  estoque_terreo: number;
  estoque_1andar: number;
  estoque_defeito: number;
  estoque_mostruario: number;
}

export interface LampKit {
  montadora: string;
  modelo: string;
  ano_inicio: string;
  ano_fim: string;
  baixo: string;
  alto: string;
  neblina: string;
  lanterna_pingo: string;
  url: string;
}

export interface PickingItem {
  rom_id: string;
  id_interno: string;
  ean: string;
  descricao: string;
  qtd_solicitada: number;
  qtd_separada: number;
  qtd_conferida: number;
}

export interface Picking {
  rom_id: string;
  canal_id: string;
  canal_nome: string;
  status: 'pendente' | 'separando' | 'separado' | 'conferindo' | 'conferido' | 'divergente' | 'corrigido';
  criado_por: string;
  criado_em: string;
  finalizado_em?: string;
  observacao?: string;
  items: PickingItem[];
  conferido_por?: string;
  conferido_em?: string;
}

export interface InventoryMaster {
  inventario_id: string;
  tipo: 'geral' | 'inicial' | 'parcial' | 'ajuste';
  filtro: string;
  data_inicio: string;
  data_fim?: string;
  status: 'aberto' | 'em_andamento' | 'finalizado' | 'cancelado';
  criado_por: string;
  total_skus: number;
  total_itens_contados: number;
  total_divergencias: number;
  valor_ajuste_positivo: number;
  valor_ajuste_negativo: number;
}

export interface InventoryItem {
  inventario_id: string;
  id_interno: string;
  local: string;
  saldo_sistema: number;
  saldo_fisico: number;
  diferenca: number;
  valor_unitario: number;
  valor_diferenca: number;
  auditado_em: string;
  usuario: string;
}

export interface InventoryEntry {
  id: string;
  productId: string;
  quantity: number;
  type: 'inicial' | 'parcial' | 'geral' | 'ajuste';
  userId: string;
  timestamp: string;
}

export interface SyncItem {
  id: string;
  type: 'picking' | 'inventory' | 'movement';
  data: any;
  timestamp: string;
}

export interface StockItem {
  id_interno: string;
  local: string;
  saldo_disponivel: number;
  saldo_reservado: number;
  saldo_em_transito: number;
  saldo_total: number;
  atualizado_em: string;
}

export interface Movement {
  movimento_id?: string;
  data: string;
  tipo: 'entrada' | 'saida' | 'transferencia' | 'reserva' | 'baixa_reserva' | 'expedicao' | 'recebimento_transito' | 'ajuste_entrada' | 'ajuste_saida' | 'inventario' | 'saida_conferencia';
  id_interno: string;
  local_origem: string;
  local_destino: string;
  quantidade: number;
  usuario: string;
  origem: string;
  observacao?: string;
}
