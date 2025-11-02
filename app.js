// State management
let state = {
    productImage: null,
    modelImage: null,
    isProcessing: false,
    tf: null
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Starting AI Virtual Try-On...');
    await initializeApp();
});

async function initializeApp() {
    try {
        // Load TensorFlow.js dari CDN
        await loadTensorFlow();
        setupFileUploads();
        console.log('✅ AI App initialized successfully!');
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        fallbackToSimpleMode();
    }
}

async function loadTensorFlow() {
    // Load TensorFlow.js dari CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.18.0/dist/tf.min.js';
    document.head.appendChild(script);
    
    return new Promise((resolve, reject) => {
        script.onload = () => {
            state.tf = tf;
            console.log('✅ TensorFlow.js loaded!');
            resolve();
        };
        script.onerror = reject;
    });
}

function setupFileUploads() {
    const productUpload = document.querySelector('#productUpload input');
    const modelUpload = document.querySelector('#modelUpload input');
    
    document.getElementById('productUpload').addEventListener('click', () => productUpload.click());
    document.getElementById('modelUpload').addEventListener('click', () => modelUpload.click());
    
    productUpload.addEventListener('change', handleProductUpload);
    modelUpload.addEventListener('change', handleModelUpload);
}

function handleProductUpload(event) {
    if (state.isProcessing) return;
    
    const file = event.target.files[0];
    if (file && file.size < 2 * 1024 * 1024) { // Max 2MB
        const reader = new FileReader();
        reader.onload = function(e) {
            state.productImage = new Image();
            state.productImage.onload = function() {
                document.querySelector('#productUpload span').textContent = '✅ Produk Siap';
                checkReadyState();
            };
            state.productImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        alert('Gambar produk maksimal 2MB!');
    }
}

function handleModelUpload(event) {
    if (state.isProcessing) return;
    
    const file = event.target.files[0];
    if (file && file.size < 2 * 1024 * 1024) { // Max 2MB
        const reader = new FileReader();
        reader.onload = function(e) {
            state.modelImage = new Image();
            state.modelImage.onload = function() {
                document.querySelector('#modelUpload span').textContent = '✅ Model Siap';
                checkReadyState();
            };
            state.modelImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        alert('Gambar model maksimal 2MB!');
    }
}

function checkReadyState() {
    const processBtn = document.getElementById('processBtn');
    if (state.productImage && state.modelImage) {
        processBtn.disabled = false;
    }
}

// Process button handler
document.getElementById('processBtn').addEventListener('click', processTryOn);

async function processTryOn() {
    if (state.isProcessing) return;
    
    const loading = document.getElementById('loading');
    const processBtn = document.getElementById('processBtn');
    const canvas = document.getElementById('resultCanvas');
    const downloadBtn = document.getElementById('downloadBtn');
    
    // Show loading
    loading.style.display = 'block';
    processBtn.disabled = true;
    state.isProcessing = true;
    
    try {
        // Setup canvas
        const maxSize = 512; // Resize untuk performa
        const {width, height} = calculateAspectRatioFit(
            state.modelImage.width, 
            state.modelImage.height, 
            maxSize, 
            maxSize
        );
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Draw model image first (resized)
        ctx.drawImage(state.modelImage, 0, 0, width, height);
        
        // Simple AI Placement tanpa dependency external
        await placeProductSmart(ctx, width, height);
        
        // Show result
        canvas.style.display = 'block';
        downloadBtn.style.display = 'block';
        
        // Setup download
        downloadBtn.onclick = () => {
            const link = document.createElement('a');
            link.download = 'virtual-try-on-result.png';
            link.href = canvas.toDataURL();
            link.click();
        };
        
    } catch (error) {
        console.error('❌ Processing error:', error);
        // Fallback ke metode sederhana
        placeProductSimple(ctx);
    } finally {
        loading.style.display = 'none';
        processBtn.disabled = false;
        state.isProcessing = false;
    }
}

// AI Placement Algorithm Sederhana
async function placeProductSmart(ctx, canvasWidth, canvasHeight) {
    if (!state.tf) {
        throw new Error('TensorFlow not loaded');
    }
    
    // Gunakan computer vision sederhana untuk detect area tubuh
    const bodyAreas = detectBodyAreasSimple(ctx, canvasWidth, canvasHeight);
    
    // Tempatkan produk di area yang tepat
    if (bodyAreas.torso) {
        const {x, y, width, height} = bodyAreas.torso;
        
        // Calculate product size based on torso
        const productWidth = width * 1.1;
        const productHeight = (state.productImage.height / state.productImage.width) * productWidth;
        
        // Adjust position
        const productX = x - (productWidth - width) / 2;
        const productY = y - (productHeight - height) / 3;
        
        // Draw product dengan efek shadow
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        
        ctx.drawImage(state.productImage, productX, productY, productWidth, productHeight);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
    } else {
        // Fallback ke center placement
        placeProductCenter(ctx, canvasWidth, canvasHeight);
    }
}

// Simple Body Detection tanpa AI kompleks
function detectBodyAreasSimple(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Analisis sederhana untuk find torso area
    let skinPixels = [];
    let centerOfMass = {x: 0, y: 0, count: 0};
    
    // Simple skin detection (basic color range)
    for (let y = 0; y < height; y += 4) {
        for (let x = 0; x < width; x += 4) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Basic skin color detection
            if (isSkinColor(r, g, b)) {
                skinPixels.push({x, y});
                centerOfMass.x += x;
                centerOfMass.y += y;
                centerOfMass.count++;
            }
        }
    }
    
    if (centerOfMass.count > 10) {
        centerOfMass.x /= centerOfMass.count;
        centerOfMass.y /= centerOfMass.count;
        
        // Estimate torso area berdasarkan center of mass
        const torsoWidth = width * 0.3;
        const torsoHeight = height * 0.4;
        const torsoX = centerOfMass.x - torsoWidth / 2;
        const torsoY = centerOfMass.y - torsoHeight / 3;
        
        return {
            torso: {
                x: Math.max(0, torsoX),
                y: Math.max(0, torsoY),
                width: torsoWidth,
                height: torsoHeight
            }
        };
    }
    
    return null;
}

// Simple skin color detection
function isSkinColor(r, g, b) {
    // Basic skin color ranges (bisa disesuaikan)
    return (r > 95 && g > 40 && b > 20 && 
            Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
            Math.abs(r - g) > 15 && r > g && r > b);
}

function placeProductCenter(ctx, canvasWidth, canvasHeight) {
    const width = canvasWidth * 0.6;
    const height = (state.productImage.height / state.productImage.width) * width;
    const x = (canvasWidth - width) / 2;
    const y = (canvasHeight - height) / 2;
    
    ctx.drawImage(state.productImage, x, y, width, height);
}

function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight) {
    const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
    return {
        width: Math.round(srcWidth * ratio),
        height: Math.round(srcHeight * ratio)
    };
}

function fallbackToSimpleMode() {
    console.log('⚠️ Using fallback simple mode');
    // Override process function dengan yang sederhana
    document.getElementById('processBtn').onclick = function() {
        const canvas = document.getElementById('resultCanvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = state.modelImage.width;
        canvas.height = state.modelImage.height;
        
        ctx.drawImage(state.modelImage, 0, 0);
        placeProductCenter(ctx, canvas.width, canvas.height);
        
        canvas.style.display = 'block';
        document.getElementById('downloadBtn').style.display = 'block';
    };
}

// Service Worker Registration (sederhana)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('SW registered'))
        .catch(error => console.log('SW failed:', error));
}
