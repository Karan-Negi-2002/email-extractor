// Import required Node.js modules
const fs = require('fs');           // File system operations
const path = require('path');       // Path manipulation utilities
const pdf = require('pdf-parse');   // PDF text extraction library

// Email regex pattern to match valid email addresses
const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

// Function to extract emails from a single PDF file
async function extractEmailsFromPDF(pdfPath) {
    try {
        // Read PDF file as binary data
        const dataBuffer = fs.readFileSync(pdfPath);
        
        // Parse PDF and extract text content
        const data = await pdf(dataBuffer);
        const text = data.text;
        
        // Extract emails using regex pattern matching
        const emails = text.match(emailRegex) || [];
        return emails;
    } catch (error) {
        // Handle errors during PDF processing
        console.error(`Error processing ${pdfPath}: ${error.message}`);
        return [];
    }
}

// Function to extract emails from PDF buffer (for web uploads)
async function extractEmailsFromBuffer(buffer, filename = 'uploaded file') {
    try {
        // Parse PDF and extract text content
        const data = await pdf(buffer);
        const text = data.text;
        
        // Extract emails using regex pattern matching
        const emails = text.match(emailRegex) || [];
        return emails;
    } catch (error) {
        // Handle errors during PDF processing
        console.error(`Error processing ${filename}: ${error.message}`);
        return [];
    }
}

// Function to process all PDF files in the "pdf folder" directory
async function processAllPDFs() {
    const pdfFolderPath = path.join(process.cwd(), 'pdf folder');
    
    // Check if pdf folder exists
    if (!fs.existsSync(pdfFolderPath)) {
        console.error('PDF folder does not exist! Please create a "pdf folder" directory.');
        process.exit(1);
    }

    // Get all PDF files from the folder
    const files = fs.readdirSync(pdfFolderPath);
    const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');

    if (pdfFiles.length === 0) {
        console.log('No PDF files found in the "pdf folder" directory.');
        process.exit(1);
    }

    console.log(`Found ${pdfFiles.length} PDF file(s) to process...\n`);

    const allEmails = new Set(); // Use Set to automatically remove duplicates
    let processedCount = 0;

    // Process each PDF file
    for (let i = 0; i < pdfFiles.length; i++) {
        const pdfFile = pdfFiles[i];
        const pdfPath = path.join(pdfFolderPath, pdfFile);
        
        console.log(`Processing ${i + 1}/${pdfFiles.length}: ${pdfFile}...`);
        
        // Extract emails from this PDF
        const emails = await extractEmailsFromPDF(pdfPath);
        
        if (emails.length > 0) {
            // Add emails to the main collection (Set handles duplicates)
            emails.forEach(email => allEmails.add(email.toLowerCase()));
            console.log(`  Found ${emails.length} email(s) in ${pdfFile}`);
            processedCount++;
        } else {
            console.log(`  No emails found in ${pdfFile}`);
        }
    }

    // Convert Set to Array and sort alphabetically
    const sortedEmails = Array.from(allEmails).sort();

    console.log('\n=====================================');
    console.log(`Processing Complete!`);
    console.log(`Files processed: ${processedCount}/${pdfFiles.length}`);
    console.log(`Total unique emails found: ${sortedEmails.length}`);
    console.log('=====================================\n');

    if (sortedEmails.length > 0) {
        // Display all found emails
        console.log('All unique emails found:\n');
        sortedEmails.forEach(email => console.log(`  ${email}`));
        console.log();
        
        return sortedEmails;
    } else {
        console.log('No emails found in any PDF files.\n');
        return [];
    }
}

// Function to save emails to storage folder with custom filename
function saveEmailsToStorage(emails, filename) {
    const storagePath = path.join(process.cwd(), 'storage');
    
    // Create storage folder if it doesn't exist
    if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath);
        console.log('Created storage folder.');
    }

    // Ensure filename has .txt extension
    if (!filename.endsWith('.txt')) {
        filename += '.txt';
    }

    // Check if file already exists and generate unique filename
    let finalFilename = filename;
    let counter = 0;
    let filePath = path.join(storagePath, finalFilename);
    
    // Keep checking and incrementing counter until we find a unique filename
    while (fs.existsSync(filePath)) {
        // Extract name without .txt extension
        const nameWithoutExt = filename.replace('.txt', '');
        // Create new filename with counter
        finalFilename = `${nameWithoutExt}(${counter}).txt`;
        filePath = path.join(storagePath, finalFilename);
        counter++;
    }

    const emailContent = emails.join('\n');
    
    // Save emails to file with unique filename
    fs.writeFileSync(filePath, emailContent);
    
    if (counter > 0) {
        console.log(`File already existed. Emails saved to: storage/${finalFilename}`);
    } else {
        console.log(`Emails saved to: storage/${finalFilename}`);
    }
}

// Main execution function - entry point of the script
async function main() {
    console.log('=====================================');
    console.log('    PDF Email Extractor Tool');
    console.log('=====================================\n');
    
    console.log('Processing all PDFs in "pdf folder"...\n');
    
    try {
        // Process all PDF files in the pdf folder
        const emails = await processAllPDFs();
        
        if (emails.length > 0) {
            // Ask for filename to save the results
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question('Enter filename to save the emails (without .txt extension): ', (filename) => {
                if (filename.trim()) {
                    saveEmailsToStorage(emails, filename.trim());
                    console.log('\nEmail extraction completed successfully!');
                } else {
                    console.log('Invalid filename. Emails not saved.');
                }
                rl.close();
            });
        }
    } catch (error) {
        // Handle any unexpected errors
        console.error('An error occurred:', error.message);
        process.exit(1);
    }
}

// Export functions for web use
module.exports = {
    extractEmailsFromPDF,
    extractEmailsFromBuffer,
    processAllPDFs,
    saveEmailsToStorage,
    emailRegex
};

// Start the application only if this file is run directly
if (require.main === module) {
    main();
}