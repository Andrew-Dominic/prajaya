const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = (app, supabase, requireAuth) => {
    
    // ==========================================
    // PUBLIC ROUTES
    // ==========================================

    // SSR Route for SEO (must be registered before static middleware in server.js or it will fall through)
    app.get('/news/:slug', async (req, res, next) => {
        try {
            const { slug } = req.params;
            const { data: news, error } = await supabase
                .from('news')
                .select('*')
                .eq('slug', slug)
                .eq('is_published', true)
                .single();

            if (error || !news) {
                return next(); // Pass to next handler (which might be 404)
            }

            const { data: images } = await supabase.from('news_images').select('image_url').eq('news_id', news.id);
            const coverImage = (images && images.length > 0) ? images[0].image_url : 'https://prajayafoundation.org/assets/images/logo.png';

            const fs = require('fs');
            const path = require('path');
            const template = fs.readFileSync(path.join(__dirname, '../../frontend/news-detail.html'), 'utf8');
            
            let html = template
                .replaceAll('{{TITLE}}', news.seo_title || news.title + ' | Prajaya Foundation')
                .replaceAll('{{DESC}}', news.seo_description || news.short_description || '')
                .replaceAll('{{OG_IMAGE}}', coverImage)
                .replaceAll('{{URL}}', 'https://prajayafoundation.org/news/' + news.slug)
                .replace('{{NEWS_DATA_JSON}}', JSON.stringify({ ...news, images }).replace(/</g, '\\u003c'));

            res.send(html);
        } catch (err) {
            next(err);
        }
    });

    // Get all published news
    app.get('/api/v1/news', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('news')
                .select(`
                    id, title, slug, short_description, published_at, 
                    location, category, status, cover_image_id, is_published, content,
                    updated_at, created_at,
                    news_images(image_url)
                `)
                .eq('is_published', true)
                .order('published_at', { ascending: false });

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            console.error('Error fetching news:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Get single published news by slug
    app.get('/api/v1/news/:slug', async (req, res) => {
        try {
            const { slug } = req.params;
            
            // 1. Fetch news
            const { data: news, error: newsError } = await supabase
                .from('news')
                .select('*')
                .eq('slug', slug)
                .eq('is_published', true)
                .single();

            if (newsError || !news) {
                return res.status(404).json({ success: false, message: 'News not found' });
            }

            // 2. Fetch images
            const { data: images } = await supabase
                .from('news_images')
                .select('*')
                .eq('news_id', news.id)
                .order('sort_order', { ascending: true });

            // 3. Fetch links
            const { data: links } = await supabase
                .from('news_links')
                .select('*')
                .eq('news_id', news.id)
                .order('sort_order', { ascending: true });

            res.json({ 
                success: true, 
                data: {
                    ...news,
                    images: images || [],
                    links: links || []
                }
            });
        } catch (error) {
            console.error('Error fetching news details:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });


    // ==========================================
    // ADMIN ROUTES
    // ==========================================

    // Get all news (including drafts)
    app.get('/api/v1/admin/news', requireAuth, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('news')
                .select(`*, news_images(image_url)`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Server error', error: error.message });
        }
    });

    // Get single news for editing
    app.get('/api/v1/admin/news/:id', requireAuth, async (req, res) => {
        try {
            const { id } = req.params;
            
            const { data: news, error: newsError } = await supabase
                .from('news')
                .select('*')
                .eq('id', id)
                .single();

            if (newsError || !news) return res.status(404).json({ success: false, message: 'News not found' });

            const { data: images } = await supabase
                .from('news_images')
                .select('*')
                .eq('news_id', news.id)
                .order('sort_order', { ascending: true });

            const { data: links } = await supabase
                .from('news_links')
                .select('*')
                .eq('news_id', news.id)
                .order('sort_order', { ascending: true });

            res.json({ success: true, data: { ...news, images: images || [], links: links || [] } });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Create new news
    app.post('/api/v1/admin/news', requireAuth, async (req, res) => {
        try {
            const { images, news_links, ...restBody } = req.body;
            const payload = {
                ...restBody,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            // Generate basic slug if not provided
            if (!payload.slug && payload.title) {
                let baseSlug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                // Check if slug exists
                const { data: existing } = await supabase.from('news').select('id').eq('slug', baseSlug).maybeSingle();
                if (existing) {
                    baseSlug = `${baseSlug}-${Date.now()}`;
                }
                payload.slug = baseSlug;
            }

            const { data: newsData, error: newsError } = await supabase
                .from('news')
                .insert([payload])
                .select()
                .single();

            if (newsError) throw newsError;
            
            if (images && images.length > 0) {
                const imagePayload = images.map((img, index) => ({
                    news_id: newsData.id,
                    s3_key: img.s3_key,
                    image_url: img.url,
                    sort_order: index
                }));
                
                const { data: insertedImages, error: imagesError } = await supabase
                    .from('news_images')
                    .insert(imagePayload)
                    .select();
                    
                if (imagesError) throw imagesError;
                
                if (insertedImages && insertedImages.length > 0) {
                    await supabase.from('news').update({ cover_image_id: insertedImages[0].id }).eq('id', newsData.id);
                }
            }
            
            if (news_links && news_links.length > 0) {
                const linksPayload = news_links.map((link, index) => ({
                    news_id: newsData.id,
                    title: link.title,
                    url: link.url,
                    sort_order: index
                }));
                
                const { error: linksError } = await supabase
                    .from('news_links')
                    .insert(linksPayload);
                    
                if (linksError) throw linksError;
            }

            res.json({ success: true, data: newsData });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Server error', error: error.message });
        }
    });

    // Upload Image for News
    app.post('/api/v1/admin/news/upload', requireAuth, upload.single('image'), async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
            
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const cleanName = (req.file.originalname || 'file').replace(/[^a-zA-Z0-9.]/g, '_');
            const filePath = `news/${uniqueSuffix}-${cleanName}`;
            
            const { data, error } = await supabase.storage.from('uploads').upload(filePath, req.file.buffer, { contentType: req.file.mimetype });
            
            if (error) throw error;
            
            const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
            
            res.json({ success: true, url: publicUrlData.publicUrl, s3_key: filePath });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ success: false, message: 'Server error', error: error.message });
        }
    });

    // Upload Multiple Images for News
    app.post('/api/v1/admin/news/upload-multiple', requireAuth, upload.array('images', 10), async (req, res) => {
        try {
            if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded' });
            
            const uploadedFiles = [];
            for (const file of req.files) {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const cleanName = (file.originalname || 'file').replace(/[^a-zA-Z0-9.]/g, '_');
                const filePath = `news/${uniqueSuffix}-${cleanName}`;
                
                const { error } = await supabase.storage.from('uploads').upload(filePath, file.buffer, { contentType: file.mimetype });
                if (error) throw error;
                
                const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
                uploadedFiles.push({ url: publicUrlData.publicUrl, s3_key: filePath });
            }
            
            res.json({ success: true, files: uploadedFiles });
        } catch (error) {
            console.error('Upload multiple error:', error);
            res.status(500).json({ success: false, message: 'Server error', error: error.message });
        }
    });

    // Update news
    app.put('/api/v1/admin/news/:id', requireAuth, async (req, res) => {
        try {
            const { id } = req.params;
            const { images, news_links, ...restBody } = req.body;
            const payload = {
                ...restBody,
                updated_at: new Date().toISOString()
            };

            const { data: newsData, error: newsError } = await supabase
                .from('news')
                .update(payload)
                .eq('id', id)
                .select()
                .single();

            if (newsError) throw newsError;
            
            // Handle Images
            if (images && images.length > 0) {
                await supabase.from('news_images').delete().eq('news_id', id);
                
                const imagePayload = images.map((img, index) => ({
                    news_id: id,
                    s3_key: img.s3_key,
                    image_url: img.url,
                    sort_order: index
                }));
                
                const { data: insertedImages, error: imagesError } = await supabase
                    .from('news_images')
                    .insert(imagePayload)
                    .select();
                    
                if (imagesError) throw imagesError;
                
                if (insertedImages && insertedImages.length > 0) {
                    await supabase.from('news').update({ cover_image_id: insertedImages[0].id }).eq('id', id);
                }
            }
            
            // Handle External Links
            if (news_links) {
                // Delete existing links
                await supabase.from('news_links').delete().eq('news_id', id);
                
                if (news_links.length > 0) {
                    const linksPayload = news_links.map((link, index) => ({
                        news_id: id,
                        title: link.title,
                        url: link.url,
                        sort_order: index
                    }));
                    
                    const { error: linksError } = await supabase
                        .from('news_links')
                        .insert(linksPayload);
                        
                    if (linksError) throw linksError;
                }
            }

            res.json({ success: true, data: newsData });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Server error', error: error.message });
        }
    });

    // Delete news
    app.delete('/api/v1/admin/news/:id', requireAuth, async (req, res) => {
        try {
            const { id } = req.params;
            const { error } = await supabase
                .from('news')
                .delete()
                .eq('id', id);

            if (error) throw error;
            res.json({ success: true, message: 'News deleted' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Server error', error: error.message });
        }
    });

};
