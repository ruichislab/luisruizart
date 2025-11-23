import { LayerManager } from './layers.js';

class MobileEditorApp {
    constructor() {
        this.wrapper = document.getElementById('canvas-wrapper');
        this.layerManager = new LayerManager(this.wrapper);

        // Fit to screen
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.layerManager.setSize(this.width, this.height);

        // Ensure initial layer
        this.layerManager.addLayer('Background');

        // State
        this.tool = 'brush';
        this.color = '#00ffff';
        this.size = 5;
        this.lastX = 0;
        this.lastY = 0;

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
        // Touch only
        this.wrapper.addEventListener('touchstart', (e) => {
            e.preventDefault(); // No scroll
            const touch = e.touches[0];
            const rect = this.wrapper.getBoundingClientRect();
            this.lastX = touch.clientX - rect.left;
            this.lastY = touch.clientY - rect.top;

            this.draw(this.lastX, this.lastY);
            this.layerManager.saveState();
        }, { passive: false });

        this.wrapper.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.wrapper.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            this.draw(x, y);
            this.lastX = x;
            this.lastY = y;
        }, { passive: false });
    }

    draw(x, y) {
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
        }
        // Add other tools logic here (copy from editor-app.js)
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MobileEditorApp();
});
