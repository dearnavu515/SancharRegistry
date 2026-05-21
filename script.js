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
   async function preprocessFrontImage(base64Image) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Image;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;

            // Apply high contrast and grayscale
            ctx.filter = 'grayscale(100%) contrast(200%) brightness(110%)';
            ctx.drawImage(img, 0, 0);
            
            // Return as high-quality JPEG
            resolve(canvas.toDataURL('image/jpeg', 1.0));
        };
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
    
    // THE DETECTIVE LINE:
    console.log("Robot is trying to find box ID:", id, "and put this inside:", value);
    
    if (el) {
        el.value = value;
        el.classList.add('has-value');

        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));

    } else {
        // If you see this error, it means the ID name in your HTML is different!
        console.error("OH NO! The robot couldn't find the box named:", id);
    }
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

        
        

        // 4. HR Number
        const hrMatch = normalized.match(/(?:HR\.?\s*NO|EMP\.?\s*NO|ID\.?\s*NO|HR|EMP)[\s\.:]*(\d{9})/i);        if (hrMatch) setField('hr-number', hrMatch[1]);
// 5. Smart Dictionary Name Finder
const designationInLine = /\b(JTO|SDE|AOS|JE|JAO|AO|DGM|GM|AGM|DET|CAO|EE|SE|ASE)\b/i;
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

if (desigLineIdx > 0) {
    let currentLine = lines[desigLineIdx - 1].trim();
    currentLine = currentLine.replace(/(?:OFFICE|OF|THE|CGM|BSNL|TRIVANDRUM|KERALA|CIRCLE|TVM)/ig, '');
    name = currentLine.replace(/[^A-Za-z\s\.]/g, '').replace(/\s+/g, ' ').trim();
}

// BSNL EMPLOYEE LOOKUP DICTIONARY
// Only define cleanText ONCE here
const cleanText = normalized.replace(/[^A-Z0-9]/g, '');

if (cleanText.includes("201002909") || cleanText.includes("AURPA5585D")) {
    name = "MUHSINA. A. N";
    setField('hr-number', "201002909");
    setField('tel-mobile', "9486101153")
} else if (cleanText.includes("200200610") || cleanText.includes("AMXPB9346D")) {
    name = "BINU KUMAR.M";
    setField('hr-number', "200200610");
    setField('tel-mobile', "9447041200")
} else if (cleanText.includes("199803161") || cleanText.includes("ACTPT6444Q")) {
    name = "SREELETHA.T";
    setField('hr-number', "199803161");
    setField('tel-mobile', "9447660043")
}

// Drop the final clean name and title into the form!
if (name) setField('name', name.toUpperCase().trim());
if (designation) setField('designation', designation);
        // 6. Office Address
        setField('office-address', 'RTTC TVM');

       
        
    }
});