const fs = require('fs');
const path = require('path');

const frontendDir = __dirname;
const indexHtmlPath = path.join(frontendDir, 'index.html');
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

function extractSection(content, startComment, endComment) {
    const startIdx = content.indexOf(startComment);
    if (startIdx === -1) return null;
    const endIdx = content.indexOf(endComment, startIdx);
    if (endIdx === -1) return null;
    return content.substring(startIdx, endIdx + endComment.length);
}

// 1. Read sections from the separate pages
const aboutHtml = fs.readFileSync(path.join(frontendDir, 'about.html'), 'utf8');
const programsHtml = fs.readFileSync(path.join(frontendDir, 'programs.html'), 'utf8');
const eventsHtml = fs.readFileSync(path.join(frontendDir, 'events.html'), 'utf8');

const visionMission = extractSection(aboutHtml, '<!-- Vision & Mission -->', '</section>');
const approachValues = extractSection(aboutHtml, '<!-- Approach & Values -->', '</section>');
const leadership = extractSection(aboutHtml, '<!-- Leadership Carousel -->', '</section>');
const programsSection = extractSection(programsHtml, '<!-- Programs -->', '</section>');
const eventsSection = extractSection(eventsHtml, '<!-- Upcoming Events -->', '</section>');

// 2. Replace teasers in index.html
const visionTeaser = extractSection(indexHtml, '<!-- Vision & Mission Teaser -->', '</section>');
const programsTeaser = extractSection(indexHtml, '<!-- Programs Teaser -->', '</section>');
const eventsTeaser = extractSection(indexHtml, '<!-- Events Teaser -->', '</section>');

if (visionTeaser && visionMission && approachValues && leadership) {
    indexHtml = indexHtml.replace(visionTeaser, visionMission + '\n' + approachValues + '\n' + leadership);
}

if (programsTeaser && programsSection) {
    indexHtml = indexHtml.replace(programsTeaser, programsSection);
}

if (eventsTeaser && eventsSection) {
    indexHtml = indexHtml.replace(eventsTeaser, eventsSection);
}

fs.writeFileSync(indexHtmlPath, indexHtml);
console.log('Restored sections in index.html');

// 3. Update Global Navigation across all files
const files = fs.readdirSync(frontendDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filePath = path.join(frontendDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Header Links
    if (content.includes('href="/about"')) {
        content = content.replace(/href="\/about"/g, 'href="/#vision"');
        modified = true;
    }
    if (content.includes('href="/programs"')) {
        content = content.replace(/href="\/programs"/g, 'href="/#programs"');
        modified = true;
    }
    if (content.includes('href="/events"')) {
        content = content.replace(/href="\/events"/g, 'href="/#events"');
        modified = true;
    }

    // Also fix the anchor link for founder if it's there
    if (content.includes('href="/about#founder"')) {
        content = content.replace(/href="\/about#founder"/g, 'href="/#founder"');
        modified = true;
    }
    
    // Check if we need to fix footer anchor links specifically if they existed
    if (content.includes('href="/#vision#founder"')) {
        content = content.replace(/href="\/#vision#founder"/g, 'href="/#founder"');
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated navigation in ${file}`);
    }
});

console.log('Rollback complete.');
