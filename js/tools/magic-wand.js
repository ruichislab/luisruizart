class MagicWand {
    constructor(layerManager) {
        this.layerManager = layerManager;
    }

    removeBackground(tolerance = 30) {
        const layer = this.layerManager.getActiveLayer();
        if (!layer) return;

        const ctx = layer.ctx;
        const w = layer.canvas.width;
        const h = layer.canvas.height;
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Assume background color is the top-left pixel
        const r0 = data[0];
        const g0 = data[1];
        const b0 = data[2];
        const a0 = data[3];

        if (a0 === 0) return; // Already transparent

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            const a = data[i+3];

            // Simple Euclidian distance
            const dist = Math.sqrt(
                (r-r0)**2 + (g-g0)**2 + (b-b0)**2
            );

            if (dist <= tolerance) {
                data[i+3] = 0; // Make transparent
            }
        }

        ctx.putImageData(imgData, 0, 0);
    }

    floodFillClear(startX, startY, tolerance = 30) {
        const layer = this.layerManager.getActiveLayer();
        if (!layer) return;

        const ctx = layer.ctx;
        const w = layer.canvas.width;
        const h = layer.canvas.height;
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        const getPixel = (x, y) => {
            if (x < 0 || y < 0 || x >= w || y >= h) return [-1, -1, -1, -1];
            const i = (y * w + x) * 4;
            return [data[i], data[i+1], data[i+2], data[i+3]];
        };

        const startColor = getPixel(startX, startY);
        if (startColor[3] === 0) return; // Already empty

        const checkMatch = (r, g, b, a) => {
            const dist = Math.sqrt(
                (r-startColor[0])**2 +
                (g-startColor[1])**2 +
                (b-startColor[2])**2
            );
            return dist <= tolerance;
        };

        const stack = [[startX, startY]];
        const visited = new Set(); // Optimization: use boolean array or inline modification

        // For performance, we just modify data directly and use it as "visited" logic if we change alpha to 0
        // But if target is tolerance based, we might re-visit.
        // Let's use a Uint8Array for visited
        const visitedArr = new Uint8Array(w * h);

        while(stack.length > 0) {
            const [x, y] = stack.pop();
            const idx = y * w + x;

            if (visitedArr[idx]) continue;
            visitedArr[idx] = 1;

            const i = idx * 4;
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            const a = data[i+3];

            if (checkMatch(r, g, b, a)) {
                data[i+3] = 0; // Clear it

                // Add neighbors
                if(x > 0) stack.push([x-1, y]);
                if(x < w-1) stack.push([x+1, y]);
                if(y > 0) stack.push([x, y-1]);
                if(y < h-1) stack.push([x, y+1]);
            }
        }

        ctx.putImageData(imgData, 0, 0);
    }
}

export { MagicWand };
