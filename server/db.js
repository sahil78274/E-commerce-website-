import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
mkdirSync('data',{recursive:true});
export const db = new DatabaseSync(process.env.DB_PATH || 'data/bunavat.sqlite');
db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, sku TEXT UNIQUE NOT NULL, name TEXT NOT NULL, gender TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL, material TEXT NOT NULL, price INTEGER NOT NULL, sale_price INTEGER NOT NULL, image TEXT NOT NULL, featured INTEGER DEFAULT 0, active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS variants(id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id), size TEXT NOT NULL, colour TEXT NOT NULL, stock INTEGER NOT NULL CHECK(stock>=0), UNIQUE(product_id,size,colour));
CREATE TABLE IF NOT EXISTS cart(user_id INTEGER NOT NULL REFERENCES users(id), variant_id INTEGER NOT NULL REFERENCES variants(id), quantity INTEGER NOT NULL CHECK(quantity>0), PRIMARY KEY(user_id,variant_id));
CREATE TABLE IF NOT EXISTS wishlist(user_id INTEGER NOT NULL REFERENCES users(id), product_id INTEGER NOT NULL REFERENCES products(id), PRIMARY KEY(user_id,product_id));
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY, number TEXT UNIQUE NOT NULL, user_id INTEGER NOT NULL REFERENCES users(id), name TEXT NOT NULL, phone TEXT NOT NULL, address TEXT NOT NULL, city TEXT NOT NULL, state TEXT NOT NULL, pin TEXT NOT NULL, instructions TEXT, subtotal INTEGER NOT NULL, shipping INTEGER NOT NULL, total INTEGER NOT NULL, payment_method TEXT NOT NULL, payment_status TEXT NOT NULL, status TEXT NOT NULL, tracking TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS order_items(id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id), variant_id INTEGER NOT NULL REFERENCES variants(id), name TEXT NOT NULL, size TEXT NOT NULL, colour TEXT NOT NULL, price INTEGER NOT NULL, quantity INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS timeline(id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id), status TEXT NOT NULL, note TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS returns(id INTEGER PRIMARY KEY, order_id INTEGER UNIQUE NOT NULL REFERENCES orders(id), reason TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'Requested', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS reviews(id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id), user_id INTEGER NOT NULL REFERENCES users(id), rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(product_id,user_id));
CREATE TABLE IF NOT EXISTS review_reports(id INTEGER PRIMARY KEY, review_id INTEGER NOT NULL REFERENCES reviews(id), user_id INTEGER NOT NULL REFERENCES users(id), reason TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(review_id,user_id));
CREATE TABLE IF NOT EXISTS newsletter(email TEXT PRIMARY KEY, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_products_gender ON products(gender,active); CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id,created_at);`);

// Schema upgrade for databases created by the previous version. Each change is additive,
// so orders and their variant references remain intact.
function addColumn(table, name, definition) {
 if (!db.prepare(`PRAGMA table_info(${table})`).all().some(c=>c.name===name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
}
for (const [name,def] of Object.entries({status:"TEXT NOT NULL DEFAULT 'active'",subcategory:"TEXT NOT NULL DEFAULT ''",brand:"TEXT NOT NULL DEFAULT ''",fit:"TEXT NOT NULL DEFAULT ''",specifications:"TEXT NOT NULL DEFAULT ''",offer_price:'INTEGER',new_arrival:'INTEGER NOT NULL DEFAULT 0',best_seller:'INTEGER NOT NULL DEFAULT 0'})) addColumn('products',name,def);
addColumn('variants','enabled','INTEGER NOT NULL DEFAULT 1');
addColumn('variants','sku',"TEXT NOT NULL DEFAULT ''");
db.exec(`CREATE TABLE IF NOT EXISTS product_images(product_id INTEGER NOT NULL REFERENCES products(id), url TEXT NOT NULL, position INTEGER NOT NULL, PRIMARY KEY(product_id,url));
CREATE TABLE IF NOT EXISTS uploads(url TEXT PRIMARY KEY, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS migrations(name TEXT PRIMARY KEY, applied_at TEXT DEFAULT CURRENT_TIMESTAMP);`);
// Remove only the exact legacy seed records. Rows referenced by orders or reviews are
// archived instead, because historical transactions must never be destroyed.
if (!db.prepare("SELECT 1 FROM migrations WHERE name='remove_legacy_catalogue_v1'").get()) {
 db.exec('BEGIN IMMEDIATE');
 try {
  const legacy=[['BV-W-001','the-everyday-linen-shirt','/images/women.png'],['BV-M-001','the-weekend-linen-shirt','/images/men.png'],['BV-W-002','terracotta-midi-dress','/images/dress.png'],['BV-M-002','textured-camp-shirt','/images/man-shirt.png'],['BV-W-003','linen-coord-set','/images/women.png'],['BV-M-003','olive-resort-shirt','/images/men.png'],['BV-W-004','sunset-day-dress','/images/dress.png'],['BV-M-004','sunday-cotton-shirt','/images/man-shirt.png']];
  for (const [sku,slug,image] of legacy) {
   const p=db.prepare('SELECT id FROM products WHERE sku=? AND slug=? AND image=?').get(sku,slug,image);
   if(!p) continue;
   const used=db.prepare('SELECT 1 FROM order_items i JOIN variants v ON v.id=i.variant_id WHERE v.product_id=? UNION SELECT 1 FROM reviews WHERE product_id=? LIMIT 1').get(p.id,p.id);
   if(used) db.prepare("UPDATE products SET active=0,status='inactive' WHERE id=?").run(p.id);
   else {
    db.prepare('DELETE FROM cart WHERE variant_id IN (SELECT id FROM variants WHERE product_id=?)').run(p.id);
    db.prepare('DELETE FROM wishlist WHERE product_id=?').run(p.id);
    db.prepare('DELETE FROM variants WHERE product_id=?').run(p.id);
    db.prepare('DELETE FROM products WHERE id=?').run(p.id);
   }
  }
  // Legacy products using decorative images need an owner upload before publication.
  db.exec("UPDATE products SET status=CASE WHEN active=1 THEN 'active' ELSE 'inactive' END; UPDATE products SET status='draft',active=0 WHERE image NOT LIKE '/uploads/%' AND active=1;");
  db.exec("INSERT OR IGNORE INTO uploads(url) SELECT image FROM products WHERE image LIKE '/uploads/%'; INSERT OR IGNORE INTO product_images(product_id,url,position) SELECT id,image,0 FROM products WHERE image LIKE '/uploads/%';");
  db.prepare("INSERT INTO migrations(name) VALUES('remove_legacy_catalogue_v1')").run();
  db.exec('COMMIT');
 } catch(e){db.exec('ROLLBACK');throw e;}
}
