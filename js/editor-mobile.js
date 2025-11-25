import { LayerManager } from './layers.js';

class MobileEditorApp {
    constructor() {
        this.wrapper = document.getElementById('canvas-wrapper');
        this.layerManager = new LayerManager(this.wrapper);

        // Fit to screen with High DPI
        this.pixelRatio = window.devicePixelRatio || 1;
        this.width = window.innerWidth;
        // Subtract top/bottom bars
        const topBarH = 50;
        const bottomBarH = 70;
        this.height = window.innerHeight - topBarH - bottomBarH;

        this.layerManager.setSize(this.width, this.height, this.pixelRatio);

        // Ensure initial layer
        this.layerManager.addLayer('Background', true); // skip UI render since we use custom

        // State
        this.tool = 'brush';
        this.color = '#00ffff';
        this.size = 5;
        this.points = []; // For smoothing

        this.initUI();
        this.bindEvents();
        this.renderLayers();
    }

    initUI() {
        // Navigation
        const drawers = document.querySelectorAll('.drawer');
        const overlay = document.getElementById('overlay');

        const openDrawer = (id) => {
            drawers.forEach(d => d.classList.remove('open'));
            const el = document.getElementById(id);
            if (el) el.classList.add('open');
            overlay.classList.add('visible');
        };

        const closeAll = () => {
            drawers.forEach(d => d.classList.remove('open'));
            overlay.classList.remove('visible');
        };

        overlay.onclick = closeAll;

        document.getElementById('nav-brushes').onclick = () => openDrawer('drawer-brushes');
        document.getElementById('nav-layers').onclick = () => {
            this.renderLayers();
            openDrawer('drawer-layers');
        };
        document.getElementById('nav-color').onclick = () => openDrawer('drawer-color');
        document.getElementById('nav-draw').onclick = closeAll;

        // Tools
        document.querySelectorAll('.brush-card').forEach(card => {
            if(card.id === 'btn-new-layer') return;
            card.onclick = () => {
                this.tool = card.dataset.tool;
                document.querySelectorAll('.brush-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                closeAll();
            };
        });

        // Properties
        document.getElementById('slider-size').oninput = (e) => this.size = parseInt(e.target.value);
        document.getElementById('input-color').oninput = (e) => this.color = e.target.value;

        // Layers
        document.getElementById('btn-new-layer').onclick = () => {
            this.layerManager.addLayer(null, true);
            this.renderLayers();
        };

        document.getElementById('btn-undo').onclick = () => this.layerManager.undo();
        document.getElementById('btn-home').onclick = () => window.location.href = 'index.html';
    }

    renderLayers() {
        const list = document.getElementById('layers-list-mobile');
        list.innerHTML = '';

        // Render reverse
        for(let i = this.layerManager.layers.length -1; i >= 0; i--) {
            const layer = this.layerManager.layers[i];
            const isActive = i === this.layerManager.activeLayerIndex;

            const el = document.createElement('div');
            el.className = `layer-row ${isActive ? 'active' : ''}`;
            el.onclick = () => {
                this.layerManager.setActiveLayer(i);
                this.renderLayers();
            };

            const vis = document.createElement('div');
            vis.className = `layer-vis ${layer.visible ? 'visible' : ''}`;
            vis.innerHTML = '👁';
            vis.onclick = (e) => {
                e.stopPropagation();
                this.layerManager.toggleVisibility(i);
                this.renderLayers();
            };

            const name = document.createElement('div');
            name.style.flex = '1';
            name.innerText = layer.name;
            name.style.fontSize = '14px';

            el.appendChild(vis);
            el.appendChild(name);
            list.appendChild(el);
        }
    }

    bindEvents() {
        // Use Pointer Events for better support
        this.wrapper.addEventListener('pointerdown', (e) => {
            if(e.button !== 0) return;
            e.preventDefault();

            const rect = this.wrapper.getBoundingClientRect();
            const x = (e.clientX - rect.left) * this.pixelRatio;
            const y = (e.clientY - rect.top) * this.pixelRatio;

            this.points = [{x, y, pressure: e.pressure}];
            this.layerManager.saveState();

            const layer = this.layerManager.getActiveLayer();
            if (layer) {
                layer.ctx.beginPath();
                layer.ctx.moveTo(x, y);
                // Dot
                if (this.tool !== 'glitch') {
                    layer.ctx.fillStyle = this.color;
                    layer.ctx.arc(x, y, (this.size * e.pressure * this.pixelRatio) / 2, 0, Math.PI*2);
                    layer.ctx.fill();
                    layer.ctx.beginPath();
                }
            }

            this.wrapper.setPointerCapture(e.pointerId);
        });

        this.wrapper.addEventListener('pointermove', (e) => {
            if(e.buttons !== 1) return;
            e.preventDefault();

            const rect = this.wrapper.getBoundingClientRect();
            const x = (e.clientX - rect.left) * this.pixelRatio;
            const y = (e.clientY - rect.top) * this.pixelRatio;

            this.points.push({x, y, pressure: e.pressure});
            this.draw();
        });

        this.wrapper.addEventListener('pointerup', (e) => {
            this.points = [];
            this.wrapper.releasePointerCapture(e.pointerId);
        });
    }

    draw() {
        const layer = this.layerManager.getActiveLayer();
        if (!layer || !layer.visible) return;
        const ctx = layer.ctx;

        // For generative tools that need only last point
        const p = this.points[this.points.length-1];

        if (this.tool === 'netweaver') {
            this.drawNetWeaver(ctx, p.x, p.y);
            return;
        }
        if (this.tool === 'cyberflow') {
            this.drawCyberFlow(ctx, p.x, p.y);
            return;
        }
        if (this.tool === 'glitch') {
            this.drawGlitchDrag(ctx, p.x, p.y);
            return;
        }
        if (this.tool === 'fractal') {
            this.drawFractalDust(ctx, p.x, p.y);
            return;
        }

        // Smooth Draw for Brush/Eraser
        if (this.points.length < 3) return;

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        const p1 = this.points[this.points.length - 3];
        const p2 = this.points[this.points.length - 2];
        const p3 = this.points[this.points.length - 1];

        const mid1x = (p1.x + p2.x) / 2;
        const mid1y = (p1.y + p2.y) / 2;
        const mid2x = (p2.x + p3.x) / 2;
        const mid2y = (p2.y + p3.y) / 2;

        const pressure = p2.pressure || 0.5;
        ctx.lineWidth = this.size * this.pixelRatio * (0.5 + pressure);

        ctx.beginPath();
        ctx.moveTo(mid1x, mid1y);
        ctx.quadraticCurveTo(p2.x, p2.y, mid2x, mid2y);

        if (this.tool === 'brush') {
            ctx.strokeStyle = this.color;
            ctx.globalCompositeOperation = 'source-over';
            ctx.stroke();
        } else if (this.tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
        }
    }

    drawNetWeaver(ctx, x, y) {
        ctx.fillStyle = this.color;
        ctx.globalCompositeOperation = 'source-over';

        if(Math.random() > 0.8) {
            ctx.beginPath();
            ctx.arc(x, y, Math.random() * this.size * this.pixelRatio * 0.5, 0, Math.PI*2);
            ctx.fill();

            const recent = this.points.slice(Math.max(0, this.points.length - 20));
            const r = recent[Math.floor(Math.random() * recent.length)];
            if(r) {
                ctx.lineWidth = 1 * this.pixelRatio;
                ctx.strokeStyle = this.color;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(r.x, r.y);
                ctx.stroke();
            }
        }
    }

    drawCyberFlow(ctx, x, y) {
        ctx.strokeStyle = this.color;
        ctx.globalCompositeOperation = 'screen';
        const particles = 3;
        for(let i=0; i<particles; i++) {
            const offset = (Math.random() - 0.5) * this.size * 2 * this.pixelRatio;
            const angle = Math.random() * Math.PI * 2;
            const px = x + Math.cos(angle) * offset;
            const py = y + Math.sin(angle) * offset;
            ctx.lineWidth = Math.random() * 2 * this.pixelRatio;

            // Connect from previous point if possible
            const prev = this.points.length > 1 ? this.points[this.points.length-2] : {x,y};

            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            const cp1x = prev.x + (Math.random()-0.5)*50;
            const cp1y = prev.y + (Math.random()-0.5)*50;
            ctx.quadraticCurveTo(cp1x, cp1y, px, py);
            ctx.stroke();
        }
    }

    drawGlitchDrag(ctx, x, y) {
        const s = this.size * 4 * this.pixelRatio;
        const sx = x + (Math.random()-0.5) * 50 * this.pixelRatio;
        const sy = y + (Math.random()-0.5) * 50 * this.pixelRatio;
        try {
            const data = ctx.getImageData(sx, sy, s, s);
            // manipulate
            ctx.putImageData(data, x - s/2, y - s/2);
        } catch(e) {}
    }

    drawFractalDust(ctx, x, y) {
        ctx.fillStyle = this.color;
        ctx.globalCompositeOperation = 'lighter';
        const s = this.size * this.pixelRatio;
        const recursiveDraw = (bx, by, size, depth) => {
            if (depth <= 0) return;
            ctx.fillRect(bx, by, size, size);
            if (Math.random() > 0.5) {
                const offset = size * 2;
                recursiveDraw(bx + (Math.random()-0.5)*offset, by + (Math.random()-0.5)*offset, size*0.6, depth-1);
            }
        };
        recursiveDraw(x, y, s, 3);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new MobileEditorApp());
} else {
    new MobileEditorApp();
}
