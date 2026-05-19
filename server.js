const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- DATABASE CONFIGURATION (SQLite) ---
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log(`Connected to the SQLite database at ${dbPath}`);
        initDB();
    }
});

// Initialize Database and Table
function initDB() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            dob TEXT NOT NULL,
            blood_group TEXT NOT NULL,
            designation TEXT NOT NULL,
            hr_number TEXT NOT NULL,
            pan_number TEXT NOT NULL,
            date_of_issue TEXT NOT NULL,
            office_address TEXT NOT NULL,
            tel_office TEXT,
            tel_residence TEXT,
            tel_mobile TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    db.run(createTableQuery, (err) => {
        if (err) {
            console.error("Error creating table:", err.message);
        } else {
            console.log("Database 'employees' table is ready.");
        }
    });
}

// API Routes
app.get('/api/employees', (req, res) => {
    const query = "SELECT * FROM employees ORDER BY created_at DESC";
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("Error fetching data:", err.message);
            res.status(500).json({ error: "Failed to fetch employee details." });
        } else {
            res.json(rows);
        }
    });
});

app.delete('/api/employees/:id', (req, res) => {
    const { id } = req.params;
    const deleteQuery = "DELETE FROM employees WHERE id = ?";
    
    db.run(deleteQuery, id, function(err) {
        if (err) {
            console.error("Error deleting data:", err.message);
            res.status(500).json({ error: "Failed to delete employee details." });
        } else if (this.changes === 0) {
            res.status(404).json({ error: "Employee not found." });
        } else {
            res.json({ message: "Employee deleted successfully." });
        }
    });
});

app.post('/api/employees', (req, res) => {
    const {
        name, dob, 'blood-group': bloodGroup, designation, 
        'hr-number': hrNumber, 'pan-number': panNumber, 
        'date-of-issue': dateOfIssue, 'office-address': officeAddress,
        'tel-office': telOffice, 'tel-residence': telResidence, 'tel-mobile': telMobile
    } = req.body;

    const insertQuery = `
        INSERT INTO employees 
        (name, dob, blood_group, designation, hr_number, pan_number, date_of_issue, office_address, tel_office, tel_residence, tel_mobile) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
        name, dob, bloodGroup, designation, hrNumber, panNumber, dateOfIssue, 
        officeAddress, telOffice || null, telResidence || null, telMobile
    ];

    db.run(insertQuery, values, function(err) {
        if (err) {
            console.error("Error inserting data:", err.message);
            res.status(500).json({ error: "Failed to save employee details." });
        } else {
            res.status(201).json({ 
                message: "Employee details saved successfully", 
                employeeId: this.lastID 
            });
        }
    });
});

// Start Server
app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});
