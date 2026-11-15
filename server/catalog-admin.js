import crypto from 'node:crypto';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import sharp from 'sharp';
import {S3Client,PutObjectCommand,GetObjectCommand} from '@aws-sdk/client-s3';

// Files are stored on a persistent filesystem, not in the build directory.
export function mountCatalogAdmin({app,db,auth,admin,wrap}) {
 const q=(s,...a)=>db.prepare(s).all(...a), one=(s,...a)=>db.prepare(s).get(...a), run=(s,...a)=>db.prepare(s).run(...a);
 const uploadDir=process.env.UPLOAD_DIR||'data/uploads',useS3=process.env.IMAGE_STORAGE==='s3';
 if(process.env.IMAGE_STORAGE&&!['local','s3'].includes(process.env.IMAGE_STORAGE))throw Error('IMAGE_STORAGE must be local or s3');
 let s3=null;const bucket=process.env.S3_BUCKET;
 if(useS3){if(!bucket||!process.env.AWS_REGION)throw Error('S3_BUCKET and AWS_REGION are required for S3 image storage');s3=new S3Client({region:process.env.AWS_REGION,...(process.env.S3_ENDPOINT?{endpoint:process.env.S3_ENDPOINT,forcePathStyle:true}:{})});
  app.get('/uploads/:name',async(req,res)=>{try{if(!/^[a-zA-Z0-9_-]+\.(webp|png|jpg|jpeg)$/.test(req.params.name)||!one('SELECT 1 FROM uploads WHERE url=?','/uploads/'+req.params.name))return res.sendStatus(404);let obj=await s3.send(new GetObjectCommand({Bucket:bucket,Key:req.params.name}));res.set('Content-Type',obj.ContentType||'application/octet-stream');res.set('Cache-Control','public, max-age=86400');obj.Body.on('error',()=>res.destroy());obj.Body.pipe(res)}catch(e){console.error('Image storage read failed',e);res.sendStatus(404)}});
 } else {mkdirSync(uploadDir,{recursive:true});app.use('/uploads',staticFiles(uploadDir));}
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1}});
 app.post('/api/admin/upload',auth,admin,(req,res,next)=>upload.single('image')(req,res,e=>e?res.status(400).json({error:e.code==='LIMIT_FILE_SIZE'?'Image must be 5 MB or smaller':'Could not upload image'}):next()),async(req,res)=>{
  try {
   if(!req.file) throw Error('Select an image');
   const image=sharp(req.file.buffer,{limitInputPixels:40000000}); const meta=await image.metadata();
   if(!['jpeg','png','webp'].includes(meta.format)||!meta.width||!meta.height) throw Error('Use a valid JPEG, PNG or WebP image');
   const encoded=await image.rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
   const name=crypto.randomBytes(20).toString('hex')+'.webp',url='/uploads/'+name;
   if(useS3)await s3.send(new PutObjectCommand({Bucket:bucket,Key:name,Body:encoded,ContentType:'image/webp'}));else writeFileSync(path.join(uploadDir,name),encoded,{flag:'wx'});run('INSERT INTO uploads(url) VALUES(?)',url);res.json({url});
  } catch(e){res.status(400).json({error:e.message.includes('Input buffer')?'Use a valid JPEG, PNG or WebP image':e.message})}
 });
 function text(v,max,label){if(v==null)return '';if(typeof v!=='string')throw Error(`${label} must be text`);v=v.trim();if(v.length>max)throw Error(`${label} is too long`);return v}
 function integer(v,label){if(v==null||v==='')return 0;let n=Number(v);if(!Number.isSafeInteger(n)||n<0||n>10000000)throw Error(`${label} must be a non-negative whole number`);return n}
 function parse(body,old){
  let name=text(body.name,160,'Product name'),sku=text(body.sku,80,'SKU'),category=text(body.category,80,'Category'),description=text(body.description,3000,'Description');
  let status=body.status||'draft';if(!['draft','active','inactive'].includes(status))throw Error('Choose a valid status');
  let gender=text(body.gender,20,'Gender');if(gender&&!['Men','Women','Unisex'].includes(gender))throw Error('Choose a valid gender');
  let price=integer(body.price,'MRP'),sale_price=integer(body.sale_price,'Selling price'),offer_price=body.offer_price==null||body.offer_price===''?null:integer(body.offer_price,'Offer price');
  if((price&&sale_price>price)||(offer_price!==null&&(!offer_price||!sale_price||offer_price>sale_price)))throw Error('Selling price cannot exceed MRP; offer price must be positive and no higher than selling price');
  let images=body.images??[];if(!Array.isArray(images)||images.length>12||new Set(images).size!==images.length)throw Error('Choose up to 12 distinct images');
  for(const url of images){if(typeof url!=='string'||!/^\/uploads\/[a-zA-Z0-9_-]+\.(webp|png|jpg|jpeg)$/.test(url)||!one('SELECT 1 FROM uploads WHERE url=?',url)||(!useS3&&!existsSync(path.join(uploadDir,path.basename(url)))))throw Error('Images must be uploaded through the admin panel');}
  let variants=body.variants??[];if(!Array.isArray(variants)||variants.length>200)throw Error('Enter up to 200 variants');let keys=new Set();
  variants=variants.map(v=>{if(v.stock==null||v.stock==='')throw Error('Enter stock for every variant');let size=text(v.size,40,'Size'),colour=text(v.colour,60,'Colour'),variantSku=text(v.sku,80,'Variant SKU'),stock=integer(v.stock,'Stock');if(!size||!colour)throw Error('Each variant needs a size and colour');let key=(size+'\0'+colour).toLowerCase();if(keys.has(key))throw Error('Each size and colour combination must be unique');keys.add(key);return {id:v.id?Number(v.id):null,size,colour,sku:variantSku,stock}});
  if(status==='active'&&(!name||!sku||sku.startsWith('__draft_')||!description||!category||!gender||!price||!sale_price||!images.length||!variants.length))throw Error('To publish, provide a name, unique SKU, description, category, gender, MRP, selling price, uploaded image and at least one variant');
  let slug=text(body.slug,180,'Slug').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');if(!slug)slug=(name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'draft')+'-'+crypto.randomBytes(4).toString('hex');
  if(!sku)sku=old?.sku?.startsWith('__draft_')?old.sku:'__draft_'+crypto.randomBytes(12).toString('hex');
  if(one('SELECT id FROM products WHERE sku=? COLLATE NOCASE AND id<>?',sku,old?.id||0))throw Error('Product SKU is already in use');
  if(one('SELECT id FROM products WHERE slug=? AND id<>?',slug,old?.id||0))throw Error('Product URL slug is already in use');
  return {name,slug,sku,category,description,gender,price,sale_price,offer_price,status,images,variants,subcategory:text(body.subcategory,80,'Subcategory'),brand:text(body.brand,100,'Brand'),material:text(body.material,100,'Fabric'),fit:text(body.fit,100,'Fit'),specifications:text(body.specifications,4000,'Specifications'),featured:body.featured?1:0,new_arrival:body.new_arrival?1:0,best_seller:body.best_seller?1:0};
 }
 function save(body,id){
  let old=id?one('SELECT * FROM products WHERE id=?',id):null;if(id&&!old)throw Error('Product not found');let p=parse(body,old);
  db.exec('BEGIN IMMEDIATE');try{
   if(old)run('UPDATE products SET slug=?,sku=?,name=?,gender=?,category=?,description=?,material=?,price=?,sale_price=?,image=?,active=?,status=?,subcategory=?,brand=?,fit=?,specifications=?,offer_price=?,featured=?,new_arrival=?,best_seller=? WHERE id=?',p.slug,p.sku,p.name,p.gender,p.category,p.description,p.material,p.price,p.sale_price,p.images[0]||'',p.status==='active'?1:0,p.status,p.subcategory,p.brand,p.fit,p.specifications,p.offer_price,p.featured,p.new_arrival,p.best_seller,id);
   else id=Number(run('INSERT INTO products(slug,sku,name,gender,category,description,material,price,sale_price,image,active,status,subcategory,brand,fit,specifications,offer_price,featured,new_arrival,best_seller) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',p.slug,p.sku,p.name,p.gender,p.category,p.description,p.material,p.price,p.sale_price,p.images[0]||'',p.status==='active'?1:0,p.status,p.subcategory,p.brand,p.fit,p.specifications,p.offer_price,p.featured,p.new_arrival,p.best_seller).lastInsertRowid);
   run('DELETE FROM product_images WHERE product_id=?',id);p.images.forEach((url,i)=>run('INSERT INTO product_images VALUES(?,?,?)',id,url,i));
   run('UPDATE variants SET enabled=0 WHERE product_id=?',id);
   for(let v of p.variants){
    let existing=v.id?one('SELECT * FROM variants WHERE id=? AND product_id=?',v.id,id):one('SELECT * FROM variants WHERE product_id=? AND size=? AND colour=?',id,v.size,v.colour);
    if(v.id&&!existing)throw Error('Variant does not belong to this product');
    if(existing&&(existing.size!==v.size||existing.colour!==v.colour))throw Error('Remove and add a variant to change its size or colour');
    if(v.sku&&one('SELECT id FROM variants WHERE sku=? COLLATE NOCASE AND id<>?',v.sku,existing?.id||0))throw Error('Variant SKU is already in use');
    if(existing)run('UPDATE variants SET stock=?,sku=?,enabled=1 WHERE id=?',v.stock,v.sku,existing.id);
    else run('INSERT INTO variants(product_id,size,colour,stock,sku,enabled) VALUES(?,?,?,?,?,1)',id,v.size,v.colour,v.stock,v.sku);
   }
   db.exec('COMMIT');return id;
  }catch(e){db.exec('ROLLBACK');throw e}
 }
 app.post('/api/admin/products',auth,admin,wrap((req,res)=>res.json({id:save(req.body,null)})));
 app.get('/api/admin/products/:id',auth,admin,wrap((req,res)=>{let p=one('SELECT * FROM products WHERE id=?',Number(req.params.id));if(!p)return res.status(404).json({error:'Product not found'});p.variants=q('SELECT id,size,colour,stock,sku FROM variants WHERE product_id=? AND enabled=1',p.id);p.images=q('SELECT url FROM product_images WHERE product_id=? ORDER BY position',p.id).map(x=>x.url);if(p.sku.startsWith('__draft_'))p.sku='';res.json(p)}));
 app.put('/api/admin/products/:id',auth,admin,wrap((req,res)=>res.json({id:save(req.body,Number(req.params.id))})));
 app.delete('/api/admin/products/:id',auth,admin,wrap((req,res)=>{if(!run("UPDATE products SET active=0,status='inactive' WHERE id=?",Number(req.params.id)).changes)throw Error('Product not found');res.json({ok:true})}));
}
import express from 'express';
function staticFiles(dir){return express.static(dir,{fallthrough:false,maxAge:'1d'});}
