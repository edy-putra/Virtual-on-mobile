// State management
let state = {
    productImage: null,
    modelImage: null,
    pose: null,
    selfieSegmentation: null
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    // Setup file uploads
    setupFileUploads();
    
    // Load AI models
    await loadAIModels();
    
    console.log('✅ App initialized successfully!');
}

function setupFileUploads() {
    const productUpload = document.querySelector('#productUpload input');
    const modelUpload = document.querySelector('#modelUpload input');
    
    // Product upload click handler
    document.getElementById('productUpload').addEventListener('click', () => {
        productUpload.click();
    });
    
    // Model upload click handler  
    document.getElementById('modelUpload').addEventListener('click', () => {
        modelUpload.click();
    });
    
    // File change handlers
    productUpload.addEventListener('change', handleProductUpload);
    modelUpload.addEventListener('change', handleModelUpload);
}

function handleProductUpload(event) {
    const file = event.target.files[0];
    if (file) {
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
    }
}

function handleModelUpload(event) {
    const file = event.target.files[0];
    if (file) {
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
    }
}

function checkReadyState() {
    const processBtn = document.getElementById('processBtn');
    if (state.productImage && state.modelImage) {
        processBtn.disabled = false;
    }
}

async function loadAIModels() {
    try {
        // Load Pose Detection
        state.pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }
        });
        
        state.pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        
        // Load Selfie Segmentation
        state.selfieSegmentation = new SelfieSegmentation({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
            }
        });
        
        state.selfieSegmentation.setOptions({
            modelSelection: 1,
        });
        
        console.log('✅ AI Models loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading AI models:', error);
        alert('Gagal load AI models. Cek koneksi internet!');
    }
}

// Process button handler
document.getElementById('processBtn').addEventListener('click', processTryOn);

async function processTryOn() {
    const loading = document.getElementById('loading');
    const processBtn = document.getElementById('processBtn');
    const canvas = document.getElementById('resultCanvas');
    const downloadBtn = document.getElementById('downloadBtn');
    
    // Show loading
    loading.style.display = 'block';
    processBtn.disabled = true;
    
    try {
        // Setup canvas
        canvas.width = state.modelImage.width;
        canvas.height = state.modelImage.height;
        const ctx = canvas.getContext('2d');
        
        // Draw model image first
        ctx.drawImage(state.modelImage, 0, 0, canvas.width, canvas.height);
        
        // Get pose landmarks
        const poseResults = await new Promise((resolve) => {
            state.pose.onResults(resolve);
            state.pose.send({image: state.modelImage});
        });
        
        if (poseResults.poseLandmarks) {
            // Simple placement based on pose landmarks
            placeProductSimple(ctx, poseResults.poseLandmarks);
        } else {
            // Fallback: center placement
            placeProductCenter(ctx);
        }
        
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
        alert('Error processing images. Coba lagi!');
    } finally {
        loading.style.display = 'none';
        processBtn.disabled = false;
    }
}

function placeProductSimple(ctx, landmarks) {
    // Simple algorithm for product placement
    const leftShoulder = landmarks[11]; // MediaPipe indices
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    
    if (leftShoulder && rightShoulder && leftHip) {
        const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x) * ctx.canvas.width;
        const torsoHeight = Math.abs(leftHip.y - leftShoulder.y) * ctx.canvas.height;
        
        const x = (leftShoulder.x * ctx.canvas.width) - (shoulderWidth * 0.1);
        const y = leftShoulder.y * ctx.canvas.height;
        const width = shoulderWidth * 1.2;
        const height = (state.productImage.height / state.productImage.width) * width;
        
        ctx.drawImage(state.productImage, x, y, width, height);
    } else {
        placeProductCenter(ctx);
    }
}

function placeProductCenter(ctx) {
    // Fallback center placement
    const width = ctx.canvas.width * 0.6;
    const height = (state.productImage.height / state.productImage.width) * width;
    const x = (ctx.canvas.width - width) / 2;
    const y = (ctx.canvas.height - height) / 2;
    
    ctx.drawImage(state.productImage, x, y, width, height);
}
