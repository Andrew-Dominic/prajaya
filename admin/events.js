let allEvents = [];
let currentEvent = null;
let coverFile = null;
let editorContentBlocks = [];
let editorExternalLinks = [];
let blockEditors = {}; // Map of block index to Quill instances
let currentPageType = 'TEASER'; // Track current page type

document.addEventListener('DOMContentLoaded', () => {
    // Intercept switchView
    const originalSwitchView = window.switchView;
    if (originalSwitchView) {
        window.switchView = function(viewId) {
            originalSwitchView(viewId);
            
            const evView = document.getElementById('eventsView');
            if (evView) evView.style.display = 'none';

            if (viewId === 'events') {
                document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('.nav-link').forEach(el => {
                    if (el.textContent.includes('Events')) el.classList.add('active');
                });
                
                const pageTitle = document.getElementById('page-title');
                if (pageTitle) pageTitle.textContent = 'Event Management';
                
                if (evView) evView.style.display = 'block';
                showEventsList();
            }
        }
    }

    // Page Type card selection logic
    document.querySelectorAll('input[name="basicPageType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const teaserCard = document.getElementById('pageTypeTeaser');
            const contentCard = document.getElementById('pageTypeContent');
            if (this.value === 'TEASER') {
                teaserCard.style.border = '2px solid var(--color-accent)';
                teaserCard.style.background = 'var(--color-accent-glow)';
                contentCard.style.border = '2px solid var(--color-border)';
                contentCard.style.background = 'white';
            } else {
                contentCard.style.border = '2px solid var(--color-accent)';
                contentCard.style.background = 'var(--color-accent-glow)';
                teaserCard.style.border = '2px solid var(--color-border)';
                teaserCard.style.background = 'white';
            }
        });
    });
});

/* =======================================================================
   STAGE 1: EVENT LIBRARY
   ======================================================================= */

async function fetchAdminEvents() {
    try {
        const response = await fetch('/api/v1/admin/events', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        const result = await response.json();
        if (result.success) {
            allEvents = result.data;
            renderEventsTable(allEvents);
        }
    } catch (error) {
        console.error('Failed to fetch events', error);
    }
}

function formatLifecycleStatus(status) {
    const map = {
        'COMING_SOON': 'Coming Soon',
        'UPCOMING': 'Upcoming',
        'ONGOING': 'Ongoing',
        'COMPLETED': 'Completed',
        'CANCELLED': 'Cancelled'
    };
    return map[status] || status || 'Upcoming';
}

function renderEventsTable(events) {
    const tbody = document.getElementById('eventsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (events.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px; color: #888;">No events found. Click "Create Event" to start!</td></tr>';
        return;
    }

    events.forEach(event => {
        let imageUrl = null;
        if (event.event_images && event.event_images.length > 0) {
            const cover = event.event_images.find(img => img.is_cover);
            imageUrl = cover ? cover.image_url : event.event_images[0].image_url;
        }

        const lifecycleBadge = event.event_lifecycle_status ? event.event_lifecycle_status.toLowerCase().replace('_', '-') : 'upcoming';
        const pageTypeLabel = event.page_type === 'CONTENT_PAGE' ? '📖 Content' : '📌 Teaser';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                ${imageUrl ? `<img src="${imageUrl}" width="60" height="40" style="border-radius: 6px; object-fit: cover; border: 1px solid #ddd;">` : `<div style="width: 60px; height: 40px; background: #f0f0f0; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #aaa; border: 1px solid #eee;">No IMG</div>`}
            </td>
            <td><strong>${event.title}</strong><br><small style="color: #888;">${event.slug ? '/' + event.slug : 'No slug'}</small></td>
            <td>${event.event_date ? new Date(event.event_date).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'}) : '<span style="color:#aaa;">TBA</span>'}</td>
            <td><span class="status-badge status-${lifecycleBadge}" style="text-transform: capitalize;">${formatLifecycleStatus(event.event_lifecycle_status)}</span></td>
            <td><span style="font-size: 0.8rem; color: #666;">${pageTypeLabel}</span></td>
            <td>
                ${event.publication_status === 'PUBLISHED' 
                    ? '<span style="color: var(--color-success); font-weight: 600; font-size: 0.85rem;"><i class="fas fa-eye"></i> Published</span>' 
                    : '<span style="color: var(--color-warning, #f59e0b); font-weight: 600; font-size: 0.85rem;"><i class="fas fa-eye-slash"></i> Draft</span>'}
            </td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editEvent('${event.id}')">Edit</button>
                <button class="btn btn-sm btn-outline" style="color: var(--color-danger); border-color: var(--color-danger);" onclick="deleteEvent('${event.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterEvents() {
    const query = document.getElementById('eventSearchInput').value.toLowerCase();
    const status = document.getElementById('eventStatusFilter').value;
    
    const filtered = allEvents.filter(ev => {
        const matchQuery = ev.title.toLowerCase().includes(query) || (ev.slug && ev.slug.toLowerCase().includes(query));
        
        let matchStatus = true;
        if (status === 'DRAFT') matchStatus = ev.publication_status === 'DRAFT';
        else if (status === 'PUBLISHED') matchStatus = ev.publication_status === 'PUBLISHED';
        else if (status === 'COMING_SOON') matchStatus = ev.event_lifecycle_status === 'COMING_SOON';
        else if (status === 'UPCOMING') matchStatus = ev.event_lifecycle_status === 'UPCOMING';
        else if (status === 'COMPLETED') matchStatus = ev.event_lifecycle_status === 'COMPLETED';
        
        return matchQuery && matchStatus;
    });
    
    renderEventsTable(filtered);
}

function showEventsList() {
    document.getElementById('eventsListSection').style.display = 'block';
    document.getElementById('eventBasicFormSection').style.display = 'none';
    document.getElementById('eventEditorSection').style.display = 'none';
    fetchAdminEvents();
}

/* =======================================================================
   STAGE 2: CREATE / EDIT BASIC INFO
   ======================================================================= */

function showEventBasicForm() {
    document.getElementById('eventsListSection').style.display = 'none';
    document.getElementById('eventBasicFormSection').style.display = 'block';
    document.getElementById('eventEditorSection').style.display = 'none';
    
    document.getElementById('eventBasicForm').reset();
    document.getElementById('basicEventId').value = '';
    removeCover();

    // Reset page type cards visual state
    const teaserCard = document.getElementById('pageTypeTeaser');
    const contentCard = document.getElementById('pageTypeContent');
    if (teaserCard && contentCard) {
        teaserCard.style.border = '2px solid var(--color-accent)';
        teaserCard.style.background = 'var(--color-accent-glow)';
        contentCard.style.border = '2px solid var(--color-border)';
        contentCard.style.background = 'white';
    }
}

function handleCoverPreview(input) {
    if (input.files && input.files[0]) {
        coverFile = input.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('coverUploadArea').style.display = 'none';
            document.getElementById('coverPreviewContainer').style.display = 'block';
            document.getElementById('coverPreviewImg').src = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function removeCover() {
    coverFile = null;
    document.getElementById('basicEventCover').value = '';
    document.getElementById('coverUploadArea').style.display = 'block';
    document.getElementById('coverPreviewContainer').style.display = 'none';
    document.getElementById('coverPreviewImg').src = '';
}

function handleBasicEventSubmit(e) {
    e.preventDefault();
    saveBasicEvent();
}

async function saveBasicEvent() {
    const id = document.getElementById('basicEventId').value;
    const title = document.getElementById('basicEventTitle').value.trim();
    const date = document.getElementById('basicEventDate').value;
    const location = document.getElementById('basicEventLocation').value.trim();
    const shortDesc = document.getElementById('basicEventShortDesc').value.trim();
    
    if (!title) return alert('Event Title is required.');
    
    const lifecycle = document.querySelector('input[name="basicEventLifecycle"]:checked').value;
    const pageType = document.querySelector('input[name="basicPageType"]:checked').value;
    
    // Upload cover if new file selected
    let uploadedImages = [];
    if (coverFile) {
        const formData = new FormData();
        formData.append('images', coverFile);
        
        try {
            const uploadRes = await fetch('/api/v1/admin/events/upload-multiple', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
                body: formData
            });
            const uploadData = await uploadRes.json();
            if (uploadData.success && uploadData.files.length > 0) {
                // Mark this image explicitly as the cover
                uploadData.files[0].is_cover = true;
                uploadedImages = uploadData.files;
            } else {
                return alert('Cover image upload failed: ' + uploadData.message);
            }
        } catch (err) {
            console.error(err);
            return alert('Network error during image upload.');
        }
    }

    const payload = {
        title,
        short_description: shortDesc,
        event_date: date ? new Date(date).toISOString() : null,
        location,
        event_lifecycle_status: lifecycle,
        page_type: pageType,
        publication_status: 'DRAFT'
    };

    if (uploadedImages.length > 0) {
        payload.images = uploadedImages;
    }

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/v1/admin/events/${id}` : '/api/v1/admin/events';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}` 
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.success) {
            // Success! Load the editor for this event
            editEvent(result.data.id || id);
        } else {
            alert('Error saving event: ' + result.message);
        }
    } catch (error) {
        console.error('Failed to save event basic info', error);
        alert('Network error saving event.');
    }
}

/* =======================================================================
   STAGE 3: EVENT EDITOR (CONTENT BUILDER)
   ======================================================================= */

async function editEvent(id) {
    try {
        const response = await fetch(`/api/v1/admin/events/${id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        const result = await response.json();
        if (result.success) {
            currentEvent = result.data;
            populateEditor();
            document.getElementById('eventsListSection').style.display = 'none';
            document.getElementById('eventBasicFormSection').style.display = 'none';
            document.getElementById('eventEditorSection').style.display = 'block';
        } else {
            alert('Error loading event for editing: ' + (result.message || 'Unknown server error'));
        }
    } catch (error) {
        console.error('Failed to load event for editing', error);
        alert('Network or syntax error loading event details. Please try again.');
    }
}

function populateEditor() {
    if (!currentEvent) return;

    try {
        console.log('Populating editor with currentEvent:', currentEvent);
        
        let parsedDraftData = currentEvent.draft_data;
        if (typeof parsedDraftData === 'string') {
            try { parsedDraftData = JSON.parse(parsedDraftData); } catch(e) {}
        }
        
        const eventData = parsedDraftData ? { ...currentEvent, ...parsedDraftData } : currentEvent;

        // Header
        const titleStatus = currentEvent.publication_status === 'PUBLISHED' ? `<span style="color:var(--color-success);font-size:0.9rem;font-weight:normal;">● Published</span>` : `<span style="color:var(--color-warning, #f59e0b);font-size:0.9rem;font-weight:normal;">● Draft</span>`;
        const titleEl = document.getElementById('editorEventTitle');
        if (titleEl) titleEl.innerHTML = `${eventData.title || 'Untitled Event'} ${titleStatus}`;
        
        const previewBtn = document.getElementById('editorPreviewBtn');
        if (previewBtn) previewBtn.href = `/events/${eventData.slug || eventData.id}`;

        // Overview section
        let imageUrl = '';
        let imagesToUse = eventData.images || currentEvent.images || [];
        if (!Array.isArray(imagesToUse)) imagesToUse = [];
        
        if (imagesToUse.length > 0) {
            const cover = imagesToUse.find(img => img.is_cover);
            imageUrl = cover ? cover.image_url : imagesToUse[0].image_url;
        }
        
        const coverImgEl = document.getElementById('overviewCoverImg');
        if (coverImgEl) coverImgEl.src = imageUrl || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlZWVlZWUiLz48L3N2Zz4='; 
        
        const dateStr = (eventData.event_date && !isNaN(new Date(eventData.event_date).getTime())) ? new Date(eventData.event_date).toLocaleDateString() : 'TBA';
        const locStr = eventData.location || 'No Location';
        const dateLocEl = document.getElementById('overviewDateLocation');
        if (dateLocEl) dateLocEl.innerHTML = `<i class="far fa-calendar"></i> ${dateStr} &nbsp;|&nbsp; <i class="fas fa-map-marker-alt"></i> ${locStr}`;
        
        const shortDescEl = document.getElementById('overviewShortDesc');
        if (shortDescEl) shortDescEl.innerText = eventData.short_description || 'No description provided.';

        // Settings Panel
        const lifecycleEl = document.getElementById('editorEventLifecycleStatus');
        if (lifecycleEl) lifecycleEl.value = eventData.event_lifecycle_status || 'UPCOMING';
        
        const slugEl = document.getElementById('editorEventSlug');
        if (slugEl) slugEl.value = eventData.slug || '';
        
        const seoTitleEl = document.getElementById('editorSeoTitle');
        if (seoTitleEl) seoTitleEl.value = eventData.seo_title || '';
        
        const seoDescEl = document.getElementById('editorSeoDesc');
        if (seoDescEl) seoDescEl.value = eventData.seo_description || '';
        
        // Page Experience Panel
        currentPageType = eventData.page_type || 'TEASER';
        updatePageExperiencePanel();

        // Content Blocks
        try {
            if (eventData.content && eventData.content.ops) {
                 editorContentBlocks = [{ type: 'paragraph', content: eventData.content }];
            } else if (Array.isArray(eventData.content)) {
                editorContentBlocks = eventData.content;
            } else {
                editorContentBlocks = [];
            }
        } catch(e) {
            editorContentBlocks = [];
        }
        
        editorExternalLinks = eventData.event_links || [];

        renderContentBlocks();
        renderExternalLinks();
    } catch (err) {
        console.error('Error populating editor:', err);
    }
}

function updatePageExperiencePanel() {
    const teaserPanel = document.getElementById('pageExpTeaser');
    const contentPanel = document.getElementById('pageExpContent');
    
    if (currentPageType === 'CONTENT_PAGE') {
        teaserPanel.style.display = 'none';
        contentPanel.style.display = 'block';
    } else {
        teaserPanel.style.display = 'block';
        contentPanel.style.display = 'none';
    }
}

function switchPageType(newType) {
    // Content is NEVER deleted when switching page types
    currentPageType = newType;
    updatePageExperiencePanel();
    markUnsaved();
    
    // Auto-save the page type change
    if (currentEvent) {
        saveEventContent();
    }
}

function editBasicInfo() {
    if (!currentEvent) return;
    try {
        const eventData = currentEvent.draft_data ? { ...currentEvent, ...currentEvent.draft_data } : currentEvent;
        showEventBasicForm();
        
        document.getElementById('basicEventId').value = eventData.id || currentEvent.id || '';
        document.getElementById('basicEventTitle').value = eventData.title || '';
        
        if (eventData.event_date) {
            const d = new Date(eventData.event_date);
            if (!isNaN(d.getTime())) {
                d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                document.getElementById('basicEventDate').value = d.toISOString().slice(0, 16);
            }
        }
        
        document.getElementById('basicEventLocation').value = eventData.location || '';
        document.getElementById('basicEventShortDesc').value = eventData.short_description || '';
        
        // Set lifecycle radio
        const radios = document.getElementsByName('basicEventLifecycle');
        for (let i = 0; i < radios.length; i++) {
            if (radios[i].value === (eventData.event_lifecycle_status || 'UPCOMING')) {
                radios[i].checked = true;
            }
        }

        // Set page type radio and visual state
        const pageRadios = document.getElementsByName('basicPageType');
        const pt = eventData.page_type || 'TEASER';
        for (let i = 0; i < pageRadios.length; i++) {
            if (pageRadios[i].value === pt) {
                pageRadios[i].checked = true;
            }
        }
        
        // Update card visuals
        const teaserCard = document.getElementById('pageTypeTeaser');
        const contentCard = document.getElementById('pageTypeContent');
        if (teaserCard && contentCard) {
            if (pt === 'CONTENT_PAGE') {
                contentCard.style.border = '2px solid var(--color-accent)';
                contentCard.style.background = 'var(--color-accent-glow)';
                teaserCard.style.border = '2px solid var(--color-border)';
                teaserCard.style.background = 'white';
            } else {
                teaserCard.style.border = '2px solid var(--color-accent)';
                teaserCard.style.background = 'var(--color-accent-glow)';
                contentCard.style.border = '2px solid var(--color-border)';
                contentCard.style.background = 'white';
            }
        }
    } catch (err) {
        console.error('Error in editBasicInfo:', err);
        alert('An error occurred while opening the edit form.');
    }
}

/* --- Content Builder Logic --- */

function toggleAddBlockMenu() {
    const menu = document.getElementById('addBlockMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    const btn = document.getElementById('addContentBtn');
    const menu = document.getElementById('addBlockMenu');
    if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
        menu.style.display = 'none';
    }
});

function addContentBlock(type) {
    toggleAddBlockMenu(); // hide menu
    
    const newBlock = { type: type };
    if (type === 'heading') newBlock.content = 'New Heading';
    if (type === 'paragraph') newBlock.content = '';
    if (type === 'quote') { newBlock.content = ''; newBlock.author = ''; }
    if (type === 'image') newBlock.url = '';
    if (type === 'gallery') newBlock.images = [];
    if (type === 'highlight') { newBlock.title = ''; newBlock.content = ''; }
    if (type === 'people') { newBlock.title = ''; newBlock.roles = [{ name: '', title: '' }]; }
    if (type === 'organization') { newBlock.label = 'Presented By'; newBlock.name = ''; newBlock.details = ''; }
    if (type === 'divider') { /* no data needed */ }
    if (type === 'cta') { newBlock.label = ''; newBlock.url = ''; newBlock.style = 'button'; }
    if (type === 'video') { newBlock.url = ''; }
    
    editorContentBlocks.push(newBlock);
    renderContentBlocks();
    markUnsaved();
}

function removeContentBlock(index) {
    if (confirm('Remove this block?')) {
        editorContentBlocks.splice(index, 1);
        renderContentBlocks();
        markUnsaved();
    }
}

function moveContentBlock(index, direction) {
    syncBlockEditors(); // Save current quill states before moving
    
    if (direction === -1 && index > 0) {
        const temp = editorContentBlocks[index];
        editorContentBlocks[index] = editorContentBlocks[index - 1];
        editorContentBlocks[index - 1] = temp;
    } else if (direction === 1 && index < editorContentBlocks.length - 1) {
        const temp = editorContentBlocks[index];
        editorContentBlocks[index] = editorContentBlocks[index + 1];
        editorContentBlocks[index + 1] = temp;
    }
    renderContentBlocks();
}

function renderContentBlocks() {
    const container = document.getElementById('contentBlocksArea');
    const emptyState = document.getElementById('emptyContentState');
    
    // Clear previous Quill instances map
    blockEditors = {};

    if (editorContentBlocks.length === 0) {
        container.innerHTML = '';
        container.appendChild(emptyState);
        emptyState.style.display = 'block';
        return;
    }

    container.innerHTML = '';
    
    editorContentBlocks.forEach((block, index) => {
        const blockDiv = document.createElement('div');
        blockDiv.className = 'content-block-item';
        blockDiv.style = 'background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); overflow: hidden;';
        
        // Block type label
        const typeLabels = {
            'heading': 'Heading',
            'paragraph': 'Paragraph',
            'quote': 'Quote',
            'image': 'Image',
            'gallery': 'Gallery',
            'highlight': 'Highlight',
            'people': 'People / Roles',
            'organization': 'Organization',
            'divider': 'Divider',
            'cta': 'Call to Action',
            'video': 'Video'
        };

        // Block Toolbar
        const toolbarHtml = `
            <div style="background: #f8f9fa; border-bottom: 1px solid #eee; padding: 10px 15px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.8rem; font-weight: 600; color: #888; text-transform: uppercase;">
                    <i class="fas fa-grip-vertical" style="margin-right: 8px; cursor: move;"></i> ${typeLabels[block.type] || block.type}
                </span>
                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-sm btn-outline" style="padding: 2px 8px; border: none;" onclick="moveContentBlock(${index}, -1)" ${index === 0 ? 'disabled' : ''}><i class="fas fa-chevron-up"></i></button>
                    <button class="btn btn-sm btn-outline" style="padding: 2px 8px; border: none;" onclick="moveContentBlock(${index}, 1)" ${index === editorContentBlocks.length - 1 ? 'disabled' : ''}><i class="fas fa-chevron-down"></i></button>
                    <button class="btn btn-sm btn-outline" style="padding: 2px 8px; border: none; color: var(--color-danger);" onclick="removeContentBlock(${index})"><i class="fas fa-times"></i></button>
                </div>
            </div>
        `;
        
        let contentHtml = '';
        
        if (block.type === 'heading') {
            contentHtml = `<div style="padding: 20px;"><input type="text" class="form-control" style="font-size: 1.25rem; font-weight: 600;" value="${(block.content || '').replace(/"/g, '&quot;')}" onchange="updateBlockData(${index}, 'content', this.value)" placeholder="Enter heading..."></div>`;
        } 
        else if (block.type === 'paragraph') {
            // We use a div for Quill to mount on
            contentHtml = `<div style="padding: 20px;"><div id="quill-block-${index}" style="min-height: 150px; height: auto;"></div></div>`;
        }
        else if (block.type === 'quote') {
            contentHtml = `
                <div style="padding: 20px; display: flex; flex-direction: column; gap: 10px;">
                    <textarea class="form-control" rows="3" placeholder="Enter quote text..." onchange="updateBlockData(${index}, 'content', this.value)">${block.content || ''}</textarea>
                    <input type="text" class="form-control" placeholder="Author / Attribution" value="${(block.author || '').replace(/"/g, '&quot;')}" onchange="updateBlockData(${index}, 'author', this.value)">
                </div>`;
        }
        else if (block.type === 'image') {
            const currentUrl = block.url || '';
            contentHtml = `
                <div style="padding: 20px; text-align: center;">
                    ${currentUrl ? `
                        <div style="margin-bottom: 15px; max-height: 200px; overflow: hidden; border-radius: 4px;">
                            <img src="${currentUrl}" style="width: 100%; object-fit: contain;">
                        </div>
                    ` : ''}
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="file" accept="image/*" class="form-control" onchange="uploadBlockImage(${index}, this)">
                        <span style="font-size: 0.8rem; color: #888;">OR</span>
                        <input type="text" class="form-control" placeholder="Paste Image URL" value="${currentUrl}" onchange="updateBlockData(${index}, 'url', this.value)">
                    </div>
                </div>
            `;
        }
        else if (block.type === 'gallery') {
            const imagesHtml = (block.images || []).map((imgUrl, imgIdx) => `
                <div style="position: relative; width: 100px; height: 100px; border-radius: 8px; overflow: hidden; border: 1px solid #ddd;">
                    <img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover;">
                    <button class="btn btn-sm btn-danger" style="position: absolute; top: 2px; right: 2px; padding: 2px 6px;" onclick="removeGalleryImage(${index}, ${imgIdx})"><i class="fas fa-times"></i></button>
                </div>
            `).join('');
            
            contentHtml = `
                <div style="padding: 20px;">
                    <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;" id="gallery-preview-${index}">
                        ${imagesHtml}
                        ${(block.images || []).length === 0 ? '<p style="color: #888; font-size: 0.9rem; margin: 0;">No images in gallery yet.</p>' : ''}
                    </div>
                    <div class="upload-area" style="border: 2px dashed #ccc; padding: 20px; text-align: center; cursor: pointer; border-radius: 8px;" onclick="document.getElementById('gallery-input-${index}').click()">
                        <i class="fas fa-plus"></i> Add Photos
                        <input type="file" id="gallery-input-${index}" accept="image/*" multiple style="display: none;" onchange="uploadGalleryImages(${index}, this)">
                    </div>
                </div>
            `;
        }
        else if (block.type === 'highlight') {
            contentHtml = `
                <div style="padding: 20px; background: #fffdf0; display: flex; flex-direction: column; gap: 10px;">
                    <input type="text" class="form-control" style="font-size: 1.1rem; font-weight: 600;" value="${(block.title || '').replace(/"/g, '&quot;')}" onchange="updateBlockData(${index}, 'title', this.value)" placeholder="Highlight title (e.g. FOR A DRUG-FREE GENERATION)">
                    <textarea class="form-control" rows="3" placeholder="Highlight body text (e.g. A movement to inspire young minds towards Discipline • Strength • Fitness • Purpose)" onchange="updateBlockData(${index}, 'content', this.value)">${block.content || ''}</textarea>
                </div>
            `;
        }
        else if (block.type === 'people') {
            const rolesHtml = (block.roles || []).map((r, rIdx) => `
                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <input type="text" class="form-control" placeholder="Role (e.g. Founder)" value="${(r.title || '').replace(/"/g, '&quot;')}" onchange="updateBlockArrayData(${index}, 'roles', ${rIdx}, 'title', this.value)">
                    <input type="text" class="form-control" placeholder="Name" value="${(r.name || '').replace(/"/g, '&quot;')}" onchange="updateBlockArrayData(${index}, 'roles', ${rIdx}, 'name', this.value)">
                    <button class="btn btn-sm btn-outline" style="color: red;" onclick="removeBlockArrayItem(${index}, 'roles', ${rIdx})"><i class="fas fa-trash"></i></button>
                </div>
            `).join('');

            contentHtml = `
                <div style="padding: 20px; display: flex; flex-direction: column; gap: 15px;">
                    <input type="text" class="form-control" placeholder="Section Title (e.g. Core Team)" value="${(block.title || '').replace(/"/g, '&quot;')}" onchange="updateBlockData(${index}, 'title', this.value)">
                    <div>
                        <label style="font-size: 0.85rem; font-weight: 600; color: #666; margin-bottom: 5px; display: block;">ROLES</label>
                        <div id="people-list-${index}">
                            ${rolesHtml}
                        </div>
                        <button class="btn btn-sm btn-outline" onclick="addBlockArrayItem(${index}, 'roles', {title: '', name: ''})">+ Add Person</button>
                    </div>
                </div>
            `;
        }
        else if (block.type === 'organization') {
            contentHtml = `
                <div style="padding: 20px; display: flex; flex-direction: column; gap: 15px; background: #f8fafc;">
                    <input type="text" class="form-control" placeholder="Label (e.g. Presented By)" value="${(block.label || 'Presented By').replace(/"/g, '&quot;')}" onchange="updateBlockData(${index}, 'label', this.value)">
                    <input type="text" class="form-control" style="font-size: 1.25rem; font-weight: 600;" placeholder="Organization Name" value="${(block.name || '').replace(/"/g, '&quot;')}" onchange="updateBlockData(${index}, 'name', this.value)">
                    <textarea class="form-control" rows="2" placeholder="Organization Details (Optional)" onchange="updateBlockData(${index}, 'details', this.value)">${block.details || ''}</textarea>
                </div>
            `;
        }
        else if (block.type === 'divider') {
            contentHtml = `
                <div style="padding: 20px; text-align: center;">
                    <hr style="border: 0; border-top: 2px solid #e0e0e0; margin: 10px 40px;">
                    <p style="font-size: 0.8rem; color: #aaa; margin: 10px 0 0 0;">Visual separator between sections</p>
                </div>
            `;
        }
        else if (block.type === 'cta') {
            contentHtml = `
                <div style="padding: 20px; display: flex; flex-direction: column; gap: 10px;">
                    <input type="text" class="form-control" placeholder="Button label (e.g. Call 96558 11133)" value="${(block.label || '').replace(/"/g, '&quot;')}" onchange="updateBlockData(${index}, 'label', this.value)">
                    <input type="url" class="form-control" placeholder="URL or tel: link (e.g. tel:+919655811133)" value="${(block.url || '').replace(/"/g, '&quot;')}" onchange="updateBlockData(${index}, 'url', this.value)">
                    <select class="form-control" onchange="updateBlockData(${index}, 'style', this.value)" style="max-width: 200px;">
                        <option value="button" ${block.style === 'button' ? 'selected' : ''}>Button</option>
                        <option value="link" ${block.style === 'link' ? 'selected' : ''}>Text Link</option>
                    </select>
                </div>
            `;
        }
        else if (block.type === 'video') {
            contentHtml = `
                <div style="padding: 20px;">
                    <input type="url" class="form-control" placeholder="YouTube or video URL" value="${(block.url || '').replace(/"/g, '&quot;')}" onchange="updateBlockData(${index}, 'url', this.value)">
                    ${block.url ? `<div style="margin-top: 15px; position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;"><iframe src="${getEmbedUrl(block.url)}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen></iframe></div>` : ''}
                </div>
            `;
        }
        
        blockDiv.innerHTML = toolbarHtml + contentHtml;
        container.appendChild(blockDiv);
        
        // Initialize Quill if it's a paragraph block
        if (block.type === 'paragraph' && typeof Quill !== 'undefined') {
            const quill = new Quill(`#quill-block-${index}`, {
                theme: 'snow',
                placeholder: 'Write paragraph content...',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['link'],
                        ['clean']
                    ]
                }
            });
            // Handle existing content (Delta or plain text mapping)
            if (block.content) {
                if (typeof block.content === 'object' && block.content.ops) {
                    quill.setContents(block.content); // Delta object
                } else {
                    // Fallback if string
                    quill.root.innerHTML = block.content;
                }
            }
            
            blockEditors[index] = quill;
        }
    });
}

function getEmbedUrl(url) {
    if (!url) return '';
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    return url;
}

function updateBlockData(index, key, value) {
    editorContentBlocks[index][key] = value;
    markUnsaved();
}

function updateBlockArrayData(blockIndex, arrayKey, itemIndex, itemKey, value) {
    if (editorContentBlocks[blockIndex] && editorContentBlocks[blockIndex][arrayKey] && editorContentBlocks[blockIndex][arrayKey][itemIndex]) {
        editorContentBlocks[blockIndex][arrayKey][itemIndex][itemKey] = value;
        markUnsaved();
    }
}

function addBlockArrayItem(blockIndex, arrayKey, emptyItem) {
    if (editorContentBlocks[blockIndex]) {
        if (!editorContentBlocks[blockIndex][arrayKey]) {
            editorContentBlocks[blockIndex][arrayKey] = [];
        }
        editorContentBlocks[blockIndex][arrayKey].push(emptyItem);
        renderContentBlocks();
        markUnsaved();
    }
}

function removeBlockArrayItem(blockIndex, arrayKey, itemIndex) {
    if (editorContentBlocks[blockIndex] && editorContentBlocks[blockIndex][arrayKey]) {
        editorContentBlocks[blockIndex][arrayKey].splice(itemIndex, 1);
        renderContentBlocks();
        markUnsaved();
    }
}

async function uploadBlockImage(index, input) {
    if (!input.files || input.files.length === 0) return;
    const formData = new FormData();
    formData.append('images', input.files[0]);
    
    try {
        input.parentElement.style.opacity = '0.5';
        const res = await fetch('/api/v1/admin/events/upload-multiple', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
            body: formData
        });
        const data = await res.json();
        if (data.success && data.files.length > 0) {
            updateBlockData(index, 'url', data.files[0].url);
            renderContentBlocks();
        } else {
            alert('Upload failed.');
        }
    } catch(e) {
        console.error(e);
        alert('Network error.');
    } finally {
        input.parentElement.style.opacity = '1';
    }
}

async function uploadGalleryImages(index, input) {
    if (!input.files || input.files.length === 0) return;
    const formData = new FormData();
    for (let i=0; i<input.files.length; i++) {
        formData.append('images', input.files[i]);
    }
    
    try {
        const res = await fetch('/api/v1/admin/events/upload-multiple', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            if (!editorContentBlocks[index].images) editorContentBlocks[index].images = [];
            data.files.forEach(f => editorContentBlocks[index].images.push(f.url));
            renderContentBlocks();
            markUnsaved();
        } else {
            alert('Upload failed.');
        }
    } catch(e) {
        console.error(e);
        alert('Network error.');
    }
}

function removeGalleryImage(blockIndex, imgIndex) {
    if(confirm('Remove this photo from gallery?')) {
        editorContentBlocks[blockIndex].images.splice(imgIndex, 1);
        renderContentBlocks();
        markUnsaved();
    }
}

function syncBlockEditors() {
    // Save content from Quill editors back into the data array
    Object.keys(blockEditors).forEach(index => {
        const quill = blockEditors[index];
        // We save the Delta object so it accurately represents formatting
        editorContentBlocks[index].content = quill.getContents(); 
    });
}

function markUnsaved() {
    // Future visual indicator feature
}

/* --- External Links --- */

function addExternalLink() {
    editorExternalLinks.push({ title: '', url: '' });
    renderExternalLinks();
    markUnsaved();
}

function removeExternalLink(index) {
    editorExternalLinks.splice(index, 1);
    renderExternalLinks();
    markUnsaved();
}

function renderExternalLinks() {
    const container = document.getElementById('externalLinksContainer');
    container.innerHTML = '';
    
    editorExternalLinks.forEach((link, index) => {
        container.innerHTML += `
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <input type="text" class="form-control" placeholder="Title (e.g. Instagram)" value="${link.title}" onchange="editorExternalLinks[${index}].title = this.value; markUnsaved()">
                <input type="url" class="form-control" placeholder="https://" value="${link.url}" onchange="editorExternalLinks[${index}].url = this.value; markUnsaved()">
                <button class="btn btn-sm btn-outline" style="color: var(--color-danger); border-color: var(--color-danger);" onclick="removeExternalLink(${index})"><i class="fas fa-trash"></i></button>
            </div>
        `;
    });
}

/* --- Save & Publish Workflow --- */

async function prepareAndSaveEvent(isPublishAction) {
    if (!currentEvent) return;
    
    // Provide visual feedback for saving state
    const saveBtn = document.querySelector('button[onclick="saveEventContent()"]');
    const pubBtn = document.querySelector('button[onclick="publishEventChanges()"]');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }
    if (pubBtn) { pubBtn.disabled = true; pubBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...'; }
    
    // Ensure all Quill data is flushed to editorContentBlocks
    syncBlockEditors();

    const eventData = currentEvent.draft_data ? { ...currentEvent, ...currentEvent.draft_data } : currentEvent;
    const lifecycle = document.getElementById('editorEventLifecycleStatus').value;
    const slug = document.getElementById('editorEventSlug').value.trim();
    const seoTitle = document.getElementById('editorSeoTitle').value.trim();
    const seoDesc = document.getElementById('editorSeoDesc').value.trim();
    
    const payload = {
        title: eventData.title,
        short_description: eventData.short_description,
        event_date: eventData.event_date,
        location: eventData.location,
        event_lifecycle_status: lifecycle,
        page_type: currentPageType,
        publication_status: isPublishAction ? 'PUBLISHED' : 'DRAFT',
        content: editorContentBlocks, // The powerful flexible JSON array
        event_links: editorExternalLinks,
        slug: slug,
        seo_title: seoTitle,
        seo_description: seoDesc
    };

    if (isPublishAction) {
        payload.published_at = new Date().toISOString();
    }

    try {
        const response = await fetch(`/api/v1/admin/events/${currentEvent.id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}` 
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.success) {
            // Re-fetch to update local state
            await editEvent(currentEvent.id);
            if (isPublishAction || !window.isPreviewing) {
                alert(isPublishAction ? 'Changes published successfully!' : 'Event saved successfully!');
            }
            return true;
        } else {
            console.error('Server error payload:', result);
            alert('Error saving event: ' + result.message + (result.error ? '\\nDetails: ' + result.error : ''));
            return false;
        }
    } catch (error) {
        console.error('Failed to save event content', error);
        alert('Network error saving event.');
        return false;
    } finally {
        // Restore buttons
        const saveBtn = document.querySelector('button[onclick="saveEventContent()"]');
        const pubBtn = document.querySelector('button[onclick="publishEventChanges()"]');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Draft'; }
        if (pubBtn) { pubBtn.disabled = false; pubBtn.innerHTML = '<i class="fas fa-globe"></i> Publish Changes'; }
    }
}

async function saveEventContent() {
    return await prepareAndSaveEvent(false);
}

async function previewEventContent() {
    window.isPreviewing = true;
    const success = await saveEventContent();
    window.isPreviewing = false;
    
    if (success && currentEvent) {
        const eventData = currentEvent.draft_data ? { ...currentEvent, ...currentEvent.draft_data } : currentEvent;
        const slug = document.getElementById('editorEventSlug').value.trim() || eventData.slug || eventData.id;
        window.open(`/events/${slug}`, '_blank');
    }
}

function publishEventChanges() {
    prepareAndSaveEvent(true);
}

/* =======================================================================
   DELETE EVENT
   ======================================================================= */
async function deleteEvent(id) {
    if (!confirm('Are you sure you want to delete this event? This cannot be undone.')) return;
    try {
        const response = await fetch(`/api/v1/admin/events/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        const result = await response.json();
        if (result.success) {
            fetchAdminEvents();
        } else {
            alert('Failed to delete: ' + result.message);
        }
    } catch (error) {
        console.error('Failed to delete', error);
    }
}
