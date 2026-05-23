const fs = require('fs');
console.log(fs.readFileSync('dark_usages.txt', 'utf8').substring(0, 1000));
