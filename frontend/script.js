const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const newHeader = `    <header class="header" id="header">
        <div class="container nav-container">
            <a href="/#home" class="brand">
                <img src="assets/images/logo.png" alt="PRAJAYA Foundation Logo" class="brand-logo">
                <div class="brand-text">
                    <span class="brand-name">PRAJAYA</span>
                    <span class="brand-tagline">Foundation</span>
                </div>
            </a>
            
            <nav class="nav-links" id="nav-links">
                <a href="/#home">Home</a>
                <a href="/#vision">About</a>
                <a href="/#programs">Objectives</a>
                <a href="/#founder">Founder</a>
                <a href="/#events">Events</a>
                <a href="/news">News</a>
                <a href="/contact">Contact</a>
                <a href="/volunteer" class="btn btn-primary volunteer-trigger nav-volunteer-btn">Join as Volunteer</a>
            </nav>
            
            <div class="mobile-menu-btn" id="mobile-btn">
                <i class="fas fa-bars"></i>
            </div>
        </div>
    </header>`;

const faviconTag = '\n    <link rel="icon" type="image/png" href="assets/images/logo.png">\n</head>';

let headerUpdated = 0;
let faviconUpdated = 0;

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace Header
    const headerRegex = /<header class="header"[^>]*>([\s\S]*?)<\/header>/i;
    if (headerRegex.test(content)) {
        content = content.replace(headerRegex, newHeader);
        headerUpdated++;
    }

    // Add Favicon
    if (!content.includes('rel="icon"')) {
        content = content.replace(/<\/head>/i, faviconTag);
        faviconUpdated++;
    }

    fs.writeFileSync(filePath, content, 'utf8');
}

console.log(`Updated Headers: ${headerUpdated}, Updated Favicons: ${faviconUpdated}`);
