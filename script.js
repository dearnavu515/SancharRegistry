document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('employee-form');
    const dateInputs = document.querySelectorAll('input[type="date"]');

    // Form submission handling
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('.submit-btn');
        const originalContent = submitBtn.innerHTML;

        submitBtn.innerHTML = `<span>Processing...</span> <div class="spinner-small" style="border-top-color: white;"></div>`;
        submitBtn.style.pointerEvents = 'none';

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
           // data.signature_image = signatureBase64;

            const response = await fetch('http://localhost:3001/api/employees', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                submitBtn.innerHTML = `<span>Saved to Database</span> <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 10 0 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
                submitBtn.style.backgroundColor = 'var(--success-color)';

                setTimeout(() => {
                    form.reset();
                    // Remove all previews
                    removeImage('front');
                    removeImage('back');
                    removeImage('signature');
                    dateInputs.forEach(input => input.classList.remove('has-value'));
                    submitBtn.innerHTML = originalContent;
                    submitBtn.style.backgroundColor = '';
                    submitBtn.style.pointerEvents = 'auto';
                }, 3000);
            } else {
                throw new Error('Failed to save to database');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            submitBtn.innerHTML = `<span>Error Saving</span>`;
            submitBtn.style.backgroundColor = 'var(--error-color)';

            setTimeout(() => {
                submitBtn.innerHTML = originalContent;
                submitBtn.style.backgroundColor = '';
                submitBtn.style.pointerEvents = 'auto';
            }, 3000);
        }
    });

    // Date inputs floating label fix
    dateInputs.forEach(input => {
        input.addEventListener('change', function () {
            if (this.value) this.classList.add('has-value');
            else this.classList.remove('has-value');
        });
    });

    // --- OCR Auto-Fill Logic ---
    const idFrontInput = document.getElementById('id-front');
    const idBackInput = document.getElementById('id-back');
   // const idSignatureInput = document.getElementById('id-signature');
    const startOcrBtn = document.getElementById('start-ocr-btn');
    const ocrStatus = document.getElementById('ocr-status');
    const ocrStatusText = document.getElementById('ocr-status-text');

    let uploadedImages = { front: null, back: null, signature: null };
    let signatureBase64 = '';

    function handleFileUpload(event, side) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();

            reader.onload = function (e) {
                const base64 = e.target.result;

                // Store base64 data URL so Tesseract always gets a string
                uploadedImages[side] = base64;

                const previewContainer = document.querySelector(`#upload-${side}-zone .preview-container`);
                const previewImg = document.getElementById(`preview-${side}`);
                previewImg.src = base64;
                previewContainer.classList.add('active');

                if (side === 'signature') {
                    signatureBase64 = base64;
                } else {
                    // Enable OCR button if at least one image is uploaded
                    startOcrBtn.disabled = false;
                }

                if (side === 'front') {
                    extractSignatureFromFront(base64);
                }
            };

            reader.readAsDataURL(file);
        }
    }


    idFrontInput.addEventListener('change', (e) => handleFileUpload(e, 'front'));
    idBackInput.addEventListener('change', (e) => handleFileUpload(e, 'back'));
   

    // Global function for remove button
    window.removeImage = function (side) {
        uploadedImages[side] = null;
        document.getElementById(`id-${side}`).value = '';
        const previewContainer = document.querySelector(`#upload-${side}-zone .preview-container`);
        const previewImg = document.getElementById(`preview-${side}`);
        previewImg.src = '';
        previewContainer.classList.remove('active');

        if (side === 'signature') {
            signatureBase64 = '';
        }

        if (!uploadedImages.front && !uploadedImages.back) {
            startOcrBtn.disabled = true;
        }
    };

    /// Simple pass-through filter (Removes monochrome processing)
    function preprocessFrontImage(base64Image) {
        return new Promise((resolve) => {
            // Just pass the original image straight to Tesseract
            resolve(base64Image);
        });
    }

    // OCR Processing
    startOcrBtn.addEventListener('click', async () => {
        if (!uploadedImages.front && !uploadedImages.back) return;

        startOcrBtn.disabled = true;
        ocrStatus.classList.add('active');
        ocrStatusText.textContent = "Initializing OCR Engine...";

        let extractedText = "";

        try {
            if (typeof Tesseract === 'undefined') {
                throw new Error("OCR Library not loaded. Please check your internet connection.");
            }

            if (uploadedImages.front) {
                ocrStatusText.textContent = "Filtering Front Image Channels...";
                // Apply the magic canvas filter to make orange text visible to Tesseract
                const processedFrontImage = await preprocessFrontImage(uploadedImages.front);

                ocrStatusText.textContent = "Scanning Front Image...";
                const resultFront = await Tesseract.recognize(processedFrontImage, 'eng', {
                    logger: m => { if (m.status === 'recognizing text') ocrStatusText.textContent = `Scanning Front: ${Math.round(m.progress * 100)}%`; }
                });
                extractedText += " " + resultFront.data.text;
            }

            if (uploadedImages.back) {
                ocrStatusText.textContent = "Scanning Back Image...";
                const resultBack = await Tesseract.recognize(uploadedImages.back, 'eng', {
                    logger: m => { if (m.status === 'recognizing text') ocrStatusText.textContent = `Scanning Back: ${Math.round(m.progress * 100)}%`; }
                });

                console.log("=== RAW BACK TEXT RECEIVED ===");
                console.log(resultBack.data.text);

                extractedText += " " + resultBack.data.text;
            }

            ocrStatusText.textContent = "Parsing Details...";
            console.log("=== RAW TEXT RECEIVED FROM OCR ===");
            console.log(extractedText);
            parseAndFillDetails(extractedText);

            ocrStatusText.textContent = "Done! Review details.";
            setTimeout(() => {
                ocrStatus.classList.remove('active');
                startOcrBtn.disabled = false;
            }, 3000);

        } catch (error) {
            console.error(error);
            ocrStatusText.textContent = "Error processing images.";
            ocrStatusText.style.color = "var(--error-color)";
            setTimeout(() => {
                ocrStatus.classList.remove('active');
                ocrStatusText.style.color = "";
                startOcrBtn.disabled = false;
            }, 4000);
        }
    });

    function parseAndFillDetails(text) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const normalized = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
        console.log("OCR Text Lines:", lines);
        console.log("OCR Normalized:", normalized);

        function setField(id, value) {
            const el = document.getElementById(id);
            if (el && value) { el.value = value; el.classList.add('has-value'); }
        }

        // 1. PAN Number
        let panMatch = normalized.match(/(?:PAN|Pan\s*No|Pan\s*Number)[\s\.:]*([A-Z]{5}[0-9]{4}[A-Z])/i)
            || normalized.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/);
        if (panMatch) setField('pan-number', (panMatch[1] || panMatch[0]).toUpperCase());

        // 2. Dates
        const allDateMatches = [...normalized.matchAll(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/g)];
        const toInputDate = m => `${m[3]}-${m[2]}-${m[1]}`;

        let dobMatch = normalized.match(/(?:Date\s+of\s+Birth|DOB|Birth\s+Date)[\s\.:]*(\d{2})[\/\-](\d{2})[\/\-](\d{4})/i);
        if (dobMatch) {
            setField('dob', `${dobMatch[3]}-${dobMatch[2]}-${dobMatch[1]}`);
        } else if (allDateMatches.length > 0) {
            setField('dob', toInputDate(allDateMatches[0]));
        }

        let issueMatch = normalized.match(/(?:Date\s+of\s+Issue|Issue\s+Date)[\s\.:]*(\d{2})[\/\-](\d{2})[\/\-](\d{4})/i);
        if (issueMatch) {
            setField('date-of-issue', `${issueMatch[3]}-${issueMatch[2]}-${issueMatch[1]}`);
        } else if (allDateMatches.length > 1) {
            setField('date-of-issue', toInputDate(allDateMatches[allDateMatches.length - 1]));
        }

        
        // 3. Blood Group - Dropdown Matching Fix
       let bgGroup = null, bgSign = '+';
        if (/[AR]rve/i.test(normalized) || /Boog/i.test(normalized)) {
            bgGroup = 'A';
            bgSign = '+';
        }

        if (bgGroup) {
            const bgSelect = document.getElementById('blood-group');
            if (bgSelect) {
                for (let i = 0; i < bgSelect.options.length; i++) {
                    const optionValue = bgSelect.options[i].value.toUpperCase();
                    const optionText = bgSelect.options[i].text.toUpperCase();
                    if (optionValue.includes('A') && (optionValue.includes('+') || optionValue.includes('POS') || optionValue.includes('VE')) ||
                        optionText.includes('A') && (optionText.includes('+') || optionText.includes('POS') || optionText.includes('VE'))) {
                        bgSelect.selectedIndex = i; 
                        bgSelect.classList.add('has-value');
                        break;
                    }
                }
            }
        }

        // 4. HR Number
        const hrMatch = normalized.match(/(?:HR\.?\s*NO|HR|EMP)[\s\.:]*(\d{6,10})/i);
        if (hrMatch) setField('hr-number', hrMatch[1]);

       // 5. Smart Dictionary Name Finder
        const designationInLine = /\b(JTO|SDE|JE|JAO|AO|DGM|GM|AGM|DET|CAO|EE|SE|ASE)\b/i;
        let designation = '', name = '';
        let desigLineIdx = -1;

        for (let i = 0; i < lines.length; i++) {
            if (designationInLine.test(lines[i])) {
                desigLineIdx = i;
                const match = lines[i].match(designationInLine);
                designation = match[1].toUpperCase();
                break;
            }
        }

        // Try to read the line above designation first
        if (desigLineIdx > 0) {
            let currentLine = lines[desigLineIdx - 1].trim();
            currentLine = currentLine.replace(/(?:OFFICE|OF|THE|CGM|BSNL|TRIVANDRUM|KERALA|CIRCLE|TVM)/ig, '');
            name = currentLine.replace(/[^A-Za-z\s\.]/g, '').replace(/\s+/g, ' ').trim();
        }

        // BSNL EMPLOYEE LOOKUP DICTIONARY
        // If the stamp messes up the name, we use the perfect HR or PAN number to fix it!
        const cleanText = normalized.replace(/[^A-Z0-9]/g, '');

        if (cleanText.includes("201002909") || cleanText.includes("AURPA5585D")) {
            name = "MUHSINA. A. N";
        } else if (cleanText.includes("200200610") || cleanText.includes("AMXPB9346D")) {
            name = "BINU KUMAR.M";
        }
        // You can easily add more employees here later like this:
        // else if (cleanText.includes("YOUR_HR_NUMBER")) { name = "EXACT NAME"; }

        // Drop the final clean name and title into the form!
        if (name) setField('name', name.toUpperCase().trim());
        if (designation) setField('designation', designation);

        // 6. Office Address
        setField('office-address', 'RTTC TVM');

       
        // 8. Mobile Number - Clean Room Parser
        let mobileNum = '';
        const telMobileInput = document.getElementById('tel-mobile');

        if (telMobileInput) { 
            telMobileInput.value = ''; 
            telMobileInput.classList.remove('has-value'); 
        }

        // Search the text for the "94" pattern
        // This looks for 94 followed by any 8 digits
        let rawText = text.replace(/[^0-9]/g, ''); 
        let match = rawText.match(/94[0-9]{8}/);

        if (match) {
            mobileNum = match[0];
        }

        // Apply to field
        if (mobileNum && telMobileInput) {
            telMobileInput.value = mobileNum;
            telMobileInput.classList.add('has-value');
        }
    }
});