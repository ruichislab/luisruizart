import { LayerManager } from './layers.js';

class EditorApp {
    constructor() {
        this.wrapper = document.getElementById('canvas-wrapper');
        this.layerManager = new LayerManager(this.wrapper);

        // Default Size
        this.width = 800;
        this.height = 600;
        this.layerManager.setSize(this.width, this.height);

        // Initial Layer
        this.layerManager.addLayer('Background');

        // State
        this.painting = false;
        this.tool = 'brush';
        this.color = '#00ffff';
        this.size = 5;
        this.lastX = 0;
        this.lastY = 0;

        // Tool Settings
        this.tools = {
            brush: { name: 'Brush' },
            eraser: { name: 'Eraser' },
            netweaver: { name: 'Net-Weaver' },
            cyberflow: { name: 'Cyber-Flow' },
            glitch: { name: 'Glitch-Drag' },
            fractal: { name: 'Fractal-Dust' }
        };

        this.bindUI();
        this.bindEvents();

        // Initialize Animation Loop for generative brushes
        this.animate();
    }

    bindUI() {
        // Size Inputs
        const wInput = document.getElementById('canvas-width');
        const hInput = document.getElementById('canvas-height');
        const resizeBtn = document.getElementById('btn-resize');

        if(wInput && hInput && resizeBtn) {
            wInput.value = this.width;
            hInput.value = this.height;
            resizeBtn.onclick = () => {
                this.width = parseInt(wInput.value);
                this.height = parseInt(hInput.value);
                this.layerManager.setSize(this.width, this.height);
                this.centerCanvas();
            };
        }

        // Tools
        Object.keys(this.tools).forEach(key => {
            const btn = document.getElementById(`btn-${key}`);
            if (btn) {
                btn.onclick = () => this.setTool(key, btn);
            }
        });

        // Properties
        document.getElementById('size-picker').oninput = (e) => this.size = parseInt(e.target.value);
        document.getElementById('color-picker').oninput = (e) => this.color = e.target.value;

        // Layer Controls
        document.getElementById('btn-add-layer').onclick = () => this.layerManager.addLayer();

        const btnClear = document.getElementById('btn-clear-layer');
        if(btnClear) btnClear.onclick = () => this.layerManager.clearActiveLayer();

        const btnUndo = document.getElementById('btn-undo');
        if(btnUndo) btnUndo.onclick = () => this.layerManager.undo();

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                this.layerManager.undo();
            }
        });

        // Filters
        document.getElementById('btn-invert').onclick = () => this.applyFilter('invert');
        document.getElementById('btn-grayscale').onclick = () => this.applyFilter('grayscale');
        document.getElementById('btn-rgb-split').onclick = () => this.applyFilter('rgb-split');
        document.getElementById('btn-pixelate').onclick = () => this.applyFilter('pixelate');

        // Export
        document.getElementById('btn-save').onclick = () => this.exportImage();
    }

    bindEvents() {
        // Mouse/Touch on Wrapper
        this.wrapper.addEventListener('mousedown', this.startPosition.bind(this));
        this.wrapper.addEventListener('touchstart', (e) => { e.preventDefault(); this.startPosition(e); });

        window.addEventListener('mouseup', this.endPosition.bind(this));
        window.addEventListener('touchend', this.endPosition.bind(this));

        window.addEventListener('mousemove', this.draw.bind(this));
        window.addEventListener('touchmove', (e) => { e.preventDefault(); this.draw(e); });
    }

    setTool(name, btn) {
        this.tool = name;
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
    }

    getPos(e) {
        const rect = this.wrapper.getBoundingClientRect();
        const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
        const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    startPosition(e) {
        this.painting = true;
        this.netWeaverPoints = []; // Reset for new stroke

        // Save state for undo
        this.layerManager.saveState();

        const pos = this.getPos(e);
        this.lastX = pos.x;
        this.lastY = pos.y;
        this.draw(e);

        // Hide drop hint
        const dropZone = document.getElementById('drop-zone');
        if(dropZone) dropZone.classList.add('hidden');
    }

    endPosition() {
        this.painting = false;
        const layer = this.layerManager.getActiveLayer();
        if (layer) layer.ctx.beginPath();
    }

    draw(e) {
        if (!this.painting) return;

        const pos = this.getPos(e);
        const x = pos.x;
        const y = pos.y;

        const layer = this.layerManager.getActiveLayer();
        if (!layer || !layer.visible) return;
        const ctx = layer.ctx;

        ctx.lineWidth = this.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Brush Implementation
        if (this.tool === 'brush') {
            ctx.strokeStyle = this.color;
            ctx.globalCompositeOperation = 'source-over';
            ctx.beginPath();
            ctx.moveTo(this.lastX, this.lastY);
            ctx.lineTo(x, y);
            ctx.stroke();
        } else if (this.tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.moveTo(this.lastX, this.lastY);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over'; // reset
        } else if (this.tool === 'netweaver') {
            this.drawNetWeaver(ctx, x, y);
        } else if (this.tool === 'cyberflow') {
            this.drawCyberFlow(ctx, x, y);
        } else if (this.tool === 'glitch') {
            this.drawGlitchDrag(ctx, x, y);
        } else if (this.tool === 'fractal') {
            this.drawFractalDust(ctx, x, y);
        }

        this.lastX = x;
        this.lastY = y;
    }

    // --- Generative Tools ---

    drawNetWeaver(ctx, x, y) {
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.globalCompositeOperation = 'source-over';

        // 1. Draw node
        ctx.beginPath();
        ctx.arc(x, y, Math.random() * this.size/2, 0, Math.PI*2);
        ctx.fill();

        // 2. Connect to random nearby points in history (simulated by looking at canvas?)
        // Looking at canvas pixels is slow. Let's keep a local "recent points" buffer for this stroke.
        if (!this.netWeaverPoints) this.netWeaverPoints = [];

        this.netWeaverPoints.push({x, y});
        if (this.netWeaverPoints.length > 50) this.netWeaverPoints.shift();

        ctx.lineWidth = 1;
        this.netWeaverPoints.forEach(p => {
            const dx = p.x - x;
            const dy = p.y - y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < 100 && Math.random() > 0.8) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            }
        });
    }

    drawCyberFlow(ctx, x, y) {
        // Fluid-like trails
        ctx.strokeStyle = this.color;
        ctx.globalCompositeOperation = 'screen'; // Glowy look

        const particles = 5;
        for(let i=0; i<particles; i++) {
            const offset = (Math.random() - 0.5) * this.size * 2;
            const angle = Math.random() * Math.PI * 2;

            const px = x + Math.cos(angle) * offset;
            const py = y + Math.sin(angle) * offset;

            ctx.lineWidth = Math.random() * 2;
            ctx.beginPath();
            ctx.moveTo(this.lastX, this.lastY);

            // Bezier curve towards mouse
            const cp1x = this.lastX + (Math.random()-0.5)*50;
            const cp1y = this.lastY + (Math.random()-0.5)*50;

            ctx.quadraticCurveTo(cp1x, cp1y, px, py);
            ctx.stroke();
        }
    }

    drawGlitchDrag(ctx, x, y) {
        // Smudge / Displacement
        const w = this.size * 4;
        const h = this.size * 4;

        // Copy a chunk from nearby and paste it here
        const sx = x + (Math.random()-0.5) * 50;
        const sy = y + (Math.random()-0.5) * 50;

        try {
            // This operation is heavy if done every move, might need throttling
            const data = ctx.getImageData(sx, sy, w, h);

            // Manipulate pixels? Maybe RGB shift
            const d = data.data;
            for(let i=0; i<d.length; i+=4) {
                if (i % 20 === 0) {
                    d[i] = 255; // Add red noise
                }
            }

            ctx.putImageData(data, x - w/2, y - h/2);
        } catch(e) {
            // Off canvas read might fail
        }
    }

    drawFractalDust(ctx, x, y) {
        ctx.fillStyle = this.color;
        ctx.globalCompositeOperation = 'lighter';

        const recursiveDraw = (bx, by, size, depth) => {
            if (depth <= 0) return;

            ctx.fillRect(bx, by, size, size);

            if (Math.random() > 0.5) {
                const offset = size * 2;
                recursiveDraw(bx + (Math.random()-0.5)*offset, by + (Math.random()-0.5)*offset, size*0.6, depth-1);
            }
        };

        recursiveDraw(x, y, this.size, 3);
    }

    applyFilter(name) {
        const layer = this.layerManager.getActiveLayer();
        if (!layer) return;
        const ctx = layer.ctx;
        const w = layer.canvas.width;
        const h = layer.canvas.height;

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        if (name === 'invert') {
            for(let i=0; i<data.length; i+=4) {
                data[i] = 255 - data[i];
                data[i+1] = 255 - data[i+1];
                data[i+2] = 255 - data[i+2];
            }
            ctx.putImageData(imgData, 0, 0);
        } else if (name === 'grayscale') {
            for(let i=0; i<data.length; i+=4) {
                const avg = (data[i] + data[i+1] + data[i+2]) / 3;
                data[i] = avg;
                data[i+1] = avg;
                data[i+2] = avg;
            }
            ctx.putImageData(imgData, 0, 0);
        } else if (name === 'rgb-split') {
            // Need a copy of source
            const source = new Uint8ClampedArray(data);
            const offset = 10; // Pixel offset

            for(let i=0; i<data.length; i+=4) {
                // Red channel: shift left
                const rIdx = i - offset * 4;
                if (rIdx >= 0) data[i] = source[rIdx];

                // Blue channel: shift right
                const bIdx = i + offset * 4;
                if (bIdx < data.length) data[i+2] = source[bIdx+2];

                // Green stays
            }
            ctx.putImageData(imgData, 0, 0);
        } else if (name === 'pixelate') {
            const size = 10;
            // Create temporary canvas to downscale then upscale
            const temp = document.createElement('canvas');
            temp.width = w / size;
            temp.height = h / size;
            const tctx = temp.getContext('2d');

            tctx.drawImage(layer.canvas, 0, 0, temp.width, temp.height);

            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(temp, 0, 0, w, h);
            ctx.imageSmoothingEnabled = true;
        }
    }

    exportImage() {
        const comp = this.layerManager.getCompositeCanvas();
        const link = document.createElement('a');
        link.download = 'aether-artifact-' + Date.now() + '.png';
        link.href = comp.toDataURL();
        link.click();
    }

    centerCanvas() {
         // CSS handles centering in flex container usually
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        // Can add animated effects here if needed (e.g. "Wet" paint drying)
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    window.app = new EditorApp();
});
