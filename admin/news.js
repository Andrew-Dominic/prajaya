let allNews = [];
let currentNews = null;
let newsCoverFile = null;
let newsEditorContentBlocks = [];
let newsEditorExternalLinks = [];
let newsBlockEditors = {}; // Map of block index to Quill instances

document.addEventListener('DOMContentLoaded', () => {
    // Intercept switchView
    const originalSwitchView = window.switchView;
    if (originalSwitchView) {
        window.switchView = function(viewId) {
            originalSwitchView(viewId);
            
            const evView = document.getElementById('newsView');
            if (evView) evView.style.display = 'none';

            if (viewId === 'news') {
                document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('.nav-link').forEach(el => {
                    if (el.textContent.includes('News')) el.classList.add('active');
                });
                
                const pageTitle = document.getElementById('page-title');
                if (pageTitle) pageTitle.textContent = 'News Management';
                
                if (evView) evView.style.display = 'block';
                showNewsList();
            }
        }
    }
});

/* =======================================================================
   STAGE 1: EVENT LIBRARY
   ======================================================================= */

async function fetchAdminNews() {
    try {
        const response = await fetch('/api/v1/admin/news', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        const result = await response.json();
        if (result.success) {
            allNews = result.data;
            renderNewsTable(allNews);
        }
    } catch (error) {
        console.error('Failed to fetch news', error);
    }
}

function renderNewsTable(news) {
    const tbody = document.getElementById('newsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (news.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #888;">No news found. Click "Create News" to start!</td></tr>';
        return;
    }

    news.forEach(news => {
        let imageUrl = null;
        if (news.news_images && news.news_images.length > 0) {
            const cover = news.news_images.find(img => img.is_cover);
            imageUrl = cover ? cover.image_url : news.news_images[0].image_url;
        }

        const statusBadge = news.status ? news.status.toLowerCase() : 'draft';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                ${imageUrl ? `<img src="${imageUrl}" width="60" height="40" style="border-radius: 6px; object-fit: cover; border: 1px solid #ddd;">` : `<div style="width: 60px; height: 40px; background: #f0f0f0; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #aaa; border: 1px solid #eee;">No IMG</div>`}
            </td>
            <td><strong>${news.title}</strong><br><small style="color: #888;">${news.slug ? '/' + news.slug : 'No slug'}</small></td>
            <td>${news.published_at ? new Date(news.published_at).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'}) : '<span style="color:#aaa;">TBA</span>'}</td>
            <td><span class="status-badge status-${statusBadge}" style="text-transform: capitalize;">${news.status || 'Draft'}</span></td>
            <td>
                ${news.is_published 
                    ? '<span style="color: var(--color-success); font-weight: 600; font-size: 0.85rem;"><i class="fas fa-eye"></i> Public</span>' 
                    : '<span style="color: var(--color-text-light); font-weight: 600; font-size: 0.85rem;"><i class="fas fa-eye-slash"></i> Private</span>'}
            </td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editNews('${news.id}')">Edit</button>
                <button class="btn btn-sm btn-outline" style="color: var(--color-danger); border-color: var(--color-danger);" onclick="deleteNews('${news.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterNews() {
    const query = document.getElementById('newsSearchInput').value.toLowerCase();
    const status = document.getElementById('newsStatusFilter').value.toLowerCase();
    
    const filtered = allNews.filter(ev => {
        const matchQuery = ev.title.toLowerCase().includes(query) || (ev.slug && ev.slug.toLowerCase().includes(query));
        
        let matchStatus = true;
        if (status === 'draft') matchStatus = !ev.is_published;
        else if (status === 'upcoming') matchStatus = ev.is_published && (ev.status || '').toLowerCase() === 'upcoming';
        else if (status === 'completed') matchStatus = ev.is_published && (ev.status || '').toLowerCase() === 'completed';
        
        return matchQuery && matchStatus;
    });
    
    renderNewsTable(filtered);
}

function showNewsList() {
    document.getElementById('newsListSection').style.display = 'block';
    document.getElementById('newsBasicFormSection').style.display = 'none';
    document.getElementById('newsEditorSection').style.display = 'none';
    fetchAdminNews();
}

/* =======================================================================
   STAGE 2: CREATE / EDIT BASIC INFO
   ======================================================================= */

function showNewsBasicForm() {
    document.getElementById('newsListSection').style.display = 'none';
    document.getElementById('newsBasicFormSection').style.display = 'block';
    document.getElementById('newsEditorSection').style.display = 'none';
    
    document.getElementById('newsBasicForm').reset();
    document.getElementById('basicNewsId').value = '';
    removeNewsCover();
}

function handleNewsCoverPreview(input) {
    if (input.files && input.files[0]) {
        newsCoverFile = input.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('coverUploadArea').style.display = 'none';
            document.getElementById('coverPreviewContainer').style.display = 'block';
            document.getElementById('coverPreviewImg').src = e.target.result;
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function removeNewsCover() {
    newsCoverFile = null;
    document.getElementById('basicNewsCover').value = '';
    document.getElementById('coverUploadArea').style.display = 'block';
    document.getElementById('coverPreviewContainer').style.display = 'none';
    document.getElementById('coverPreviewImg').src = '';
}

function handleBasicNewsSubmit(e) {
    e.preventDefault();
    // Default to 'upcoming' if they click save & continue from the form submission
    const visibility = document.querySelector('input[name="basicNewsVisibility"]:checked').value;
    saveBasicNews(visibility);
}

async function saveBasicNews(visibilityTarget) {
    const id = document.getElementById('basicNewsId').value;
    const title = document.getElementById('basicNewsTitle').value.trim();
    const date = document.getElementById('basicNewsDate').value;
    const location = document.getElementById('basicNewsLocation').value.trim();
    const shortDesc = document.getElementById('basicNewsShortDesc').value.trim();
    
    if (!title) return alert('News Title is required.');
    
    // Status and visibility mapping based on the selection
    const isPublished = visibilityTarget === 'upcoming';
    const status = isPublished ? 'Upcoming' : 'Draft';
    
    // Upload cover if new file selected
    let uploadedImages = [];
    if (newsCoverFile) {
        const formData = new FormData();
        formData.append('images', newsCoverFile);
        
        try {
            const uploadRes = await fetch('/api/v1/admin/news/upload-multiple', {
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
    } else if (!id && isPublished) {
        // If creating a NEW published news, cover is highly recommended/required by UX
        // We will allow it but warn
        if (!confirm('You are publishing without a cover poster. Are you sure?')) return;
    }

    const payload = {
        title,
        short_description: shortDesc,
        published_at: date ? new Date(date).toISOString() : null,
        location,
        status,
        is_published: isPublished
    };

    if (uploadedImages.length > 0) {
        payload.images = uploadedImages;
    }

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/v1/admin/news/${id}` : '/api/v1/admin/news';

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
            // Success! Load the editor for this news
            editNews(result.data.id || id);
        } else {
            alert('Error saving news: ' + result.message);
        }
    } catch (error) {
        console.error('Failed to save news basic info', error);
        alert('Network error saving news.');
    }
}

/* =======================================================================
   STAGE 3: EVENT EDITOR (CONTENT BUILDER)
   ======================================================================= */

async function editNews(id) {
    try {
        const response = await fetch(`/api/v1/admin/news/${id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        const result = await response.json();
        if (result.success) {
            currentNews = result.data;
            populateNewsEditor();
            document.getElementById('newsListSection').style.display = 'none';
            document.getElementById('newsBasicFormSection').style.display = 'none';
            document.getElementById('newsEditorSection').style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to load news for editing', error);
        alert('Failed to load news details.');
    }
}

function populateNewsEditor() {
    if (!currentNews) return;

    // Header
    const titleStatus = currentNews.is_published ? `<span style="color:var(--color-success);font-size:0.9rem;font-weight:normal;">● ${currentNews.status || 'Published'}</span>` : `<span style="color:var(--color-warning);font-size:0.9rem;font-weight:normal;">● Draft</span>`;
    document.getElementById('editorNewsTitle').innerHTML = `${currentNews.title} ${titleStatus}`;
    document.getElementById('editorPreviewBtn').href = `/news/${currentNews.slug || currentNews.id}`;

    // Overview section
    let imageUrl = '';
    if (currentNews.images && currentNews.images.length > 0) {
        const cover = currentNews.images.find(img => img.is_cover);
        imageUrl = cover ? cover.image_url : currentNews.images[0].image_url;
    }
    document.getElementById('overviewNewsCoverImg').src = imageUrl || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlZWVlZWUiLz48L3N2Zz4='; // placeholder svg
    
    const dateStr = currentNews.published_at ? new Date(currentNews.published_at).toLocaleDateString() : 'TBA';
    const locStr = currentNews.location || 'No Location';
    document.getElementById('overviewNewsDateLocation').innerHTML = `<i class="far fa-calendar"></i> ${dateStr} &nbsp;|&nbsp; <i class="fas fa-map-marker-alt"></i> ${locStr}`;
    document.getElementById('overviewNewsShortDesc').innerText = currentNews.short_description || 'No description provided.';

    // Settings Panel
    document.getElementById('editorNewsStatus').value = (currentNews.status || 'draft').toLowerCase();
    document.getElementById('editorNewsSlug').value = currentNews.slug || '';
    document.getElementById('editorNewsSeoTitle').value = currentNews.seo_title || '';
    document.getElementById('editorNewsSeoDesc').value = currentNews.seo_description || '';
    
    // Status specific UI logic
    const completedPrompt = document.getElementById('completedPrompt');
    if ((currentNews.status || '').toLowerCase() === 'completed') {
        completedPrompt.style.display = 'block';
    } else {
        completedPrompt.style.display = 'none';
    }

    // Content Blocks
    try {
        // Handle migration from old content (which was a quill delta object)
        if (currentNews.content && currentNews.content.ops) {
             newsEditorContentBlocks = [{ type: 'paragraph', content: currentNews.content }]; // store delta inside a block
        } else if (Array.isArray(currentNews.content)) {
            newsEditorContentBlocks = currentNews.content;
        } else {
            newsEditorContentBlocks = [];
        }
    } catch(e) {
        newsEditorContentBlocks = [];
    }
    
    // External links (assuming they are stored in DB, otherwise use an empty array)
    newsEditorExternalLinks = currentNews.news_links || [];

    renderNewsContentBlocks();
    renderNewsExternalLinks();
}

function editNewsBasicInfo() {
    if (!currentNews) return;
    showNewsBasicForm();
    
    document.getElementById('basicNewsId').value = currentNews.id;
    document.getElementById('basicNewsTitle').value = currentNews.title;
    
    if (currentNews.published_at) {
        const d = new Date(currentNews.published_at);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        document.getElementById('basicNewsDate').value = d.toISOString().slice(0, 16);
    }
    
    document.getElementById('basicNewsLocation').value = currentNews.location || '';
    document.getElementById('basicNewsShortDesc').value = currentNews.short_description || '';
    
    const radios = document.getElementsByName('basicNewsVisibility');
    for (let i = 0; i < radios.length; i++) {
        if (radios[i].value === (currentNews.is_published ? 'upcoming' : 'draft')) {
            radios[i].checked = true;
        }
    }
}

/* --- Content Builder Logic --- */

function toggleNewsAddBlockMenu() {
    const menu = document.getElementById('addNewsBlockMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    const btn = document.getElementById('addNewsContentBtn');
    const menu = document.getElementById('addNewsBlockMenu');
    if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
        menu.style.display = 'none';
    }
});

function addNewsContentBlock(type) {
    toggleNewsAddBlockMenu(); // hide menu
    
    const newBlock = { type: type };
    if (type === 'heading') newBlock.content = 'New Heading';
    if (type === 'paragraph') newBlock.content = '';
    if (type === 'quote') { newBlock.content = ''; newBlock.author = ''; }
    if (type === 'image') newBlock.url = '';
    if (type === 'gallery') newBlock.images = [];
    
    newsEditorContentBlocks.push(newBlock);
    renderNewsContentBlocks();
}

function removeNewsContentBlock(index) {
    if (confirm('Remove this block?')) {
        newsEditorContentBlocks.splice(index, 1);
        renderNewsContentBlocks();
    }
}

function moveNewsContentBlock(index, direction) {
    syncNewsBlockEditors(); // Save current quill states before moving
    
    if (direction === -1 && index > 0) {
        const temp = newsEditorContentBlocks[index];
        newsEditorContentBlocks[index] = newsEditorContentBlocks[index - 1];
        newsEditorContentBlocks[index - 1] = temp;
    } else if (direction === 1 && index < newsEditorContentBlocks.length - 1) {
        const temp = newsEditorContentBlocks[index];
        newsEditorContentBlocks[index] = newsEditorContentBlocks[index + 1];
        newsEditorContentBlocks[index + 1] = temp;
    }
    renderNewsContentBlocks();
}

function renderNewsContentBlocks() {
    const container = document.getElementById('newsContentBlocksArea');
    const emptyState = document.getElementById('emptyNewsContentState');
    
    // Clear previous Quill instances map
    newsBlockEditors = {};

    if (newsEditorContentBlocks.length === 0) {
        container.innerHTML = '';
        container.appendChild(emptyState);
        emptyState.style.display = 'block';
        return;
    }

    container.innerHTML = '';
    
    newsEditorContentBlocks.forEach((block, index) => {
        const blockDiv = document.createElement('div');
        blockDiv.className = 'content-block-item';
        blockDiv.style = 'background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); overflow: hidden;';
        
        // Block Toolbar
        const toolbarHtml = `
            <div style="background: #f8f9fa; border-bottom: 1px solid #eee; padding: 10px 15px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.8rem; font-weight: 600; color: #888; text-transform: uppercase;">
                    <i class="fas fa-grip-vertical" style="margin-right: 8px; cursor: move;"></i> ${block.type}
                </span>
                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-sm btn-outline" style="padding: 2px 8px; border: none;" onclick="moveNewsContentBlock(${index}, -1)" ${index === 0 ? 'disabled' : ''}><i class="fas fa-chevron-up"></i></button>
                    <button class="btn btn-sm btn-outline" style="padding: 2px 8px; border: none;" onclick="moveNewsContentBlock(${index}, 1)" ${index === newsEditorContentBlocks.length - 1 ? 'disabled' : ''}><i class="fas fa-chevron-down"></i></button>
                    <button class="btn btn-sm btn-outline" style="padding: 2px 8px; border: none; color: var(--color-danger);" onclick="removeNewsContentBlock(${index})"><i class="fas fa-times"></i></button>
                </div>
            </div>
        `;
        
        let contentHtml = '';
        
        if (block.type === 'heading') {
            contentHtml = `<div style="padding: 20px;"><input type="text" class="form-control" style="font-size: 1.25rem; font-weight: 600;" value="${block.content || ''}" onchange="updateNewsBlockData(${index}, 'content', this.value)" placeholder="Enter heading..."></div>`;
        } 
        else if (block.type === 'paragraph') {
            // We use a div for Quill to mount on
            contentHtml = `<div style="padding: 20px;"><div id="quill-block-${index}" style="min-height: 150px; height: auto;"></div></div>`;
        }
        else if (block.type === 'quote') {
            contentHtml = `
                <div style="padding: 20px; display: flex; flex-direction: column; gap: 10px;">
                    <textarea class="form-control" rows="3" placeholder="Enter quote text..." onchange="updateNewsBlockData(${index}, 'content', this.value)">${block.content || ''}</textarea>
                    <input type="text" class="form-control" placeholder="Author / Attribution" value="${block.author || ''}" onchange="updateNewsBlockData(${index}, 'author', this.value)">
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
                        <input type="text" class="form-control" placeholder="Paste Image URL" value="${currentUrl}" onchange="updateNewsBlockData(${index}, 'url', this.value)">
                    </div>
                </div>
            `;
        }
        else if (block.type === 'gallery') {
            const imagesHtml = (block.images || []).map((imgUrl, imgIdx) => `
                <div style="position: relative; width: 100px; height: 100px; border-radius: 8px; overflow: hidden; border: 1px solid #ddd;">
                    <img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover;">
                    <button class="btn btn-sm btn-danger" style="position: absolute; top: 2px; right: 2px; padding: 2px 6px;" onclick="removeNewsGalleryImage(${index}, ${imgIdx})"><i class="fas fa-times"></i></button>
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
            
            newsBlockEditors[index] = quill;
        }
    });
}

function updateNewsBlockData(index, key, value) {
    newsEditorContentBlocks[index][key] = value;
    markNewsUnsaved();
}

async function uploadBlockImage(index, input) {
    if (!input.files || input.files.length === 0) return;
    const formData = new FormData();
    formData.append('images', input.files[0]);
    
    try {
        input.parentElement.style.opacity = '0.5';
        const res = await fetch('/api/v1/admin/news/upload-multiple', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
            body: formData
        });
        const data = await res.json();
        if (data.success && data.files.length > 0) {
            updateNewsBlockData(index, 'url', data.files[0].url);
            renderNewsContentBlocks();
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
        const res = await fetch('/api/v1/admin/news/upload-multiple', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            if (!newsEditorContentBlocks[index].images) newsEditorContentBlocks[index].images = [];
            data.files.forEach(f => newsEditorContentBlocks[index].images.push(f.url));
            renderNewsContentBlocks();
            markNewsUnsaved();
        } else {
            alert('Upload failed.');
        }
    } catch(e) {
        console.error(e);
        alert('Network error.');
    }
}

function removeNewsGalleryImage(blockIndex, imgIndex) {
    if(confirm('Remove this photo from gallery?')) {
        newsEditorContentBlocks[blockIndex].images.splice(imgIndex, 1);
        renderNewsContentBlocks();
        markNewsUnsaved();
    }
}

function syncNewsBlockEditors() {
    // Save content from Quill editors back into the data array
    Object.keys(newsBlockEditors).forEach(index => {
        const quill = newsBlockEditors[index];
        // We save the Delta object so it accurately represents formatting
        newsEditorContentBlocks[index].content = quill.getContents(); 
    });
}

function markNewsUnsaved() {
    // Future visual indicator feature
}

/* --- External Links --- */

function addNewsExternalLink() {
    newsEditorExternalLinks.push({ title: '', url: '' });
    renderNewsExternalLinks();
    markNewsUnsaved();
}

function removeNewsExternalLink(index) {
    newsEditorExternalLinks.splice(index, 1);
    renderNewsExternalLinks();
    markNewsUnsaved();
}

function renderNewsExternalLinks() {
    const container = document.getElementById('externalLinksContainer');
    container.innerHTML = '';
    
    newsEditorExternalLinks.forEach((link, index) => {
        container.innerHTML += `
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <input type="text" class="form-control" placeholder="Title (e.g. Instagram)" value="${link.title}" onchange="newsEditorExternalLinks[${index}].title = this.value; markNewsUnsaved()">
                <input type="url" class="form-control" placeholder="https://" value="${link.url}" onchange="newsEditorExternalLinks[${index}].url = this.value; markNewsUnsaved()">
                <button class="btn btn-sm btn-outline" style="color: var(--color-danger); border-color: var(--color-danger);" onclick="removeNewsExternalLink(${index})"><i class="fas fa-trash"></i></button>
            </div>
        `;
    });
}

/* --- Save & Publish Workflow --- */

async function prepareAndSaveNews(isPublishAction) {
    if (!currentNews) return;
    
    // Ensure all Quill data is flushed to newsEditorContentBlocks
    syncNewsBlockEditors();

    const status = document.getElementById('editorNewsStatus').value;
    const slug = document.getElementById('editorNewsSlug').value.trim();
    const seoTitle = document.getElementById('editorNewsSeoTitle').value.trim();
    const seoDesc = document.getElementById('editorNewsSeoDesc').value.trim();
    
    // Determine is_published state based on action and selected lifecycle status
    // If they explicitly click "Publish Changes", force is_published = true.
    // If they click "Save", respect the dropdown unless it's draft.
    let isPublished = isPublishAction ? true : (status !== 'draft');

    const payload = {
        title: currentNews.title,
        status: status === 'draft' ? 'Draft' : status.charAt(0).toUpperCase() + status.slice(1),
        is_published: isPublished,
        content: newsEditorContentBlocks, // The powerful flexible JSON array
        // External links can be handled differently if the backend has a separate table, but for now we'll pass them in. 
        // We may need to update the backend API to handle `news_links` properly.
        news_links: newsEditorExternalLinks,
        slug: slug,
        seo_title: seoTitle,
        seo_description: seoDesc
    };

    if (isPublishAction) {
        payload.published_at = new Date().toISOString();
    }

    try {
        const response = await fetch(`/api/v1/admin/news/${currentNews.id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}` 
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.success) {
            alert(isPublishAction ? 'Changes published successfully!' : 'News saved successfully!');
            // Re-fetch to update local state
            editNews(currentNews.id);
        } else {
            alert('Error saving news: ' + result.message);
        }
    } catch (error) {
        console.error('Failed to save news content', error);
        alert('Network error saving news.');
    }
}

function saveNewsContent() {
    prepareAndSaveNews(false);
}

function publishNewsChanges() {
    prepareAndSaveNews(true);
}

/* =======================================================================
   DELETE EVENT
   ======================================================================= */
async function deleteNews(id) {
    if (!confirm('Are you sure you want to delete this news? This cannot be undone.')) return;
    try {
        const response = await fetch(`/api/v1/admin/news/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        const result = await response.json();
        if (result.success) {
            fetchAdminNews();
        } else {
            alert('Failed to delete: ' + result.message);
        }
    } catch (error) {
        console.error('Failed to delete', error);
    }
}

