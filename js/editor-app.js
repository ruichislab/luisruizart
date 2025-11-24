import { LayerManager } from './layers.js';
import { ProjectManager } from './project.js';
import { MagicWand } from './tools/magic-wand.js';
import { PaletteManager } from './palette.js';

class EditorApp {
    constructor() {
        this.wrapper = document.getElementById('canvas-wrapper');
        this.viewport = document.getElementById('canvas-viewport');

        // Core Systems
        this.layerManager = new LayerManager(this.wrapper);
        this.projectManager = new ProjectManager(this.layerManager, this.renderTimeline.bind(this));
        this.magicWand = new MagicWand(this.layerManager);
        this.paletteManager = new PaletteManager('palette-container', (c) => {
            this.color = c;
            document.getElementById('color-picker').value = c;
        });

        // Setup Canvas
        this.width = 800;
        this.height = 600;
        this.layerManager.setSize(this.width, this.height);

        // Ensure at least one layer exists
        if (this.layerManager.layers.length === 0) {
            this.layerManager.addLayer('Background');
        }

        // Update Project Manager with initial layer state
        this.projectManager.frames[0] = {
            layers: this.layerManager.layers.map(l => ({
                name: l.name,
                visible: l.visible,
                opacity: l.opacity,
                blendMode: l.blendMode,
                data: l.ctx.getImageData(0, 0, l.canvas.width, l.canvas.height)
            }))
        };
        this.projectManager.currentFrameIndex = 0;

        // Zoom/Pan State
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;

        // State
        this.painting = false;
        this.tool = 'brush';
        this.color = '#00ffff';
        this.size = 5;
        this.lastX = 0;
        this.lastY = 0;

        this.init();
    }

    init() {
        this.bindUI();
        this.bindEvents();
        // Re-bind UI callback just in case
        this.projectManager.uiCallback = this.renderTimeline.bind(this);
        // Force render now that projectManager is fully assigned
        this.renderTimeline();
        this.animate();
    }

    bindUI() {
        // --- Canvas & View ---
        document.getElementById('btn-resize').onclick = () => {
            const w = parseInt(document.getElementById('canvas-width').value);
            const h = parseInt(document.getElementById('canvas-height').value);
            this.width = w;
            this.height = h;
            this.layerManager.setSize(w, h);
            this.updateTransform();
        };

        document.getElementById('btn-zoom-in').onclick = () => {
            this.zoom *= 1.1;
            this.updateTransform();
        };
        document.getElementById('btn-zoom-out').onclick = () => {
            this.zoom *= 0.9;
            this.updateTransform();
        };

        // --- Toolbar ---
        const tools = ['brush', 'eraser', 'wand', 'netweaver', 'cyberflow', 'glitch', 'fractal'];
        tools.forEach(t => {
            const btn = document.getElementById(`btn-${t}`);
            if(btn) btn.onclick = () => this.setTool(t, btn);
        });

        // Menu Bar Interaction
        document.querySelectorAll('.menu-item').forEach(item => {
            item.onclick = () => alert("Menu feature '" + item.innerText + "' coming soon!");
        });

        // Pan Tool Special
        document.getElementById('btn-pan-tool').onclick = () => {
            this.isPanning = !this.isPanning;
            const btn = document.getElementById('btn-pan-tool');
            if (this.isPanning) {
                btn.classList.add('active');
                this.wrapper.classList.add('panning');
                this.wrapper.classList.remove('drawing');
            } else {
                btn.classList.remove('active');
                this.wrapper.classList.remove('panning');
                this.wrapper.classList.add('drawing');
                // Revert to last tool cursor? Handled by draw logic.
            }
        };

        // --- Properties ---
        const sizePicker = document.getElementById('size-picker');
        const sizeVal = document.getElementById('size-val');

        sizePicker.oninput = (e) => {
            this.size = parseInt(e.target.value);
            sizeVal.value = this.size;
        };
        sizeVal.oninput = (e) => {
            this.size = parseInt(e.target.value);
            sizePicker.value = this.size;
        };

        document.getElementById('color-picker').oninput = (e) => this.color = e.target.value;

        // --- Layers ---
        document.getElementById('btn-add-layer').onclick = () => {
             this.layerManager.addLayer();
             this.projectManager.handleLayerAdd();
        };
        document.getElementById('btn-clear-layer').onclick = () => this.layerManager.clearActiveLayer();

        // --- History ---
        document.getElementById('btn-undo').onclick = () => this.layerManager.undo();

        // --- Filters ---
        const filters = ['invert', 'grayscale', 'rgb-split', 'pixelate'];
        filters.forEach(f => {
            document.getElementById(`btn-${f}`).onclick = () => this.applyFilter(f);
        });
        document.getElementById('btn-rem-bg').onclick = () => this.magicWand.removeBackground();

        // --- Export ---
        document.getElementById('btn-save').onclick = () => this.exportSpritesheet();

        // --- Timeline ---
        document.getElementById('btn-play').onclick = () => {
            this.projectManager.play();
            const btn = document.getElementById('btn-play');
            btn.classList.toggle('active');
            btn.innerText = this.projectManager.isPlaying ? '⏸' : '▶';
        };
        document.getElementById('btn-add-frame').onclick = () => this.projectManager.addFrame(false);

        // Optional buttons (might be hidden in new layout)
        const dupBtn = document.getElementById('btn-dup-frame');
        if(dupBtn) dupBtn.onclick = () => this.projectManager.addFrame(true);
        const delBtn = document.getElementById('btn-del-frame');
        if(delBtn) delBtn.onclick = () => this.projectManager.deleteFrame();

        const onionToggle = document.getElementById('onion-skin-toggle');
        if (onionToggle) onionToggle.onchange = (e) => this.projectManager.onionSkin = e.target.checked;

        const fpsInput = document.getElementById('fps-input');
        if (fpsInput) fpsInput.onchange = (e) => this.projectManager.fps = parseInt(e.target.value);
    }

    bindEvents() {
        // Pan/Zoom
        this.viewport.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                this.zoom *= delta;
                this.updateTransform();
            } else {
                // Scroll panning?
            }
        });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                this.wrapper.style.cursor = 'grab';
                this.isPanning = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.wrapper.style.cursor = 'crosshair';
                this.isPanning = false;
            }
        });

        // Draw Events
        this.wrapper.addEventListener('mousedown', (e) => {
            // Check for Pan mode (either persistent or temporary)
            const isTempPan = (e.buttons === 4) || (e.buttons === 1 && e.ctrlKey);

            if (this.isPanning || isTempPan) {
                 this.isDraggingPan = true;
                 this.lastPanX = e.clientX;
                 this.lastPanY = e.clientY;
                 this.wrapper.style.cursor = 'grabbing';
                 return;
            }
            this.startPosition(e);
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isDraggingPan) {
                 const dx = e.clientX - this.lastPanX;
                 const dy = e.clientY - this.lastPanY;
                 this.panX += dx;
                 this.panY += dy;
                 this.lastPanX = e.clientX;
                 this.lastPanY = e.clientY;
                 this.updateTransform();
                 return;
            }
            this.draw(e);
        });

        window.addEventListener('mouseup', () => {
            this.endPosition();
            if (this.isDraggingPan) {
                this.isDraggingPan = false;
                this.wrapper.style.cursor = this.isPanning ? 'grab' : 'crosshair';
            }
        });

        // Touch Events for Pinch Zoom
        this.wrapper.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault(); // Stop browser zoom
                this.isPinching = true;
                this.lastPinchDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            } else if (e.touches.length === 1) {
                if(this.isPanning) {
                     this.lastPanX = e.touches[0].clientX;
                     this.lastPanY = e.touches[0].clientY;
                } else {
                    this.startPosition(e);
                }
            }
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && this.isPinching) {
                e.preventDefault();
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const delta = dist - this.lastPinchDist;
                this.zoom += delta * 0.01;
                this.zoom = Math.max(0.1, Math.min(5, this.zoom));
                this.lastPinchDist = dist;
                this.updateTransform();
            } else if (e.touches.length === 1) {
                 if (this.isPanning) {
                     e.preventDefault();
                     const dx = e.touches[0].clientX - this.lastPanX;
                     const dy = e.touches[0].clientY - this.lastPanY;
                     this.panX += dx;
                     this.panY += dy;
                     this.lastPanX = e.touches[0].clientX;
                     this.lastPanY = e.touches[0].clientY;
                     this.updateTransform();
                 } else {
                     // prevent scroll while drawing
                     e.preventDefault();
                     this.draw(e);
                 }
            }
        }, { passive: false });

        window.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) this.isPinching = false;
            this.endPosition();
        });
    }

    updateTransform() {
        this.wrapper.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    }

    getPos(e) {
        const rect = this.wrapper.getBoundingClientRect();
        const scaleX = this.width / rect.width;
        const scaleY = this.height / rect.height;

        const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
        const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    setTool(name, btn) {
        this.tool = name;
        document.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        if(btn) btn.classList.add('active');
    }

    startPosition(e) {
        if(this.tool === 'wand') {
             const pos = this.getPos(e);
             this.magicWand.floodFillClear(Math.floor(pos.x), Math.floor(pos.y));
             return;
        }

        this.painting = true;
        this.netWeaverPoints = [];

        // Logic for Onion skin rendering? No, canvas handles it.
        // Save state before stroke? handled by layer manager?
        // Wait, ProjectManager handles frames. LayerManager handles UNDO for current canvas.
        // Undo should work on current frame layers.
        this.layerManager.saveState();

        const pos = this.getPos(e);
        this.lastX = pos.x;
        this.lastY = pos.y;
        this.draw(e);

        const dropZone = document.getElementById('drop-zone');
        if(dropZone) dropZone.classList.add('hidden');
    }

    endPosition() {
        if (this.painting) {
            this.painting = false;
            const layer = this.layerManager.getActiveLayer();
            if (layer) layer.ctx.beginPath();

            // Save to frame data immediately after stroke
            this.projectManager.saveCurrentFrame();
        }
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
            ctx.globalCompositeOperation = 'source-over';
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

    // --- Brushes Copied from Previous ---
    drawNetWeaver(ctx, x, y) {
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.arc(x, y, Math.random() * this.size/2, 0, Math.PI*2);
        ctx.fill();
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
        ctx.strokeStyle = this.color;
        ctx.globalCompositeOperation = 'screen';
        const particles = 5;
        for(let i=0; i<particles; i++) {
            const offset = (Math.random() - 0.5) * this.size * 2;
            const angle = Math.random() * Math.PI * 2;
            const px = x + Math.cos(angle) * offset;
            const py = y + Math.sin(angle) * offset;
            ctx.lineWidth = Math.random() * 2;
            ctx.beginPath();
            ctx.moveTo(this.lastX, this.lastY);
            const cp1x = this.lastX + (Math.random()-0.5)*50;
            const cp1y = this.lastY + (Math.random()-0.5)*50;
            ctx.quadraticCurveTo(cp1x, cp1y, px, py);
            ctx.stroke();
        }
    }

    drawGlitchDrag(ctx, x, y) {
        const w = this.size * 4;
        const h = this.size * 4;
        const sx = x + (Math.random()-0.5) * 50;
        const sy = y + (Math.random()-0.5) * 50;
        try {
            const data = ctx.getImageData(sx, sy, w, h);
            const d = data.data;
            for(let i=0; i<d.length; i+=4) {
                if (i % 20 === 0) d[i] = 255;
            }
            ctx.putImageData(data, x - w/2, y - h/2);
        } catch(e) {}
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
            const source = new Uint8ClampedArray(data);
            const offset = 10;
            for(let i=0; i<data.length; i+=4) {
                const rIdx = i - offset * 4;
                if (rIdx >= 0) data[i] = source[rIdx];
                const bIdx = i + offset * 4;
                if (bIdx < data.length) data[i+2] = source[bIdx+2];
            }
            ctx.putImageData(imgData, 0, 0);
        } else if (name === 'pixelate') {
            const size = 10;
            const temp = document.createElement('canvas');
            temp.width = w / size;
            temp.height = h / size;
            const tctx = temp.getContext('2d');
            tctx.drawImage(layer.canvas, 0, 0, temp.width, temp.height);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(temp, 0, 0, w, h);
            ctx.imageSmoothingEnabled = true;
        }

        this.projectManager.saveCurrentFrame();
    }

    // --- Timeline Rendering ---
    renderTimeline() {
        const container = document.getElementById('frames-container');
        if (!container) return; // Guard against missing element
        container.innerHTML = '';

        // Only render if frames exist and projectManager is ready
        if (!this.projectManager || !this.projectManager.frames) return;

        this.projectManager.frames.forEach((frame, index) => {
            const thumb = document.createElement('div');
            thumb.className = `frame-thumb ${index === this.projectManager.currentFrameIndex ? 'active' : ''}`;
            thumb.onclick = () => this.projectManager.loadFrame(index);

            const num = document.createElement('span');
            num.className = 'frame-number';
            num.innerText = index + 1;

            // Preview
            // Draw simplified preview to a tiny canvas
            const preview = document.createElement('canvas');
            preview.width = 50;
            preview.height = 50;
            const pCtx = preview.getContext('2d');

            // Scale down
            // We just take the first visible layer? Or composite.
            // Let's take composite of top visible.
            const topL = frame.layers.slice().reverse().find(l => l.visible);
            if (topL && topL.data) {
                // Need helper to draw ImageData
                const hC = document.createElement('canvas');
                hC.width = this.width;
                hC.height = this.height;
                hC.getContext('2d').putImageData(topL.data, 0, 0);

                pCtx.drawImage(hC, 0, 0, 50, 50);
            } else {
                 pCtx.fillStyle = '#222';
                 pCtx.fillRect(0, 0, 50, 50);
            }

            thumb.appendChild(preview);
            thumb.appendChild(num);
            container.appendChild(thumb);
        });
    }

    // --- Export ---
    exportSpritesheet() {
        const frames = this.projectManager.frames;
        const fWidth = this.width;
        const fHeight = this.height;

        const sheet = document.createElement('canvas');
        sheet.width = fWidth * frames.length;
        sheet.height = fHeight;
        const sCtx = sheet.getContext('2d');

        const temp = document.createElement('canvas');
        temp.width = fWidth;
        temp.height = fHeight;
        const tCtx = temp.getContext('2d');

        frames.forEach((frame, i) => {
            tCtx.clearRect(0, 0, fWidth, fHeight);
            frame.layers.forEach(l => {
                if (l.visible) {
                    // draw image data logic again
                    const buff = document.createElement('canvas');
                    buff.width = fWidth;
                    buff.height = fHeight;
                    buff.getContext('2d').putImageData(l.data, 0, 0);

                    tCtx.globalAlpha = l.opacity;
                    tCtx.globalCompositeOperation = l.blendMode;
                    tCtx.drawImage(buff, 0, 0);
                }
            });
            sCtx.drawImage(temp, i * fWidth, 0);
        });

        const link = document.createElement('a');
        link.download = `sprite-sheet-${Date.now()}.png`;
        link.href = sheet.toDataURL();
        link.click();
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        // If playing, we don't need to force render canvas as project manager swaps image data?
        // Actually ProjectManager swaps image data in loop.

        // But we need to render onion skin ON TOP
        // But LayerManager layers are persistent canvases.
        // Onion skin should probably be a separate overlay canvas on top of everything?
        // Or drawn into the 'active' canvas temporarily? No.

        // Let's inject an Onion Skin Canvas into wrapper if not exists
        let onionCanvas = document.getElementById('onion-canvas');
        if (!onionCanvas) {
            onionCanvas = document.createElement('canvas');
            onionCanvas.id = 'onion-canvas';
            onionCanvas.width = this.width;
            onionCanvas.height = this.height;
            onionCanvas.style.position = 'absolute';
            onionCanvas.style.top = '0';
            onionCanvas.style.left = '0';
            onionCanvas.style.pointerEvents = 'none';
            onionCanvas.style.zIndex = 50; // Above layers
            this.wrapper.appendChild(onionCanvas);
        }

        const oCtx = onionCanvas.getContext('2d');
        oCtx.clearRect(0, 0, onionCanvas.width, onionCanvas.height);

        this.projectManager.renderOnionSkin(oCtx);
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    window.app = new EditorApp();
});
