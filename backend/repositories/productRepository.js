export function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    piecesPerCase: Number(row.pieces_per_case),
    purchasePrice: Number(row.purchase_price),
    sellingPrice: Number(row.selling_price),
    stockPieces: Number(row.stock_pieces),
  };
}

function mapProductLite(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    piecesPerCase: Number(row.pieces_per_case),
    purchasePrice: Number(row.purchase_price),
    sellingPrice: Number(row.selling_price),
    stockPieces: Number(row.stock_pieces),
  };
}

function buildProductSearchClause(search, params) {
  if (!search) {
    return '';
  }

  params.push(`%${search}%`);
  return `WHERE (name ILIKE $${params.length} OR category ILIKE $${params.length})`;
}

export async function countProducts(client, { search } = {}) {
  const params = [];
  const where = buildProductSearchClause(search, params);
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM products ${where}`, params);
  return result.rows[0].count;
}

export async function listProductsPage(client, { search, limit, offset }) {
  const params = [];
  const where = buildProductSearchClause(search, params);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT * FROM products ${where} ORDER BY created_at ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapProduct);
}

export async function listAllActiveProductsLite(client) {
  const result = await client.query('SELECT id, name, category, pieces_per_case, purchase_price, selling_price, stock_pieces FROM products ORDER BY name ASC');
  return result.rows.map(mapProductLite);
}

export function insertProduct(client, product) {
  return client.query(
    `INSERT INTO products (id, name, category, pieces_per_case, purchase_price, selling_price, stock_pieces)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [product.id, product.name, product.category, product.piecesPerCase, product.purchasePrice, product.sellingPrice, product.stockPieces],
  );
}

export function updateProduct(client, product) {
  return client.query(
    `UPDATE products
     SET name = $2, category = $3, pieces_per_case = $4, purchase_price = $5, selling_price = $6
     WHERE id = $1
     RETURNING *`,
    [product.id, product.name, product.category, product.piecesPerCase, product.purchasePrice, product.sellingPrice],
  );
}

export function deleteProduct(client, productId) {
  return client.query('DELETE FROM products WHERE id = $1', [productId]);
}

export function addProductStock(client, productId, addPieces) {
  return client.query(
    `UPDATE products
     SET stock_pieces = stock_pieces + $2
     WHERE id = $1
     RETURNING *`,
    [productId, addPieces],
  );
}

export function findProductForUpdate(client, productId) {
  return client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [productId]);
}
