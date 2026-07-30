const fs = require('fs');
const file = 'd:/Productivity/Prajya/frontend/volunteer.html';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const styleEndIndex = lines.findIndex(l => l.includes('</style>'));
if (styleEndIndex !== -1) {
    const css = `
        /* Terms CSS */
        .terms-list { counter-reset: term-counter; list-style-type: none; }
        .terms-list > li { position: relative; padding-left: 40px; margin-bottom: 30px; }
        .terms-list > li::before { 
            counter-increment: term-counter; 
            content: counter(term-counter) "."; 
            position: absolute; 
            left: 0; 
            top: 0; 
            font-weight: 600; 
            color: var(--color-accent); 
            font-size: 1.1rem; 
        }
        .term-title { font-weight: 600; color: var(--color-heading); font-size: 1.1rem; margin-bottom: 8px; display: block; }
        .term-content { font-size: 1rem; color: var(--color-text); }
        .term-content ul { padding-left: 20px; margin-top: 10px; list-style-type: disc; }
        .term-content ul li { margin-bottom: 5px; }
`;
    lines.splice(styleEndIndex, 0, css);
    fs.writeFileSync(file, lines.join('\n'));
}
