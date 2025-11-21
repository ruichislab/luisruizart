import { LayerManager } from './layers.js';

class ProjectManager {
    constructor(layerManager, uiCallback) {
        this.layerManager = layerManager;
        this.uiCallback = uiCallback; // To update Timeline UI

        this.frames = []; // Array of Frame objects
        this.currentFrameIndex = -1;
        this.fps = 12;
        this.isPlaying = false;
        this.animationId = null;
        this.onionSkin = false;

        // Initialize with one empty frame
        this.addFrame();
    }

    addFrame(copyPrevious = false) {
        // Ensure current frame is saved before adding new one
        if (this.frames.length > 0) {
            this.saveCurrentFrame();
        }

        let newFrame;

        if (copyPrevious && this.frames.length > 0) {
            const prevFrame = this.frames[this.currentFrameIndex];
            // Deep copy of layer data
            newFrame = {
                layers: prevFrame.layers.map(l => ({
                    name: l.name,
                    visible: l.visible,
                    opacity: l.opacity,
                    blendMode: l.blendMode,
                    data: this.cloneImageData(l.data)
                }))
            };
        } else {
            // Create frame based on current LayerManager structure (if any) or default
            // Actually, we should base it on the *current active structure* of layers.
            // If it's the very first frame:
            if (this.frames.length === 0) {
                // We need to know the layer structure. LayerManager has it.
                // But LayerManager starts empty usually.
                // Let's assume LayerManager is already init.
                newFrame = {
                    layers: this.layerManager.layers.map(l => ({
                        name: l.name,
                        visible: l.visible,
                        opacity: l.opacity,
                        blendMode: l.blendMode,
                        data: l.ctx.getImageData(0, 0, l.canvas.width, l.canvas.height)
                    }))
                };
            } else {
                // New empty frame should have same *structure* (layer count/names) but empty data
                const refFrame = this.frames[this.currentFrameIndex];
                newFrame = {
                    layers: refFrame.layers.map(l => ({
                        name: l.name,
                        visible: l.visible,
                        opacity: l.opacity,
                        blendMode: l.blendMode,
                        data: new ImageData(l.data.width, l.data.height) // Empty
                    }))
                };
            }
        }

        this.frames.splice(this.currentFrameIndex + 1, 0, newFrame);
        this.currentFrameIndex++;
        this.loadFrame(this.currentFrameIndex);
        if (this.uiCallback) {
            this.uiCallback();
        }
    }

    deleteFrame() {
        if (this.frames.length <= 1) return;
        this.frames.splice(this.currentFrameIndex, 1);
        if (this.currentFrameIndex >= this.frames.length) {
            this.currentFrameIndex = this.frames.length - 1;
        }
        this.loadFrame(this.currentFrameIndex);
        this.uiCallback();
    }

    // Save current canvas state into the current frame object
    saveCurrentFrame() {
        if (!this.frames || !this.frames[this.currentFrameIndex]) {
            console.warn("saveCurrentFrame: Frame not found");
            return;
        }

        const frame = this.frames[this.currentFrameIndex];

        if (!this.layerManager || !this.layerManager.layers) {
            console.error("saveCurrentFrame: LayerManager or layers missing");
            return;
        }

        this.layerManager.layers.forEach((l, i) => {
            if (frame.layers && frame.layers[i]) {
                frame.layers[i].data = l.ctx.getImageData(0, 0, l.canvas.width, l.canvas.height);
                frame.layers[i].visible = l.visible;
                frame.layers[i].opacity = l.opacity;
                frame.layers[i].blendMode = l.blendMode;
                frame.layers[i].name = l.name;
            }
        });
    }

    loadFrame(index) {
        // Before loading, ensure current work is saved?
        // Ideally we save constantly or before switch.
        // But `saveCurrentFrame` reads from Canvas.
        // If we are just playing animation, we shouldn't save every tick if no changes made.
        // But for editing, we must save before leaving a frame.

        // Optimization: only save if "dirty" (modified).
        // For now, let's save the *previous* frame before loading the new one,
        // UNLESS we are just initializing.

        // Actually, let's assume `saveCurrentFrame()` is called explicitly by the tool actions
        // or right before we switch.

        if (index < 0 || index >= this.frames.length) return;

        this.currentFrameIndex = index;
        const frame = this.frames[index];

        // Reconstruct layers in LayerManager if count differs?
        // For simplicity, we enforce same layer structure for all frames.
        // If user adds a layer, we add it to ALL frames (empty in others).

        this.syncLayerStructure(frame);

        // Put Image Data
        this.layerManager.layers.forEach((l, i) => {
            if (frame.layers[i]) {
                l.ctx.putImageData(frame.layers[i].data, 0, 0);
                l.visible = frame.layers[i].visible;
                l.opacity = frame.layers[i].opacity;
                l.blendMode = frame.layers[i].blendMode;
                l.name = frame.layers[i].name;

                // Update DOM
                l.canvas.style.display = l.visible ? 'block' : 'none';
            }
        });

        this.layerManager.renderUI();
        this.uiCallback();
    }

    // Ensure LayerManager has the right amount of layers to match the Frame
    syncLayerStructure(frame) {
        while(this.layerManager.layers.length < frame.layers.length) {
            this.layerManager.addLayer(null, true); // true = skip saving/logic
        }
        // What if LayerManager has MORE layers? (User deleted layer in this frame?)
        // We assume global layer structure.
        // Implementing "Add Layer" updates ALL frames.
    }

    handleLayerAdd(name) {
        // When user adds a layer in UI
        // 1. Add to LayerManager (already done by logic calling this?)
        // 2. Add empty layer to ALL frames
        const w = this.layerManager.width;
        const h = this.layerManager.height;

        this.frames.forEach(f => {
            f.layers.push({
                name: name || `Layer ${f.layers.length}`,
                visible: true,
                opacity: 1.0,
                blendMode: 'source-over',
                data: new ImageData(w, h)
            });
        });

        // The current frame just got modified by LayerManager.addLayer,
        // so we should make sure we sync that "fresh" state into the current frame object
        this.saveCurrentFrame();
    }

    play() {
        if (this.isPlaying) {
            this.stop();
            return;
        }
        this.isPlaying = true;
        this.saveCurrentFrame(); // Save where we are before starting

        let lastTime = 0;
        const loop = (timestamp) => {
            if (!this.isPlaying) return;

            if (timestamp - lastTime > 1000 / this.fps) {
                let next = this.currentFrameIndex + 1;
                if (next >= this.frames.length) next = 0;
                this.loadFrame(next);
                lastTime = timestamp;
            }

            this.animationId = requestAnimationFrame(loop);
        };
        this.animationId = requestAnimationFrame(loop);
    }

    stop() {
        this.isPlaying = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);
    }

    cloneImageData(imageData) {
        return new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );
    }

    // --- Onion Skinning Rendering ---
    // This needs to be called by the main render loop or editor draw
    renderOnionSkin(ctx) {
        if (!this.onionSkin) return;

        // Previous Frame
        if (this.currentFrameIndex > 0) {
            const prev = this.frames[this.currentFrameIndex - 1];
            this.drawFrameGhost(ctx, prev, 0.3, 'red'); // tint red?
        }

        // Next Frame
        if (this.currentFrameIndex < this.frames.length - 1) {
            const next = this.frames[this.currentFrameIndex + 1];
            this.drawFrameGhost(ctx, next, 0.3, 'green'); // tint green?
        }
    }

    drawFrameGhost(targetCtx, frame, alpha, tint) {
        // Flatten frame layers
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.layerManager.width;
        tempCanvas.height = this.layerManager.height;
        const tCtx = tempCanvas.getContext('2d');

        frame.layers.forEach(l => {
            if(l.visible) {
                tCtx.putImageData(l.data, 0, 0);
                // Draw on top? No, putImageData replaces.
                // We need to composite.
                // Actually `putImageData` is destructive.
                // We need `createImageBitmap` (async) or loop pixels.
                // Fast way: putImageData to a second buffer, then drawImage.
            }
        });

        // Wait, putImageData ignores transparency compositing. It overwrites.
        // Correct way for flattened frame:
        // For each layer:
        // 1. Put ImageData to helper canvas.
        // 2. Draw helper canvas to composite canvas.

        // Since this is expensive, maybe simple approach: Just draw the *active layer* of prev frame?
        // Or just the composite of visible layers.

        // Let's skip complex compositing for now and just draw the flattened result if we had it.
        // We don't cache flattened frames.

        // Simplified: Draw just the TOP visible layer of prev frame.
        const topLayer = frame.layers.slice().reverse().find(l => l.visible);
        if(topLayer) {
            targetCtx.save();
            targetCtx.globalAlpha = alpha;

            // We need to convert ImageData to something drawable with opacity
            const buffer = document.createElement('canvas');
            buffer.width = topLayer.data.width;
            buffer.height = topLayer.data.height;
            buffer.getContext('2d').putImageData(topLayer.data, 0, 0);

            targetCtx.drawImage(buffer, 0, 0);
            targetCtx.restore();
        }
    }
}

export { ProjectManager };
