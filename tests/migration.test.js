import {test} from 'node:test'; import assert from 'node:assert/strict'; import {DatabaseSync} from 'node:sqlite'; import {readFileSync,rmSync} from 'node:fs'; import {spawnSync} from 'node:child_process';
test('legacy seed cleanup preserves owner products and historical orders',()=>{
 const file=`data/migration-test-${process.pid}.sqlite`;let db=new DatabaseSync(file);try{
  const schema=readFileSync('server/db.js','utf8').match(/db\.exec\(`([\s\S]*?)`\);/)[1];db.exec(schema);
  let add=db.prepare('INSERT INTO products(slug,sku,name,gender,category,description,material,price,sale_price,image) VALUES(?,?,?,?,?,?,?,?,?,?)');
  let a=Number(add.run('the-everyday-linen-shirt','BV-W-001','Original','Women','Shirts','desc','cotton',100,90,'/images/women.png').lastInsertRowid);
  let b=Number(add.run('the-weekend-linen-shirt','BV-M-001','Original','Men','Shirts','desc','cotton',100,90,'/images/men.png').lastInsertRowid);
  let c=Number(add.run('owner-product','OWNER','Owner product','Men','Shirts','desc','cotton',100,90,'/uploads/owner.jpg').lastInsertRowid);
  let v=Number(db.prepare('INSERT INTO variants(product_id,size,colour,stock) VALUES(?,?,?,?)').run(b,'M','Black',1).lastInsertRowid);
  db.exec("INSERT INTO users(id,name,email,password) VALUES(1,'User','user@example.com','hash'); INSERT INTO orders(id,number,user_id,name,phone,address,city,state,pin,subtotal,shipping,total,payment_method,payment_status,status) VALUES(1,'ORDER',1,'User','9876543210','Address','City','State','110001',90,0,90,'COD','Pending','Order Placed');");
  db.prepare('INSERT INTO order_items(order_id,variant_id,name,size,colour,price,quantity) VALUES(?,?,?,?,?,?,?)').run(1,v,'Original','M','Black',90,1);db.close();
  let migration=spawnSync(process.execPath,['--input-type=module','-e',"import './server/db.js'"],{env:{...process.env,DB_PATH:file}});assert.equal(migration.status,0,migration.stderr.toString());
  db=new DatabaseSync(file);assert.equal(db.prepare('SELECT * FROM products WHERE id=?').get(a),undefined);assert.equal(db.prepare('SELECT active FROM products WHERE id=?').get(b).active,0);assert.equal(db.prepare('SELECT active FROM products WHERE id=?').get(c).active,1);assert.equal(db.prepare('SELECT count(*) n FROM order_items').get().n,1);assert.equal(db.prepare('SELECT url FROM product_images WHERE product_id=?').get(c).url,'/uploads/owner.jpg');
 }finally{try{db.close()}catch{};for(const ext of ['','-wal','-shm'])rmSync(file+ext,{force:true})}
});
