class PaletteManager {
    constructor(containerId, onSelectColor) {
        this.container = document.getElementById(containerId);
        this.onSelectColor = onSelectColor;
        this.colors = [
            '#00ffff', '#ff00ff', '#ffff00', '#ffffff', '#000000',
            '#ff0000', '#00ff00', '#0000ff', '#808080', '#333333'
        ];

        this.initUI();
    }

    initUI() {
        this.container.innerHTML = '';
        this.container.style.display = 'flex';
        this.container.style.flexWrap = 'wrap';
        this.container.style.gap = '5px';
        this.container.style.marginTop = '10px';

        this.colors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.style.width = '20px';
            swatch.style.height = '20px';
            swatch.style.backgroundColor = color;
            swatch.style.border = '1px solid #555';
            swatch.style.cursor = 'pointer';
            swatch.onclick = () => this.onSelectColor(color);
            this.container.appendChild(swatch);
        });

        // Add Color Button
        const addBtn = document.createElement('div');
        addBtn.innerText = '+';
        addBtn.style.width = '20px';
        addBtn.style.height = '20px';
        addBtn.style.border = '1px solid #00ffff';
        addBtn.style.color = '#00ffff';
        addBtn.style.display = 'flex';
        addBtn.style.justifyContent = 'center';
        addBtn.style.alignItems = 'center';
        addBtn.style.cursor = 'pointer';
        addBtn.style.fontSize = '14px';
        addBtn.onclick = () => this.addColor();
        this.container.appendChild(addBtn);
    }

    addColor() {
        const input = document.getElementById('color-picker');
        if(input && !this.colors.includes(input.value)) {
            this.colors.push(input.value);
            this.initUI();
        }
    }
}

export { PaletteManager };
