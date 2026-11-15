import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';

// Exercise a real server/.env in an isolated copy. Never modify the user's file or database.
test('server and setup-admin load server/.env before database initialization', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'bunavat-env-test-'));
  const serverDir = path.join(root, 'server');
  mkdirSync(serverDir);
  cpSync('server/src', path.join(serverDir, 'src'), {recursive:true});
  cpSync('server/package.json', path.join(serverDir, 'package.json'));
  symlinkSync(path.resolve('node_modules'), path.join(root, 'node_modules'), 'dir');

  const probe = createServer();
  await new Promise((resolve, reject) => {probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve)});
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const suffix = randomBytes(8).toString('hex');
  const email = `owner-${suffix}@example.invalid`;
  const password = randomBytes(24).toString('hex');
  const name = `Owner ${suffix}`;
  const dbPath = path.join(root, 'data', 'from-env.sqlite');
  const externalDbPath = path.join(root, 'data', 'from-process.sqlite');
  // Values are generated in memory for this isolated test and never written to the repository or logs.
  writeFileSync(path.join(serverDir, '.env'), `PORT=${port}\nDB_PATH=data/from-env.sqlite\nUPLOAD_DIR=data/from-env-uploads\nIMAGE_STORAGE=local\nNODE_ENV=development\nADMIN_NAME="${name}"\nADMIN_EMAIL=${email}\nADMIN_PASSWORD=${password}\n`, {mode:0o600});
  const env = {...process.env};
  for (const key of ['ADMIN_NAME','ADMIN_EMAIL','ADMIN_PASSWORD','DB_PATH','UPLOAD_DIR','PORT','NODE_ENV','IMAGE_STORAGE']) delete env[key];
  let child;
  try {
    const setup = spawnSync('npm', ['run', 'setup-admin'], {cwd:serverDir, env, encoding:'utf8'});
    assert.equal(setup.status, 0, 'Owner setup using server/.env must succeed');
    assert.ok(!setup.stdout.includes(password) && !setup.stderr.includes(password), 'Setup must not log the password');
    let db = new DatabaseSync(dbPath);
    const owner = db.prepare('SELECT name,email,password,role FROM users WHERE email=?').get(email);
    assert.ok(owner && owner.name === name && owner.role === 'admin' && owner.password !== password && bcrypt.compareSync(password, owner.password), 'Expected a securely hashed admin from the environment file');
    db.close();

    // A process-level DB_PATH override wins over the file without modifying it.
    const overridden = spawnSync('npm', ['run', 'setup-admin'], {cwd:serverDir, env:{...env,DB_PATH:externalDbPath}, encoding:'utf8'});
    assert.equal(overridden.status, 0, 'Process environment must override the file');
    db = new DatabaseSync(externalDbPath);
    assert.ok(db.prepare('SELECT 1 FROM users WHERE email=?').get(email)); db.close();

    // Starting from the repository root must load the same file and connect to the same DB.
    child = spawn(process.execPath, ['server/src/index.js'], {cwd:root, env, stdio:'ignore'});
    let ready = false;
    for (let i=0; i<120; i++) {
      try { const response = await fetch(`http://127.0.0.1:${port}/api/me`); if (response.ok) {ready=true; break} } catch {}
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.ok(ready, 'Server must use PORT from server/.env');
    const login = await fetch(`http://127.0.0.1:${port}/api/login`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password})});
    assert.equal(login.status, 200, 'Owner created from server/.env must be able to sign in');
    assert.ok((await login.json()).user.role === 'admin');
    assert.ok(readFileSync(path.join(serverDir,'.env'), 'utf8').includes(`DB_PATH=data/from-env.sqlite`), 'Original file must remain intact');
  } finally {
    if (child && child.exitCode === null) {child.kill(); await new Promise(resolve => child.once('exit', resolve));}
    rmSync(root, {recursive:true, force:true});
  }
});
