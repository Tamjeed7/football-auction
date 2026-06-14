import { PLAYERS } from './src/data/players';

async function check() {
  const failed = [];
  console.log(`Checking ${PLAYERS.length} players...`);
  // Check in batches of 20
  for (let i = 0; i < PLAYERS.length; i += 20) {
    const batch = PLAYERS.slice(i, i + 20);
    await Promise.all(batch.map(async p => {
      try {
        const res = await fetch(p.image, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) {
           failed.push({name: p.name, status: res.status, url: p.image});
        }
      } catch (e) {
        failed.push({name: p.name, status: 'error', error: e.message, url: p.image});
      }
    }));
  }
  console.log(`Failed: ${failed.length}`);
  console.log(failed.slice(0, 10));
}
check();
