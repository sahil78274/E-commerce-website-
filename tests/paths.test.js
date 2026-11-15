import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';

test('database and upload paths are stable from root or server working directories',()=>{
 const env={...process.env};delete env.DB_PATH;delete env.UPLOAD_DIR;
 const run=(cwd,entry,extra={})=>{let result=spawnSync(process.execPath,['--input-type=module','-e',`import {databasePath,uploadsPath,clientDistPath} from '${entry}'; console.log(JSON.stringify({databasePath,uploadsPath,clientDistPath}));`],{cwd,env:{...env,...extra},encoding:'utf8'});assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout)};
 const root=run('.', './server/src/paths.js'),server=run('server','./src/paths.js');
 assert.deepEqual(server,root);
 assert.equal(root.databasePath,path.resolve('data/bunavat.sqlite'));
 assert.equal(root.uploadsPath,path.resolve('data/uploads'));
 assert.equal(root.clientDistPath,path.resolve('client/dist'));
 assert.deepEqual(run('server','./src/paths.js',{DB_PATH:'data/custom.sqlite',UPLOAD_DIR:'data/custom-uploads'}),{...root,databasePath:path.resolve('data/custom.sqlite'),uploadsPath:path.resolve('data/custom-uploads')});
 assert.equal(run('server','./src/paths.js',{DB_PATH:':memory:'}).databasePath,':memory:');
});
