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

            const response = await fetch('http://localhost:3000/api/employees', {
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
        input.addEventListener('change', function() {
            if (this.value) this.classList.add('has-value');
            else this.classList.remove('has-value');
        });
    });

    // --- OCR Auto-Fill Logic ---
    const idFrontInput = document.getElementById('id-front');
    const idBackInput = document.getElementById('id-back');
    const startOcrBtn = document.getElementById('start-ocr-btn');
    const ocrStatus = document.getElementById('ocr-status');
    const ocrStatusText = document.getElementById('ocr-status-text');
    
    let uploadedImages = { front: null, back: null };

    function handleFileUpload(event, side) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            uploadedImages[side] = file;
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const previewContainer = document.querySelector(`#upload-${side}-zone .preview-container`);
                const previewImg = document.getElementById(`preview-${side}`);
                previewImg.src = e.target.result;
                previewContainer.classList.add('active');
                
                // Enable OCR button if at least one image is uploaded
                startOcrBtn.disabled = false;
            }
            
            reader.readAsDataURL(file);
        }
    }

    idFrontInput.addEventListener('change', (e) => handleFileUpload(e, 'front'));
    idBackInput.addEventListener('change', (e) => handleFileUpload(e, 'back'));

    // Global function for remove button
    window.removeImage = function(side) {
        uploadedImages[side] = null;
        document.getElementById(`id-${side}`).value = '';
        const previewContainer = document.querySelector(`#upload-${side}-zone .preview-container`);
        const previewImg = document.getElementById(`preview-${side}`);
        previewImg.src = '';
        previewContainer.classList.remove('active');
        
        if (!uploadedImages.front && !uploadedImages.back) {
            startOcrBtn.disabled = true;
        }
    };

    // OCR Processing
    startOcrBtn.addEventListener('click', async () => {
        if (!uploadedImages.front && !uploadedImages.back) return;
        
        startOcrBtn.disabled = true;
        ocrStatus.classList.add('active');
        ocrStatusText.textContent = "Initializing OCR Engine...";
        
        let extractedText = "";

        try {
            // If Tesseract is loaded globally from CDN
            if (typeof Tesseract === 'undefined') {
                throw new Error("OCR Library not loaded. Please check your internet connection.");
            }

            if (uploadedImages.front) {
                ocrStatusText.textContent = "Scanning Front Image...";
                const resultFront = await Tesseract.recognize(uploadedImages.front, 'eng', {
                    logger: m => { if(m.status === 'recognizing text') ocrStatusText.textContent = `Scanning Front: ${Math.round(m.progress * 100)}%`; }
                });
                extractedText += " " + resultFront.data.text;
            }

            if (uploadedImages.back) {
                ocrStatusText.textContent = "Scanning Back Image...";
                const resultBack = await Tesseract.recognize(uploadedImages.back, 'eng', {
                    logger: m => { if(m.status === 'recognizing text') ocrStatusText.textContent = `Scanning Back: ${Math.round(m.progress * 100)}%`; }
                });
                extractedText += " " + resultBack.data.text;
            }

            ocrStatusText.textContent = "Parsing Details...";
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
        // Normalizing text for easier parsing
        const normalized = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
        console.log("Extracted OCR Text:", normalized);
        
        // 1. Extract PAN Number (Format: ABCDE1234F)
        const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]{1}/;
        const panMatch = normalized.match(panRegex);
        if (panMatch) {
            const panInput = document.getElementById('pan-number');
            panInput.value = panMatch[0];
            panInput.classList.add('has-value');
        }

        // 2. Extract DOB (Formats like DD/MM/YYYY, DD-MM-YYYY)
        const dobRegex = /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/;
        const dobMatch = normalized.match(dobRegex);
        if (dobMatch) {
            // Convert to YYYY-MM-DD for input type date
            const dobInput = document.getElementById('dob');
            dobInput.value = `${dobMatch[3]}-${dobMatch[2]}-${dobMatch[1]}`;
            dobInput.classList.add('has-value');
        }
        
        // 3. Extract Blood Group
        const bgRegex = /(A|B|AB|O)[\+\-]/i;
        const bgMatch = normalized.match(bgRegex);
        if (bgMatch) {
            const bgSelect = document.getElementById('blood-group');
            // Find option that matches
            for(let i=0; i<bgSelect.options.length; i++) {
                if(bgSelect.options[i].value.toUpperCase() === bgMatch[0].toUpperCase()) {
                    bgSelect.selectedIndex = i;
                    break;
                }
            }
        }

        // 4. Attempt to extract Name
        // Names often appear after keywords like "Name", or as the first couple of capitalized words
        const nameRegex = /(?:Name|NAME)[\s:]*([A-Z][a-z]+(?: [A-Z][a-z]+)*)/;
        const nameMatch = normalized.match(nameRegex);
        if (nameMatch && nameMatch[1]) {
            const nameInput = document.getElementById('name');
            nameInput.value = nameMatch[1];
            nameInput.classList.add('has-value');
        }
        
        // 5. Attempt to extract HR Number (assuming numeric 6-8 digits for BSNL)
        const hrRegex = /(?:HR|EMP|No)[\s\.:]*(\d{6,8})/i;
        const hrMatch = normalized.match(hrRegex);
        if(hrMatch && hrMatch[1]) {
            const hrInput = document.getElementById('hr-number');
            hrInput.value = hrMatch[1];
            hrInput.classList.add('has-value');
        }
    }
});
