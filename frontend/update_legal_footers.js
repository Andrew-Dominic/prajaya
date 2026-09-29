const fs = require('fs');
const path = require('path');

const dir = 'd:/Productivity/Prajya/frontend';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const newLegalColumn = `                <div>
                    <h4 class="footer-heading">Legal</h4>
                    <ul class="footer-links">
                        <li><a href="/terms-and-conditions">Terms and Conditions</a></li>
                        <li><a href="/privacy-policy">Privacy Policy</a></li>
                    </ul>
                </div>
                `;

let updatedCount = 0;

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Update Big Footer
    const legalColumnRegex = /<div>\s*<h4 class="footer-heading">Legal<\/h4>\s*<ul class="footer-links">[\s\S]*?<\/ul>\s*<\/div>\s*/;
    if (legalColumnRegex.test(content)) {
        content = content.replace(legalColumnRegex, newLegalColumn);
        changed = true;
    }

    // Update Small Footer Links (for the policy pages themselves)
    const smallFooterLinksRegex = /<div class="footer-bottom-links"[\s\S]*?<\/div>/;
    if (smallFooterLinksRegex.test(content)) {
        const newSmallLinks = `<div class="footer-bottom-links" style="display: flex; gap: 20px; font-size: 0.85rem;">
                    <a href="/terms-and-conditions" style="text-decoration: underline; color: rgba(255,255,255,0.7);">Terms and Conditions</a>
                    <a href="/privacy-policy" style="text-decoration: underline; color: rgba(255,255,255,0.7);">Privacy Policy</a>
                </div>`;
        content = content.replace(smallFooterLinksRegex, newSmallLinks);
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, content);
        updatedCount++;
        console.log(`Updated footer in ${file}`);
    }
}
console.log(`Updated ${updatedCount} files.`);
