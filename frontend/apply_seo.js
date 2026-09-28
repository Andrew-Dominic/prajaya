const fs = require('fs');
const path = require('path');

const dir = 'd:/Productivity/Prajya/frontend';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const schemaStr = `{
  "@context": "https://schema.org",
  "@type": "NGO",
  "name": "Prajaya Foundation",
  "legalName": "Prajaya Foundation",
  "alternateName": ["PRAJAYA Foundation", "Prajaya Foundation Chennai"],
  "description": "Prajaya Foundation is a Chennai-based NGO dedicated to transforming lives through education, health, leadership, and environmental sustainability.",
  "url": "https://prajayafoundation.org",
  "logo": "https://prajayafoundation.org/assets/images/logo.png",
  "email": "info@prajayafoundation.org",
  "telephone": "+91-9655811133",
  "foundingDate": "2024",
  "location": {
    "@type": "Place",
    "name": "Prajaya Foundation Headquarters",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "No: 13, 2nd Cross Street, Pillaiyar Koil (Extn), Nesapakkam, West K.K Nagar",
      "addressLocality": "Chennai",
      "addressRegion": "Tamil Nadu",
      "postalCode": "600078",
      "addressCountry": "IN"
    }
  },
  "areaServed": {
    "@type": "City",
    "name": "Chennai"
  },
  "sameAs": [
    "https://www.linkedin.com/company/prajayafoundation",
    "https://www.instagram.com/prajaya_foundation",
    "https://www.facebook.com/share/1BzsAep6Fs/?mibextid=wwXIfr",
    "https://youtube.com/@prajayafoundation"
  ]
}`;

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Replace existing JSON-LD if present, or inject it
    const jsonLdRegex = /<script type="application\/ld\+json">[\s\S]*?<\/script>/;
    const newJsonLd = `<script type="application/ld+json">\n${schemaStr}\n    </script>`;
    
    if (jsonLdRegex.test(content)) {
        content = content.replace(jsonLdRegex, newJsonLd);
    } else {
        // Inject right before </head> if it didn't exist
        content = content.replace('</head>', `    ${newJsonLd}\n</head>`);
    }

    // 2. Add Meta Keywords
    const keywordsMeta = `<meta name="keywords" content="Prajaya Foundation, Prajaya Foundation Chennai, Prajaya NGO, Prajaya, NGO in Chennai, Education NGO Chennai, Health NGO Chennai">`;
    if (!content.includes('<meta name="keywords"')) {
        // insert after meta description
        const descRegex = /<meta name="description" content="[^"]*">/;
        if (descRegex.test(content)) {
            content = content.replace(descRegex, match => match + '\n    ' + keywordsMeta);
        } else {
            content = content.replace('<head>', '<head>\n    ' + keywordsMeta);
        }
    }

    // 3. Optional: Add a Google Site Verification tag if they had one, but we don't know it. We'll skip for now.

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated SEO for', file);
});
