const fs = require('fs');
const path = require('path');

const dir = 'd:/Productivity/Prajya/frontend';
const policyFiles = [
    'terms-of-use.html', 'privacy-policy.html', 'safeguarding-policy.html', 
    'anti-sexual-harassment-policy.html', 'media-consent.html', 'parent-consent.html', 
    'donation-refund-policy.html', 'report-concern.html', 'grievance.html', 'volunteer-terms.html'
];

const indexContent = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');

// Extract btn CSS
const btnCssMatch = indexContent.match(/\/\*\s*---\s*Buttons\s*---\s*\*\/[\s\S]*?\/\*\s*---\s*Navigation\s*---\s*\*\//);
const btnCss = btnCssMatch ? btnCssMatch[0].replace('/* --- Navigation --- */', '') : '';

// Extract Nav CSS
const navCssMatch = indexContent.match(/\/\*\s*---\s*Navigation\s*---\s*\*\/[\s\S]*?\/\*\s*---\s*Hero Section\s*---\s*\*\//);
const navCss = navCssMatch ? navCssMatch[0].replace('/* --- Hero Section --- */', '') : '';

// Extract Mobile CSS
const mobileCssMatch = indexContent.match(/@media\s*\(max-width:\s*992px\)[\s\S]*?\/\*\s*---\s*Mobile Menu Enhancements\s*---\s*\*\//);
let mobileCss = mobileCssMatch ? mobileCssMatch[0].replace('/* --- Mobile Menu Enhancements --- */', '') : '';
// We only need the .header and .nav-links parts of the media query, but the whole thing is fine or we can just use it.
// Actually, it might be safer to extract just what we need for the navbar in mobile. Let's just use the mobileCss block as is.

// Extract the header HTML
const headerHtmlMatch = indexContent.match(/<header.*?<\/header>/s);
let headerHtml = headerHtmlMatch ? headerHtmlMatch[0] : '';
headerHtml = headerHtml.replace('<header class="header"', '<header class="header scrolled"');

// Mobile Menu Script
const mobileMenuScript = `
    <script>
        // Mobile Menu
        const mobileBtn = document.getElementById('mobile-btn');
        const navLinks = document.getElementById('nav-links');
        const navItems = document.querySelectorAll('.nav-links a');

        if (mobileBtn && navLinks) {
            mobileBtn.addEventListener('click', () => {
                navLinks.classList.toggle('active');
                const icon = mobileBtn.querySelector('i');
                if (navLinks.classList.contains('active')) {
                    icon.classList.replace('fa-bars', 'fa-times');
                } else {
                    icon.classList.replace('fa-times', 'fa-bars');
                }
            });

            navItems.forEach(item => {
                item.addEventListener('click', () => {
                    navLinks.classList.remove('active');
                    if (mobileBtn.querySelector('i')) {
                        mobileBtn.querySelector('i').classList.replace('fa-times', 'fa-bars');
                    }
                });
            });
        }
    </script>
`;

policyFiles.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Remove old simple CSS
        // The old css was from .header { to .nav-volunteer-btn {
        const oldCssRegex = /\.header\s*\{[\s\S]*?\.nav-volunteer-btn\s*\{[^}]*\}/;
        content = content.replace(oldCssRegex, btnCss + '\n' + navCss);
        
        // Add mobile CSS right before </style>
        if (!content.includes('@media (max-width: 992px)')) {
            content = content.replace('</style>', mobileCss + '\n</style>');
        }

        // Replace old header
        const oldHeaderRegex = /<header.*?<\/header>/s;
        content = content.replace(oldHeaderRegex, headerHtml);

        // Add script before </body>
        if (!content.includes('mobileBtn.addEventListener')) {
            content = content.replace('</body>', mobileMenuScript + '\n</body>');
        }

        fs.writeFileSync(filePath, content);
        console.log(`Updated nav in ${file}`);
    }
});
