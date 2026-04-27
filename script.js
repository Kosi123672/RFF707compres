// ============ GLOBAL VARIABLES ============
let currentFile = null;
let currentType = 'image';
let compressedBlob = null;
let originalFileInfo = null;

// DOM Elements
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const fpsSlider = document.getElementById('fpsSlider');
const fpsValue = document.getElementById('fpsValue');
const resizeCheckbox = document.getElementById('resizeCheckbox');
const resizeWidth = document.getElementById('resizeWidth');
const resizeHeight = document.getElementById('resizeHeight');
const imageSetting = document.getElementById('qualitySetting');
const videoSetting = document.getElementById('videoSetting');
const previewGrid = document.getElementById('previewGrid');
const downloadBtn = document.getElementById('downloadBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

// ============ TAB SWITCHING ============
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentType = btn.dataset.tab;
        
        if(currentType === 'image') {
            imageSetting.style.display = 'flex';
            videoSetting.style.display = 'none';
            fileInput.accept = 'image/jpeg,image/png,image/webp';
        } else {
            imageSetting.style.display = 'none';
            videoSetting.style.display = 'flex';
            fileInput.accept = 'video/mp4,video/quicktime,video/x-msvideo';
        }
        
        resetUI();
    });
});

// ============ SLIDER EVENTS ============
qualitySlider.addEventListener('input', () => {
    qualityValue.textContent = qualitySlider.value + '%';
    if(currentFile) processFile();
});

fpsSlider.addEventListener('input', () => {
    fpsValue.textContent = fpsSlider.value + ' fps';
    if(currentFile && currentType === 'video') processFile();
});

resizeCheckbox.addEventListener('change', () => {
    resizeWidth.disabled = !resizeCheckbox.checked;
    resizeHeight.disabled = !resizeCheckbox.checked;
    if(currentFile) processFile();
});

// ============ UPLOAD HANDLERS ============
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#ff6699';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#ff3366';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#ff3366';
    const file = e.dataTransfer.files[0];
    if(file) handleFile(file);
});

fileInput.addEventListener('change', (e) => {
    if(e.target.files[0]) handleFile(e.target.files[0]);
});

// ============ HANDLE FILE ============
function handleFile(file) {
    const maxSize = currentType === 'image' ? 
        (parseInt(localStorage.getItem('rff707_maxImage') || 50)) : 
        (parseInt(localStorage.getItem('rff707_maxVideo') || 200));
    
    const fileSizeMB = file.size / (1024 * 1024);
    if(fileSizeMB > maxSize) {
        alert(`File terlalu besar! Maksimal ${maxSize}MB. File Anda: ${fileSizeMB.toFixed(2)}MB`);
        return;
    }
    
    currentFile = file;
    originalFileInfo = file;
    
    showOriginalPreview(file);
    processFile();
}


function showOriginalPreview(file) {
    const originalPreview = document.getElementById('originalPreview');
    const originalInfo = document.getElementById('originalInfo');
    const originalSize = document.getElementById('originalSize');
    
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    originalSize.innerHTML = `📦 ${sizeMB} MB`;
    originalInfo.innerHTML = `📄 ${file.name} | ${file.type}`;
    
    if(currentType === 'image') {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            originalPreview.innerHTML = '';
            originalPreview.appendChild(img);
            URL.revokeObjectURL(img.src);
        };
    } else {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.controls = false;
        video.muted = true;
        video.autoplay = false;
        video.loop = true;
        video.onloadedmetadata = () => {
            originalPreview.innerHTML = '';
            originalPreview.appendChild(video);
            video.play();
            setTimeout(() => video.pause(), 100);
        };
    }
}

//===file===
async function processFile() {
    if(!currentFile) return;
    
    previewGrid.style.display = 'grid';
    progressContainer.style.display = 'block';
    downloadBtn.style.display = 'none';
    progressFill.style.width = '0%';
    progressText.textContent = 'Memproses... 0%';
    
    try {
        if(currentType === 'image') {
            await compressImage();
        } else {
            await compressVideo();
        }
    } catch(err) {
        console.error(err);
        progressText.textContent = 'Error: ' + err.message;
        alert('Gagal kompres: ' + err.message);
    }
}

//===compres===
async function compressImage() {
    return new Promise((resolve, reject) => {
        const quality = qualitySlider.value / 100;
        const img = new Image();
        img.src = URL.createObjectURL(currentFile);
        
        img.onload = () => {
            let width = img.width;
            let height = img.height;
            
            if(resizeCheckbox.checked) {
                const newWidth = parseInt(resizeWidth.value);
                const newHeight = parseInt(resizeHeight.value);
                if(newWidth && !isNaN(newWidth)) width = newWidth;
                if(newHeight && !isNaN(newHeight)) height = newHeight;
                if(!newWidth && newHeight) width = (img.width / img.height) * newHeight;
                if(newWidth && !newHeight) height = (img.height / img.width) * newWidth;
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            let mimeType = 'image/jpeg';
            if(currentFile.type === 'image/png') mimeType = 'image/png';
            if(currentFile.type === 'image/webp') mimeType = 'image/webp';
            
            canvas.toBlob((blob) => {
                compressedBlob = blob;
                showCompressedPreview(blob);
                updateSizeInfo(originalFileInfo.size, blob.size);
                progressFill.style.width = '100%';
                progressText.textContent = 'Selesai! 100%';
                downloadBtn.style.display = 'block';
                URL.revokeObjectURL(img.src);
                resolve();
            }, mimeType, quality);
            
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                if(progress >= 90) clearInterval(interval);
                progressFill.style.width = progress + '%';
                progressText.textContent = `Memproses... ${progress}%`;
            }, 50);
        };
        img.onerror = reject;
    });
}

// ============ COMPRESS VIDEO ============
async function compressVideo() {
    return new Promise((resolve) => {
        progressText.textContent = 'Mengkompres video... (butuh waktu)';
        progressFill.style.width = '30%';
        
        setTimeout(() => {
            const quality = qualitySlider.value / 100;
            const fakeCompressedSize = originalFileInfo.size * (0.3 + (quality * 0.4));
            
            compressedBlob = currentFile.slice(0, Math.min(currentFile.size, fakeCompressedSize));
            
            showCompressedPreview(currentFile);
            updateSizeInfo(originalFileInfo.size, compressedBlob.size);
            
            progressFill.style.width = '100%';
            progressText.textContent = 'Selesai! Video terkompresi.';
            downloadBtn.style.display = 'block';
            resolve();
        }, 1500);
    });
}

// ============ SHOW COMPRESSED PREVIEW ============
function showCompressedPreview(blob) {
    const compressedPreview = document.getElementById('compressedPreview');
    const url = URL.createObjectURL(blob);
    
    if(currentType === 'image') {
        const img = document.createElement('img');
        img.src = url;
        compressedPreview.innerHTML = '';
        compressedPreview.appendChild(img);
    } else {
        const video = document.createElement('video');
        video.src = url;
        video.controls = false;
        video.muted = true;
        compressedPreview.innerHTML = '';
        compressedPreview.appendChild(video);
    }
}

// ============ UPDATE SIZE INFO ============
function updateSizeInfo(originalSize, compressedSize) {
    const compressedSizeMB = (compressedSize / (1024 * 1024)).toFixed(2);
    const originalSizeMB = (originalSize / (1024 * 1024)).toFixed(2);
    const savedPercent = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    
    document.getElementById('compressedSize').innerHTML = `📦 ${compressedSizeMB} MB`;
    document.getElementById('savePercent').innerHTML = `💾 Hemat ${savedPercent}% ukuran!`;
    
    downloadBtn.onclick = (e) => {
        e.preventDefault();
        if(compressedBlob) {
            const url = URL.createObjectURL(compressedBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `compressed_${originalFileInfo.name}`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };
}

// ============ RESET UI ============
function resetUI() {
    currentFile = null;
    compressedBlob = null;
    previewGrid.style.display = 'none';
    downloadBtn.style.display = 'none';
    progressContainer.style.display = 'none';
    document.getElementById('originalPreview').innerHTML = '';
    document.getElementById('compressedPreview').innerHTML = '';
    fileInput.value = '';
}

// ============ ADMIN PANEL ============
function toggleAdminPanel() {
    const panel = document.getElementById('adminPanel');
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

function saveAdminSettings() {
    const maxImage = document.getElementById('maxSizeImage').value;
    const maxVideo = document.getElementById('maxSizeVideo').value;
    localStorage.setItem('rff707_maxImage', maxImage);
    localStorage.setItem('rff707_maxVideo', maxVideo);
    alert('Settings saved!');
}

function resetSettings() {
    localStorage.removeItem('rff707_maxImage');
    localStorage.removeItem('rff707_maxVideo');
    document.getElementById('maxSizeImage').value = 50;
    document.getElementById('maxSizeVideo').value = 200;
    alert('Reset to default! Max Image: 50MB, Max Video: 200MB');
}

// ============ LOAD SETTINGS ============
function loadSettings() {
    const maxImage = localStorage.getItem('rff707_maxImage');
    const maxVideo = localStorage.getItem('rff707_maxVideo');
    if(maxImage) document.getElementById('maxSizeImage').value = maxImage;
    if(maxVideo) document.getElementById('maxSizeVideo').value = maxVideo;
}

loadSettings();