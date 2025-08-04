// Global variables
let currentFiles = [];
let currentEmails = [];

// DOM Elements
const fileInput = document.getElementById('file-input');
const dropArea = document.getElementById('drop-area');
const extractBtn = document.getElementById('extract-btn');
const fileList = document.getElementById('file-list');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const errorMessage = document.getElementById('error-message');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

// Setup all event listeners
function setupEventListeners() {
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    setupDragAndDrop();
    
    // Extract button
    extractBtn.addEventListener('click', extractEmails);
    
    // Results actions
    document.getElementById('download-btn').addEventListener('click', downloadEmails);
    document.getElementById('clear-results-btn').addEventListener('click', clearResults);
    document.getElementById('copy-emails-btn').addEventListener('click', copyEmails);
    
    // Browse text click
    dropArea.addEventListener('click', () => fileInput.click());
}

// Drag and drop setup
function setupDragAndDrop() {
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('dragover');
    });
    
    dropArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropArea.classList.remove('dragover');
    });
    
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files).filter(file => file.type === 'application/pdf');
        
        if (files.length === 0) {
            showError('Please drop only PDF files.');
            return;
        }
        
        handleFiles(files);
    });
}

// Handle file selection
function handleFileSelect(e) {
    const files = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
    if (files.length === 0) {
        showError('Please select PDF files only.');
        return;
    }
    handleFiles(files);
}

// Handle files (add to existing files)
function handleFiles(files) {
    // Add to existing files array
    currentFiles = [...currentFiles, ...files];
    updateFileList();
    extractBtn.disabled = currentFiles.length === 0;
    hideError();
}

// Update file list display for multiple files
function updateFileList() {
    fileList.innerHTML = '';
    currentFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <i class="fas fa-file-pdf"></i>
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${formatFileSize(file.size)}</div>
            </div>
            <button class="remove-file" onclick="removeFile(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        fileList.appendChild(fileItem);
    });
}



// Remove file from list
function removeFile(index) {
    currentFiles.splice(index, 1);
    updateFileList();
    extractBtn.disabled = currentFiles.length === 0;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Extract emails from files
async function extractEmails() {
    if (currentFiles.length === 0) return;
    
    showLoading();
    
    try {
        const formData = new FormData();
        currentFiles.forEach(file => {
            formData.append('pdfs', file);
        });
        
        const response = await fetch('/upload-multiple', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentEmails = result.allEmails;
            window.lastFileResults = result.fileResults; // Store for copy functions
            displayResults(result);
        } else {
            showError(result.error || 'Failed to extract emails');
        }
    } catch (error) {
        showError('Error processing files: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Display results
function displayResults(data) {
    // Update summary
    document.getElementById('files-count').textContent = data.totalFiles;
    document.getElementById('emails-count').textContent = data.totalUniqueEmails;
    
    // Display emails list
    const emailsList = document.getElementById('emails-list');
    emailsList.innerHTML = '';
    
    if (data.allEmails.length === 0) {
        emailsList.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">No email addresses found in the uploaded PDF files.</p>';
    } else {
        data.allEmails.forEach((email, index) => {
            const emailItem = document.createElement('div');
            emailItem.className = 'email-item';
            emailItem.innerHTML = `
                <span class="email-text">${email}</span>
                <button class="email-copy-btn" onclick="copyToClipboard('${email.replace(/'/g, "\\'")}')">
                    <i class="fas fa-copy"></i> Copy
                </button>
            `;
            emailsList.appendChild(emailItem);
        });
    }
    
    // Show file details for multiple files or single file breakdown
    const fileDetails = document.getElementById('file-details');
    const fileDetailsList = document.getElementById('file-details-list');
    
    if (data.totalFiles > 1) {
        fileDetailsList.innerHTML = '';
        data.fileResults.forEach((file, fileIndex) => {
            const fileDetail = document.createElement('div');
            fileDetail.className = 'file-detail-item';
            
            let emailsHtml = '';
            if (file.emails.length > 0) {
                emailsHtml = file.emails.map((email, emailIndex) => `
                    <div class="file-email-item">
                        <span class="file-email-text">${email}</span>
                        <button class="email-copy-btn" onclick="copyToClipboard('${email.replace(/'/g, "\\'")}')">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                `).join('');
                emailsHtml += `
                    <div class="file-copy-all-container">
                        <button class="file-copy-all-btn" onclick="copyFileEmails(${fileIndex})">
                            <i class="fas fa-copy"></i> Copy All
                        </button>
                    </div>
                `;
            } else {
                emailsHtml = '<p style="color: #666; font-style: italic; text-align: center; padding: 10px;">No emails found in this file</p>';
            }
            
            fileDetail.innerHTML = `
                <div class="file-detail-header">
                    <span class="file-detail-name">${file.filename}</span>
                    <span class="file-email-count">${file.emailCount} emails</span>
                </div>
                <div class="file-emails">${emailsHtml}</div>
            `;
            fileDetailsList.appendChild(fileDetail);
        });
        fileDetails.classList.remove('hidden');
    } else {
        fileDetails.classList.add('hidden');
    }
    
    results.classList.remove('hidden');
}

// Download emails as text file
async function downloadEmails() {
    if (currentEmails.length === 0) return;
    
    try {
        const response = await fetch('/download-emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                emails: currentEmails,
                filename: `extracted_emails_${new Date().toISOString().split('T')[0]}.txt`
            })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `extracted_emails_${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            showError('Failed to download emails');
        }
    } catch (error) {
        showError('Error downloading emails: ' + error.message);
    }
}

// Copy all emails to clipboard
async function copyEmails() {
    if (currentEmails.length === 0) return;
    
    try {
        await navigator.clipboard.writeText(currentEmails.join('\n'));
        
        // Show feedback
        const copyBtn = document.getElementById('copy-emails-btn');
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        copyBtn.style.background = '#28a745';
        
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.style.background = '#17a2b8';
        }, 2000);
    } catch (error) {
        showError('Failed to copy emails to clipboard');
    }
}

// Copy single email to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showSuccessMessage(`Copied: ${text}`);
    } catch (error) {
        showError('Failed to copy to clipboard');
    }
}

// Copy all emails from a specific file
async function copyFileEmails(fileIndex) {
    try {
        // Get the file results from the last extraction
        const fileResults = window.lastFileResults || [];
        if (fileResults[fileIndex] && fileResults[fileIndex].emails.length > 0) {
            const emails = fileResults[fileIndex].emails.join('\n');
            await navigator.clipboard.writeText(emails);
            showSuccessMessage(`Copied ${fileResults[fileIndex].emails.length} emails from ${fileResults[fileIndex].filename}`);
        }
    } catch (error) {
        showError('Failed to copy emails to clipboard');
    }
}

// Clear results and reset form
function clearResults() {
    results.classList.add('hidden');
    currentEmails = [];
    clearFiles(); // Also clear uploaded files
    hideError();
}

// Clear files and reset form
function clearFiles() {
    currentFiles = [];
    fileInput.value = '';
    fileList.innerHTML = '';
    extractBtn.disabled = true;
    
    // Reset drop area display
    dropArea.innerHTML = `
        <div class="upload-content">
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Drag & drop PDF files here or <span class="browse-text">browse</span></p>
            <p class="upload-hint">You can upload single or multiple PDF files at once</p>
            <input type="file" id="file-input" accept=".pdf" multiple hidden>
        </div>
    `;
    
    // Re-setup event listeners since we replaced the HTML
    document.getElementById('file-input').addEventListener('change', handleFileSelect);
    dropArea.addEventListener('click', () => document.getElementById('file-input').click());
}

// Show loading state
function showLoading() {
    loading.classList.remove('hidden');
    results.classList.add('hidden');
    hideError();
}

// Hide loading state
function hideLoading() {
    loading.classList.add('hidden');
}

// Show error message
function showError(message) {
    document.getElementById('error-text').textContent = message;
    errorMessage.classList.remove('hidden');
    hideLoading();
}

// Hide error message
function hideError() {
    errorMessage.classList.add('hidden');
}

// Show success message (temporary)
function showSuccessMessage(message) {
    // Create temporary success message
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 1000;
        font-weight: 600;
    `;
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}