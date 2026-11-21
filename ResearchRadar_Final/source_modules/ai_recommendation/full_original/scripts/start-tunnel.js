import localtunnel from 'localtunnel';
import fs from 'fs';

async function main() {
  console.log('[Tunnel] Requesting public localtunnel for port 3000...');

  try {
    const tunnel = await localtunnel({ port: 3000 });
    const url = tunnel.url;

    console.log('\n======================================================');
    console.log('🌐 PUBLIC LOCALTUNNEL READY!');
    console.log('======================================================');
    console.log(`🔗 Public URL: ${url}`);
    console.log('======================================================\n');

    fs.writeFileSync('public-tunnel-info.txt', `PUBLIC TUNNEL URL: ${url}\nACTIVE: TRUE\n`);

    tunnel.on('close', () => {
      console.log('[Tunnel] Tunnel was closed.');
    });

    tunnel.on('error', (err) => {
      console.error('[Tunnel Error]', err);
    });
  } catch (err) {
    console.error('[Tunnel Exception]', err.message);
  }
}

main();
