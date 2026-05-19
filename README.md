# SancharRegistry

A professional employee registration portal for Bharat Sanchar Nigam Limited (BSNL). This project features client-side ID Card OCR parsing to automatically fill employee details, and stores the submitted entries in a local SQLite database.

## Features
- **Official BSNL Branding**: Clean, modern web UI with official colors (Deep Blue & Orange), responsive grid layouts, and active feedback states.
- **AI-Powered OCR Auto-Fill**: Upload the front and back of your BSNL employee ID card to automatically parse and populate details (Name, DOB, PAN, HR Number, Blood Group) using Tesseract.js.
- **Intelligent Signature Cropping**: Automatically extracts the signature image from the front BSNL ID card using HTML5 canvas-based cropping. Alternatively, users can upload their signature image manually.
- **Zero-Setup Database (SQLite)**: Submissions and signature base64 images are saved locally in a `database.sqlite` file inside the project directory.
- **Admin Database Viewer**: An intuitive `admin.html` web dashboard to view, browse, and delete employee records from the database, featuring signature thumbnails that dynamically zoom on hover.

## Key Innovations & Novelties

This portal is distinct from standard database forms thanks to the following technical and design implementations:
- **Intelligent Canvas-Based Signature Cropping**: Instead of forcing users to manually crop or upload their signatures separately, the application programmatically crops the signature region (bottom-right) of the Front ID card in the background using HTML5 Canvas.
- **Client-Side AI OCR Processing**: OCR parsing executes completely inside the browser using **Tesseract.js**. Documents do not need to be uploaded to an external server to be processed, protecting employee data privacy and reducing network latency.
- **Zero-Setup Database Architecture**: Built using a local **SQLite** server-less database file (`database.sqlite`). This eliminates complex external database server setups (such as MySQL/Postgres), allowing the project to run out-of-the-box in seconds.
- **Fuzzy Date & Detail Matching**: Relies on specific Regex parsers to intelligently search raw scanned card text for BSNL HR format structures, PAN card strings, and various Date of Birth formats (dynamically converting them to `YYYY-MM-DD` standard inputs).
- **Dynamic Zoom Previews**: Displays Base64 signature thumbnails in the Admin Dashboard which expand in high-definition (3.5x scaling) upon hover using pure CSS, optimizing UI space.

## Installation & Running

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your computer.

### Setup Steps
1. Clone this repository (or download the files):
   ```bash
   git clone https://github.com/dearnavu515/SancharRegistry.git
   cd SancharRegistry
   ```

2. Install the backend dependencies:
   ```bash
   npm install
   ```

3. Start the backend server:
   ```bash
   node server.js
   ```
   *You should see:*
   `Backend server running on http://localhost:3000`
   `Connected to the SQLite database`

### Using the Applications
- Open **`index.html`** in your browser to access the registration portal. Fill in the details (or use the ID Card Auto-Fill) and submit.
- Open **`admin.html`** in your browser to view all saved records and delete entries.
