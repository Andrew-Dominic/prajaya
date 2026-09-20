let quillContent, quillReport;
let allEvents = [];

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Quill editors
    if (typeof Quill !== 'undefined') {
        quillContent = new Quill('#editorContent', {
            theme: 'snow',
            placeholder: 'Write the event story...',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link', 'image'],
                    ['clean']
                ]
            }
        });

        quillReport = new Quill('#editorReport', {
            theme: 'snow',
            placeholder: 'Write the detailed event report (optional)...',
            modules: {
                toolbar: [
                    [{ 'header': [2, 3, false] }],
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link'],
                    ['clean']
                ]
            }
        });
    }

    // Intercept switchView if needed to refresh events and handle display logic
    const originalSwitchView = window.switchView;
    if (originalSwitchView) {
        window.switchView = function(viewId) {
            originalSwitchView(viewId);
            
            // Hide our custom eventsView if another tab is clicked
            const evView = document.getElementById('eventsView');
            if (evView) evView.style.display = 'none';

            if (viewId === 'events') {
                // Set nav link active
                document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('.nav-link').forEach(el => {
                    if (el.textContent.includes('Events')) el.classList.add('active');
                });
                
                const pageTitle = document.getElementById('page-title');
                if (pageTitle) pageTitle.textContent = 'Event Management';
                
                if (evView) evView.style.display = 'block';
                
                fetchAdminEvents();
            }
        }
    }
});

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

function renderEventsTable(events) {
    const tbody = document.getElementById('eventsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (events.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No events found. Create one!</td></tr>';
        return;
    }

    events.forEach(event => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                ${event.cover_image_id ? `<img src="IMAGE_RESOLVER_PLACEHOLDER" width="50" style="border-radius: 4px;">` : `<div style="width: 50px; height: 35px; background: #eee; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999;">No IMG</div>`}
            </td>
            <td><strong>${event.title}</strong><br><small style="color: #666;">/${event.slug}</small></td>
            <td>${new Date(event.event_date).toLocaleDateString()}</td>
            <td><span class="status-badge status-${event.status.toLowerCase()}">${event.status}</span></td>
            <td>
                ${event.is_published 
                    ? '<span style="color: var(--color-success); font-weight: bold;"><i class="fas fa-check-circle"></i> Published</span>' 
                    : '<span style="color: var(--color-warning); font-weight: bold;"><i class="fas fa-clock"></i> Draft</span>'}
            </td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editEvent('${event.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteEvent('${event.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function showEventForm() {
    document.getElementById('eventsListSection').style.display = 'none';
    document.getElementById('eventFormSection').style.display = 'block';
    document.getElementById('eventForm').reset();
    document.getElementById('eventId').value = '';
    document.getElementById('eventFormTitle').innerText = 'Create Event';
    if(quillContent) quillContent.root.innerHTML = '';
    if(quillReport) quillReport.root.innerHTML = '';
    document.getElementById('coverPreview').innerHTML = '';
}

function hideEventForm() {
    document.getElementById('eventsListSection').style.display = 'block';
    document.getElementById('eventFormSection').style.display = 'none';
    fetchAdminEvents();
}

async function editEvent(id) {
    try {
        const response = await fetch(`/api/v1/admin/events/${id}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        const result = await response.json();
        if (result.success) {
            const ev = result.data;
            showEventForm();
            document.getElementById('eventFormTitle').innerText = 'Edit Event';
            document.getElementById('eventId').value = ev.id;
            document.getElementById('eventTitle').value = ev.title || '';
            document.getElementById('eventSlug').value = ev.slug || '';
            document.getElementById('eventShortDesc').value = ev.short_description || '';
            
            // Format date for datetime-local
            if (ev.event_date) {
                const d = new Date(ev.event_date);
                d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                document.getElementById('eventDate').value = d.toISOString().slice(0, 16);
            }
            
            document.getElementById('eventCategory').value = ev.category || '';
            document.getElementById('eventLocation').value = ev.location || '';
            document.getElementById('eventStatus').value = ev.status || 'upcoming';
            document.getElementById('eventInstagram').value = ev.instagram_url || '';
            document.getElementById('eventSeoTitle').value = ev.seo_title || '';
            document.getElementById('eventSeoDesc').value = ev.seo_description || '';
            
            if(quillContent && ev.content) quillContent.setContents(ev.content);
            if(quillReport && ev.report_content) quillReport.setContents(ev.report_content);
        }
    } catch (error) {
        console.error('Failed to load event', error);
        alert('Failed to load event details.');
    }
}

async function saveEvent(isPublished) {
    const title = document.getElementById('eventTitle').value;
    if (!title) return alert('Event Title is required.');
    const eventDate = document.getElementById('eventDate').value;
    if (!eventDate) return alert('Event Date is required.');

    // 1. Upload Images if present
    const fileInput = document.getElementById('eventImages');
    let uploadedImages = [];

    if (fileInput.files.length > 0) {
        const formData = new FormData();
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('images', fileInput.files[i]);
        }
        
        try {
            const uploadRes = await fetch('/api/v1/admin/events/upload-multiple', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
                body: formData
            });
            const uploadData = await uploadRes.json();
            if (uploadData.success) {
                uploadedImages = uploadData.files;
            } else {
                return alert('Image upload failed: ' + uploadData.message);
            }
        } catch (err) {
            console.error(err);
            return alert('Upload network error.');
        }
    }

    // 2. Prepare payload
    const payload = {
        title,
        slug: document.getElementById('eventSlug').value,
        short_description: document.getElementById('eventShortDesc').value,
        event_date: new Date(eventDate).toISOString(),
        category: document.getElementById('eventCategory').value,
        location: document.getElementById('eventLocation').value,
        status: document.getElementById('eventStatus').value,
        instagram_url: document.getElementById('eventInstagram').value,
        seo_title: document.getElementById('eventSeoTitle').value,
        seo_description: document.getElementById('eventSeoDesc').value,
        content: quillContent ? quillContent.getContents() : null,
        report_content: quillReport ? quillReport.getContents() : null,
        is_published: isPublished,
        images: uploadedImages
    };

    if (isPublished) {
        payload.published_at = new Date().toISOString();
    }

    const id = document.getElementById('eventId').value;
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
            alert(`Event successfully ${isPublished ? 'published' : 'saved as draft'}!`);
            hideEventForm();
        } else {
            alert('Error saving event: ' + result.message);
        }
    } catch (error) {
        console.error('Failed to save event', error);
        alert('Network error saving event.');
    }
}

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

function filterEvents() {
    const query = document.getElementById('eventSearchInput').value.toLowerCase();
    const status = document.getElementById('eventStatusFilter').value;
    
    const filtered = allEvents.filter(ev => {
        const matchQuery = ev.title.toLowerCase().includes(query) || (ev.slug && ev.slug.toLowerCase().includes(query));
        let matchStatus = true;
        if (status === 'published') matchStatus = ev.is_published === true;
        if (status === 'draft') matchStatus = ev.is_published === false;
        return matchQuery && matchStatus;
    });
    
    renderEventsTable(filtered);
}
