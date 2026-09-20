const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = (app, supabase, requireAuth) => {
    
    // ==========================================
    // PUBLIC ROUTES
    // ==========================================

    // SSR Route for SEO (must be registered before static middleware in server.js or it will fall through)
    app.get('/events/:slug', async (req, res, next) => {
        try {
            const { slug } = req.params;
            const { data: event, error } = await supabase
                .from('events')
                .select('*')
                .eq('slug', slug)
                .eq('is_published', true)
                .single();

            if (error || !event) {
                return next(); // Pass to next handler (which might be 404)
            }

            const { data: images } = await supabase.from('event_images').select('image_url').eq('event_id', event.id);
            const coverImage = (images && images.length > 0) ? images[0].image_url : 'https://prajayafoundation.org/assets/images/logo.png';

            const fs = require('fs');
            const path = require('path');
            const template = fs.readFileSync(path.join(__dirname, '../../frontend/event-detail.html'), 'utf8');
            
            let html = template
                .replace('{{TITLE}}', event.seo_title || event.title + ' | Prajaya Foundation')
                .replace('{{DESC}}', event.seo_description || event.short_description || '')
                .replace('{{OG_IMAGE}}', coverImage)
                .replace('{{URL}}', 'https://prajayafoundation.org/events/' + event.slug)
                .replace('{{EVENT_DATA_JSON}}', JSON.stringify({ ...event, images }).replace(/</g, '\\u003c'));

            res.send(html);
        } catch (err) {
            next(err);
        }
    });

    // Get all published events
    app.get('/api/v1/events', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('events')
                .select(`
                    id, title, slug, short_description, event_date, end_date, 
                    location, category, status, cover_image_id, is_published,
                    event_images!events_cover_image_id_fkey(image_url, alt_text)
                `)
                .eq('is_published', true)
                .order('event_date', { ascending: false });

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            console.error('Error fetching events:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Get single published event by slug
    app.get('/api/v1/events/:slug', async (req, res) => {
        try {
            const { slug } = req.params;
            
            // 1. Fetch event
            const { data: event, error: eventError } = await supabase
                .from('events')
                .select('*')
                .eq('slug', slug)
                .eq('is_published', true)
                .single();

            if (eventError || !event) {
                return res.status(404).json({ success: false, message: 'Event not found' });
            }

            // 2. Fetch images
            const { data: images } = await supabase
                .from('event_images')
                .select('*')
                .eq('event_id', event.id)
                .order('sort_order', { ascending: true });

            // 3. Fetch links
            const { data: links } = await supabase
                .from('event_links')
                .select('*')
                .eq('event_id', event.id)
                .order('sort_order', { ascending: true });

            res.json({ 
                success: true, 
                data: {
                    ...event,
                    images: images || [],
                    links: links || []
                }
            });
        } catch (error) {
            console.error('Error fetching event details:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });


    // ==========================================
    // ADMIN ROUTES
    // ==========================================

    // Get all events (including drafts)
    app.get('/api/v1/admin/events', requireAuth, async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Server error', error: error.message });
        }
    });

    // Get single event for editing
    app.get('/api/v1/admin/events/:id', requireAuth, async (req, res) => {
        try {
            const { id } = req.params;
            
            const { data: event, error: eventError } = await supabase
                .from('events')
                .select('*')
                .eq('id', id)
                .single();

            if (eventError || !event) return res.status(404).json({ success: false, message: 'Event not found' });

            const { data: images } = await supabase
                .from('event_images')
                .select('*')
                .eq('event_id', event.id)
                .order('sort_order', { ascending: true });

            const { data: links } = await supabase
                .from('event_links')
                .select('*')
                .eq('event_id', event.id)
                .order('sort_order', { ascending: true });

            res.json({ success: true, data: { ...event, images: images || [], links: links || [] } });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Server error' });
        }
    });

    // Create new event
    app.post('/api/v1/admin/events', requireAuth, async (req, res) => {
        try {
            const { images, ...restBody } = req.body;
            const payload = {
                ...restBody,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            // Generate basic slug if not provided
            if (!payload.slug && payload.title) {
                payload.slug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            }

            const { data: eventData, error: eventError } = await supabase
                .from('events')
                .insert([payload])
                .select()
                .single();

            if (eventError) throw eventError;
            
            if (images && images.length > 0) {
                const imagePayload = images.map((img, index) => ({
                    event_id: eventData.id,
                    s3_key: img.s3_key,
                    image_url: img.url,
                    sort_order: index,
                    is_cover: index === 0
                }));
                
                const { data: insertedImages, error: imagesError } = await supabase
                    .from('event_images')
                    .insert(imagePayload)
                    .select();
                    
                if (imagesError) throw imagesError;
                
                if (insertedImages && insertedImages.length > 0) {
                    await supabase.from('events').update({ cover_image_id: insertedImages[0].id }).eq('id', eventData.id);
                }
            }

            res.json({ success: true, data: eventData });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Server error', error: error.message });
        }
    });

    // Upload Image for Event
    app.post('/api/v1/admin/events/upload', requireAuth, upload.single('image'), async (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
            
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const cleanName = (req.file.originalname || 'file').replace(/[^a-zA-Z0-9.]/g, '_');
            const filePath = `events/${uniqueSuffix}-${cleanName}`;
            
            const { data, error } = await supabase.storage.from('uploads').upload(filePath, req.file.buffer, { contentType: req.file.mimetype });
            
            if (error) throw error;
            
            const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
            
            res.json({ success: true, url: publicUrlData.publicUrl, s3_key: filePath });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ success: false, message: 'Server error', error: error.message });
        }
    });

    // Upload Multiple Images for Event
    app.post('/api/v1/admin/events/upload-multiple', requireAuth, upload.array('images', 10), async (req, res) => {
        try {
            if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded' });
            
            const uploadedFiles = [];
            for (const file of req.files) {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const cleanName = (file.originalname || 'file').replace(/[^a-zA-Z0-9.]/g, '_');
                const filePath = `events/${uniqueSuffix}-${cleanName}`;
                
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

    // Update event
    app.put('/api/v1/admin/events/:id', requireAuth, async (req, res) => {
        try {
            const { id } = req.params;
            const { images, ...restBody } = req.body;
            const payload = {
                ...restBody,
                updated_at: new Date().toISOString()
            };

            const { data: eventData, error: eventError } = await supabase
                .from('events')
                .update(payload)
                .eq('id', id)
                .select()
                .single();

            if (eventError) throw eventError;
            
            if (images && images.length > 0) {
                // Delete old images first to keep it simple, or keep existing. For now, replace all if new ones provided.
                await supabase.from('event_images').delete().eq('event_id', id);
                
                const imagePayload = images.map((img, index) => ({
                    event_id: id,
                    s3_key: img.s3_key,
                    image_url: img.url,
                    sort_order: index,
                    is_cover: index === 0
                }));
                
                const { data: insertedImages, error: imagesError } = await supabase
                    .from('event_images')
                    .insert(imagePayload)
                    .select();
                    
                if (imagesError) throw imagesError;
                
                if (insertedImages && insertedImages.length > 0) {
                    await supabase.from('events').update({ cover_image_id: insertedImages[0].id }).eq('id', id);
                }
            }

            res.json({ success: true, data: eventData });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Server error', error: error.message });
        }
    });

    // Delete event
    app.delete('/api/v1/admin/events/:id', requireAuth, async (req, res) => {
        try {
            const { id } = req.params;
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', id);

            if (error) throw error;
            res.json({ success: true, message: 'Event deleted' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Server error', error: error.message });
        }
    });

};
