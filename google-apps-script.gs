/**
 * ADAPTAÇÃO DO GOOGLE APPS SCRIPT PARA O MÓDULO DE INVENTÁRIO
 * 
 * Este script deve ser adicionado ao seu projeto do Google Apps Script.
 * Ele lida com as novas abas INVENTARIOS e INVENTARIO_ITENS.
 */

const SPREADSHEET_ID = 'SEU_ID_DA_PLANILHA_AQUI'; // O script geralmente já tem isso definido

function doPost(e) {
  let body;
  try {
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e.parameter && e.parameter.payload) {
      body = JSON.parse(e.parameter.payload);
    } else {
      body = e.parameter;
    }
  } catch (err) {
    body = e.parameter || {};
  }
  
  const action = (body.action || '').toLowerCase();
  
  try {
    switch (action) {
      case 'criarinventario':
        return handleCriarInventario(body);
      case 'registrariteminventario':
      case 'salvariteminventario':
        return handleRegistrarItemInventario(body);
      case 'finalizarinventario':
        return handleFinalizarInventario(body);
      case 'cancelarinventario':
        return handleCancelarInventario(body);
      case 'registrarmovimento':
        return handleRegistrarMovimento(body);
      case 'clearpickings':
        return handleClearPickings();
      case 'sync':
        return handleSync(body);
      case 'salvaritemseparacao':
        return handleSalvarItemSeparacao(body);
      case 'finalizarseparacao':
        return handleFinalizarSeparacao(body);
      case 'salvarconferencia':
        return handleSalvarConferencia(body);
      case 'criarseparacao':
        return handleCriarSeparacao(body);
      default:
        return response({ ok: false, message: 'Ação POST não reconhecida: ' + action });
    }
  } catch (err) {
    return response({ ok: false, message: err.toString() });
  }
}

function doGet(e) {
  const action = (e.parameter.action || '').toLowerCase();
  
  try {
    switch (action) {
      // Read Actions
      case 'listusers':
        return handleListUsers();
      case 'listmenus':
        return handleListMenus();
      case 'listcanaisenvio':
        return handleListCanaisEnvio();
      case 'listinventarios':
        return handleListInventarios();
      case 'getinventario':
        return handleGetInventario(e.parameter.id);
      case 'listinventarioitens':
        return handleListInventarioItens(e.parameter.id);
      case 'search':
        return handleSearchProdutos(e.parameter.q, e.parameter.limit);
      case 'listpickings':
        return handleListPickings();
      case 'listestoque':
        return handleListEstoque();
      case 'searchestoque':
        return handleSearchEstoque(e.parameter.q);
      case 'getestoque':
        return handleGetEstoque(e.parameter.id_interno);
      case 'listmovimentos':
        return handleListMovimentos();
      case 'searchmovimentos':
        return handleSearchMovimentos(e.parameter.id_interno);
      case 'listlampkits':
        return handleListLampKits(e.parameter.limit);
      case 'searchlampkits':
        return handleSearchLampKits(e.parameter.q);
      case 'list':
        return handleListProdutos(e.parameter.limit);
      case 'getproductexact':
      case 'getbyid':
        return handleGetProductExact(e.parameter.code || e.parameter.id);
      case 'health':
        return response({ ok: true });
        
      // Write Actions (Fallback for CORS)
      case 'criarinventario':
        return handleCriarInventario(e.parameter);
      case 'registrariteminventario':
      case 'salvariteminventario':
        return handleRegistrarItemInventario(e.parameter);
      case 'finalizarinventario':
        return handleFinalizarInventario(e.parameter);
      case 'cancelarinventario':
        return handleCancelarInventario(e.parameter);
      case 'updateinventariostatus':
        return handleUpdateInventarioStatus(e.parameter);
        
      default:
        return response({ ok: false, message: 'Ação GET não reconhecida: ' + action });
    }
  } catch (err) {
    return response({ ok: false, message: err.toString() });
  }
}

// --- AUXILIARES ---

function getSheet(name) {
  let ss;
  try {
    if (!SPREADSHEET_ID || SPREADSHEET_ID === 'SEU_ID_DA_PLANILHA_AQUI') {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } else {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    }
  } catch (e) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  if (!ss) {
    throw new Error("Não foi possível acessar a planilha. Se o script não estiver vinculado a uma planilha, você DEVE fornecer um SPREADSHEET_ID válido.");
  }

  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Adicionar cabeçalhos se a aba for nova
    if (name === 'INVENTARIOS') {
      sheet.appendRow(['inventario_id', 'tipo', 'filtro', 'data_inicio', 'data_fim', 'status', 'criado_por', 'total_skus', 'total_itens_contados', 'total_divergencias', 'valor_ajuste_positivo', 'valor_ajuste_negativo']);
    } else if (name === 'INVENTARIO_ITENS') {
      sheet.appendRow(['inventario_id', 'id_interno', 'local', 'saldo_sistema', 'saldo_fisico', 'diferenca', 'valor_unitario', 'valor_diferenca', 'auditado_em', 'usuario']);
    } else if (name === 'SEPARACOES') {
      sheet.appendRow(['id', 'canal', 'pedido', 'status', 'usuario', 'data_criacao', 'data_separacao', 'data_conferencia', 'conferido_por', 'itens_json']);
    } else if (name === 'ESTOQUE_ATUAL') {
      sheet.appendRow(['id_interno', 'local', 'saldo_disponivel', 'saldo_reservado', 'saldo_avaria', 'saldo_bloqueado', 'saldo_total', 'atualizado_em']);
    } else if (name === 'MOVIMENTOS') {
      sheet.appendRow(['movimento_id', 'data', 'tipo', 'id_interno', 'local_origem', 'local_destino', 'quantidade', 'usuario', 'origem', 'observacao']);
    } else if (name === 'PRODUTOS') {
      sheet.appendRow(['id_interno', 'sku_fornecedor', 'ean', 'descricao_base', 'descricao_completa', 'unidade', 'preco_custo', 'preco_venda', 'estoque_minimo', 'categoria', 'marca']);
    }
  }
  return sheet;
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getRowsAsObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}

// --- HANDLERS INVENTÁRIO ---

function handleCriarInventario(data) {
  const sheet = getSheet('INVENTARIOS');
  const id = 'INV-' + new Date().getTime();
  const tipo = data.tipo || 'geral';
  const filtro = data.filtro || 'todos';
  const criado_por = data.criado_por || 'sistema';
  
  const newRow = [
    id,
    tipo,
    filtro,
    new Date().toISOString(),
    '',
    'aberto',
    criado_por,
    0, 0, 0, 0, 0
  ];
  sheet.appendRow(newRow);
  
  const item = {
    inventario_id: id,
    tipo: tipo,
    filtro: filtro,
    data_inicio: newRow[3],
    status: 'aberto',
    criado_por: criado_por,
    total_skus: 0,
    total_itens_contados: 0,
    total_divergencias: 0,
    valor_ajuste_positivo: 0,
    valor_ajuste_negativo: 0
  };
  
  return response({ ok: true, item: item });
}

function handleRegistrarItemInventario(data) {
  const sheetItens = getSheet('INVENTARIO_ITENS');
  const sheetEstoque = getSheet('ESTOQUE_ATUAL');
  const sheetProdutos = getSheet('PRODUTOS');
  
  // 1. Buscar saldo atual no sistema
  const estoque = getRowsAsObjects(sheetEstoque);
  const estoqueItem = estoque.find(e => e.id_interno == data.id_interno && e.local == data.local);
  const saldoSistema = estoqueItem ? Number(estoqueItem.saldo_disponivel) : 0;
  
  // 2. Buscar valor unitário (preço de custo)
  const produtos = getRowsAsObjects(sheetProdutos);
  const produto = produtos.find(p => p.id_interno == data.id_interno);
  const valorUnitario = produto ? Number(produto.preco_custo || 0) : 0;
  
  // 3. Cálculos
  const saldoFisico = Number(data.saldo_fisico);
  const diferenca = saldoFisico - saldoSistema;
  const valorDiferenca = diferenca * valorUnitario;
  
  // 4. Gravar na aba INVENTARIO_ITENS
  // Se já existir o item no mesmo inventário/local, atualizar em vez de duplicar
  const itens = getRowsAsObjects(sheetItens);
  let rowIndex = -1;
  for (let i = 0; i < itens.length; i++) {
    if (itens[i].inventario_id == data.inventario_id && itens[i].id_interno == data.id_interno && itens[i].local == data.local) {
      rowIndex = i + 2; // +1 header, +1 index
      break;
    }
  }
  
  const rowData = [
    data.inventario_id,
    data.id_interno,
    data.local,
    saldoSistema,
    saldoFisico,
    diferenca,
    valorUnitario,
    valorDiferenca,
    new Date().toISOString(),
    data.usuario
  ];
  
  if (rowIndex > 0) {
    sheetItens.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheetItens.appendRow(rowData);
  }
  
  // 5. Atualizar totais do mestre
  atualizarTotaisInventario(data.inventario_id);
  
  return response({ ok: true });
}

function atualizarTotaisInventario(inventarioId) {
  const sheetMestre = getSheet('INVENTARIOS');
  const sheetItens = getSheet('INVENTARIO_ITENS');
  
  const itens = getRowsAsObjects(sheetItens).filter(i => i.inventario_id == inventarioId);
  
  const totalSkus = [...new Set(itens.map(i => i.id_interno))].length;
  const totalItensContados = itens.reduce((acc, curr) => acc + Number(curr.saldo_fisico), 0);
  const totalDivergencias = itens.filter(i => Number(i.diferenca) !== 0).length;
  const valorAjustePositivo = itens.filter(i => Number(i.valor_diferenca) > 0).reduce((acc, curr) => acc + Number(curr.valor_diferenca), 0);
  const valorAjusteNegativo = itens.filter(i => Number(i.valor_diferenca) < 0).reduce((acc, curr) => acc + Math.abs(Number(curr.valor_diferenca)), 0);
  
  const mestreRows = getRowsAsObjects(sheetMestre);
  let mestreIndex = -1;
  for (let i = 0; i < mestreRows.length; i++) {
    if (mestreRows[i].inventario_id == inventarioId) {
      mestreIndex = i + 2;
      break;
    }
  }
  
  if (mestreIndex > 0) {
    sheetMestre.getRange(mestreIndex, 8).setValue(totalSkus);
    sheetMestre.getRange(mestreIndex, 9).setValue(totalItensContados);
    sheetMestre.getRange(mestreIndex, 10).setValue(totalDivergencias);
    sheetMestre.getRange(mestreIndex, 11).setValue(valorAjustePositivo);
    sheetMestre.getRange(mestreIndex, 12).setValue(valorAjusteNegativo);
    sheetMestre.getRange(mestreIndex, 6).setValue('em_andamento');
  }
}

function handleFinalizarInventario(data) {
  const inventarioId = data.inventario_id || data.id;
  const usuario = data.usuario;
  
  if (!inventarioId) return response({ ok: false, message: 'ID do inventário não fornecido' });
  
  const sheetMestre = getSheet('INVENTARIOS');
  const sheetItens = getSheet('INVENTARIO_ITENS');
  const sheetEstoque = getSheet('ESTOQUE_ATUAL');
  const sheetMovimentos = getSheet('MOVIMENTOS');
  
  const itens = getRowsAsObjects(sheetItens).filter(i => i.inventario_id == inventarioId);
  
  // 1. Atualizar ESTOQUE_ATUAL e registrar MOVIMENTOS
  itens.forEach(item => {
    const idInterno = item.id_interno;
    const local = item.local;
    const saldoFisico = Number(item.saldo_fisico);
    
    // Atualizar ou inserir no ESTOQUE_ATUAL
    const estoque = getRowsAsObjects(sheetEstoque);
    let estoqueIndex = -1;
    for (let i = 0; i < estoque.length; i++) {
      if (estoque[i].id_interno == idInterno && estoque[i].local == local) {
        estoqueIndex = i + 2;
        break;
      }
    }
    
    const timestamp = new Date().toISOString();
    if (estoqueIndex > 0) {
      sheetEstoque.getRange(estoqueIndex, 3).setValue(saldoFisico); // saldo_disponivel
      sheetEstoque.getRange(estoqueIndex, 4).setValue(0);           // saldo_reservado (zera reserva no inventário)
      sheetEstoque.getRange(estoqueIndex, 7).setValue(saldoFisico); // saldo_total
      sheetEstoque.getRange(estoqueIndex, 8).setValue(timestamp);   // atualizado_em
    } else {
      sheetEstoque.appendRow([idInterno, local, saldoFisico, 0, 0, 0, saldoFisico, timestamp]);
    }
    
    // Registrar movimento tipo "inventario"
    // movimento_id, data, tipo, id_interno, local_origem, local_destino, quantidade, usuario, origem, observacao
    sheetMovimentos.appendRow([
      'MOV-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000),
      timestamp,
      'inventario',
      idInterno,
      'inventario',
      local,
      saldoFisico,
      usuario,
      'Inventário ' + inventarioId,
      'Finalização de inventário estruturado'
    ]);
  });
  
  // 2. Marcar mestre como finalizado
  const mestreRows = getRowsAsObjects(sheetMestre);
  let mestreIndex = -1;
  for (let i = 0; i < mestreRows.length; i++) {
    if (mestreRows[i].inventario_id == inventarioId) {
      mestreIndex = i + 2;
      break;
    }
  }
  
  if (mestreIndex > 0) {
    sheetMestre.getRange(mestreIndex, 6).setValue('finalizado');
    sheetMestre.getRange(mestreIndex, 5).setValue(new Date().toISOString()); // data_fim
  }
  
  return response({ ok: true });
}

function handleCancelarInventario(data) {
  const inventarioId = data.inventario_id || data.id;
  const usuario = data.usuario;
  
  if (!inventarioId) return response({ ok: false, message: 'ID do inventário não fornecido' });
  
  const sheetMestre = getSheet('INVENTARIOS');
  
  const mestreRows = getRowsAsObjects(sheetMestre);
  let mestreIndex = -1;
  for (let i = 0; i < mestreRows.length; i++) {
    if (mestreRows[i].inventario_id == inventarioId) {
      mestreIndex = i + 2;
      break;
    }
  }
  
  if (mestreIndex > 0) {
    sheetMestre.getRange(mestreIndex, 6).setValue('cancelado');
    sheetMestre.getRange(mestreIndex, 5).setValue(new Date().toISOString()); // data_fim
  }
  
  return response({ ok: true });
}

function handleUpdateInventarioStatus(data) {
  const inventarioId = data.inventario_id || data.id;
  const status = data.status;
  
  if (!inventarioId || !status) return response({ ok: false, message: 'ID ou Status não fornecido' });
  
  const sheetMestre = getSheet('INVENTARIOS');
  const mestreRows = getRowsAsObjects(sheetMestre);
  let mestreIndex = -1;
  for (let i = 0; i < mestreRows.length; i++) {
    if (mestreRows[i].inventario_id == inventarioId) {
      mestreIndex = i + 2;
      break;
    }
  }
  
  if (mestreIndex > 0) {
    sheetMestre.getRange(mestreIndex, 6).setValue(status);
    return response({ ok: true });
  }
  
  return response({ ok: false, message: 'Inventário não encontrado' });
}

function handleClearPickings() {
  const sheet = getSheet('SEPARACOES');
  sheet.clear();
  sheet.appendRow(['id', 'canal', 'pedido', 'status', 'usuario', 'data_criacao', 'data_separacao', 'data_conferencia', 'conferido_por', 'itens_json']);
  return response({ ok: true });
}

function handleListUsers() {
  const sheet = getSheet('USUARIOS');
  const items = getRowsAsObjects(sheet);
  return response({ ok: true, items: items });
}

function handleListMenus() {
  const sheet = getSheet('MENUS');
  const items = getRowsAsObjects(sheet);
  return response({ ok: true, items: items });
}

function handleListCanaisEnvio() {
  const sheet = getSheet('CANAIS_ENVIO');
  const items = getRowsAsObjects(sheet);
  return response({ ok: true, items: items });
}

function handleListPickings() {
  const sheet = getSheet('SEPARACOES');
  const items = getRowsAsObjects(sheet);
  return response({ ok: true, items: items });
}

function handleListInventarios() {
  const sheet = getSheet('INVENTARIOS');
  const items = getRowsAsObjects(sheet);
  return response({ ok: true, items: items });
}

function handleGetInventario(id) {
  const sheet = getSheet('INVENTARIOS');
  const items = getRowsAsObjects(sheet);
  const item = items.find(i => i.inventario_id == id);
  return response({ ok: true, item: item });
}

function handleListProdutos(limit) {
  const sheet = getSheet('PRODUTOS');
  const items = getRowsAsObjects(sheet);
  if (limit) {
    return response({ ok: true, items: items.slice(0, limit) });
  }
  return response({ ok: true, items: items });
}

function handleSearchProdutos(q, limit) {
  if (!q) return handleListProdutos(limit);
  
  const sheet = getSheet('PRODUTOS');
  const items = getRowsAsObjects(sheet);
  const query = q.toLowerCase();
  
  const filtered = items.filter(item => {
    const ean = String(item.ean || '').toLowerCase();
    const id = String(item.id_interno || '').toLowerCase();
    const sku = String(item.sku_fornecedor || '').toLowerCase();
    const desc = String(item.descricao_completa || item.descricao_base || '').toLowerCase();
    
    return ean.includes(query) || 
           id.includes(query) || 
           sku.includes(query) || 
           desc.includes(query) ||
           ean.replace(/^0+/, '') === query.replace(/^0+/, '') ||
           id.replace(/^0+/, '') === query.replace(/^0+/, '');
  });
  
  if (limit) {
    return response({ ok: true, items: filtered.slice(0, limit) });
  }
  return response({ ok: true, items: filtered });
}

function handleListEstoque() {
  const sheet = getSheet('ESTOQUE_ATUAL');
  const items = getRowsAsObjects(sheet);
  return response({ ok: true, items: items });
}

function handleSearchEstoque(q) {
  const sheet = getSheet('ESTOQUE_ATUAL');
  const items = getRowsAsObjects(sheet);
  const filtered = items.filter(i => 
    i.id_interno.toLowerCase().includes(q.toLowerCase()) || 
    i.local.toLowerCase().includes(q.toLowerCase())
  );
  return response({ ok: true, items: filtered });
}

function handleGetEstoque(idInterno) {
  const sheet = getSheet('ESTOQUE_ATUAL');
  const items = getRowsAsObjects(sheet).filter(i => i.id_interno == idInterno);
  return response({ ok: true, items: items });
}

function handleListMovimentos() {
  const sheet = getSheet('MOVIMENTOS');
  const items = getRowsAsObjects(sheet);
  // Retornar os últimos 100 movimentos por padrão
  return response({ ok: true, items: items.reverse().slice(0, 100) });
}

function handleSearchMovimentos(idInterno) {
  const sheet = getSheet('MOVIMENTOS');
  const items = getRowsAsObjects(sheet).filter(i => i.id_interno == idInterno);
  return response({ ok: true, items: items.reverse() });
}

function handleListLampKits(limit) {
  const sheet = getSheet('KIT_LAMPADAS');
  const items = getRowsAsObjects(sheet);
  if (limit) {
    return response({ ok: true, items: items.slice(0, limit) });
  }
  return response({ ok: true, items: items });
}

function handleSearchLampKits(q) {
  const sheet = getSheet('KIT_LAMPADAS');
  const items = getRowsAsObjects(sheet);
  const filtered = items.filter(i => 
    (i.montadora || '').toLowerCase().includes(q.toLowerCase()) || 
    (i.modelo || '').toLowerCase().includes(q.toLowerCase()) ||
    (i.baixo || '').toLowerCase().includes(q.toLowerCase()) ||
    (i.alto || '').toLowerCase().includes(q.toLowerCase()) ||
    (i.neblina || '').toLowerCase().includes(q.toLowerCase()) ||
    (i.lanterna_pingo || '').toLowerCase().includes(q.toLowerCase())
  );
  return response({ ok: true, items: filtered });
}

function handleRegistrarMovimento(data) {
  const sheetMovimentos = getSheet('MOVIMENTOS');
  const sheetEstoque = getSheet('ESTOQUE_ATUAL');
  
  const timestamp = new Date().toISOString();
  const movimentoId = 'MOV-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000);
  
  // Append movement
  sheetMovimentos.appendRow([
    movimentoId,
    timestamp,
    data.tipo,
    data.id_interno,
    data.local_origem || '',
    data.local_destino || '',
    data.quantidade,
    data.usuario,
    data.origem || 'App',
    data.observacao || ''
  ]);
  
  // Update Stock
  const idInterno = data.id_interno;
  const local = data.local_destino || data.local_origem;
  const quantidade = Number(data.quantidade);
  
  const estoque = getRowsAsObjects(sheetEstoque);
  let estoqueIndex = -1;
  for (let i = 0; i < estoque.length; i++) {
    if (estoque[i].id_interno == idInterno && estoque[i].local == local) {
      estoqueIndex = i + 2;
      break;
    }
  }
  
  if (estoqueIndex > 0) {
    const saldoDisponivel = Number(sheetEstoque.getRange(estoqueIndex, 3).getValue());
    const saldoReservado = Number(sheetEstoque.getRange(estoqueIndex, 4).getValue());
    const saldoTotal = Number(sheetEstoque.getRange(estoqueIndex, 7).getValue());
    
    if (data.tipo === 'reserva') {
      // Reserva: sai do disponível, entra no reservado. Total não muda.
      sheetEstoque.getRange(estoqueIndex, 3).setValue(saldoDisponivel - quantidade);
      sheetEstoque.getRange(estoqueIndex, 4).setValue(saldoReservado + quantidade);
    } else if (data.tipo === 'saida_conferencia') {
      // Saída Conferência: sai do reservado e do total. Disponível não muda.
      sheetEstoque.getRange(estoqueIndex, 4).setValue(saldoReservado - quantidade);
      sheetEstoque.getRange(estoqueIndex, 7).setValue(saldoTotal - quantidade);
    } else if (data.tipo === 'entrada' || data.tipo === 'ajuste_positivo') {
      sheetEstoque.getRange(estoqueIndex, 3).setValue(saldoDisponivel + quantidade);
      sheetEstoque.getRange(estoqueIndex, 7).setValue(saldoTotal + quantidade);
    } else if (data.tipo === 'saida' || data.tipo === 'ajuste_negativo') {
      sheetEstoque.getRange(estoqueIndex, 3).setValue(saldoDisponivel - quantidade);
      sheetEstoque.getRange(estoqueIndex, 7).setValue(saldoTotal - quantidade);
    }
    sheetEstoque.getRange(estoqueIndex, 8).setValue(timestamp); // atualizado_em
  } else {
    // Se não existe, cria apenas se for entrada ou ajuste positivo
    if (data.tipo === 'entrada' || data.tipo === 'ajuste_positivo') {
      sheetEstoque.appendRow([idInterno, local, quantidade, 0, 0, 0, quantidade, timestamp]);
    }
  }
  
  return response({ ok: true });
}

function handleSync(body) {
  const type = body.type;
  const data = body.data;
  
  if (type === 'picking') {
    return handleSavePicking(data);
  }
  
  return response({ ok: true, message: 'Item sincronizado (sem ação específica)' });
}

function handleSavePicking(data) {
  const sheet = getSheet('SEPARACOES');
  const timestamp = new Date().toISOString();
  
  // Se a planilha for nova, adicionar cabeçalhos
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['id', 'canal', 'pedido', 'status', 'usuario', 'data_criacao', 'data_separacao', 'data_conferencia', 'conferido_por', 'itens_json']);
  }
  
  // Verificar se já existe (update)
  const rows = getRowsAsObjects(sheet);
  let rowIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id == data.id) {
      rowIndex = i + 2;
      break;
    }
  }
  
  const rowData = [
    data.id,
    data.channel,
    data.orderNumber || '',
    data.status,
    data.userId,
    data.createdAt,
    data.separatedAt || '',
    data.conferredAt || '',
    data.conferredBy || '',
    JSON.stringify(data.items)
  ];
  
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  
  return response({ ok: true });
}

/**
 * Cria um menu na planilha para facilitar o acesso
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📦 WMS App')
      .addItem('Ver Estoque Atual', 'menuVerEstoque')
      .addItem('Ver Movimentações', 'menuVerMovimentacoes')
      .addItem('Recalcular Estoque', 'menuAtualizarEstoque')
      .addSeparator()
      .addItem('Limpar Todas Separações', 'menuLimparSeparacoes')
      .addSeparator()
      .addItem('Configurar Planilha', 'setupSpreadsheet')
      .addToUi();
}

function menuVerEstoque() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('ESTOQUE_ATUAL');
  if (sheet) {
    ss.setActiveSheet(sheet);
  } else {
    SpreadsheetApp.getUi().alert('Aba ESTOQUE_ATUAL ainda não foi criada.');
  }
}

function menuLimparSeparacoes() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('Limpar Dados', 'Deseja realmente limpar TODAS as separações da planilha?', ui.ButtonSet.YES_NO);
  
  if (response == ui.Button.YES) {
    const sheet = getSheet('SEPARACOES');
    sheet.clear();
    sheet.appendRow(['id', 'canal', 'pedido', 'status', 'usuario', 'data_criacao', 'data_separacao', 'data_conferencia', 'conferido_por', 'itens_json']);
    ui.alert('Dados limpos com sucesso!');
  }
}

function menuAtualizarEstoque() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('Recalcular Estoque', 'Deseja recalcular o estoque atual baseado em todas as movimentações? Isso pode levar alguns segundos.', ui.ButtonSet.YES_NO);
  
  if (response == ui.Button.YES) {
    try {
      recalcularEstoqueTotal();
      ui.alert('Estoque recalculado com sucesso!');
    } catch (e) {
      ui.alert('Erro ao recalcular: ' + e.toString());
    }
  }
}

function recalcularEstoqueTotal() {
  const sheetMov = getSheet('MOVIMENTOS');
  const sheetEstoque = getSheet('ESTOQUE_ATUAL');
  
  const movimentos = getRowsAsObjects(sheetMov);
  const estoqueMap = {}; // { "id_interno|local": { disponivel, reservado, total } }
  
  movimentos.forEach(mov => {
    const id = mov.id_interno;
    const local = mov.local_destino || mov.local_origem;
    const qtd = Number(mov.quantidade);
    const key = id + '|' + local;
    
    if (!estoqueMap[key]) {
      estoqueMap[key] = { disponivel: 0, reservado: 0, total: 0 };
    }
    
    if (mov.tipo === 'entrada' || mov.tipo === 'ajuste_positivo' || mov.tipo === 'inventario') {
      estoqueMap[key].disponivel += qtd;
      estoqueMap[key].total += qtd;
    } else if (mov.tipo === 'saida' || mov.tipo === 'ajuste_negativo') {
      estoqueMap[key].disponivel -= qtd;
      estoqueMap[key].total -= qtd;
    } else if (mov.tipo === 'reserva') {
      estoqueMap[key].disponivel -= qtd;
      estoqueMap[key].reservado += qtd;
    } else if (mov.tipo === 'saida_conferencia') {
      estoqueMap[key].reservado -= qtd;
      estoqueMap[key].total -= qtd;
    }
  });
  
  // Limpar e repopular estoque
  sheetEstoque.clear();
  sheetEstoque.appendRow(['id_interno', 'local', 'saldo_disponivel', 'saldo_reservado', 'saldo_avaria', 'saldo_bloqueado', 'saldo_total', 'atualizado_em']);
  
  const timestamp = new Date().toISOString();
  Object.keys(estoqueMap).forEach(key => {
    const [id, local] = key.split('|');
    const item = estoqueMap[key];
    sheetEstoque.appendRow([id, local, item.disponivel, item.reservado, 0, 0, item.total, timestamp]);
  });
}

function setupSpreadsheet() {
  // Garante que todas as abas necessárias existam
  getSheet('PRODUTOS');
  getSheet('ESTOQUE_ATUAL');
  getSheet('MOVIMENTOS');
  getSheet('SEPARACOES');
  getSheet('INVENTARIOS');
  getSheet('INVENTARIO_ITENS');
  
  const sheetMenus = getSheet('MENUS');
  if (sheetMenus.getLastRow() === 0) {
    sheetMenus.appendRow(['id', 'nome', 'chave', 'ordem', 'status']);
    sheetMenus.appendRow(['1', 'Produtos', 'produtos', '10', 'ativo']);
    sheetMenus.appendRow(['2', 'Separação', 'separacao', '20', 'ativo']);
    sheetMenus.appendRow(['3', 'Conferência', 'conferencia', '30', 'ativo']);
    sheetMenus.appendRow(['4', 'Inventário', 'inventario', '40', 'ativo']);
    sheetMenus.appendRow(['5', 'Kits Lâmpadas', 'kit_lampada', '50', 'ativo']);
    sheetMenus.appendRow(['6', 'Estoque Atual', 'estoque', '60', 'ativo']);
    sheetMenus.appendRow(['7', 'Movimentações', 'movimentos', '70', 'ativo']);
  }
  
  const sheetCanais = getSheet('CANAIS_ENVIO');
  if (sheetCanais.getLastRow() === 0) {
    sheetCanais.appendRow(['id', 'nome', 'chave', 'status']);
    sheetCanais.appendRow(['1', 'FLEX', 'FLEX', 'ativo']);
    sheetCanais.appendRow(['2', 'AGÊNCIA SHOPEE', 'SHOPEE AGENCIA', 'ativo']);
    sheetCanais.appendRow(['3', 'MERCADO ENVIOS', 'MELI', 'ativo']);
  }
  
  const sheetUsers = getSheet('USUARIOS');
  if (sheetUsers.getLastRow() === 0) {
    sheetUsers.appendRow(['id', 'nome', 'usuario', 'perfil', 'status']);
    sheetUsers.appendRow(['1', 'Administrador', 'admin', 'admin', 'ativo']);
  }

  SpreadsheetApp.getUi().alert('Planilha configurada com sucesso!');
}
