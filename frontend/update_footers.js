const fs = require('fs');
const path = require('path');

const dir = 'd:/Productivity/Prajya/frontend';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const legalColumn = `                <div>
                    <h4 class="footer-heading">Legal</h4>
                    <ul class="footer-links">
                        <li><a href="/terms-of-use">Terms of Use</a></li>
                        <li><a href="/privacy-policy">Privacy Policy</a></li>
                        <li><a href="/safeguarding-policy">Safeguarding</a></li>
                        <li><a href="/donation-refund-policy">Refund Policy</a></li>
                        <li><a href="/anti-sexual-harassment-policy">POSH Policy</a></li>
                    </ul>
                </div>
                `;

let updatedCount = 0;

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it has footer-grid
    if (content.includes('<div class="footer-grid">') && !content.includes('>Legal</h4>')) {
        // Update CSS grid columns
        content = content.replace(/grid-template-columns:\s*2fr\s+1fr\s+1fr;/g, 'grid-template-columns: 2fr 1fr 1fr 1fr;');
        
        // Find Connect column to insert Legal column before it
        const connectRegex = /<div>\s*<h4 class="footer-heading">Connect<\/h4>/;
        
        if (connectRegex.test(content)) {
            content = content.replace(connectRegex, legalColumn + '$&');
            fs.writeFileSync(filePath, content);
            console.log(`Updated big footer in ${file}`);
            updatedCount++;
        }
    }
}

// For all pages, let's also update the footer-bottom to include small links just in case, or maybe not needed if big footer has it.
// Actually, let's also add terms to the small footers that don't have the big grid.
for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.includes('<div class="footer-grid">') && !content.includes('footer-bottom-links')) {
        // Small footer page
        const footerBottomRegex = /<div class="footer-bottom">([\s\S]*?)<\/div>/;
        const match = content.match(footerBottomRegex);
        if (match) {
            const newFooterBottom = `<div class="footer-bottom">
                <div class="footer-bottom-left">
                    <span>&copy; 2026 PRAJAYA Foundation. All Rights Reserved.</span>
                </div>
                <div class="footer-bottom-links" style="display: flex; gap: 20px; font-size: 0.85rem;">
                    <a href="/terms-of-use" style="text-decoration: underline; color: rgba(255,255,255,0.7);">Terms of Use</a>
                    <a href="/privacy-policy" style="text-decoration: underline; color: rgba(255,255,255,0.7);">Privacy Policy</a>
                </div>
                <div class="footer-bottom-right">
                    <span style="font-family: var(--font-heading); color: var(--color-accent); font-size: 1.1rem; font-weight: 600;">Deserve to Deserve</span>
                </div>
            </div>`;
            content = content.replace(footerBottomRegex, newFooterBottom);
            fs.writeFileSync(filePath, content);
            console.log(`Updated small footer in ${file}`);
            updatedCount++;
        }
    }
}

console.log(`Total files updated: ${updatedCount}`);
