import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.jsx')) results.push(file);
        }
    });
    return results;
}

walk('src').forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/rounded(?:-[a-zA-Z0-9]+)?/g, 'rounded-none');
    fs.writeFileSync(f, content);
});
console.log('done replacing');
