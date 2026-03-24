const fs = require('fs');
const path = require('path');

const seedFile = path.join(__dirname, 'seed-preview-data.js');
let seedContent = fs.readFileSync(seedFile, 'utf8');

// The regex will find `posterUrl: 'https://image.tmdb.org/...'` 
// and optionally trailing commas, so it cleans them up.
const newContent = seedContent.replace(/\s*posterUrl:\s*'https:\/\/image\.tmdb\.org[^']+',?/g, '');

fs.writeFileSync(seedFile, newContent, 'utf8');
console.log('Successfully cleaned up posterUrl from seeds!');
