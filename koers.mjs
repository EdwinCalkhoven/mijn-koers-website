// Haalt de ASN Duurzaam Aandelenfonds-koers op en voegt die toe aan koers.json
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const URL_ = 'https://www.asnbank.nl/beleggen/koersen.html';
const FUND = 'ASN Duurzaam Aandelenfonds';
const res = await fetch(URL_, { headers: { 'User-Agent': 'Mozilla/5.0 (koers-dashboard)' } });
if (!res.ok) throw new Error('HTTP ' + res.status);
const html = await res.text();
const rows = html.split(/<tr[\s>]/i);
const head = rows.find(r => /laatste 3 beschikbare/i.test(r));
const row = rows.find(r => r.includes(FUND + '<') || r.includes(FUND + ' <') || r.includes('>' + FUND));
if (!head || !row) throw new Error('Tabelrij niet gevonden: paginastructuur gewijzigd?');
const dates = [...head.matchAll(/(\d{2})-(\d{2})-(\d{4})/g)].map(m => `${m[3]}-${m[2]}-${m[1]}`);
const text = row.replace(/<a[^>]*>.*?<\/a>/is, '');            // naam/link weghalen
const prices = [...text.replace(/<[^>]+>/g, ' ').matchAll(/\d+,\d{2}/g)].map(m => parseFloat(m[0].replace(',', '.')));
if (dates.length < 1 || prices.length < dates.length) throw new Error('Datums/koersen niet te lezen');
const data = existsSync('koers.json') ? JSON.parse(readFileSync('koers.json', 'utf8')) : { history: {} };
const before = JSON.stringify(data.history);
dates.forEach((d, i) => {
  if (!(prices[i] > 1 && prices[i] < 10000)) throw new Error('Onwaarschijnlijke koers: ' + prices[i]);
  data.history[d] = prices[i];
});
const sorted = Object.keys(data.history).sort();
const ld = sorted[sorted.length - 1];
data.latest = { date: ld, price: data.history[ld] };
data.history = Object.fromEntries(sorted.slice(-400).map(d => [d, data.history[d]]));
if (JSON.stringify(data.history) !== before) {
  data.updated = new Date().toISOString();
  writeFileSync('koers.json', JSON.stringify(data));
}
console.log('Laatste koers', data.latest);
