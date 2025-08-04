const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { extractEmailsFromBuffer } = require('./extractEmails');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Only allow PDF files
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
        }
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle single PDF upload
app.post('/upload-single', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file uploaded' });
        }

        console.log(`Processing uploaded file: ${req.file.originalname}`);
        
        // Extract emails from the uploaded PDF buffer
        const emails = await extractEmailsFromBuffer(req.file.buffer, req.file.originalname);
        
        // Remove duplicates and sort
        const uniqueEmails = [...new Set(emails.map(email => email.toLowerCase()))].sort();
        
        res.json({
            success: true,
            filename: req.file.originalname,
            emailCount: uniqueEmails.length,
            emails: uniqueEmails
        });

    } catch (error) {
        console.error('Error processing PDF:', error);
        res.status(500).json({ 
            error: 'Failed to process PDF file',
            details: error.message 
        });
    }
});

// Handle multiple PDF uploads
app.post('/upload-multiple', upload.array('pdfs', 500), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No PDF files uploaded' });
        }

        console.log(`Processing ${req.files.length} uploaded files...`);
        
        const allEmails = new Set();
        const results = [];

        // Process each uploaded file
        for (const file of req.files) {
            console.log(`Processing: ${file.originalname}`);
            
            const emails = await extractEmailsFromBuffer(file.buffer, file.originalname);
            const uniqueFileEmails = [...new Set(emails.map(email => email.toLowerCase()))];
            
            // Add to overall collection
            uniqueFileEmails.forEach(email => allEmails.add(email));
            
            results.push({
                filename: file.originalname,
                emailCount: uniqueFileEmails.length,
                emails: uniqueFileEmails
            });
        }

        // Convert Set to sorted array
        const sortedEmails = Array.from(allEmails).sort();

        res.json({
            success: true,
            totalFiles: req.files.length,
            totalUniqueEmails: sortedEmails.length,
            allEmails: sortedEmails,
            fileResults: results
        });

    } catch (error) {
        console.error('Error processing PDFs:', error);
        res.status(500).json({ 
            error: 'Failed to process PDF files',
            details: error.message 
        });
    }
});

// Download emails as text file
app.post('/download-emails', (req, res) => {
    try {
        const { emails, filename } = req.body;
        
        if (!emails || !Array.isArray(emails)) {
            return res.status(400).json({ error: 'Invalid email data' });
        }

        const emailContent = emails.join('\n');
        const downloadFilename = filename || 'extracted_emails.txt';
        
        res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
        res.setHeader('Content-Type', 'text/plain');
        res.send(emailContent);

    } catch (error) {
        console.error('Error creating download:', error);
        res.status(500).json({ error: 'Failed to create download file' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
    }
    
    if (error.message === 'Only PDF files are allowed!') {
        return res.status(400).json({ error: 'Only PDF files are allowed!' });
    }
    
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

// Start server
app.listen(PORT, () => {
    console.log('=====================================');
    console.log('    PDF Email Extractor - Web App');
    console.log('=====================================');
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Upload PDF files to extract email addresses!');
    console.log('=====================================');
});