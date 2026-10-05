import { mkdirSync, writeFileSync } from 'node:fs';
import { compileEscrow } from './compile-lib.js';
mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/AccordEscrow.json', JSON.stringify(compileEscrow(), null, 2));
console.log('Compiled AccordEscrow -> artifacts/AccordEscrow.json');
