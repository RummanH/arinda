export function insertProduct(client, product) {
  return client.query(
    `INSERT INTO products (id, name, category, pieces_per_case, purchase_price, selling_price, stock_pieces)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [product.id, product.name, product.category, product.piecesPerCase, product.purchasePrice, product.sellingPrice, product.stockPieces],
  );
}

export function updateProduct(client, product) {
  return client.query(
    `UPDATE products
     SET name = $2, category = $3, pieces_per_case = $4, purchase_price = $5, selling_price = $6
     WHERE id = $1`,
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
     WHERE id = $1`,
    [productId, addPieces],
  );
}

export function findProductForUpdate(client, productId) {
  return client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [productId]);
}
