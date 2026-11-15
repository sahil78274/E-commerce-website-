import path from 'node:path';
import {fileURLToPath} from 'node:url';

// The legacy installation stored persistent data relative to the repository root.
// Resolve relative overrides there too, regardless of the process working directory.
export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const resolveProjectPath = value => path.isAbsolute(value) ? value : path.resolve(projectRoot, value);
export const databasePath = process.env.DB_PATH === ':memory:' ? ':memory:' : resolveProjectPath(process.env.DB_PATH || 'data/bunavat.sqlite');
export const uploadsPath = resolveProjectPath(process.env.UPLOAD_DIR || 'data/uploads');
export const clientDistPath = path.join(projectRoot, 'client', 'dist');
