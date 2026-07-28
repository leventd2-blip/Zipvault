// ZipVault Frontend Core Script (public/js/app.js)

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone'); // Adjust ID to match your HTML
    const fileInput = document.getElementById('file-input'); // Adjust ID to match your HTML
    const extractBtn = document.getElementById('extract-btn'); // Adjust ID to match your HTML

    if (extractBtn) {
        extractBtn.addEventListener('click', async () => {
            try {
                // Your existing extraction logic goes here...
                console.log('Extracting archive...');

                // Trigger the stats tracking endpoint once extraction is successful
                await trackZipUpload();

            } catch (err) {
                console.error('Failed to process or download file:', err);
                alert('Failed to download file.');
            }
        });
    }
});

// Function to track global upload stats without crashing
async function trackZipUpload() {
    try {
        const response = await fetch('/api/track-upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Upload tracked successfully. Total:', data.totalUploads);
        }
    } catch (err) {
        console.error('Failed to update stats counter on server:', err);
    }
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}