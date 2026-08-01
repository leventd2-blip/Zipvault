document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();

  const dropZone = document.getElementById('dropZone');
  const zipInput = document.getElementById('zipInput');
  const fileTree = document.getElementById('fileTree');
  const archiveMeta = document.getElementById('archiveMeta');
  const archiveName = document.getElementById('archiveName');
  const archiveSize = document.getElementById('archiveSize');
  const archiveEntries = document.getElementById('archiveEntries');
  const previewPath = document.getElementById('previewPath');
  const previewArea = document.getElementById('previewArea');
  const extractBtn = document.getElementById('extractBtn');
  const treeSearch = document.getElementById('treeSearch');
  
  // Modal Elements
  const uploadSuccessModal = document.getElementById('uploadSuccessModal');
  const modalSuccessText = document.getElementById('modalSuccessText');
  const closeModalBtn = document.getElementById('closeModalBtn');

  // Stats Dashboard Elements
  const viewExtraInfoBtn = document.getElementById('viewExtraInfoBtn');
  const statsModal = document.getElementById('statsModal');
  const closeStatsBtn = document.getElementById('closeStatsBtn');
  const closeStatsFooterBtn = document.getElementById('closeStatsFooterBtn');
  const statFilesCount = document.getElementById('statFilesCount');
  const statFoldersCount = document.getElementById('statFoldersCount');
  const statCompressedSize = document.getElementById('statCompressedSize');
  const statLargestFiles = document.getElementById('statLargestFiles');

  let currentZipFiles = {};
  let selectedFileEntry = null;
  let selectedFileName = '';
  let archiveStatsData = { files: 0, folders: 0, sizeText: '0 KB', largest: [] };

  // Trigger file browser on dropzone click
  dropZone.addEventListener('click', () => zipInput.click());

  // Drag and drop events
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-indigo-500', 'bg-indigo-500/10');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-indigo-500', 'bg-indigo-500/10');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-indigo-500', 'bg-indigo-500/10');
    if (e.dataTransfer.files.length) {
      handleZipFile(e.dataTransfer.files[0]);
    }
  });

  zipInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      handleZipFile(e.target.files[0]);
    }
  });

  // Modal event controls
  closeModalBtn.addEventListener('click', () => {
    uploadSuccessModal.classList.add('hidden');
  });

  viewExtraInfoBtn.addEventListener('click', () => {
    openStatsDashboard();
  });

  closeStatsBtn.addEventListener('click', () => {
    statsModal.classList.add('hidden');
  });

  closeStatsFooterBtn.addEventListener('click', () => {
    statsModal.classList.add('hidden');
  });

  function openStatsDashboard() {
    statFilesCount.textContent = archiveStatsData.files;
    statFoldersCount.textContent = archiveStatsData.folders;
    statCompressedSize.textContent = archiveStatsData.sizeText;

    if (archiveStatsData.largest.length > 0) {
      statLargestFiles.innerHTML = archiveStatsData.largest.map(file => `
        <div class="flex items-center justify-between py-1 border-b border-zinc-800/40 last:border-0">
          <span class="text-zinc-300 truncate max-w-[300px]">${file.name}</span>
          <span class="text-indigo-400 font-medium">${file.size}</span>
        </div>
      `).join('');
    } else {
      statLargestFiles.innerHTML = `<p class="text-zinc-600 text-center py-2">No file metrics available.</p>`;
    }

    statsModal.classList.remove('hidden');
    lucide.createIcons();
  }

  async function handleZipFile(file) {
    try {
      const startTime = performance.now();

      archiveName.textContent = file.name;
      const formattedSize = `${(file.size / 1024).toFixed(1)} KB`;
      archiveSize.textContent = formattedSize;
      archiveMeta.classList.remove('hidden');

      const zip = new JSZip();
      const content = await zip.loadAsync(file);
      currentZipFiles = content.files;

      let fileCount = 0;
      let folderCount = 0;
      let fileSizesList = [];

      // Loop and inspect all items asynchronously to collect sizing data
      for (const filename of Object.keys(currentZipFiles)) {
        const entry = currentZipFiles[filename];
        if (entry.dir) {
          folderCount++;
        } else {
          fileCount++;
          try {
            // Attempt to get uncompressed size from entry if available, fallback to blob length
            const blob = await entry.async('blob');
            fileSizesList.push({ name: filename, sizeBytes: blob.size, size: `${(blob.size / 1024).toFixed(1)} KB` });
          } catch (e) {
            fileSizesList.push({ name: filename, sizeBytes: 0, size: '0 KB' });
          }
        }
      }

      // Sort files by size descending to find the largest items
      fileSizesList.sort((a, b) => b.sizeBytes - a.sizeBytes);

      archiveEntries.textContent = fileCount;

      // Store stats data for dashboard modal
      archiveStatsData = {
        files: fileCount,
        folders: folderCount,
        sizeText: formattedSize,
        largest: fileSizesList.slice(0, 5) // Top 5 largest files
      };

      const endTime = performance.now();
      const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);

      modalSuccessText.textContent = `ZipVault successfully detected ${fileCount} files and ${folderCount} folders in ${durationSeconds} seconds.`;
      uploadSuccessModal.classList.remove('hidden');
      lucide.createIcons();

      buildAndRenderTree(currentZipFiles);
    } catch (err) {
      alert('Failed to parse ZIP archive. Ensure it is a valid .zip file.');
      console.error(err);
    }
  }

  function buildAndRenderTree(filesObj, filterText = '') {
    fileTree.innerHTML = '';
    const root = { name: '', type: 'folder', children: {}, path: '' };

    Object.keys(filesObj).forEach(relativePath => {
      const zipEntry = filesObj[relativePath];
      if (zipEntry.dir) return;

      if (filterText && !relativePath.toLowerCase().includes(filterText.toLowerCase())) {
        return;
      }

      const parts = relativePath.split('/');
      let currentNode = root;

      parts.forEach((part, index) => {
        if (!part) return;
        const isFile = index === parts.length - 1;
        const currentPath = parts.slice(0, index + 1).join('/');

        if (!currentNode.children[part]) {
          currentNode.children[part] = {
            name: part,
            type: isFile ? 'file' : 'folder',
            path: currentPath,
            children: {},
            entry: isFile ? zipEntry : null
          };
        }
        currentNode = currentNode.children[part];
      });
    });

    renderNode(root, fileTree);
    lucide.createIcons();
  }

  function renderNode(node, container) {
    const sortedKeys = Object.keys(node.children).sort((a, b) => {
      const aIsFolder = node.children[a].type === 'folder';
      const bIsFolder = node.children[b].type === 'folder';
      return bIsFolder - aIsFolder || a.localeCompare(b);
    });

    sortedKeys.forEach(key => {
      const child = node.children[key];
      const itemEl = document.createElement('div');
      itemEl.className = 'flex flex-col';

      if (child.type === 'folder') {
        itemEl.innerHTML = `
          <div class="folder-toggle flex items-center gap-1.5 py-1 px-2 hover:bg-zinc-800/60 rounded cursor-pointer text-zinc-300 transition-colors">
            <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-zinc-500 transition-transform duration-200"></i>
            <i data-lucide="folder" class="w-3.5 h-3.5 text-indigo-400"></i>
            <span class="truncate">${child.name}</span>
          </div>
          <div class="folder-contents pl-4 hidden flex-col space-y-0.5 border-l border-zinc-800/50 ml-2 mt-0.5"></div>
        `;
        
        const toggleRow = itemEl.querySelector('.folder-toggle');
        const contentsContainer = itemEl.querySelector('.folder-contents');
        const chevron = toggleRow.querySelector('[data-lucide="chevron-right"]');

        toggleRow.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = !contentsContainer.classList.contains('hidden');
          if (isOpen) {
            contentsContainer.classList.add('hidden');
            chevron.style.transform = 'rotate(0deg)';
          } else {
            contentsContainer.classList.remove('hidden');
            chevron.style.transform = 'rotate(90deg)';
          }
        });

        renderNode(child, contentsContainer);
      } else {
        itemEl.innerHTML = `
          <div class="file-item flex items-center gap-1.5 py-1 px-2 hover:bg-indigo-500/10 hover:text-indigo-300 rounded cursor-pointer text-zinc-400 transition-colors">
            <i data-lucide="file" class="w-3.5 h-3.5 text-zinc-500 ml-5"></i>
            <span class="truncate">${child.name}</span>
          </div>
        `;
        
        const fileRow = itemEl.querySelector('.file-item');
        fileRow.addEventListener('click', () => {
          document.querySelectorAll('.file-item').forEach(el => el.classList.remove('bg-indigo-500/20', 'text-indigo-200'));
          fileRow.classList.add('bg-indigo-500/20', 'text-indigo-200');
          previewFile(child.entry, child.path);
        });
      }

      container.appendChild(itemEl);
    });
  }

  treeSearch.addEventListener('input', (e) => {
    buildAndRenderTree(currentZipFiles, e.target.value);
  });

  async function previewFile(entry, path) {
    selectedFileEntry = entry;
    selectedFileName = path;
    previewPath.textContent = path;
    extractBtn.classList.remove('hidden');
    extractBtn.removeAttribute('disabled');

    try {
      const ext = path.split('.').pop().toLowerCase();
      const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];

      if (imageExtensions.includes(ext)) {
        const blob = await entry.async('blob');
        const url = URL.createObjectURL(blob);
        previewArea.innerHTML = `<img src="${url}" class="max-h-full max-w-full object-contain rounded border border-zinc-800 shadow-lg" alt="${path}" />`;
      } else {
        const text = await entry.async('text');
        previewArea.innerHTML = `<pre class="w-full h-full font-mono text-xs text-zinc-300 whitespace-pre-wrap overflow-auto">${escapeHtml(text)}</pre>`;
      }
    } catch (err) {
      previewArea.innerHTML = `<p class="text-rose-400 text-xs font-mono">Failed to load preview for this file format.</p>`;
    }
  }

  extractBtn.addEventListener('click', async () => {
    if (!selectedFileEntry) return;
    try {
      const blob = await selectedFileEntry.async('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFileName.split('/').pop();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download file.');
    }
  });

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
});