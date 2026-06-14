import { PLAYERS } from './src/data/players';

const missing = PLAYERS.filter(p => !p.image).map(p => p.name);
console.log(`Missing ${missing.length} images`);
console.log(missing.join(', '));
