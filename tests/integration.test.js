import {test} from 'node:test'; import assert from 'node:assert/strict'; import {spawn,spawnSync} from 'node:child_process'; import {rmSync,readFileSync} from 'node:fs'; import sharp from 'sharp';
test('empty catalogue, owner publication, variant inventory, order privacy and archival',async()=>{
 const port=34000+Math.floor(Math.random()*10000),db=`data/test-${port}.sqlite`,uploadDir=`data/test-uploads-${port}`,env={...process.env,PORT:String(port),DB_PATH:db,UPLOAD_DIR:uploadDir,NODE_ENV:'production'};
 let server;function start(){server=spawn(process.execPath,['server/index.js'],{env,stdio:'ignore'});return server}start();let url=`http://127.0.0.1:${port}/api`;
 try{
  for(let i=0;i<100;i++){try{await fetch(url+'/me');break}catch{await new Promise(r=>setTimeout(r,50))}}
  async function req(path,{method='GET',body,cookie,raw}={}){let r=await fetch(url+path,{method,headers:{...(raw?{}:{'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{})},body:raw||(body?JSON.stringify(body):undefined)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}}
  assert.equal((await fetch(`http://127.0.0.1:${port}/`)).status,200);assert.deepEqual((await req('/products')).data,[]);
  let setup=spawnSync(process.execPath,['server/admin.js'],{env:{...env,ADMIN_NAME:'Owner',ADMIN_EMAIL:'owner@test.local',ADMIN_PASSWORD:'ownerpassword'}});assert.equal(setup.status,0,setup.stderr.toString());
  let alice=(await req('/register',{method:'POST',body:{name:'Alice',email:'alice@test.local',password:'password123',role:'admin'}})).cookie;
  assert.equal((await req('/admin/products',{cookie:alice})).status,403);assert.equal((await req('/admin/products',{method:'POST',cookie:alice,body:{}})).status,403);
  const owner=(await req('/login',{method:'POST',body:{email:'owner@test.local',password:'ownerpassword'}})).cookie;assert.ok(owner);
  let img=await sharp({create:{width:32,height:32,channels:3,background:'#cc8844'}}).png().toBuffer();
  async function upload(){let form=new FormData();form.append('image',new Blob([img],{type:'image/png'}),'photo.png');return req('/admin/upload',{method:'POST',cookie:owner,raw:form})}
  let u=await upload(),u2=await upload();assert.equal(u.status,200);assert.equal((await fetch(`http://127.0.0.1:${port}${u.data.url}`)).status,200);assert.ok(readFileSync(`${uploadDir}/${u.data.url.split('/').pop()}`).length>0);
  assert.equal((await req('/admin/products',{method:'POST',cookie:owner,body:{status:'active'}})).status,400);
  let draft=await req('/admin/products',{method:'POST',cookie:owner,body:{name:'Incomplete',status:'draft'}});assert.equal(draft.status,200);assert.equal((await req('/products')).data.length,0);
  let body={name:'Test garment',sku:'OWNER-TEST-1',gender:'Unisex',category:'T-shirts',subcategory:'Oversized',brand:'Owner',description:'Actual product description',material:'Cotton',fit:'Relaxed',specifications:'Care: hand wash',price:1200,sale_price:1000,offer_price:900,images:[u.data.url,u2.data.url],status:'active',new_arrival:true,variants:[{colour:'Black',size:'S',stock:3,sku:'BLACK-S'},{colour:'Black',size:'M',stock:4},{colour:'White',size:'S',stock:2}]};
  assert.equal((await req('/admin/products',{method:'POST',cookie:owner,body:{...body,images:['/images/men.png']}})).status,400);
  assert.equal((await req('/admin/products',{method:'POST',cookie:owner,body:{...body,sale_price:1300}})).status,400);
  let created=await req('/admin/products',{method:'POST',cookie:owner,body});assert.equal(created.status,200,JSON.stringify(created.data));let product=(await req('/admin/products/'+created.data.id,{cookie:owner})).data;
  let publicProducts=(await req('/products?gender=Men&category=T-shirts&search=garment')).data;assert.equal(publicProducts.length,1);assert.equal(publicProducts[0].sale_price,900);assert.equal(publicProducts[0].stock,9);let detail=(await req('/products/'+product.slug)).data;assert.deepEqual(detail.images,body.images);assert.equal(detail.variants.length,3);
  assert.equal((await req('/admin/products',{method:'POST',cookie:owner,body})).status,400);
  assert.equal((await req('/admin/products/'+created.data.id,{method:'PUT',cookie:owner,body:{...product,variants:[{...product.variants[0],stock:-1}]}})).status,400);
  let v=product.variants[0];let edited={...product,price:1500,sale_price:1100,offer_price:null,images:[u2.data.url,u.data.url],variants:product.variants.map(x=>x.id===v.id?{...x,stock:5}:x)};assert.equal((await req('/admin/products/'+created.data.id,{method:'PUT',cookie:owner,body:edited})).status,200);
  detail=(await req('/products/'+product.slug)).data;assert.equal(detail.sale_price,1100);assert.equal(detail.image,u2.data.url);assert.equal(detail.variants.find(x=>x.id===v.id).stock,5);
  assert.equal((await req('/cart',{method:'POST',cookie:alice,body:{variant_id:v.id,quantity:6}})).status,400);assert.equal((await req('/cart',{method:'POST',cookie:alice,body:{variant_id:v.id,quantity:2}})).status,200);
  let details={name:'Alice',phone:'9876543210',address:'123 Street',city:'Delhi',state:'Delhi',pin:'110001',payment_method:'COD'};let order=await req('/orders',{method:'POST',cookie:alice,body:details});assert.equal(order.status,200,JSON.stringify(order.data));assert.equal((await req('/products/'+product.slug)).data.variants.find(x=>x.id===v.id).stock,3);
  let bob=(await req('/register',{method:'POST',body:{name:'Bob',email:'bob@test.local',password:'password123'}})).cookie;assert.equal((await req('/orders/'+order.data.id,{cookie:bob})).status,404);
  // Removing a variant never deletes historical references; it cannot be purchased even if already in a cart.
  assert.equal((await req('/cart',{method:'POST',cookie:alice,body:{variant_id:v.id,quantity:1}})).status,200);
  let latest=(await req('/admin/products/'+created.data.id,{cookie:owner})).data;assert.equal((await req('/admin/products/'+created.data.id,{method:'PUT',cookie:owner,body:{...latest,variants:latest.variants.filter(x=>x.id!==v.id)}})).status,200);
  assert.equal((await req('/cart',{method:'POST',cookie:alice,body:{variant_id:v.id,quantity:1}})).status,400);assert.equal((await req('/orders',{method:'POST',cookie:alice,body:details})).status,400);assert.equal((await req('/cart/'+v.id,{method:'DELETE',cookie:alice})).status,200);assert.equal((await req('/orders/'+order.data.id+'/cancel',{method:'POST',cookie:alice,body:{}})).status,200);assert.equal((await req('/orders/'+order.data.id+'/cancel',{method:'POST',cookie:alice,body:{}})).status,400);
  assert.equal((await req('/admin/products/'+created.data.id,{method:'DELETE',cookie:owner})).status,200);assert.equal((await req('/products')).data.length,0);assert.equal((await req('/orders/'+order.data.id,{cookie:alice})).status,200);
 }finally{server.kill();for(let suffix of ['', '-wal','-shm'])try{rmSync(db+suffix)}catch{};rmSync(uploadDir,{recursive:true,force:true})}
});
