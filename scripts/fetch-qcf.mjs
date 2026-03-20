// Pre-fetch toutes les pages QCF V4 et stocker en JSON local
const allPages = {};
const TOTAL = 604;
const BATCH = 10;

async function fetchPage(pageNum) {
  const url = `https://api.quran.com/api/v4/verses/by_page/${pageNum}?words=true&word_fields=code_v2,v2_page&per_page=50&mushaf=19`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Page ${pageNum}: HTTP ${res.status}`);
  const data = await res.json();

  const lines = {};
  for (const verse of data.verses) {
    for (const word of verse.words) {
      const line = word.line_number;
      if (!lines[line]) lines[line] = [];
      lines[line].push({
        c: word.code_v2,
        t: word.char_type_name,
        p: word.position,
        vk: verse.verse_key,
      });
    }
  }
  return { p: pageNum, lines };
}

async function main() {
  console.log(`Fetching ${TOTAL} pages...`);

  for (let start = 1; start <= TOTAL; start += BATCH) {
    const end = Math.min(start + BATCH - 1, TOTAL);
    const promises = [];
    for (let p = start; p <= end; p++) {
      promises.push(fetchPage(p).then(result => {
        allPages[result.p] = result.lines;
      }));
    }
    await Promise.all(promises);
    process.stdout.write(`\r${end}/${TOTAL}`);
    if (end < TOTAL) await new Promise(r => setTimeout(r, 100));
  }

  console.log('\nWriting JSON...');
  const fs = await import('fs');
  fs.writeFileSync('src/data/qcf-pages.json', JSON.stringify(allPages));
  const stats = fs.statSync('src/data/qcf-pages.json');
  console.log(`Done! File size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
}

main().catch(e => { console.error(e); process.exit(1); });
