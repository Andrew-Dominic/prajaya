const fs = require('fs');
const path = require('path');

const frontendDir = __dirname;
const templateHtml = fs.readFileSync(path.join(frontendDir, 'transparency.html'), 'utf8');

const bodyStartIndex = templateHtml.indexOf('<div style="height: 120px; background-color: var(--color-heading);"></div>') + 74;
const footerIndex = templateHtml.indexOf('<!-- Footer -->');

const headAndHeader = templateHtml.substring(0, bodyStartIndex);
const footerAndScripts = templateHtml.substring(footerIndex);

function buildPage(title, content, schema = '') {
    let pageHead = headAndHeader.replace(/<title>.*?<\/title>/, `<title>${title} | Prajaya Foundation</title>`);
    pageHead = pageHead.replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${title} | Prajaya Foundation">`);
    pageHead = pageHead.replace(/<meta property="twitter:title" content=".*?">/, `<meta property="twitter:title" content="${title} | Prajaya Foundation">`);
    
    if (schema) {
        pageHead = pageHead.replace('</head>', schema + '\n</head>');
    }
    
    return pageHead + '\n\n' + content + '\n\n' + footerAndScripts;
}

// 1. Build news.html
const newsContent = `
<section class="section" id="news">
    <div class="container">
        <div class="section-label" style="justify-content: center;">Latest Updates</div>
        <h2 class="section-title" style="text-align: center; margin-bottom: 40px;">News & Impact Stories</h2>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 30px;">
            
            <!-- Article Card 1 -->
            <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); transition: transform 0.3s ease;">
                <div style="height: 200px; background-color: #eee; background-image: url('assets/images/programs/education.jpg'); background-size: cover; background-position: center;"></div>
                <div style="padding: 25px;">
                    <div style="font-size: 0.85rem; color: var(--color-accent); font-weight: 600; margin-bottom: 10px;">Sep 20, 2026 &bull; Education</div>
                    <h3 style="margin-bottom: 15px; font-size: 1.3rem;">Transforming Lives Through Digital Literacy</h3>
                    <p style="color: #666; margin-bottom: 20px; font-size: 0.95rem; line-height: 1.6;">Discover how our recent digital literacy drive empowered 500 students in rural Tamil Nadu with essential computer skills.</p>
                    <a href="/impact-education" class="btn btn-outline" style="padding: 8px 20px; font-size: 0.9rem;">Read Full Story</a>
                </div>
            </div>

            <!-- Article Card 2 -->
            <div style="background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); transition: transform 0.3s ease;">
                <div style="height: 200px; background-color: #eee; background-image: url('assets/images/programs/health.jpg'); background-size: cover; background-position: center;"></div>
                <div style="padding: 25px;">
                    <div style="font-size: 0.85rem; color: var(--color-accent); font-weight: 600; margin-bottom: 10px;">Aug 15, 2026 &bull; Health</div>
                    <h3 style="margin-bottom: 15px; font-size: 1.3rem;">Mega Health Camp Reaches 1,000 Families</h3>
                    <p style="color: #666; margin-bottom: 20px; font-size: 0.95rem; line-height: 1.6;">Our annual health camp provided free checkups, eye tests, and medicines to underprivileged communities in Chennai.</p>
                    <a href="/impact-health" class="btn btn-outline" style="padding: 8px 20px; font-size: 0.9rem;">Read Full Story</a>
                </div>
            </div>

        </div>
    </div>
</section>
`;

fs.writeFileSync(path.join(frontendDir, 'news.html'), buildPage('News & Impact Stories', newsContent));


// 2. Build Article Templates
const getArticleSchema = (title, date, url) => `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "${title}",
      "author": {
        "@type": "Organization",
        "name": "Prajaya Foundation"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Prajaya Foundation",
        "logo": {
          "@type": "ImageObject",
          "url": "https://prajayafoundation.org/assets/images/logo.png"
        }
      },
      "datePublished": "${date}",
      "mainEntityOfPage": "${url}"
    }
    </script>
`;

const getArticleContent = (title, date, category) => `
<section class="section" style="padding-top: 60px;">
    <div class="container" style="max-width: 800px;">
        <div style="font-size: 0.9rem; color: var(--color-accent); font-weight: 600; margin-bottom: 15px;">${date} &bull; ${category}</div>
        <h1 style="margin-bottom: 30px; font-size: 2.5rem; line-height: 1.2;">${title}</h1>
        
        <div style="width: 100%; height: 400px; background-color: #e0e0e0; border-radius: 15px; margin-bottom: 40px; display: flex; align-items: center; justify-content: center; color: #888;">
            [Replace this box with your article image]
        </div>

        <div style="font-size: 1.1rem; line-height: 1.8; color: #444;">
            <p style="margin-bottom: 20px;"><strong>[Placeholder Content]</strong> This is where you will write your amazing impact story! Talk about the problem you noticed in the community, the specific actions your team took, and the measurable results you achieved.</p>
            
            <h3 style="margin-top: 40px; margin-bottom: 20px;">The Challenge</h3>
            <p style="margin-bottom: 20px;">Describe the background context here. Why was this project necessary? Who were the people struggling before the Prajaya Foundation stepped in?</p>
            
            <h3 style="margin-top: 40px; margin-bottom: 20px;">Our Intervention</h3>
            <p style="margin-bottom: 20px;">What exactly did you do? Mention the number of volunteers, the resources deployed, and the timeline of the campaign.</p>

            <blockquote style="border-left: 4px solid var(--color-accent); padding-left: 20px; margin: 40px 0; font-size: 1.3rem; font-style: italic; color: var(--color-heading);">
                "Include a powerful quote from a beneficiary, a volunteer, or the founder here to add emotional weight to the case study."
            </blockquote>

            <h3 style="margin-top: 40px; margin-bottom: 20px;">The Impact</h3>
            <p style="margin-bottom: 20px;">Conclude with the results. How many lives were changed? What is the long-term benefit of this initiative?</p>
        </div>

        <div style="margin-top: 60px; padding-top: 30px; border-top: 1px solid #eee; text-align: center;">
            <a href="/news" class="btn btn-outline">← Back to All News</a>
        </div>
    </div>
</section>
`;

fs.writeFileSync(path.join(frontendDir, 'impact-education.html'), buildPage(
    'Transforming Lives Through Digital Literacy', 
    getArticleContent('Transforming Lives Through Digital Literacy', 'September 20, 2026', 'Education'),
    getArticleSchema('Transforming Lives Through Digital Literacy', '2026-09-20', 'https://prajayafoundation.org/impact-education')
));

fs.writeFileSync(path.join(frontendDir, 'impact-health.html'), buildPage(
    'Mega Health Camp Reaches 1,000 Families', 
    getArticleContent('Mega Health Camp Reaches 1,000 Families', 'August 15, 2026', 'Health'),
    getArticleSchema('Mega Health Camp Reaches 1,000 Families', '2026-08-15', 'https://prajayafoundation.org/impact-health')
));

console.log('Created news.html, impact-education.html, and impact-health.html');

// 3. Update Global Navigation
const files = fs.readdirSync(frontendDir).filter(f => f.endsWith('.html'));
files.forEach(file => {
    const filePath = path.join(frontendDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Add News to header
    if (content.includes('<a href="/contact">Contact</a>') && !content.includes('<a href="/news">News</a>')) {
        content = content.replace('<a href="/contact">Contact</a>', '<a href="/news">News</a>\n                <a href="/contact">Contact</a>');
        modified = true;
    }

    // Add News to footer
    if (content.includes('<li><a href="/transparency">Transparency</a></li>') && !content.includes('<li><a href="/news">News & Impact</a></li>')) {
        content = content.replace('<li><a href="/transparency">Transparency</a></li>', '<li><a href="/news">News & Impact</a></li>\n                        <li><a href="/transparency">Transparency</a></li>');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated navigation in ${file}`);
    }
});
