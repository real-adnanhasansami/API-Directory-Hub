// Generates a 100,000-row CSV for stress-testing Bulk upload:  node tools/generate-test-file.mjs [rows] [out.csv]
import fs from 'node:fs';
const rows = parseInt(process.argv[2] || '100000', 10), out = process.argv[3] || 'bulk-test.csv';
const topics = ['ai chatbot gpt', 'shopify store products', 'linkedin leads prospect', 'real estate property listings', 'github developer sdk', 'news articles rss', 'flight hotel travel', 'youtube video transcript', 'crypto stock finance', 'job resume career'];
const lines = ['Name,URL,Description,Category'];
for (let i = 0; i < rows; i++) lines.push(`Test API ${i},https://test${i % 50 ? i : i - 1}.example.com/api,"${topics[i % topics.length]} service #${i}, requires API key",`);
fs.writeFileSync(out, lines.join('\n'));
console.log(`Wrote ${rows} rows to ${out}`);
