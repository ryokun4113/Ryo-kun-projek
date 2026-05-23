const fs = require('fs');
let text = fs.readFileSync('classes.txt', 'utf8');
let items = text.split('\n');
let counts = {};
for (let item of items) {
  if (!item) continue;
  counts[item] = (counts[item] || 0) + 1;
}
console.log(counts);
