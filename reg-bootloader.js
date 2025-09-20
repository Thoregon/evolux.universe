// register-hooks.js
import { register } from 'node:module';

// Asynchrone Hooks (eigene Loader-Datei):
register('./bootloader_24.mjs', import.meta.url);