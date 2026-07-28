document.addEventListener('DOMContentLoaded', () => {
  // DOM References
  const zipInput = document.getElementById('zipInput');
  const dropZone = document.getElementById('dropZone');
  const treeSearch = document.getElementById('treeSearch');
  const fileTree = document.getElementById('fileTree');
  const previewArea = document.getElementById('previewArea');
  const previewPath = document.getElementById('previewPath');
  const extractBtn = document.getElementById('extractBtn');

  // Archive Metadata Header References
  const archiveMeta = document.getElementById('archiveMeta');
  const archiveName = document.getElementById('archiveName');
  const archiveSize = document.getElementById('archiveSize');
  const archiveEntries = document.getElementById('archiveEntries');

  // App State Variables
  let loadedZip = null;
  let activeEntryPath = null;
  let zipEntries = [];

  // Helper: Format Bytes Utility
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // File Upload Handlers
  dropZone.addEventListener('click', () => zipInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-emerald-500');
  });

  ['dragleave', 'dragend'].forEach(evt => {
    dropZone.addEventListener(evt, () => {
      dropZone.classList.remove('border-emerald-500');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-emerald-500');
    if (e.dataTransfer.files.length > 0) {
      handleZipFile(e.dataTransfer.files[0]);
    }
  });

  zipInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleZipFile(e.target.files[0]);
    }
  });

  // JSZip File Processing
  async function handleZipFile(file) {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      alert('Please select a valid .zip file.');
      return;
    }

    if (file.size === 0) {
      alert('Selected zip archive is empty (0 Bytes).');
      return;
    }

    try {
      fileTree.innerHTML = `<div class="text-center text-neutral-500 py-8 font-mono text-xs">Parsing archive structure...</div>`;
      
      const arrayBuffer = await file.arrayBuffer();
      loadedZip = await JSZip.loadAsync(arrayBuffer);

      // Populate File Array
      zipEntries = [];
      loadedZip.forEach((relativePath, zipEntry) => {
        zipEntries.push({
          path: relativePath,
          isDir: zipEntry.dir,
          entry: zipEntry
        });
      });

      // Update Archive Metadata Header
      archiveName.textContent = file.name;
      archiveSize.textContent = formatBytes(file.size);
      archiveEntries.textContent = zipEntries.length;
      archiveMeta.classList.remove('hidden');

      // Render Tree Hierarchy
      renderTree('');
    } catch (err) {
      console.error(err);
      fileTree.innerHTML = `<div class="text-center text-red-400 py-8 font-mono text-xs">Error parsing archive.</div>`;
    }
  }

  // Dynamic Search Filter Listener
  treeSearch.addEventListener('input', (e) => {
    renderTree(e.target.value.trim().toLowerCase());
  });

  // Tree Rendering Logic
  function renderTree(filter = '') {
    if (!zipEntries.length) return;

    fileTree.innerHTML = '';
    const filtered = zipEntries.filter(item => item.path.toLowerCase().includes(filter));

    if (filtered.length === 0) {
      fileTree.innerHTML = `<div class="text-center text-neutral-600 py-6 font-mono text-xs">No matching files found.</div>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    filtered.forEach(item => {
      const row = document.createElement('div');
      row.className = `flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors hover:bg-neutral-800/60 ${activeEntryPath === item.path ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-300'}`;

      const nameContainer = document.createElement('div');
      nameContainer.className = 'flex items-center space-x-2 truncate';

      const icon = document.createElement('i');
      icon.setAttribute('data-lucide', item.isDir ? 'folder' : 'file');
      icon.className = `w-3.5 h-3.5 shrink-0 ${item.isDir ? 'text-amber-400' : 'text-neutral-400'}`;

      const label = document.createElement('span');
      label.className = 'truncate';
      label.textContent = item.path;

      nameContainer.appendChild(icon);
      nameContainer.appendChild(label);
      row.appendChild(nameContainer);

      if (!item.isDir) {
        row.addEventListener('click', () => fetchPreview(item.path));
      }

      fragment.appendChild(row);
    });

    fileTree.appendChild(fragment);
    lucide.createIcons();
  }

  // Preview Renderer Logic
  async function fetchPreview(path) {
    if (!loadedZip) return;

    const fileEntry = loadedZip.file(path);
    if (!fileEntry) return;

    activeEntryPath = path;
    previewPath.textContent = path;
    extractBtn.classList.remove('hidden');
    extractBtn.disabled = false;

    // Refresh active tree row highlighting
    renderTree(treeSearch.value.trim().toLowerCase());

    const ext = path.split('.').pop().toLowerCase();
    const imgExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];
    const textExts = ['txt', 'json', 'js', 'ts', 'html', 'css', 'md', 'xml', 'env', 'yml', 'yaml'];

    try {
      previewArea.innerHTML = `<div class="text-xs font-mono text-neutral-500">Loading preview...</div>`;

      if (imgExts.includes(ext)) {
        // Image Preview Handler
        const base64 = await fileEntry.async('base64');
        const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
        previewArea.innerHTML = `<img src="data:${mime};base64,${base64}" class="max-h-full max-w-full object-contain rounded border border-neutral-800" />`;
      } else if (textExts.includes(ext)) {
        // Text/Code Preview Handler
        const textContent = await fileEntry.async('string');
        const escaped = textContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        previewArea.innerHTML = `<pre class="w-full h-full font-mono text-xs text-neutral-300 overflow-auto bg-neutral-900/50 p-4 rounded border border-neutral-800/80 leading-relaxed"><code>${escaped}</code></pre>`;
      } else {
        // Fallback for Unsupported/Binary Files
        previewArea.innerHTML = `
          <div class="text-center font-mono">
            <i data-lucide="file-binary" class="w-10 h-10 mx-auto text-neutral-600 mb-2"></i>
            <p class="text-xs text-neutral-400">Binary or non-previewable file format.</p>
            <p class="text-[10px] text-neutral-600 mt-1">Use the extract button above to download this file directly.</p>
          </div>
        `;
        lucide.createIcons();
      }
    } catch (err) {
      console.error(err);
      previewArea.innerHTML = `<div class="text-xs font-mono text-red-400">Failed to render file preview.</div>`;
    }
  }

  // Single File Extraction Trigger
  extractBtn.addEventListener('click', async () => {
    if (!loadedZip || !activeEntryPath) return;

    const fileEntry = loadedZip.file(activeEntryPath);
    if (!fileEntry) return;

    const blob = await fileEntry.async('blob');
    const url = URL.createObjectURL(blob);
    const fileName = activeEntryPath.split('/').pop() || 'extracted_file';

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    // Clean up memory
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
});