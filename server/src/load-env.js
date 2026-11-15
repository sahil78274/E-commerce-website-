import {config} from 'dotenv';
import {fileURLToPath} from 'node:url';

// Load from the server directory even when commands run from the repository root.
// Existing process environment variables take precedence. No values are logged.
config({path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true});
