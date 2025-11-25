class LayerManager {
    constructor(container) {
        this.container = container;
        this.layers = [];
        this.activeLayerIndex = -1;
        this.layerIdCounter = 0;
        this.width = 800;
        this.height = 600;

        // UI Elements
        this.layersListElement = document.getElementById('layers-list');

        // History
        this.history = [];
        this.maxHistory = 20;
    }

    saveState() {
        if (this.activeLayerIndex < 0) return;
        const layer = this.layers[this.activeLayerIndex];

        // Save state of the active layer BEFORE changes
        const state = {
            layerId: layer.id,
            index: this.activeLayerIndex,
            data: layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height)
        };

        this.history.push(state);
        if (this.history.length > this.maxHistory) this.history.shift();
    }

    undo() {
        if (this.history.length === 0) return;

        const state = this.history.pop();

        // Find layer by ID (in case it moved)
        const layer = this.layers.find(l => l.id === state.layerId);

        if (layer) {
            layer.ctx.putImageData(state.data, 0, 0);
            // Ideally we switch active layer to this one so user sees it
            // But maybe confusing if they are on another layer.
            // Let's just restore.
        } else {
            // Layer might have been deleted. Skip or warn.
            console.warn("Layer for undo not found");
        }
    }

    clearActiveLayer() {
        if (this.activeLayerIndex < 0) return;
        this.saveState(); // Save before clearing
        const layer = this.layers[this.activeLayerIndex];
        layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    }

    setSize(width, height, pixelRatio = 1) {
        this.width = width * pixelRatio;
        this.height = height * pixelRatio;
        this.container.style.width = width + 'px';
        this.container.style.height = height + 'px';
        this.pixelRatio = pixelRatio;

        this.layers.forEach(layer => {
            const temp = document.createElement('canvas');
            temp.width = layer.canvas.width;
            temp.height = layer.canvas.height;
            temp.getContext('2d').drawImage(layer.canvas, 0, 0);

            layer.canvas.width = this.width;
            layer.canvas.height = this.height;

            // Scale context if ratio > 1?
            // Usually we scale drawing commands, but if we set width/height directly,
            // 1 css pixel = pixelRatio canvas pixels.
            // We might want to scale context so 1 unit = 1 css pixel.
            // But drawing logic usually handles coord transformation.
            // Let's just resize buffer.

            layer.ctx = layer.canvas.getContext('2d');
            // layer.ctx.scale(pixelRatio, pixelRatio); // If we want logical coords

            // Draw back stretched
            layer.ctx.drawImage(temp, 0, 0, this.width, this.height);
        });
    }

    addLayer(name = null, skipUI = false) {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none'; // Events handled by wrapper

        // Fill transparency?
        // By default canvas is transparent.
        // If it's the *first* layer (background), maybe fill black?
        const isFirst = this.layers.length === 0;

        this.container.appendChild(canvas);

        const layer = {
            id: this.layerIdCounter++,
            name: name || `Layer ${this.layerIdCounter}`,
            canvas: canvas,
            ctx: canvas.getContext('2d', { willReadFrequently: true }),
            visible: true,
            opacity: 1.0,
            blendMode: 'source-over'
        };

        if (isFirst) {
            // Default to transparent, user can fill if they want
            // But let's keep name 'Background'
            layer.name = 'Background';
        }

        this.layers.push(layer);
        this.setActiveLayer(this.layers.length - 1);
        if(!skipUI) this.renderUI();
        return layer;
    }

    deleteLayer(index) {
        if (this.layers.length <= 1) return; // Keep at least one

        const layer = this.layers[index];
        layer.canvas.remove();
        this.layers.splice(index, 1);

        if (this.activeLayerIndex >= this.layers.length) {
            this.activeLayerIndex = this.layers.length - 1;
        }
        this.renderUI();
    }

    setActiveLayer(index) {
        this.activeLayerIndex = index;
        this.renderUI();
    }

    getActiveLayer() {
        return this.layers[this.activeLayerIndex];
    }

    toggleVisibility(index) {
        const layer = this.layers[index];
        layer.visible = !layer.visible;
        layer.canvas.style.display = layer.visible ? 'block' : 'none';
        this.renderUI();
    }

    moveLayer(fromIndex, toIndex) {
        if(toIndex < 0 || toIndex >= this.layers.length) return;

        const layer = this.layers[fromIndex];
        this.layers.splice(fromIndex, 1);
        this.layers.splice(toIndex, 0, layer);

        // Update DOM order
        // DOM order: last is on top (z-index).
        // Array order: 0 is bottom, last is top.
        // We can just re-append all canvases in order.
        this.layers.forEach(l => this.container.appendChild(l.canvas));

        // Update active index if it moved
        if (this.activeLayerIndex === fromIndex) {
            this.activeLayerIndex = toIndex;
        } else if (this.activeLayerIndex === toIndex && fromIndex < toIndex) {
             this.activeLayerIndex--;
        } // Logic is complex, simpler to just find the layer object

        this.activeLayerIndex = this.layers.indexOf(layer); // Safer

        this.renderUI();
    }

    renderUI() {
        if (!this.layersListElement) return; // Safe guard for mobile or missing UI
        this.layersListElement.innerHTML = '';

        // Render in reverse order (Top layer first in list)
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            const el = document.createElement('div');
            el.className = `layer-item ${i === this.activeLayerIndex ? 'active' : ''}`;

            // Visibility Toggle
            const visBtn = document.createElement('span');
            visBtn.className = 'layer-vis';
            visBtn.innerHTML = layer.visible ? '👁️' : '✕';
            visBtn.onclick = (e) => { e.stopPropagation(); this.toggleVisibility(i); };

            // Name
            const nameSpan = document.createElement('span');
            nameSpan.className = 'layer-name';
            nameSpan.innerText = layer.name;

            // Delete
            const delBtn = document.createElement('span');
            delBtn.className = 'layer-del';
            delBtn.innerHTML = '🗑️';
            delBtn.onclick = (e) => { e.stopPropagation(); this.deleteLayer(i); };

            // On Click Handler
            // Use explicit function to avoid closure issues? No, let i is fine.
            // But ensure we capture it correctly.
            el.addEventListener('click', () => this.setActiveLayer(i));

            el.appendChild(visBtn);
            el.appendChild(nameSpan);
            el.appendChild(delBtn);
            this.layersListElement.appendChild(el);
        }
    }

    getCompositeCanvas() {
        const comp = document.createElement('canvas');
        comp.width = this.width;
        comp.height = this.height;
        const ctx = comp.getContext('2d');

        this.layers.forEach(layer => {
            if (layer.visible) {
                ctx.globalAlpha = layer.opacity;
                ctx.globalCompositeOperation = layer.blendMode;
                ctx.drawImage(layer.canvas, 0, 0);
            }
        });
        return comp;
    }
}

export { LayerManager };
