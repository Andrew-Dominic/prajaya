const fs = require('fs');
const file = 'd:/Productivity/Prajya/frontend/volunteer.html';
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

// 1. Alternative Phone (Lines 1372-1381) - 0-indexed is 1371 to 1380
const altPhoneBlock = `                <div class="form-group-grid grid-3">
                    <div>
                        <label class="form-label">Mobile Number<span class="required-asterisk">*</span></label>
                        <input type="tel" class="form-control" id="phone" placeholder="+91 98765 43210" autocomplete="tel" required>
                    </div>
                    <div>
                        <label class="form-label">Alternative Mobile</label>
                        <input type="tel" class="form-control" id="alt_phone" placeholder="+91 98765 00000" autocomplete="tel">
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
                </div>`.split('\n');
lines.splice(1371, 10, ...altPhoneBlock);

// Note: after splice, line numbers shift! 
// We added 19 lines, removed 10. Net shift = +9 lines.

// 2. Hometown & State (originally lines 1394-1407, now +9 = 1403-1416, 0-indexed is 1402)
const stateBlock = `                <div class="form-group-grid grid-2">
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
                </div>`.split('\n');
lines.splice(1402, 14, ...stateBlock);

// Added 44 lines, removed 14. Net shift = +30. Total net shift = 39.

// 3. Terms & Conditions display
// It should go "within below the form" or just above the submit button.
// The form originally ends at line 1533 (</form>), Submit button is at 1533 (wait, submit is 1533? Let me check line 1533-1534 in original)
// In original: 
// 1533: <button type="submit" ...
// 1534: </form>
// Current net shift = +39. So 1533 is now 1533 + 39 = 1572.
// Wait, I don't need to guess line numbers if I just search for them!
// Let's rewrite the script to find indexes by string matching instead of hardcoded numbers.
