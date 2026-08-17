const fs = require('fs');
const file = 'd:/Productivity/Prajya/frontend/volunteer.html';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

// 1. Alternative Phone Relation
const phoneIndex = lines.findIndex(l => l.includes('id="phone"'));
if (phoneIndex !== -1) {
    let gridStart = phoneIndex;
    while(gridStart > 0 && !lines[gridStart].includes('<div class="form-group-grid grid-2">')) {
        gridStart--;
    }
    let gridEnd = phoneIndex;
    let openDivs = 1; 
    for (let i = gridStart + 1; i < lines.length; i++) {
        if (lines[i].includes('<div')) openDivs++;
        if (lines[i].includes('</div')) openDivs--;
        if (openDivs === 0) {
            gridEnd = i;
            break;
        }
    }
    
    const altPhoneReplacement = `                <div class="form-group-grid grid-3">
                    <div>
                        <label class="form-label">Mobile Number<span class="required-asterisk">*</span></label>
                        <input type="tel" class="form-control" id="phone" placeholder="+91 XXXXX XXXXX" autocomplete="tel" required>
                    </div>
                    <div>
                        <label class="form-label">Alternative Mobile</label>
                        <input type="tel" class="form-control" id="alt_phone" placeholder="+91 XXXXX XXXXX" autocomplete="tel">
                    </div>
                    <div>
                        <label class="form-label">Alt Mobile Relation</label>
                        <select class="form-control" id="alt_phone_relation">
                            <option value="">Select Relation</option>
                            <option value="Parent">Parent</option>
                            <option value="Spouse">Spouse</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Friend">Friend</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>`;
    lines.splice(gridStart, gridEnd - gridStart + 1, ...altPhoneReplacement.split('\n'));
}

// 2. Hometown & State
const stateIndex = lines.findIndex(l => l.includes('id="state"'));
if (stateIndex !== -1) {
    let gridStart = stateIndex;
    while(gridStart > 0 && !lines[gridStart].includes('<div class="form-group-grid grid-3">')) {
        gridStart--;
    }
    let gridEnd = stateIndex;
    let openDivs = 1; 
    for (let i = gridStart + 1; i < lines.length; i++) {
        if (lines[i].includes('<div')) openDivs++;
        if (lines[i].includes('</div')) openDivs--;
        if (openDivs === 0) {
            gridEnd = i;
            break;
        }
    }

    const stateReplacement = `                <div class="form-group-grid grid-2">
                    <div>
                        <label class="form-label">Current City<span class="required-asterisk">*</span></label>
                        <input type="text" class="form-control" id="current_city" placeholder="e.g. Chennai" required>
                    </div>
                    <div>
                        <label class="form-label">State<span class="required-asterisk">*</span></label>
                        <select class="form-control" id="state" required>
                            <option value="" disabled selected>Select State</option>
                            <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                            <option value="Andhra Pradesh">Andhra Pradesh</option>
                            <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                            <option value="Assam">Assam</option>
                            <option value="Bihar">Bihar</option>
                            <option value="Chandigarh">Chandigarh</option>
                            <option value="Chhattisgarh">Chhattisgarh</option>
                            <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                            <option value="Delhi">Delhi</option>
                            <option value="Goa">Goa</option>
                            <option value="Gujarat">Gujarat</option>
                            <option value="Haryana">Haryana</option>
                            <option value="Himachal Pradesh">Himachal Pradesh</option>
                            <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                            <option value="Jharkhand">Jharkhand</option>
                            <option value="Karnataka">Karnataka</option>
                            <option value="Kerala">Kerala</option>
                            <option value="Ladakh">Ladakh</option>
                            <option value="Lakshadweep">Lakshadweep</option>
                            <option value="Madhya Pradesh">Madhya Pradesh</option>
                            <option value="Maharashtra">Maharashtra</option>
                            <option value="Manipur">Manipur</option>
                            <option value="Meghalaya">Meghalaya</option>
                            <option value="Mizoram">Mizoram</option>
                            <option value="Nagaland">Nagaland</option>
                            <option value="Odisha">Odisha</option>
                            <option value="Puducherry">Puducherry</option>
                            <option value="Punjab">Punjab</option>
                            <option value="Rajasthan">Rajasthan</option>
                            <option value="Sikkim">Sikkim</option>
                            <option value="Tamil Nadu">Tamil Nadu</option>
                            <option value="Telangana">Telangana</option>
                            <option value="Tripura">Tripura</option>
                            <option value="Uttar Pradesh">Uttar Pradesh</option>
                            <option value="Uttarakhand">Uttarakhand</option>
                            <option value="West Bengal">West Bengal</option>
                        </select>
                    </div>
                </div>`;
    lines.splice(gridStart, gridEnd - gridStart + 1, ...stateReplacement.split('\n'));
}

// 3. Update formData Javascript
const hometownAppIdx = lines.findIndex(l => l.includes('formData.append(\'hometown\''));
if (hometownAppIdx !== -1) {
    lines.splice(hometownAppIdx, 1);
}

const altPhoneAppIdx = lines.findIndex(l => l.includes('formData.append(\'alt_phone\''));
if (altPhoneAppIdx !== -1) {
    const relAppend = `            formData.append('alt_phone_relation', document.getElementById('alt_phone_relation').value || '');`;
    lines.splice(altPhoneAppIdx + 1, 0, relAppend);
}

// 4. Inject Terms and Conditions
const termsHtml = fs.readFileSync('d:/Productivity/Prajya/frontend/volunteer-terms.html', 'utf8').split(/\r?\n/);
const termsStart = termsHtml.findIndex(l => l.includes('<div class="content-box">'));
const termsEnd = termsHtml.findIndex((l, i) => i > termsStart && l.includes('</ol>'));
const termsContent = termsHtml.slice(termsStart, termsEnd + 1).join('\n').replace('class="content-box"', 'style="max-height: 300px; overflow-y: auto; background: var(--color-surface); padding: 20px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); margin-bottom: 20px;"');

const termsBoxStr = `
                <div class="form-group" style="margin-top: 35px;">
                    <label class="form-label">Volunteer Terms & Conditions</label>
                    ${termsContent}
                </div>
`;

// Find where to insert it: Just before the Terms checkbox group.
const checkboxGroupIdx = lines.findIndex(l => l.includes('Please review our <a href="volunteer-terms.html"'));
if (checkboxGroupIdx !== -1) {
    let insertIdx = checkboxGroupIdx;
    while(insertIdx > 0 && !lines[insertIdx].includes('<div class="form-group" style="margin-top: 35px;">')) {
        insertIdx--;
    }
    lines.splice(insertIdx, 0, ...termsBoxStr.split('\n'));
}

fs.writeFileSync(file, lines.join('\n'));
