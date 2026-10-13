const fs = require('fs');
const path = require('path');

const dir = __dirname;

const baseOrg = {
  "@type": ["NGO", "LocalBusiness"],
  "@id": "https://prajayafoundation.org/#organization",
  "name": "Prajaya Foundation",
  "legalName": "Prajaya Foundation",
  "alternateName": ["PRAJAYA Foundation", "Prajaya Foundation Chennai", "Prajaya NGO Chennai"],
  "disambiguatingDescription": "A registered public charitable trust and non-profit organization based in Chennai, Tamil Nadu, India, dedicated to education, healthcare, youth leadership, and environmental sustainability. It is distinct from Mumbai's Praja Foundation.",
  "url": "https://prajayafoundation.org",
  "logo": {
    "@type": "ImageObject",
    "@id": "https://prajayafoundation.org/#logo",
    "url": "https://prajayafoundation.org/assets/images/logo.png",
    "contentUrl": "https://prajayafoundation.org/assets/images/logo.png",
    "caption": "Prajaya Foundation Logo",
    "inLanguage": "en-US"
  },
  "image": "https://prajayafoundation.org/assets/images/logo.png",
  "email": "info@prajayafoundation.org",
  "telephone": "+91-9655811133",
  "slogan": "Deserve to Deserve",
  "foundingDate": "2024",
  "foundingLocation": {
    "@type": "Place",
    "name": "Chennai, Tamil Nadu, India"
  },
  "founder": {
    "@type": "Person",
    "@id": "https://prajayafoundation.org/#founder",
    "name": "Mr. Pradeep Babu M",
    "jobTitle": "Founder & Managing Trustee",
    "image": "https://prajayafoundation.org/assets/images/founder.jpeg",
    "worksFor": { "@id": "https://prajayafoundation.org/#organization" },
    "sameAs": "https://www.instagram.com/m.pradeepbabu"
  },
  "member": [
    { "@type": "Person", "name": "Mr. Murali C", "jobTitle": "Trustee" },
    { "@type": "Person", "name": "Mr. Jagadeesan M", "jobTitle": "Trustee" },
    { "@type": "Person", "name": "Mr. Chittibabu E", "jobTitle": "President" },
    { "@type": "Person", "name": "Mr. Giri C", "jobTitle": "Vice President" },
    { "@type": "Person", "name": "Mrs. Indira M", "jobTitle": "Secretary" },
    { "@type": "Person", "name": "Mrs. Bhanupriya P", "jobTitle": "Treasurer" },
    { "@type": "Person", "name": "Mrs. Shalini P", "jobTitle": "Joint Secretary" },
    { "@type": "Person", "name": "Ms. Vijaya Sri G", "jobTitle": "Volunteer Coordinator" }
  ],
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "No: 13, 2nd Cross Street, Pillaiyar Koil (Extn), Nesapakkam, West K.K Nagar",
    "addressLocality": "Chennai",
    "addressRegion": "Tamil Nadu",
    "postalCode": "600078",
    "addressCountry": "IN"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 13.0336,
    "longitude": 80.1983
  },
  "hasMap": "https://maps.google.com/?q=Prajaya+Foundation+Nesapakkam+Chennai",
  "areaServed": [
    { "@type": "City", "name": "Chennai" },
    { "@type": "State", "name": "Tamil Nadu" },
    { "@type": "Country", "name": "India" }
  ],
  "knowsAbout": [
    "Public Policy Education",
    "Underprivileged Student Education Support",
    "Community Healthcare and Free Medical Camps",
    "Youth Leadership and Fitness",
    "Environmental Sustainability and Tree Plantation",
    "Social Responsibility and Volunteerism in Chennai",
    "Non-Governmental Organization (NGO) Tamil Nadu"
  ],
  "sameAs": [
    "https://www.linkedin.com/company/prajayafoundation",
    "https://www.instagram.com/prajaya_foundation",
    "https://www.instagram.com/prajayafoundation",
    "https://www.facebook.com/share/1BzsAep6Fs/?mibextid=wwXIfr",
    "https://youtube.com/@prajayafoundation"
  ]
};

const pagesConfig = {
  'index.html': {
    title: 'Prajaya Foundation | NGO & Public Charitable Trust in Chennai',
    desc: 'Prajaya Foundation is a registered public charitable trust and NGO in Chennai dedicated to empowering lives through education, healthcare, youth leadership, and environmental sustainability.',
    canonical: 'https://prajayafoundation.org/',
    keywords: 'Prajaya Foundation, Prajaya Foundation Chennai, Prajaya NGO, NGO in Chennai, Public Charitable Trust Chennai, Education NGO Chennai, Health NGO Chennai, Volunteer Chennai',
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        baseOrg,
        {
          "@type": "WebSite",
          "@id": "https://prajayafoundation.org/#website",
          "url": "https://prajayafoundation.org/",
          "name": "Prajaya Foundation",
          "description": "Official website of Prajaya Foundation, a Chennai-based public charitable trust and NGO.",
          "publisher": { "@id": "https://prajayafoundation.org/#organization" },
          "inLanguage": "en-US",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://prajayafoundation.org/?s={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        }
      ]
    }
  },
  'about.html': {
    title: 'About Us & Leadership | Prajaya Foundation Chennai NGO',
    desc: 'Discover Prajaya Foundation\'s mission, vision, and leadership in Chennai. Meet Founder Mr. Pradeep Babu M and trustees guiding our education and healthcare community initiatives.',
    canonical: 'https://prajayafoundation.org/about',
    keywords: 'About Prajaya Foundation, Prajaya Foundation Trustees, Pradeep Babu M, Prajaya Chennai NGO, NGO Leadership Chennai, Public Charitable Trust About',
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        baseOrg,
        {
          "@type": "AboutPage",
          "@id": "https://prajayafoundation.org/about#webpage",
          "url": "https://prajayafoundation.org/about",
          "name": "About Prajaya Foundation",
          "description": "Overview of Prajaya Foundation's vision, mission, trustees, and administrative leadership in Chennai.",
          "isPartOf": { "@type": "WebSite", "@id": "https://prajayafoundation.org/#website", "name": "Prajaya Foundation", "url": "https://prajayafoundation.org/" },
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://prajayafoundation.org/" },
              { "@type": "ListItem", "position": 2, "name": "About Us", "item": "https://prajayafoundation.org/about" }
            ]
          }
        },
        {
          "@type": "FAQPage",
          "@id": "https://prajayafoundation.org/about#faq",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "What is Prajaya Foundation?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Prajaya Foundation is a registered public charitable trust and non-profit organization (NGO) headquartered in Chennai, Tamil Nadu, India. It focuses on transforming communities through education, healthcare, youth leadership, and environmental sustainability."
              }
            },
            {
              "@type": "Question",
              "name": "How is Prajaya Foundation different from Praja Foundation?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Prajaya Foundation (spelled P-R-A-J-A-Y-A) is an independent public charitable trust based in Chennai, Tamil Nadu, founded by Mr. Pradeep Babu M, dedicated to community empowerment, student education, and healthcare. It is separate and completely distinct from the Mumbai-based organization Praja Foundation."
              }
            },
            {
              "@type": "Question",
              "name": "Where is Prajaya Foundation located in Chennai?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Prajaya Foundation is headquartered at No: 13, 2nd Cross Street, Pillaiyar Koil (Extn), Nesapakkam, West K.K Nagar, Chennai, Tamil Nadu - 600 078, India."
              }
            },
            {
              "@type": "Question",
              "name": "What are the core initiatives of Prajaya Foundation?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "The foundation's four core pillars are: 1. Education & Learning (underprivileged student mentorship and policy awareness), 2. Health & Fitness (free medical camps and wellness drives), 3. Environmental Sustainability (tree plantations and green cleanups), and 4. Leadership & Social Responsibility (youth empowerment)."
              }
            }
          ]
        }
      ]
    }
  },
  'programs.html': {
    title: 'Our Programs & Objectives | Education, Health & Sustainability NGO Chennai',
    desc: 'Explore Prajaya Foundation\'s core program pillars: Education & Public Policy, Community Health & Fitness, Environmental Sustainability, and Youth Leadership Development in Chennai.',
    canonical: 'https://prajayafoundation.org/programs',
    keywords: 'Prajaya Foundation Programs, Education NGO Programs Chennai, Health Camps Chennai, Environmental NGO Chennai, Youth Leadership NGO',
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        baseOrg,
        {
          "@type": "CollectionPage",
          "@id": "https://prajayafoundation.org/programs#webpage",
          "url": "https://prajayafoundation.org/programs",
          "name": "Our Programs & Objectives | Prajaya Foundation",
          "description": "Comprehensive overview of Prajaya Foundation's key social impact programs.",
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://prajayafoundation.org/" },
              { "@type": "ListItem", "position": 2, "name": "Programs", "item": "https://prajayafoundation.org/programs" }
            ]
          }
        }
      ]
    }
  },
  'impact-education.html': {
    title: 'Education Impact & Initiatives | Prajaya Foundation Chennai',
    desc: 'See how Prajaya Foundation empowers underprivileged students in Chennai through study material distribution, public policy education, mentorship, and digital literacy.',
    canonical: 'https://prajayafoundation.org/impact-education',
    keywords: 'Education Impact Prajaya Foundation, Underprivileged Education Chennai, Student Mentorship NGO, Digital Literacy Drive Chennai',
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        baseOrg,
        {
          "@type": "Article",
          "@id": "https://prajayafoundation.org/impact-education#article",
          "headline": "Education Impact & Initiatives — Prajaya Foundation",
          "description": "Empowering students and communities through digital literacy, mentorship, and educational materials.",
          "publisher": { "@id": "https://prajayafoundation.org/#organization" },
          "author": { "@id": "https://prajayafoundation.org/#organization" },
          "mainEntityOfPage": "https://prajayafoundation.org/impact-education",
          "image": "https://prajayafoundation.org/assets/images/logo.png"
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://prajayafoundation.org/" },
            { "@type": "ListItem", "position": 2, "name": "Programs", "item": "https://prajayafoundation.org/programs" },
            { "@type": "ListItem", "position": 3, "name": "Education Impact", "item": "https://prajayafoundation.org/impact-education" }
          ]
        }
      ]
    }
  },
  'impact-health.html': {
    title: 'Healthcare & Wellness Impact | Prajaya Foundation Chennai',
    desc: 'Discover Prajaya Foundation\'s healthcare initiatives: free medical checkup camps, eye screenings, health awareness sessions, and fitness drives across Chennai.',
    canonical: 'https://prajayafoundation.org/impact-health',
    keywords: 'Health Impact Prajaya Foundation, Free Medical Camps Chennai, Community Wellness NGO, Health NGO Chennai',
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        baseOrg,
        {
          "@type": "Article",
          "@id": "https://prajayafoundation.org/impact-health#article",
          "headline": "Healthcare & Wellness Impact — Prajaya Foundation",
          "description": "Delivering preventive healthcare, free medical camps, and wellness education to vulnerable communities.",
          "publisher": { "@id": "https://prajayafoundation.org/#organization" },
          "author": { "@id": "https://prajayafoundation.org/#organization" },
          "mainEntityOfPage": "https://prajayafoundation.org/impact-health",
          "image": "https://prajayafoundation.org/assets/images/logo.png"
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://prajayafoundation.org/" },
            { "@type": "ListItem", "position": 2, "name": "Programs", "item": "https://prajayafoundation.org/programs" },
            { "@type": "ListItem", "position": 3, "name": "Health Impact", "item": "https://prajayafoundation.org/impact-health" }
          ]
        }
      ]
    }
  },
  'events.html': {
    title: 'Events & Community Drives in Chennai | Prajaya Foundation',
    desc: 'Join upcoming community events, free health camps, tree planting drives, and youth workshops by Prajaya Foundation across Chennai. Participate and make a difference.',
    canonical: 'https://prajayafoundation.org/events',
    keywords: 'Prajaya Foundation Events, NGO Events Chennai, Social Work Drives Chennai, Volunteer Events Chennai, Health Camp Schedule Chennai',
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        baseOrg,
        {
          "@type": "CollectionPage",
          "@id": "https://prajayafoundation.org/events#webpage",
          "url": "https://prajayafoundation.org/events",
          "name": "Events & Community Initiatives | Prajaya Foundation",
          "description": "Upcoming and past community events hosted by Prajaya Foundation in Chennai.",
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://prajayafoundation.org/" },
              { "@type": "ListItem", "position": 2, "name": "Events", "item": "https://prajayafoundation.org/events" }
            ]
          }
        }
      ]
    }
  },
  'event-detail.html': {
    title: 'Event Details | Prajaya Foundation Community Initiatives',
    desc: 'Explore details, schedules, and photos of community development events, health camps, and volunteer drives organized by Prajaya Foundation in Chennai.',
    canonical: 'https://prajayafoundation.org/events',
    keywords: 'Prajaya Foundation Event Details, Chennai NGO Event Info, Community Health Drive, Volunteer Event',
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        baseOrg,
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://prajayafoundation.org/" },
            { "@type": "ListItem", "position": 2, "name": "Events", "item": "https://prajayafoundation.org/events" },
            { "@type": "ListItem", "position": 3, "name": "Event Detail", "item": "https://prajayafoundation.org/event-detail" }
          ]
        }
      ]
    }
  },
  'news.html': {
    title: 'News & Press Updates | Prajaya Foundation Chennai NGO',
    desc: 'Read the latest updates, stories of impact, and press releases from Prajaya Foundation. Discover our on-ground social empowerment work across Chennai and Tamil Nadu.',
    canonical: 'https://prajayafoundation.org/news',
    keywords: 'Prajaya Foundation News, Chennai NGO News, NGO Press Releases, Social Work Updates Tamil Nadu',
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        baseOrg,
        {
          "@type": "CollectionPage",
          "@id": "https://prajayafoundation.org/news#webpage",
          "url": "https://prajayafoundation.org/news",
          "name": "News & Updates | Prajaya Foundation",
          "description": "News coverage, impact stories, and media releases from Prajaya Foundation.",
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://prajayafoundation.org/" },
              { "@type": "ListItem", "position": 2, "name": "News", "item": "https://prajayafoundation.org/news" }
            ]
          }
        }
      ]
    }
  },
  'news-detail.html': {
    title: 'News & Impact Story Details | Prajaya Foundation Chennai',
    desc: 'Detailed impact story and news update from Prajaya Foundation, highlighting community progress, educational empowerment, and social welfare in Chennai.',
    canonical: 'https://prajayafoundation.org/news',
    keywords: 'Prajaya Foundation News Article, NGO Impact Story Chennai, Social Development News',
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        baseOrg,
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://prajayafoundation.org/" },
            { "@type": "ListItem", "position": 2, "name": "News", "item": "https://prajayafoundation.org/news" },
            { "@type": "ListItem", "position": 3, "name": "Story Detail", "item": "https://prajayafoundation.org/news-detail" }
          ]
        }
      ]
    }
  },
  'volunteer.html': {
    title: 'Volunteer with Prajaya Foundation | Make an Impact in Chennai',
    desc: 'Join Prajaya Foundation as a volunteer in Chennai. Contribute your passion and skills to education, health, youth leadership, and environmental initiatives. Apply online today!',
    canonical: 'https://prajayafoundation.org/volunteer',
    keywords: 'Volunteer in Chennai, Prajaya Foundation Volunteer, NGO Volunteering Chennai, Student Volunteer Certificate, Social Work Volunteer Chennai',
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        baseOrg,
        {
          "@type": "WebPage",
          "@id": "https://prajayafoundation.org/volunteer#webpage",
          "url": "https://prajayafoundation.org/volunteer",
          "name": "Volunteer Registration | Prajaya Foundation",
          "description": "Sign up to volunteer with Prajaya Foundation in Chennai across education, health, environment, and leadership programs.",
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://prajayafoundation.org/" },
              { "@type": "ListItem", "position": 2, "name": "Volunteer", "item": "https://prajayafoundation.org/volunteer" }
            ]
          }
        },
        {
          "@type": "FAQPage",
          "@id": "https://prajayafoundation.org/volunteer#faq",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "Who can volunteer with Prajaya Foundation?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Anyone passionate about community welfare can join! We welcome school and college students, working professionals, educators, and senior citizens."
              }
            },
            {
              "@type": "Question",
              "name": "Do volunteers receive an official certificate?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, all active volunteers receive an official Certificate of Appreciation recognizing their hours, contributions, and dedicated social service."
              }
            },
            {
              "@type": "Question",
              "name": "Are volunteer activities restricted to Chennai?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Most physical community drives (health camps, education sessions, green drives) take place in Chennai and adjoining districts in Tamil Nadu. We also offer digital/remote volunteering roles in tech, content, and communications."
              }
            },
            {
              "@type": "Question",
              "name": "How do I sign up as a volunteer?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "You can apply directly through our website by submitting the registration form on prajayafoundation.org/volunteer. Our volunteer coordinator will reach out with onboarding details."
              }
            }
          ]
        }
      ]
    }
  },
  'volunteer-opportunities.html': {
    title: 'Volunteer Opportunities & Openings | Prajaya Foundation Chennai',
    desc: 'Explore current volunteer openings at Prajaya Foundation in Chennai: teaching mentors, medical camp coordinators, plantation drivers, and event coordinators.',
    canonical: 'https://prajayafoundation.org/volunteer-opportunities',
    keywords: 'Volunteer Opportunities Chennai, NGO Openings Chennai, Social Work Positions Chennai, Youth Volunteer Roles',
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        baseOrg,
        {
          "@type": "CollectionPage",
          "@id": "https://prajayafoundation.org/volunteer-opportunities#webpage",
          "url": "https://prajayafoundation.org/volunteer-opportunities",
          "name": "Volunteer Opportunities | Prajaya Foundation",
          "description": "Available volunteering roles and community openings with Prajaya Foundation in Chennai.",
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://prajayafoundation.org/" },
              { "@type": "ListItem", "position": 2, "name": "Volunteer", "item": "https://prajayafoundation.org/volunteer" },
              { "@type": "ListItem", "position": 3, "name": "Opportunities", "item": "https://prajayafoundation.org/volunteer-opportunities" }
            ]
          }
        }
      ]
    }
  },
  'volunteer-terms.html': {
    title: 'Volunteer Terms & Code of Conduct | Prajaya Foundation',
    desc: 'Review the official volunteer terms, code of conduct, ethical responsibilities, and safeguarding guidelines for Prajaya Foundation volunteers.',
    canonical: 'https://prajayafoundation.org/volunteer-terms',
    keywords: 'Volunteer Terms, Volunteer Code of Conduct Prajaya, Safeguarding Guidelines NGO, Volunteer Policy Chennai',
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        baseOrg,
        {
          "@type": "WebPage",
          "@id": "https://prajayafoundation.org/volunteer-terms#webpage",
          "url": "https://prajayafoundation.org/volunteer-terms",
          "name": "Volunteer Terms and Code of Conduct | Prajaya Foundation",
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://prajayafoundation.org/" },
              { "@type": "ListItem", "position": 2, "name": "Volunteer", "item": "https://prajayafoundation.org/volunteer" },
              { "@type": "ListItem", "position": 3, "name": "Volunteer Terms", "item": "https://prajayafoundation.org/volunteer-terms" }
            ]
          }
        }
      ]
    }
  },
  'transparency.html': {
    title: 'Transparency & Governance | Prajaya Foundation Public Charitable Trust',
    desc: 'Prajaya Foundation is committed to complete transparency, trust governance, legal compliance, and community accountability in Chennai, Tamil Nadu.',
    canonical: 'https://prajayafoundation.org/transparency',
    keywords: 'Transparency Prajaya Foundation, Public Charitable Trust Governance Chennai, NGO Accountability Tamil Nadu, Prajaya Trust Details',
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        baseOrg,
        {
          "@type": "AboutPage",
          "@id": "https://prajayafoundation.org/transparency#webpage",
          "url": "https://prajayafoundation.org/transparency",
          "name": "Transparency and Governance | Prajaya Foundation",
          "description": "Governance model, trust transparency, and accountability standards of Prajaya Foundation.",
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://prajayafoundation.org/" },
              { "@type": "ListItem", "position": 2, "name": "Transparency", "item": "https://prajayafoundation.org/transparency" }
            ]
          }
        }
      ]
    }
  },
  'contact.html': {
    title: 'Contact Us | Prajaya Foundation Chennai Headquarters',
    desc: 'Contact Prajaya Foundation. Headquarters: No: 13, 2nd Cross St, Pillaiyar Koil (Extn), Nesapakkam, West K.K Nagar, Chennai 600078. Phone: +91 96558 11133. Email: info@prajayafoundation.org.',
    canonical: 'https://prajayafoundation.org/contact',
    keywords: 'Contact Prajaya Foundation, Prajaya Foundation Chennai Address, NGO Phone Number Chennai, Nesapakkam West KK Nagar NGO, Prajaya Contact',
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        baseOrg,
        {
          "@type": "ContactPage",
          "@id": "https://prajayafoundation.org/contact#webpage",
          "url": "https://prajayafoundation.org/contact",
          "name": "Contact Prajaya Foundation",
          "description": "Headquarters address, telephone, email, and location details for Prajaya Foundation in Chennai.",
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://prajayafoundation.org/" },
              { "@type": "ListItem", "position": 2, "name": "Contact", "item": "https://prajayafoundation.org/contact" }
            ]
          }
        }
      ]
    }
  },
  'terms-and-conditions.html': {
    title: 'Terms and Conditions | Prajaya Foundation Official',
    desc: 'Official terms and conditions for using the Prajaya Foundation website, participating in events, and engaging with foundation programs.',
    canonical: 'https://prajayafoundation.org/terms-and-conditions',
    keywords: 'Terms and Conditions Prajaya Foundation, Website Terms of Use, NGO Terms, Legal Policy',
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        baseOrg,
        {
          "@type": "WebPage",
          "@id": "https://prajayafoundation.org/terms-and-conditions#webpage",
          "url": "https://prajayafoundation.org/terms-and-conditions",
          "name": "Terms and Conditions | Prajaya Foundation",
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://prajayafoundation.org/" },
              { "@type": "ListItem", "position": 2, "name": "Terms and Conditions", "item": "https://prajayafoundation.org/terms-and-conditions" }
            ]
          }
        }
      ]
    }
  },
  'privacy-policy.html': {
    title: 'Privacy Policy | Prajaya Foundation Official',
    desc: 'Privacy policy of Prajaya Foundation. Learn how we responsibly handle and protect user, donor, and volunteer personal information.',
    canonical: 'https://prajayafoundation.org/privacy-policy',
    keywords: 'Privacy Policy Prajaya Foundation, Data Protection NGO, Volunteer Privacy, Donor Information Security',
    schema: {
      "@context": "https://schema.org",
      "@graph": [
        baseOrg,
        {
          "@type": "WebPage",
          "@id": "https://prajayafoundation.org/privacy-policy#webpage",
          "url": "https://prajayafoundation.org/privacy-policy",
          "name": "Privacy Policy | Prajaya Foundation",
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://prajayafoundation.org/" },
              { "@type": "ListItem", "position": 2, "name": "Privacy Policy", "item": "https://prajayafoundation.org/privacy-policy" }
            ]
          }
        }
      ]
    }
  }
};

let updated = 0;

for (const [filename, conf] of Object.entries(pagesConfig)) {
  const filePath = path.join(dir, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filename}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Update Title
  content = content.replace(/<title>.*?<\/title>/i, `<title>${conf.title}</title>`);

  // 2. Update Meta Description
  if (content.includes('<meta name="description"')) {
    content = content.replace(/<meta name="description" content=".*?">/i, `<meta name="description" content="${conf.desc}">`);
  } else {
    content = content.replace('<head>', `<head>\n    <meta name="description" content="${conf.desc}">`);
  }

  // 3. Update Meta Keywords
  if (content.includes('<meta name="keywords"')) {
    content = content.replace(/<meta name="keywords" content=".*?">/i, `<meta name="keywords" content="${conf.keywords}">`);
  } else {
    content = content.replace('<head>', `<head>\n    <meta name="keywords" content="${conf.keywords}">`);
  }

  // 4. Update Canonical
  if (content.includes('<link rel="canonical"')) {
    content = content.replace(/<link rel="canonical" href=".*?">/i, `<link rel="canonical" href="${conf.canonical}">`);
  } else {
    content = content.replace('</title>', `</title>\n    <link rel="canonical" href="${conf.canonical}">`);
  }

  // 5. Update Robots meta & Author & Theme Color & Manifest
  const extraMetas = `    <meta name="author" content="Prajaya Foundation">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <meta name="theme-color" content="#2C2946">
    <link rel="manifest" href="/site.webmanifest">
    <link rel="apple-touch-icon" href="/assets/images/logo.png">`;

  // Remove existing redundant author/robots/manifest/theme-color if present
  content = content.replace(/<meta name="author"[^>]*>\r?\n?/gi, '');
  content = content.replace(/<meta name="robots"[^>]*>\r?\n?/gi, '');
  content = content.replace(/<meta name="theme-color"[^>]*>\r?\n?/gi, '');
  content = content.replace(/<link rel="manifest"[^>]*>\r?\n?/gi, '');
  content = content.replace(/<link rel="apple-touch-icon"[^>]*>\r?\n?/gi, '');

  content = content.replace(/<link rel="canonical" href="[^"]*">/i, `$& \n${extraMetas}`);

  // 6. Update Open Graph Tags
  content = content.replace(/<meta property="og:title" content=".*?">/i, `<meta property="og:title" content="${conf.title}">`);
  content = content.replace(/<meta property="og:description" content=".*?">/i, `<meta property="og:description" content="${conf.desc}">`);
  content = content.replace(/<meta property="og:url" content=".*?">/i, `<meta property="og:url" content="${conf.canonical}">`);

  // Ensure og:site_name & og:locale
  if (!content.includes('property="og:site_name"')) {
    content = content.replace(/<meta property="og:type" content="[^"]*">/i, `$& \n    <meta property="og:site_name" content="Prajaya Foundation">\n    <meta property="og:locale" content="en_IN">`);
  }

  // 7. Update Twitter Tags
  content = content.replace(/<meta property="twitter:title" content=".*?">/i, `<meta property="twitter:title" content="${conf.title}">`);
  content = content.replace(/<meta property="twitter:description" content=".*?">/i, `<meta property="twitter:description" content="${conf.desc}">`);
  content = content.replace(/<meta property="twitter:url" content=".*?">/i, `<meta property="twitter:url" content="${conf.canonical}">`);

  // 8. Inject Rich JSON-LD Structured Data
  const jsonLdStr = `<script type="application/ld+json">\n${JSON.stringify(conf.schema, null, 2)}\n    </script>`;
  const jsonLdRegex = /<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/;

  if (jsonLdRegex.test(content)) {
    content = content.replace(jsonLdRegex, jsonLdStr);
  } else {
    content = content.replace('</head>', `    ${jsonLdStr}\n</head>`);
  }

  // 9. Clean up broken footer links if in volunteer.html
  if (filename === 'volunteer.html') {
    content = content.replace(/<a href="\/safeguarding-policy"[^>]*>.*?<\/a>/g, '<a href="/volunteer-terms">Volunteer Terms & Safeguarding</a>');
    content = content.replace(/<a href="\/anti-sexual-harassment-policy"[^>]*>.*?<\/a>/g, '<a href="/transparency">Transparency & Governance</a>');
    content = content.replace(/<a href="\/donation-refund-policy"[^>]*>.*?<\/a>/g, '<a href="/transparency">Transparency & Policies</a>');
    content = content.replace(/<a href="\/terms-of-use"[^>]*>.*?<\/a>/g, '<a href="/terms-and-conditions">Terms and Conditions</a>');
    content = content.replace(/<a href="\/grievance"[^>]*>.*?<\/a>/g, '<a href="/contact">Grievance & Contact</a>');
    content = content.replace(/<a href="\/report-concern"[^>]*>.*?<\/a>/g, '<a href="/contact">Report Concern</a>');
    content = content.replace(/<a href="\/parent-consent"[^>]*>.*?<\/a>/g, '<a href="/volunteer-terms">Parent/Guardian Guidelines</a>');
    content = content.replace(/<a href="\/media-consent"[^>]*>.*?<\/a>/g, '<a href="/volunteer-terms">Media Consent Guidelines</a>');
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully enhanced SEO for ${filename}`);
  updated++;
}

console.log(`\nAll done! Successfully updated ${updated} files.`);
