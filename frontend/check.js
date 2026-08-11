const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf-8');

const problems = [];
const lines = html.split('\n');

const ids = new Map();

lines.forEach((line, i) => {
    const lineNum = i + 1;
    
    // Check for duplicate IDs
    let idMatch;
    const idRegex = /id=["']([^"']+)["']/g;
    while ((idMatch = idRegex.exec(line)) !== null) {
        const id = idMatch[1];
        if (ids.has(id)) {
            problems.push(`Line ${lineNum}: Duplicate ID '${id}' (also on line ${ids.get(id)})`);
        } else {
            ids.set(id, lineNum);
        }
    }
    
    // Check for missing alt
    const imgRegex = /<img\s([^>]+)>/g;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(line)) !== null) {
        if (!imgMatch[1].includes('alt=')) {
            problems.push(`Line ${lineNum}: Missing alt on img`);
        }
    }
    
    // Check for div inside p (simplified)
    if (line.includes('<p') && line.includes('<div')) {
        problems.push(`Line ${lineNum}: div inside p`);
    }

    // Check for unclosed / invalid self-closing non-void tags
    const invalidSelfClose = /<(div|span|p|a|ul|li|section|article)\s*[^>]*\/>/gi;
    let scMatch;
    while ((scMatch = invalidSelfClose.exec(line)) !== null) {
        problems.push(`Line ${lineNum}: Invalid self-closing tag <${scMatch[1]} />`);
    }

    // Check for invalid tags
    if (line.includes('<br>')) {
        // usually fine but maybe <br/>
    }
});

console.log('Total problems found:', problems.length);
if (problems.length > 0) {
    console.log(problems.join('\n'));
}
