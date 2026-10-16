// Quick self-test + benchmark for the bulk parser: node tools/test-bulk.mjs
import { parseBulk } from '../public/js/bulk-parser.js';
import { dedupeKey } from '../public/js/classify.js';

const cases = {
  csvHeader: 'Name,URL,Description,Category\nStripe,https://stripe.com/docs/api,"Payments API, requires API key",Business\nOpenWeather,openweathermap.org/api,Free weather data,\n',
  noHeader: 'Foo Bot,https://foo.dev,Automates workflows with a bot,Automation\nBar,https://bar.io,Short desc,\n',
  tsv: 'Name\tURL\tDescription\nCat Facts\thttps://catfact.ninja\tRandom cat facts, free\n',
  pipe: '| Name | URL | Description |\n|---|---|---|\n| [Zillow Scraper](https://apify.com/x/zillow) | | Real estate listings |\n',
  free: '- Spotify Web API - https://developer.spotify.com/ - music catalog, needs OAuth\nhttps://api.github.com\n3) NASA APOD: https://api.nasa.gov free space images\n',
  json: '[{"name":"X","url":"https://x.com/api","description":"Twitter posts","category":"social"}]',
  dupes: 'A,https://a.com/?utm_source=z\nA again,https://www.a.com\n'
};
for (const [k, v] of Object.entries(cases)) {
  const r = await parseBulk(v);
  console.log(k.padEnd(10), r.stats.format.padEnd(24), `parsed=${r.stats.parsed} dupInFile=${r.stats.dupInFile} invalid=${r.stats.invalid}`, r.records.map((x) => `${x.name}|${x.cat}|${x.pricing}|auth${x.auth}`).join(' ; '));
}
const ex = new Map([[dedupeKey('https://stripe.com/docs/api'), 'b1']]);
const u = await parseBulk(cases.csvHeader, { existing: ex, onDuplicate: 'update' });
console.log('existing dup ->', u.stats.dupExisting, 'updates', u.updates.length, 'new', u.records.length);

const cats = ['ai chatbot', 'shopify store products', 'linkedin leads', 'real estate listings', 'github developer sdk', 'news articles', 'flight hotel travel', 'youtube video transcript'];
const N = 100000, lines = ['Name,URL,Description,Category'];
for (let i = 0; i < N; i++) lines.push(`API ${i},https://example${i % 90000}.com/api/v${i % 7},"${cats[i % 8]} service number ${i}",`);
const t = performance.now();
const big = await parseBulk(lines.join('\n'));
console.log(`100k rows: parsed=${big.stats.parsed} dupInFile=${big.stats.dupInFile} in ${(performance.now() - t).toFixed(0)}ms`, big.stats.categories);
