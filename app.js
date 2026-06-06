import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import pg from 'pg';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
const PORT = Number(process.env.PORT || 3001);

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Add it to your .env file.');
}

const initialProducts = [
  { id: 'p1', name: 'Potato Chips 25g', category: 'Snacks', piecesPerCase: 48, purchasePrice: 8, sellingPrice: 10, stockPieces: 480 },
  { id: 'p2', name: 'Chanachur 100g', category: 'Snacks', piecesPerCase: 40, purchasePrice: 18, sellingPrice: 22, stockPieces: 360 },
  { id: 'p3', name: 'Cream Biscuit 80g', category: 'Bakery', piecesPerCase: 60, purchasePrice: 12, sellingPrice: 15, stockPieces: 540 },
  { id: 'p4', name: 'Chocolate Wafer 30g', category: 'Snacks', piecesPerCase: 72, purchasePrice: 6, sellingPrice: 8, stockPieces: 720 },
  { id: 'p5', name: 'Mango Juice 250ml', category: 'Beverage', piecesPerCase: 24, purchasePrice: 22, sellingPrice: 28, stockPieces: 240 },
  { id: 'p6', name: 'Energy Drink 250ml', category: 'Beverage', piecesPerCase: 24, purchasePrice: 35, sellingPrice: 45, stockPieces: 192 },
  { id: 'p7', name: 'Lemon Soft Drink 500ml', category: 'Beverage', piecesPerCase: 12, purchasePrice: 38, sellingPrice: 45, stockPieces: 144 },
  { id: 'p8', name: 'Instant Noodles 8 Pack', category: 'Food', piecesPerCase: 30, purchasePrice: 18, sellingPrice: 22, stockPieces: 300 },
  { id: 'p9', name: 'Cup Cake 25g', category: 'Bakery', piecesPerCase: 48, purchasePrice: 9, sellingPrice: 12, stockPieces: 384 },
  { id: 'p10', name: 'Milk Chocolate 15g', category: 'Confectionery', piecesPerCase: 96, purchasePrice: 5, sellingPrice: 8, stockPieces: 960 },
  { id: 'p11', name: 'Beauty Soap 100g', category: 'Personal Care', piecesPerCase: 48, purchasePrice: 32, sellingPrice: 38, stockPieces: 288 },
  { id: 'p12', name: 'Detergent Powder 500g', category: 'Household', piecesPerCase: 24, purchasePrice: 62, sellingPrice: 72, stockPieces: 168 },
  { id: 'p13', name: 'Shampoo Sachet 6ml', category: 'Personal Care', piecesPerCase: 144, purchasePrice: 2, sellingPrice: 3, stockPieces: 1440 },
  { id: 'p14', name: 'Toothpaste 100g', category: 'Personal Care', piecesPerCase: 36, purchasePrice: 72, sellingPrice: 85, stockPieces: 180 },
  { id: 'p15', name: 'Facial Tissue 120 Pull', category: 'Household', piecesPerCase: 24, purchasePrice: 55, sellingPrice: 65, stockPieces: 144 },
  { id: 'p16', name: 'Black Tea 200g', category: 'Grocery', piecesPerCase: 24, purchasePrice: 82, sellingPrice: 95, stockPieces: 120 },
  { id: 'p17', name: 'Milk Powder 400g', category: 'Grocery', piecesPerCase: 24, purchasePrice: 250, sellingPrice: 285, stockPieces: 96 },
  { id: 'p18', name: 'Iodized Salt 1kg', category: 'Grocery', piecesPerCase: 20, purchasePrice: 32, sellingPrice: 38, stockPieces: 160 },
  { id: 'p19', name: 'Soybean Oil 1L', category: 'Grocery', piecesPerCase: 12, purchasePrice: 158, sellingPrice: 175, stockPieces: 84 },
  { id: 'p20', name: 'Mixed Spices 100g', category: 'Grocery', piecesPerCase: 48, purchasePrice: 42, sellingPrice: 50, stockPieces: 288 },
  { id: 'p21', name: 'Sauce Bottle 340g', category: 'Condiments', piecesPerCase: 24, purchasePrice: 78, sellingPrice: 90, stockPieces: 120 },
  { id: 'p22', name: 'Mosquito Coil 10pc', category: 'Household', piecesPerCase: 30, purchasePrice: 44, sellingPrice: 52, stockPieces: 180 },
  { id: 'p23', name: 'Hand Wash 200ml', category: 'Personal Care', piecesPerCase: 24, purchasePrice: 80, sellingPrice: 95, stockPieces: 96 },
  { id: 'p24', name: 'Dishwash Bar 300g', category: 'Household', piecesPerCase: 60, purchasePrice: 18, sellingPrice: 22, stockPieces: 420 },
  { id: 'p25', name: 'Peanut Bar 20g', category: 'Confectionery', piecesPerCase: 72, purchasePrice: 7, sellingPrice: 10, stockPieces: 504 },
  { id: 'p26', name: 'Mineral Water 500ml', category: 'Beverage', piecesPerCase: 24, purchasePrice: 10, sellingPrice: 15, stockPieces: 240 },
  { id: 'p27', name: 'Baby Diaper Mini', category: 'Personal Care', piecesPerCase: 48, purchasePrice: 14, sellingPrice: 18, stockPieces: 192 },
  { id: 'p28', name: 'Oral Saline 25g', category: 'Health', piecesPerCase: 100, purchasePrice: 5, sellingPrice: 7, stockPieces: 500 },
];

const initialDsrs = [
  { id: 'dsr1', name: 'Rahim Uddin', phone: '01700000000', area: 'Mirpur', status: 'Active' },
  { id: 'dsr2', name: 'Karim Hasan', phone: '01711111111', area: 'Dhanmondi', status: 'Active' },
  { id: 'dsr3', name: 'Jalal Ahmed', phone: '01722222222', area: 'Uttara', status: 'Active' },
  { id: 'dsr4', name: 'Sohel Rana', phone: '01733333333', area: 'Gulshan', status: 'Active' },
  { id: 'dsr5', name: 'Mamun Mia', phone: '01744444444', area: 'Savar', status: 'Inactive' },
];

function createPool(connectionString) {
  return new Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=no-verify') ? { rejectUnauthorized: false } : undefined,
  });
}

function withPostgresDatabase(connectionString) {
  const url = new URL(connectionString);
  url.pathname = '/postgres';
  return url.toString();
}

let activeDatabaseUrl = DATABASE_URL;
let pool = createPool(activeDatabaseUrl);

const app = express();
app.use(express.json());

function createId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function cleanInteger(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function cleanMoney(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeProduct(input) {
  return {
    id: input.id || createId('p'),
    name: String(input.name || '').trim(),
    category: String(input.category || '').trim(),
    piecesPerCase: cleanInteger(input.piecesPerCase),
    purchasePrice: cleanMoney(input.purchasePrice),
    sellingPrice: cleanMoney(input.sellingPrice),
    stockPieces: cleanInteger(input.stockPieces),
  };
}

function normalizeDsr(input) {
  return {
    id: input.id || createId('dsr'),
    name: String(input.name || '').trim(),
    phone: String(input.phone || '').trim(),
    area: String(input.area || '').trim(),
    status: input.status === 'Inactive' ? 'Inactive' : 'Active',
  };
}

function normalizeIssue(input) {
  return {
    id: input.id || createId('issue'),
    date: String(input.date || '').trim(),
    dsrId: String(input.dsrId || '').trim(),
    dsrName: String(input.dsrName || '').trim(),
    area: String(input.area || '').trim(),
    phone: String(input.phone || '').trim(),
    items: Array.isArray(input.items)
      ? input.items.map((item) => ({
          productId: String(item.productId || '').trim(),
          productName: String(item.productName || '').trim(),
          piecesPerCase: cleanInteger(item.piecesPerCase),
          issuedPieces: cleanInteger(item.issuedPieces),
          rate: cleanMoney(item.rate),
        }))
      : [],
  };
}

function normalizeSettlement(input) {
  const items = Array.isArray(input.items)
    ? input.items.map((item) => {
        const issuedPieces = cleanInteger(item.issuedPieces);
        const returnedPieces = cleanInteger(item.returnedPieces);
        const soldPieces = Math.max(issuedPieces - returnedPieces, 0);
        const rate = cleanMoney(item.rate);
        return {
          productId: String(item.productId || '').trim(),
          productName: String(item.productName || '').trim(),
          piecesPerCase: cleanInteger(item.piecesPerCase),
          issuedPieces,
          returnedPieces,
          soldPieces,
          rate,
          payable: soldPieces * rate,
        };
      })
    : [];

  const totalPayable = items.reduce((sum, item) => sum + item.payable, 0);
  const amountPaid = Math.min(Math.max(0, cleanMoney(input.amountPaid)), totalPayable);

  return {
    id: input.id || createId('settlement'),
    date: String(input.date || '').trim(),
    dsrId: String(input.dsrId || '').trim(),
    dsrName: String(input.dsrName || '').trim(),
    area: String(input.area || '').trim(),
    phone: String(input.phone || '').trim(),
    issueIds: Array.isArray(input.issueIds) ? input.issueIds.map((item) => String(item)) : [],
    items,
    totalPayable,
    amountPaid,
    dueAmount: totalPayable - amountPaid,
    status: 'Completed',
  };
}

function assert(condition, message, status = 400) {
  if (!condition) {
    const error = new Error(message);
    error.status = status;
    throw error;
  }
}

function sumPiecesByProduct(items, field) {
  return items.reduce((map, item) => {
    const current = map.get(item.productId) || 0;
    map.set(item.productId, current + cleanInteger(item[field]));
    return map;
  }, new Map());
}

async function lockProducts(client, productIds) {
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  const productMap = new Map();

  for (const productId of uniqueIds) {
    const result = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [productId]);
    assert(result.rowCount > 0, 'Product not found.', 404);
    productMap.set(productId, result.rows[0]);
  }

  return productMap;
}

async function applyIssueInventoryDelta(client, previousItems, nextItems) {
  const previousTotals = sumPiecesByProduct(previousItems, 'issuedPieces');
  const nextTotals = sumPiecesByProduct(nextItems, 'issuedPieces');
  const productIds = [...new Set([...previousTotals.keys(), ...nextTotals.keys()])];
  const productMap = await lockProducts(client, productIds);

  for (const productId of productIds) {
    const previousIssued = previousTotals.get(productId) || 0;
    const nextIssued = nextTotals.get(productId) || 0;
    const difference = nextIssued - previousIssued;

    if (difference === 0) {
      continue;
    }

    const product = productMap.get(productId);
    if (difference > 0) {
      assert(Number(product.stock_pieces) >= difference, `${product.name} does not have enough available stock.`);
    }

    await client.query('UPDATE products SET stock_pieces = stock_pieces - $2 WHERE id = $1', [productId, difference]);
  }
}

async function applySettlementInventoryDelta(client, previousItems, nextItems) {
  const previousTotals = sumPiecesByProduct(previousItems, 'returnedPieces');
  const nextTotals = sumPiecesByProduct(nextItems, 'returnedPieces');
  const productIds = [...new Set([...previousTotals.keys(), ...nextTotals.keys()])];
  const productMap = await lockProducts(client, productIds);

  for (const productId of productIds) {
    const previousReturned = previousTotals.get(productId) || 0;
    const nextReturned = nextTotals.get(productId) || 0;
    const difference = nextReturned - previousReturned;

    if (difference === 0) {
      continue;
    }

    const product = productMap.get(productId);
    if (difference < 0) {
      assert(Number(product.stock_pieces) >= Math.abs(difference), `${product.name} does not have enough available stock for this settlement change.`);
    }

    await client.query('UPDATE products SET stock_pieces = stock_pieces + $2 WHERE id = $1', [productId, difference]);
  }
}

function syncSettlementItemsWithIssue(issueItems, settlementItems) {
  const settlementMap = new Map((Array.isArray(settlementItems) ? settlementItems : []).map((item) => [item.productId, item]));

  return issueItems.map((issueItem) => {
    const previousSettlementItem = settlementMap.get(issueItem.productId);
    const returnedPieces = cleanInteger(previousSettlementItem?.returnedPieces);
    assert(returnedPieces <= issueItem.issuedPieces, `${issueItem.productName} returned quantity cannot be greater than issued quantity after the issue update.`);
    const soldPieces = issueItem.issuedPieces - returnedPieces;
    const rate = cleanMoney(issueItem.rate);

    return {
      productId: issueItem.productId,
      productName: issueItem.productName,
      piecesPerCase: issueItem.piecesPerCase,
      issuedPieces: issueItem.issuedPieces,
      returnedPieces,
      soldPieces,
      rate,
      payable: soldPieces * rate,
    };
  });
}

async function readState(client) {
  const [productsResult, dsrsResult, issuesResult, settlementsResult] = await Promise.all([
    client.query('SELECT * FROM products ORDER BY created_at DESC'),
    client.query('SELECT * FROM dsrs ORDER BY created_at DESC'),
    client.query('SELECT * FROM issues ORDER BY created_at DESC'),
    client.query('SELECT * FROM settlements ORDER BY created_at DESC'),
  ]);

  return {
    products: productsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      piecesPerCase: Number(row.pieces_per_case),
      purchasePrice: Number(row.purchase_price),
      sellingPrice: Number(row.selling_price),
      stockPieces: Number(row.stock_pieces),
    })),
    dsrs: dsrsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      area: row.area,
      status: row.status,
    })),
    issues: issuesResult.rows.map((row) => ({
      id: row.id,
      date: row.issue_date,
      dsrId: row.dsr_id,
      dsrName: row.dsr_name,
      area: row.area,
      phone: row.phone,
      items: row.items,
    })),
    settlements: settlementsResult.rows.map((row) => ({
      id: row.id,
      date: row.settlement_date,
      dsrId: row.dsr_id,
      dsrName: row.dsr_name,
      area: row.area,
      phone: row.phone,
      issueIds: row.issue_ids,
      items: row.items,
      totalPayable: Number(row.total_payable),
      amountPaid: Number(row.amount_paid || 0),
      dueAmount: Number(row.due_amount || 0),
      status: row.status,
    })),
  };
}

async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function createSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      pieces_per_case INTEGER NOT NULL,
      purchase_price NUMERIC NOT NULL,
      selling_price NUMERIC NOT NULL,
      stock_pieces INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS dsrs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      area TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY,
      issue_date TEXT NOT NULL,
      dsr_id TEXT NOT NULL,
      dsr_name TEXT NOT NULL,
      area TEXT NOT NULL,
      phone TEXT NOT NULL,
      items JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      settlement_date TEXT NOT NULL,
      dsr_id TEXT NOT NULL,
      dsr_name TEXT NOT NULL,
      area TEXT NOT NULL,
      phone TEXT NOT NULL,
      issue_ids JSONB NOT NULL,
      items JSONB NOT NULL,
      total_payable NUMERIC NOT NULL,
      amount_paid NUMERIC NOT NULL DEFAULT 0,
      due_amount NUMERIC NOT NULL DEFAULT 0,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE settlements ADD COLUMN IF NOT EXISTS amount_paid NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE settlements ADD COLUMN IF NOT EXISTS due_amount NUMERIC NOT NULL DEFAULT 0;
  `);
}

async function seedTableIfEmpty(tableName, seedRows, insertRow) {
  const { rows } = await pool.query(`SELECT COUNT(*)::INTEGER AS count FROM ${tableName}`);
  if (rows[0].count > 0) {
    return;
  }

  for (const row of seedRows) {
    await insertRow(row);
  }
}

async function seedInitialData() {
  await seedTableIfEmpty(
    'products',
    initialProducts,
    (product) =>
      pool.query(
        `INSERT INTO products (id, name, category, pieces_per_case, purchase_price, selling_price, stock_pieces)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [product.id, product.name, product.category, product.piecesPerCase, product.purchasePrice, product.sellingPrice, product.stockPieces],
      ),
  );

  await seedTableIfEmpty(
    'dsrs',
    initialDsrs,
    (dsr) =>
      pool.query(
        `INSERT INTO dsrs (id, name, phone, area, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [dsr.id, dsr.name, dsr.phone, dsr.area, dsr.status],
      ),
  );
}

app.get('/api/state', async (_req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      res.json(await readState(client));
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

app.post('/api/products', async (req, res, next) => {
  try {
    const product = normalizeProduct(req.body);
    assert(product.name && product.category, 'Product name and category are required.');
    assert(product.piecesPerCase > 0, 'Pieces per case must be greater than zero.');
    assert(product.purchasePrice > 0 && product.sellingPrice > 0, 'Purchase price and selling price must be greater than zero.');

    const state = await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO products (id, name, category, pieces_per_case, purchase_price, selling_price, stock_pieces)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [product.id, product.name, product.category, product.piecesPerCase, product.purchasePrice, product.sellingPrice, product.stockPieces],
      );
      return readState(client);
    });

    res.status(201).json(state);
  } catch (error) {
    next(error);
  }
});

app.put('/api/products/:id', async (req, res, next) => {
  try {
    const product = normalizeProduct({ ...req.body, id: req.params.id });
    assert(product.name && product.category, 'Product name and category are required.');
    assert(product.piecesPerCase > 0, 'Pieces per case must be greater than zero.');
    assert(product.purchasePrice > 0 && product.sellingPrice > 0, 'Purchase price and selling price must be greater than zero.');

    const state = await withTransaction(async (client) => {
      const result = await client.query(
        `UPDATE products
         SET name = $2, category = $3, pieces_per_case = $4, purchase_price = $5, selling_price = $6, stock_pieces = $7
         WHERE id = $1`,
        [product.id, product.name, product.category, product.piecesPerCase, product.purchasePrice, product.sellingPrice, product.stockPieces],
      );
      assert(result.rowCount > 0, 'Product not found.', 404);
      return readState(client);
    });

    res.json(state);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/products/:id', async (req, res, next) => {
  try {
    const state = await withTransaction(async (client) => {
      const result = await client.query('DELETE FROM products WHERE id = $1', [req.params.id]);
      assert(result.rowCount > 0, 'Product not found.', 404);
      return readState(client);
    });

    res.json(state);
  } catch (error) {
    next(error);
  }
});

app.post('/api/products/:id/stock', async (req, res, next) => {
  try {
    const addPieces = cleanInteger(req.body.addPieces);
    assert(addPieces > 0, 'Stock update must be greater than zero.');

    const state = await withTransaction(async (client) => {
      const result = await client.query(
        `UPDATE products
         SET stock_pieces = stock_pieces + $2
         WHERE id = $1`,
        [req.params.id, addPieces],
      );
      assert(result.rowCount > 0, 'Product not found.', 404);
      return readState(client);
    });

    res.json(state);
  } catch (error) {
    next(error);
  }
});

app.post('/api/dsrs', async (req, res, next) => {
  try {
    const dsr = normalizeDsr(req.body);
    assert(dsr.name && dsr.phone && dsr.area, 'Name, phone, and area are required.');

    const state = await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO dsrs (id, name, phone, area, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [dsr.id, dsr.name, dsr.phone, dsr.area, dsr.status],
      );
      return readState(client);
    });

    res.status(201).json(state);
  } catch (error) {
    next(error);
  }
});

app.put('/api/dsrs/:id', async (req, res, next) => {
  try {
    const dsr = normalizeDsr({ ...req.body, id: req.params.id });
    assert(dsr.name && dsr.phone && dsr.area, 'Name, phone, and area are required.');

    const state = await withTransaction(async (client) => {
      const result = await client.query(
        `UPDATE dsrs
         SET name = $2, phone = $3, area = $4, status = $5
         WHERE id = $1`,
        [dsr.id, dsr.name, dsr.phone, dsr.area, dsr.status],
      );
      assert(result.rowCount > 0, 'DSR not found.', 404);

      // Keep historical issue and settlement sheets aligned with the latest DSR profile.
      await Promise.all([
        client.query(
          `UPDATE issues
           SET dsr_name = $2, phone = $3, area = $4
           WHERE dsr_id = $1`,
          [dsr.id, dsr.name, dsr.phone, dsr.area],
        ),
        client.query(
          `UPDATE settlements
           SET dsr_name = $2, phone = $3, area = $4
           WHERE dsr_id = $1`,
          [dsr.id, dsr.name, dsr.phone, dsr.area],
        ),
      ]);

      return readState(client);
    });

    res.json(state);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/dsrs/:id', async (req, res, next) => {
  try {
    const state = await withTransaction(async (client) => {
      const result = await client.query('DELETE FROM dsrs WHERE id = $1', [req.params.id]);
      assert(result.rowCount > 0, 'DSR not found.', 404);
      return readState(client);
    });

    res.json(state);
  } catch (error) {
    next(error);
  }
});

app.post('/api/issues', async (req, res, next) => {
  try {
    const issue = normalizeIssue(req.body);
    assert(issue.date && issue.dsrId, 'Issue date and DSR are required.');
    assert(issue.items.length > 0, 'Enter issue quantity for at least one product.');

    const state = await withTransaction(async (client) => {
      if (req.body?.id) {
        const existingIssue = await client.query('SELECT * FROM issues WHERE id = $1 LIMIT 1', [issue.id]);
        assert(existingIssue.rowCount > 0, 'Issue not found.', 404);

        const previousIssue = existingIssue.rows[0];
        const previousItems = Array.isArray(previousIssue.items) ? previousIssue.items : [];

        const settlementCheck = await client.query(
          'SELECT * FROM settlements WHERE settlement_date = $1 AND dsr_id = $2 LIMIT 1',
          [previousIssue.issue_date, previousIssue.dsr_id],
        );

        if (settlementCheck.rowCount > 0) {
          assert(
            issue.date === previousIssue.issue_date && issue.dsrId === previousIssue.dsr_id,
            'When a settlement already exists, the morning issue date and DSR cannot be changed.',
          );
        }

        const targetSettlementCheck =
          issue.date === previousIssue.issue_date && issue.dsrId === previousIssue.dsr_id
            ? settlementCheck
            : await client.query(
                'SELECT * FROM settlements WHERE settlement_date = $1 AND dsr_id = $2 LIMIT 1',
                [issue.date, issue.dsrId],
              );

        const duplicateIssue = await client.query(
          'SELECT id FROM issues WHERE issue_date = $1 AND dsr_id = $2 AND id <> $3 LIMIT 1',
          [issue.date, issue.dsrId, issue.id],
        );
        assert(duplicateIssue.rowCount === 0, 'Another morning issue already exists for this DSR and date.');

        const dsrResult = await client.query('SELECT * FROM dsrs WHERE id = $1 LIMIT 1', [issue.dsrId]);
        assert(dsrResult.rowCount > 0, 'Select a valid DSR.');

        await applyIssueInventoryDelta(client, previousItems, issue.items);

        await client.query(
          `UPDATE issues
           SET issue_date = $2, dsr_id = $3, dsr_name = $4, area = $5, phone = $6, items = $7::jsonb
           WHERE id = $1`,
          [issue.id, issue.date, issue.dsrId, issue.dsrName, issue.area, issue.phone, JSON.stringify(issue.items)],
        );

        if (targetSettlementCheck.rowCount > 0) {
          const existingSettlement = targetSettlementCheck.rows[0];
          const nextSettlementItems = syncSettlementItemsWithIssue(issue.items, existingSettlement.items);
          const nextTotalPayable = nextSettlementItems.reduce((sum, item) => sum + Number(item.payable || 0), 0);

          await applySettlementInventoryDelta(client, existingSettlement.items, nextSettlementItems);

          await client.query(
            `UPDATE settlements
             SET settlement_date = $2, dsr_id = $3, dsr_name = $4, area = $5, phone = $6, issue_ids = $7::jsonb, items = $8::jsonb, total_payable = $9
             WHERE id = $1`,
            [
              existingSettlement.id,
              issue.date,
              issue.dsrId,
              issue.dsrName,
              issue.area,
              issue.phone,
              JSON.stringify([issue.id]),
              JSON.stringify(nextSettlementItems),
              nextTotalPayable,
            ],
          );
        }

        return readState(client);
      }

      const settlementResult = await client.query(
        'SELECT id FROM settlements WHERE settlement_date = $1 AND dsr_id = $2 LIMIT 1',
        [issue.date, issue.dsrId],
      );
      assert(settlementResult.rowCount === 0, 'Settlement is already completed for this DSR and date.');

      const dsrResult = await client.query('SELECT * FROM dsrs WHERE id = $1 LIMIT 1', [issue.dsrId]);
      assert(dsrResult.rowCount > 0, 'Select a valid DSR.');

      const existingIssue = await client.query(
        'SELECT id FROM issues WHERE issue_date = $1 AND dsr_id = $2 LIMIT 1',
        [issue.date, issue.dsrId],
      );
      assert(existingIssue.rowCount === 0, 'Morning issue already exists for this DSR and date. Edit that issue instead.');

      await applyIssueInventoryDelta(client, [], issue.items);

      await client.query(
        `INSERT INTO issues (id, issue_date, dsr_id, dsr_name, area, phone, items)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [issue.id, issue.date, issue.dsrId, issue.dsrName, issue.area, issue.phone, JSON.stringify(issue.items)],
      );

      return readState(client);
    });

    res.status(201).json(state);
  } catch (error) {
    next(error);
  }
});

app.put('/api/issues/:id', async (req, res, next) => {
  try {
    const issue = normalizeIssue({ ...req.body, id: req.params.id });
    assert(issue.date && issue.dsrId, 'Issue date and DSR are required.');
    assert(issue.items.length > 0, 'Enter issue quantity for at least one product.');

    const state = await withTransaction(async (client) => {
      const existingIssue = await client.query('SELECT * FROM issues WHERE id = $1 LIMIT 1', [issue.id]);
      assert(existingIssue.rowCount > 0, 'Issue not found.', 404);

      const previousIssue = existingIssue.rows[0];
      const previousItems = Array.isArray(previousIssue.items) ? previousIssue.items : [];

      const settlementCheck = await client.query(
        'SELECT id FROM settlements WHERE settlement_date = $1 AND dsr_id = $2 LIMIT 1',
        [previousIssue.issue_date, previousIssue.dsr_id],
      );
      assert(settlementCheck.rowCount === 0, 'This issue already has a completed settlement and cannot be edited.');

      const targetSettlementCheck = await client.query(
        'SELECT id FROM settlements WHERE settlement_date = $1 AND dsr_id = $2 LIMIT 1',
        [issue.date, issue.dsrId],
      );
      assert(targetSettlementCheck.rowCount === 0, 'Settlement is already completed for this DSR and date.');

      const duplicateIssue = await client.query(
        'SELECT id FROM issues WHERE issue_date = $1 AND dsr_id = $2 AND id <> $3 LIMIT 1',
        [issue.date, issue.dsrId, issue.id],
      );
      assert(duplicateIssue.rowCount === 0, 'Another morning issue already exists for this DSR and date.');

      const dsrResult = await client.query('SELECT * FROM dsrs WHERE id = $1 LIMIT 1', [issue.dsrId]);
      assert(dsrResult.rowCount > 0, 'Select a valid DSR.');

      await applyIssueInventoryDelta(client, previousItems, issue.items);

      await client.query(
        `UPDATE issues
         SET issue_date = $2, dsr_id = $3, dsr_name = $4, area = $5, phone = $6, items = $7::jsonb
         WHERE id = $1`,
        [issue.id, issue.date, issue.dsrId, issue.dsrName, issue.area, issue.phone, JSON.stringify(issue.items)],
      );

      return readState(client);
    });

    res.json(state);
  } catch (error) {
    next(error);
  }
});

app.post('/api/settlements', async (req, res, next) => {
  try {
    const settlement = normalizeSettlement(req.body);
    assert(settlement.date && settlement.dsrId, 'Settlement date and DSR are required.');
    assert(settlement.items.length > 0, 'No morning issue found for this DSR and date.');

    const state = await withTransaction(async (client) => {
      if (req.body?.id) {
        const existingSettlement = await client.query('SELECT * FROM settlements WHERE id = $1 LIMIT 1', [settlement.id]);
        assert(existingSettlement.rowCount > 0, 'Settlement not found.', 404);

        const previousSettlement = existingSettlement.rows[0];
        const previousItems = Array.isArray(previousSettlement.items) ? previousSettlement.items : [];

        const duplicateSettlement = await client.query(
          'SELECT id FROM settlements WHERE settlement_date = $1 AND dsr_id = $2 AND id <> $3 LIMIT 1',
          [settlement.date, settlement.dsrId, settlement.id],
        );
        assert(duplicateSettlement.rowCount === 0, 'Another settlement already exists for this DSR and date.');

        const issueResult = await client.query(
          'SELECT id FROM issues WHERE issue_date = $1 AND dsr_id = $2 LIMIT 1',
          [settlement.date, settlement.dsrId],
        );
        assert(issueResult.rowCount > 0, 'No morning issue found for this DSR and date.');

        for (const item of settlement.items) {
          assert(item.returnedPieces <= item.issuedPieces, 'Returned quantity cannot be greater than issued quantity.');
        }

        await applySettlementInventoryDelta(client, previousItems, settlement.items);

        await client.query(
          `UPDATE settlements
           SET settlement_date = $2, dsr_id = $3, dsr_name = $4, area = $5, phone = $6, issue_ids = $7::jsonb, items = $8::jsonb, total_payable = $9, amount_paid = $10, due_amount = $11, status = $12
           WHERE id = $1`,
          [
            settlement.id,
            settlement.date,
            settlement.dsrId,
            settlement.dsrName,
            settlement.area,
            settlement.phone,
            JSON.stringify(settlement.issueIds),
            JSON.stringify(settlement.items),
            settlement.totalPayable,
            settlement.amountPaid,
            settlement.dueAmount,
            settlement.status,
          ],
        );

        return readState(client);
      }

      const existingSettlement = await client.query(
        'SELECT id FROM settlements WHERE settlement_date = $1 AND dsr_id = $2 LIMIT 1',
        [settlement.date, settlement.dsrId],
      );
      assert(existingSettlement.rowCount === 0, 'Settlement is already completed for this DSR and date.');

      const issueResult = await client.query(
        'SELECT id FROM issues WHERE issue_date = $1 AND dsr_id = $2 LIMIT 1',
        [settlement.date, settlement.dsrId],
      );
      assert(issueResult.rowCount > 0, 'No morning issue found for this DSR and date.');

      for (const item of settlement.items) {
        assert(item.returnedPieces <= item.issuedPieces, 'Returned quantity cannot be greater than issued quantity.');
      }

      await applySettlementInventoryDelta(client, [], settlement.items);

      await client.query(
        `INSERT INTO settlements (id, settlement_date, dsr_id, dsr_name, area, phone, issue_ids, items, total_payable, amount_paid, due_amount, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12)`,
        [
          settlement.id,
          settlement.date,
          settlement.dsrId,
          settlement.dsrName,
          settlement.area,
          settlement.phone,
          JSON.stringify(settlement.issueIds),
          JSON.stringify(settlement.items),
          settlement.totalPayable,
          settlement.amountPaid,
          settlement.dueAmount,
          settlement.status,
        ],
      );

      return readState(client);
    });

    res.status(201).json(state);
  } catch (error) {
    next(error);
  }
});

app.put('/api/settlements/:id', async (req, res, next) => {
  try {
    const settlement = normalizeSettlement({ ...req.body, id: req.params.id });
    assert(settlement.date && settlement.dsrId, 'Settlement date and DSR are required.');
    assert(settlement.items.length > 0, 'No morning issue found for this DSR and date.');

    const state = await withTransaction(async (client) => {
      const existingSettlement = await client.query('SELECT * FROM settlements WHERE id = $1 LIMIT 1', [settlement.id]);
      assert(existingSettlement.rowCount > 0, 'Settlement not found.', 404);

      const previousSettlement = existingSettlement.rows[0];
      const previousItems = Array.isArray(previousSettlement.items) ? previousSettlement.items : [];

      const duplicateSettlement = await client.query(
        'SELECT id FROM settlements WHERE settlement_date = $1 AND dsr_id = $2 AND id <> $3 LIMIT 1',
        [settlement.date, settlement.dsrId, settlement.id],
      );
      assert(duplicateSettlement.rowCount === 0, 'Another settlement already exists for this DSR and date.');

      const issueResult = await client.query(
        'SELECT id FROM issues WHERE issue_date = $1 AND dsr_id = $2 LIMIT 1',
        [settlement.date, settlement.dsrId],
      );
      assert(issueResult.rowCount > 0, 'No morning issue found for this DSR and date.');

      for (const item of settlement.items) {
        assert(item.returnedPieces <= item.issuedPieces, 'Returned quantity cannot be greater than issued quantity.');
      }

      await applySettlementInventoryDelta(client, previousItems, settlement.items);

      await client.query(
        `UPDATE settlements
         SET settlement_date = $2, dsr_id = $3, dsr_name = $4, area = $5, phone = $6, issue_ids = $7::jsonb, items = $8::jsonb, total_payable = $9, amount_paid = $10, due_amount = $11, status = $12
         WHERE id = $1`,
        [
          settlement.id,
          settlement.date,
          settlement.dsrId,
          settlement.dsrName,
          settlement.area,
          settlement.phone,
          JSON.stringify(settlement.issueIds),
          JSON.stringify(settlement.items),
          settlement.totalPayable,
          settlement.amountPaid,
          settlement.dueAmount,
          settlement.status,
        ],
      );

      return readState(client);
    });

    res.json(state);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ message: error.message || 'Internal server error.' });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

async function start() {
  try {
    await createSchema();
  } catch (error) {
    if (error.code !== '3D000') {
      throw error;
    }

    await pool.end();
    activeDatabaseUrl = withPostgresDatabase(DATABASE_URL);
    pool = createPool(activeDatabaseUrl);
    await createSchema();
  }

  await seedInitialData();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (activeDatabaseUrl !== DATABASE_URL) {
      console.log('DATABASE_URL database name was unavailable, using "postgres" instead.');
    }
  });
}

start().catch((error) => {
  console.error('Failed to start server');
  console.error(error);
  process.exit(1);
});
