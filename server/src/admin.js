import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
const {ADMIN_NAME:name,ADMIN_EMAIL:email,ADMIN_PASSWORD:password}=process.env;
if(!name || !email || !password || password.length<10){console.error('Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD (at least 10 characters) in the environment.');process.exit(1)}
try { db.prepare('INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)').run(name,email.toLowerCase(),bcrypt.hashSync(password,12),'admin'); console.log('Admin created.'); } catch(e){console.error('Could not create admin:',e.message);process.exit(1)}
