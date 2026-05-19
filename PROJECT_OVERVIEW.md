# BSNL SancharRegistry - Project Overview

SancharRegistry is an innovative, professional employee registration portal designed specifically for Bharat Sanchar Nigam Limited (BSNL). The project leverages modern client-side intelligence (OCR and image processing) and a robust backend to streamline the employee onboarding and registration workflow.

---

## 1. Project Architecture

The application is built using a modern, lightweight tech stack that ensures speed, ease of deployment, and high interactive fidelity:

```
                  ┌──────────────────────────────────────────────┐
                  │                   BROWSER                    │
                  │  (HTML5 / Vanilla CSS / Vanilla Javascript)  │
                  └──────────────┬───────────────────▲───────────┘
                                 │                   │
                     HTTP POST   │                   │  HTTP GET / DELETE
                     JSON Data   │                   │  JSON Data
                                 ▼                   │
                  ┌──────────────────────────────────────────────┐
                  │                 NODE.JS REST                 │
                  │                  (Express)                   │
                  └──────────────┬───────────────────▲───────────┘
                                 │                   │
                   Write Query   │                   │  Read Query
                                 ▼                   │
                  ┌──────────────────────────────────────────────┐
                  │               SQLITE DATABASE                │
                  │              (database.sqlite)               │
                  └──────────────────────────────────────────────┘
```

- **Frontend**: Vanilla HTML5, CSS3, and JavaScript. No bulky frameworks are used, ensuring instantaneous page load times. Styling follows official BSNL branding (Deep Blue, Accent Orange, and White).
- **Client-Side AI**: Powered by **Tesseract.js** (loaded via CDN) for OCR scanning directly in the user's browser, preserving privacy and reducing server load.
- **Backend API**: A **Node.js/Express** server serving REST endpoints.
- **Database**: **SQLite** (`sqlite3` module). It stores registrations in a local file (`database.sqlite`) meaning the project works right out of the box with zero complex database setup (unlike MySQL or PostgreSQL).

---

## 2. Core Features

### A. Intelligent Signature Extraction
To simplify form filling, the front-side upload zone is equipped with automatic signature extraction:
- When a user uploads the front image of their BSNL ID card, a hidden HTML5 `<canvas>` copies the bottom-right portion of the card (where signatures are traditionally located).
- This cropped region is instantly converted into a Base64 image string and displayed in the "Signature" preview box.
- Users can review the cropped signature or override it by uploading a custom signature file.

### B. AI-Powered OCR Auto-Fill
- Built-in scanner scans the uploaded front/back ID images using Tesseract.js.
- Parsed text is parsed using regular expressions (Regex) to extract key parameters:
  - **PAN Number**: Regex pattern matches the `ABCDE1234F` structure.
  - **Date of Birth (DOB)**: Matches `DD/MM/YYYY` or `DD-MM-YYYY` formats and auto-converts to standard `YYYY-MM-DD` for HTML date pickers.
  - **HR Number**: Searches for `HR` or `EMP` keywords followed by standard numeric BSNL employee identifiers.
  - **Name / Blood Group**: Auto-populated based on keyword detection and selection matches.

### C. Responsive BSNL Design
- Uses absolute-positioned banners for "Project Demo" announcements that remain responsive on high-resolution screens.
- Utilizes CSS grids (`repeat(auto-fit, minmax(200px, 1fr))`) to handle card and signature preview grids responsively on mobile, tablet, and desktop viewports.

### D. Interactive Admin Dashboard
- Allows HR administrators to inspect registered employees in real-time.
- Features hover-based signature zoom: hovering over the cropped signature expands the thumbnail so details can be reviewed clearly.
- Built-in data cleaning tools: includes red "Delete" buttons for records with double-confirmation popups to prevent accidental deletions.

---

## 3. Directory & File Breakdown

```
SancharRegistry/
│
├── server.js            # Node.js Express server, REST API endpoints, and SQLite DB configuration
├── index.html           # Main employee registration web portal page
├── admin.html           # Admin dashboard for inspecting and deleting records
├── script.js            # Frontend JavaScript: Form validation, OCR scan, Canvas signature extraction
├── styles.css           # BSNL branding styles, CSS variable palettes, layout & micro-animations
├── database.sqlite      # Automatically created local SQLite database (excluded from Git)
├── .gitignore           # Keeps dependency directories and database files out of git source control
└── README.md            # Setup steps and basic overview of the project
```

### File Details:
- **`server.js`**: Operates as the Node.js Express server handling core database interactions:
  - **Database Initialization**: On launch, it opens/creates the `database.sqlite` file and automatically runs the schema migration (`CREATE TABLE IF NOT EXISTS employees`) to ensure the table structure is ready.
  - **Save Route (`POST /api/employees`)**: Parses the incoming JSON payload (including the Base64 signature image string) and executes a parameterized SQL `INSERT` statement to safely register the record without vulnerability to SQL injection.
  - **List Route (`GET /api/employees`)**: Queries all employee rows ordered by submission date (`ORDER BY created_at DESC`) and returns them as a JSON list to feed the admin table.
  - **Delete Route (`DELETE /api/employees/:id`)**: Parses the unique ID parameter and executes `DELETE FROM employees WHERE id = ?` to remove rows on admin confirmation.
- **`index.html`**: Structures the registration layout. Includes floating label fields, three preview upload zones (Front ID, Back ID, Signature), and progress status indicators for OCR.
- **`script.js`**:
  - Implements the form submit listener, converting data to JSON payload.
  - Reads input files using `FileReader.readAsDataURL()`.
  - Holds `extractSignatureFromFront(base64)` which uses `canvas.getContext('2d')` to crop and set signature previews.
  - Controls Tesseract engine activation and logs OCR progress in real-time.
- **`styles.css`**: Defines design tokens (`--bsnl-blue`, `--bsnl-orange`). Styles buttons, active drag/drop zones, input labels, the administrative tables, and interactive zoom transformations.

---

## 4. Operational Flows

### Registration Flow
1. User visits `index.html`.
2. User uploads their Front ID Card image.
   - **Trigger**: Script reads the file, generates a Base64 preview, and launches `extractSignatureFromFront()`.
   - **Result**: The bottom-right section is drawn to canvas, converted back to Base64, and the Signature preview lights up with the cropped signature.
3. User uploads the Back ID Card image.
4. User clicks **Start Auto-Fill**.
   - OCR runs on both images. Extracted text is fed to `parseAndFillDetails()`, and matching fields are auto-filled with a highlight animation.
5. User fills any remaining fields and clicks **Submit**.
   - Server registers the user, inserts the row (including the signature Base64 string), and responds with success.

### Administration Flow
1. HR admin opens `admin.html`.
2. Dashboard sends a `GET` request to `server.js` for data.
3. SQLite queries the `employees` table sorted by `created_at DESC` and responds.
4. Admin reviews names, telephone numbers, and hover-zooms signatures.
5. Clicking **Delete** triggers a confirmation popup. If confirmed, a `DELETE` request is sent, and SQLite deletes the row. The page then automatically refreshes the table view.

---

## 5. Security & Production Considerations

For deployment in an official environment, the following improvements should be addressed:
1. **Authentication**: Restrict `admin.html` and the `DELETE /api/employees/:id` endpoint behind secure session cookies or JWT authentication.
2. **File Storage**: Instead of storing Base64 strings directly in SQLite (which slows down table queries when scaling to thousands of employees), save the uploaded images directly to disk (e.g. an `uploads/` directory) or an Object Storage bucket (like AWS S3), and store the file URL references in the database.
3. **HTTPS Encryption**: Force SSL/TLS to encrypt form transmissions, protecting sensitive data (like PAN and mobile numbers) during transit.
