export class NavigationMenu {
    constructor() {
        this.init();
    }

    init() {
        // Create Menu Container
        const menuContainer = document.createElement('div');
        menuContainer.id = 'nav-menu-container';

        // Menu Toggle Button (Hamburger / Hexagon)
        const toggleBtn = document.createElement('div');
        toggleBtn.id = 'menu-toggle';
        toggleBtn.innerHTML = '☰'; // Simple icon, styled later
        toggleBtn.addEventListener('click', () => this.toggleMenu());

        // Menu Overlay
        const menuOverlay = document.createElement('nav');
        menuOverlay.id = 'main-nav';

        // Menu Items
        const links = [
            { name: 'N E X U S', url: 'index.html', desc: 'Home / The Hub' },
            { name: 'A R C H I V E', url: 'archive.html', desc: 'Legacy Collection (20 Rooms)' },
            { name: 'DIGITAL RAIN', url: 'rain.html', desc: 'Falling Code' },
            { name: 'NOISE FIELD', url: 'noise.html', desc: 'Fluid Dynamics' },
            { name: 'CYBER GLITCH', url: 'glitch.html', desc: 'Data Corruption' },
            { name: 'AETHER LAB', url: 'editor.html', desc: 'Generative Creation Tool' }
        ];

        const ul = document.createElement('ul');
        links.forEach(link => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = link.url;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'link-name';
            nameSpan.textContent = link.name;

            const descSpan = document.createElement('span');
            descSpan.className = 'link-desc';
            descSpan.textContent = link.desc;

            a.appendChild(nameSpan);
            a.appendChild(descSpan);
            li.appendChild(a);
            ul.appendChild(li);
        });

        menuOverlay.appendChild(ul);

        // Close Button inside menu
        const closeBtn = document.createElement('div');
        closeBtn.id = 'menu-close';
        closeBtn.innerHTML = '×';
        closeBtn.addEventListener('click', () => this.toggleMenu());
        menuOverlay.appendChild(closeBtn);

        menuContainer.appendChild(toggleBtn);
        menuContainer.appendChild(menuOverlay);
        document.body.appendChild(menuContainer);
    }

    toggleMenu() {
        const nav = document.getElementById('main-nav');
        nav.classList.toggle('active');

        const toggle = document.getElementById('menu-toggle');
        toggle.classList.toggle('hidden');
    }
}

// Auto-initialize if imported as a script module
document.addEventListener('DOMContentLoaded', () => {
    new NavigationMenu();
});
