const fs = require('fs');
const file = 'd:/Productivity/Prajya/frontend/volunteer.html';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the old banner
const oldBanner = `                <div class="form-group" style="margin-top: 35px;">
                    <label class="form-label">Terms and Conditions</label>
                    <div style="font-size: 0.95rem; background: var(--color-bg); padding: 24px; border-radius: 8px; margin-bottom: 20px; color: var(--color-text); line-height: 1.6; border: 1px solid rgba(0,0,0,0.08);">
    Please review our <a href="volunteer-terms.html" target="_blank" style="color: var(--color-accent); text-decoration: underline; font-weight: 500;">Volunteer Terms & Conditions</a> and Code of Conduct before applying.
</div>`;

content = content.replace(oldBanner, `                <div class="form-group" style="margin-top: 35px;">`);

// 2. Remove the height limit on the new terms box
const newBoxStart = `max-height: 300px; overflow-y: auto; background: var(--color-surface); padding: 20px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); margin-bottom: 20px;`;
const updatedBoxStart = `background: var(--color-bg); padding: 30px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.08); margin-bottom: 30px; margin-top: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.03);`;

content = content.replace(newBoxStart, updatedBoxStart);

fs.writeFileSync(file, content);
