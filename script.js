const video = document.getElementById('source-video');
const canvas = document.getElementById('ascii-canvas');
const ctx = canvas.getContext('2d', { alpha: false });

// Hidden canvas for reading pixel data
const offscreenCanvas = document.createElement('canvas');
const offCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });

// ASCII characters sorted by brightness (darkest to lightest)
// Using a robust gradient that looks good for video
const density = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
const charCount = density.length;

let columns = 250;
let playing = false;
let animationFrameId;

// Handle auto-play explicitly just in case HTML attribute isn't enough on some browsers
video.addEventListener('loadeddata', () => {
    video.play().then(() => {
        playing = true;
        renderLoop();
    }).catch(err => console.error("Error playing video:", err));
});

// Also start loop if the video starts playing via autoplay
video.addEventListener('play', () => {
    if (!playing) {
        playing = true;
        renderLoop();
    }
});

video.addEventListener('pause', () => {
    playing = false;
    cancelAnimationFrame(animationFrameId);
});

function updateCanvasSize() {
    if (video.videoWidth === 0) return false;
    
    // Calculate aspect ratio
    const aspect = video.videoHeight / video.videoWidth;
    
    // Standard monospace font aspect ratio is roughly 0.5 (width to height)
    const fontAspect = 0.5;
    const rows = Math.floor(columns * aspect * fontAspect);
    
    // Set offscreen canvas to the low resolution for sampling
    offscreenCanvas.width = columns;
    offscreenCanvas.height = rows;
    
    // We'll scale the actual display canvas based on columns and a fixed cell size
    const cellWidth = 8;
    const cellHeight = 16;
    
    canvas.width = columns * cellWidth;
    canvas.height = rows * cellHeight;
    
    ctx.font = `${cellHeight}px monospace`;
    ctx.textBaseline = 'top';
    
    return true;
}

function renderFrame() {
    if (!updateCanvasSize()) return;

    const { width: ow, height: oh } = offscreenCanvas;
    
    // Draw current video frame to low-res offscreen canvas
    offCtx.drawImage(video, 0, 0, ow, oh);
    
    // Get pixel data
    const frame = offCtx.getImageData(0, 0, ow, oh);
    const data = frame.data;
    
    // Clear display canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const cellWidth = canvas.width / ow;
    const cellHeight = canvas.height / oh;

    // Draw characters to display canvas
    for (let y = 0; y < oh; y++) {
        for (let x = 0; x < ow; x++) {
            const index = (y * ow + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            
            // Calculate original luminance for character mapping
            const luminance = r * 0.299 + g * 0.587 + b * 0.114;
            
            // Map brightness to character index
            // We use original luminance so we don't blow out the character shapes
            const charIndex = Math.floor((luminance / 255) * (charCount - 1));
            const char = density[charIndex];
            
            // Draw colorful character
            if (char !== ' ') {
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.fillText(char, x * cellWidth, y * cellHeight);
            }
        }
    }
}

function renderLoop() {
    if (!playing) return;
    
    renderFrame();
    animationFrameId = requestAnimationFrame(renderLoop);
}
