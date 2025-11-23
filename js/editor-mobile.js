import { LayerManager } from './layers.js';

class MobileEditorApp {
    constructor() {
        this.wrapper = document.getElementById('canvas-wrapper');
        this.layerManager = new LayerManager(this.wrapper);

        // Fit to screen with High DPI
        this.pixelRatio = window.devicePixelRatio || 1;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.layerManager.setSize(this.width, this.height, this.pixelRatio);

        // Ensure initial layer
        this.layerManager.addLayer('Background');

        // State
        this.tool = 'brush';
        this.color = '#00ffff';
        this.size = 5;
        this.points = []; // For smoothing

        this.bindUI();
        this.bindEvents();
    }

    bindUI() {
        // Tabs
        const closeAll = () => document.querySelectorAll('.panel-drawer').forEach(p => p.classList.remove('open'));

        document.getElementById('tab-tools').onclick = () => {
            const panel = document.getElementById('tools-panel');
            const isOpen = panel.classList.contains('open');
            closeAll();
            if(!isOpen) panel.classList.add('open');
        };

        document.getElementById('tab-layers').onclick = () => {
            const panel = document.getElementById('layers-panel');
            const isOpen = panel.classList.contains('open');
            closeAll();
            if(!isOpen) panel.classList.add('open');
        };

        document.getElementById('action-undo').onclick = () => this.layerManager.undo();

        // Tools
        const setTool = (t) => {
            this.tool = t;
            document.querySelectorAll('.m-btn').forEach(b => b.classList.remove('active')); // basic logic
        };

        document.getElementById('btn-brush').onclick = () => setTool('brush');
        document.getElementById('btn-eraser').onclick = () => setTool('eraser');
        document.getElementById('btn-netweaver').onclick = () => setTool('netweaver');
        document.getElementById('btn-cyberflow').onclick = () => setTool('cyberflow');

        document.getElementById('color-picker').onchange = (e) => this.color = e.target.value;
        document.getElementById('size-picker').oninput = (e) => this.size = parseInt(e.target.value);

        document.getElementById('btn-add-layer').onclick = () => this.layerManager.addLayer();
    }

    bindEvents() {
        // Use Pointer Events for better support (Stylus pressure etc)
        this.wrapper.addEventListener('pointerdown', (e) => {
            if(e.button !== 0) return; // Only left click/touch
            e.preventDefault();

            const rect = this.wrapper.getBoundingClientRect();
            const x = (e.clientX - rect.left) * this.pixelRatio;
            const y = (e.clientY - rect.top) * this.pixelRatio;

            this.points = [{x, y, pressure: e.pressure}];
            this.layerManager.saveState();

            // Start stroke
            const layer = this.layerManager.getActiveLayer();
            if (layer) {
                layer.ctx.beginPath();
                layer.ctx.moveTo(x, y);
                // Draw a dot
                layer.ctx.fillStyle = this.color;
                layer.ctx.arc(x, y, (this.size * e.pressure * this.pixelRatio) / 2, 0, Math.PI*2);
                layer.ctx.fill();
                layer.ctx.beginPath(); // Reset for path
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
            this.drawSmooth();
        });

        this.wrapper.addEventListener('pointerup', (e) => {
            this.points = [];
            this.wrapper.releasePointerCapture(e.pointerId);
        });
    }

    drawSmooth() {
        const layer = this.layerManager.getActiveLayer();
        if (!layer || !layer.visible) return;
        const ctx = layer.ctx;

        if (this.points.length < 3) {
            const b = this.points[this.points.length - 1];
            // ctx.beginPath();
            // ctx.arc(b.x, b.y, ctx.lineWidth / 2, 0, Math.PI * 2, !0);
            // ctx.fill();
            // ctx.closePath();
            return;
        }

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // Quadratic Curve
        const p1 = this.points[this.points.length - 3];
        const p2 = this.points[this.points.length - 2];
        const p3 = this.points[this.points.length - 1];

        const cp1x = p1.x;
        const cp1y = p1.y;
        const cp2x = p2.x;
        const cp2y = p2.y;

        const mid1x = (p1.x + p2.x) / 2;
        const mid1y = (p1.y + p2.y) / 2;
        const mid2x = (p2.x + p3.x) / 2;
        const mid2y = (p2.y + p3.y) / 2;

        // Dynamic width based on pressure
        const pressure = p2.pressure || 0.5;
        ctx.lineWidth = this.size * this.pixelRatio * (0.5 + pressure); // Min 50% size

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
        } else if (this.tool === 'netweaver') {
            this.drawNetWeaver(ctx, p2.x, p2.y);
        }

        // Note: Generative tools might need point-by-point logic instead of smooth curves
    }

    drawNetWeaver(ctx, x, y) {
        ctx.fillStyle = this.color;
        ctx.globalCompositeOperation = 'source-over';

        if(Math.random() > 0.8) {
            ctx.beginPath();
            ctx.arc(x, y, Math.random() * this.size * this.pixelRatio, 0, Math.PI*2);
            ctx.fill();

            // Random connection to previous points
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
}

document.addEventListener('DOMContentLoaded', () => {
    new MobileEditorApp();
});
