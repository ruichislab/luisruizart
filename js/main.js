import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AudioEngine } from './audio.js';

class World {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.0015);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 30;
        this.camera.position.y = 5;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.container.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();
        this.mouse = new THREE.Vector2();
        this.targetMouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();

        this.audioEngine = new AudioEngine();
        this.started = false;

        this.init();
        this.createObjects();
        this.setupPostProcessing();
        this.addEventListeners();
        this.animate();
    }

    init() {
        // Lights
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 1, 100);
        pointLight.position.set(0, 10, 10);
        this.scene.add(pointLight);

        // Loading animation
        setTimeout(() => {
            document.body.classList.add('loaded');
            document.getElementById('overlay').classList.add('fade-out');
        }, 500);
    }

    createObjects() {
        // 1. The Flow Field (Particles)
        const particleCount = 15000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        const color1 = new THREE.Color(0x00ffff);
        const color2 = new THREE.Color(0xff00ff);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

            // Gradient color
            const mixedColor = color1.clone().lerp(color2, Math.random());
            colors[i * 3] = mixedColor.r;
            colors[i * 3 + 1] = mixedColor.g;
            colors[i * 3 + 2] = mixedColor.b;

            sizes[i] = Math.random() * 0.5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // Custom shader material for particles
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pixelRatio: { value: window.devicePixelRatio }
            },
            vertexShader: `
                uniform float time;
                uniform float pixelRatio;
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;

                // Simplex noise function would go here, but using simple sin waves for brevity

                void main() {
                    vColor = color;
                    vec3 pos = position;

                    // Organic movement
                    float noise = sin(pos.x * 0.05 + time) * cos(pos.z * 0.05 + time) * 2.0;
                    pos.y += noise;

                    // Spiral Twist
                    float angle = time * 0.1 + length(pos.xy) * 0.05;
                    float c = cos(angle);
                    float s = sin(angle);
                    mat2 rot = mat2(c, -s, s, c);
                    pos.xz = rot * pos.xz;

                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;

                void main() {
                    // Circular particle
                    vec2 center = gl_PointCoord - 0.5;
                    float dist = length(center);
                    if (dist > 0.5) discard;

                    float alpha = 1.0 - (dist * 2.0);
                    gl_FragColor = vec4(vColor, alpha * 0.8);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);


        // 2. Portals System
        this.portals = [];
        this.portalGroup = new THREE.Group();
        this.scene.add(this.portalGroup);

        this.createPortal('archive.html', new THREE.IcosahedronGeometry(1.5, 0), 0xffffff, 0, 0, -15, 'ARCHIVE');
        this.createPortal('editor.html', new THREE.TorusKnotGeometry(1, 0.3, 100, 16), 0x00ffff, 12, 0, -8, 'EDITOR');
        this.createPortal('rain.html', new THREE.BoxGeometry(2, 4, 2), 0x00ff00, -12, 0, -8, 'RAIN');
        this.createPortal('glitch.html', new THREE.OctahedronGeometry(1.5), 0xff00ff, 7, 5, -10, 'GLITCH');
        this.createPortal('noise.html', new THREE.SphereGeometry(1.5, 16, 16), 0x0000ff, -7, 5, -10, 'NOISE');
    }

    createPortal(url, geometry, color, x, y, z, label) {
        const material = new THREE.MeshBasicMaterial({
            color: color,
            wireframe: true,
            transparent: true,
            opacity: 0.5
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);

        // Inner core
        const coreGeo = geometry.clone();
        coreGeo.scale(0.5, 0.5, 0.5);
        const coreMat = new THREE.MeshBasicMaterial({ color: color });
        const core = new THREE.Mesh(coreGeo, coreMat);
        mesh.add(core);

        mesh.userData = { isPortal: true, url: url, label: label };
        core.userData = { isPortal: true, url: url, label: label };

        this.portalGroup.add(mesh);
        this.portals.push(mesh);

        // Create Label Element
        const div = document.createElement('div');
        div.className = 'portal-label';
        div.textContent = label;
        div.style.position = 'absolute';
        div.style.color = '#' + new THREE.Color(color).getHexString();
        div.style.fontFamily = 'monospace';
        div.style.fontWeight = 'bold';
        div.style.textShadow = '0 0 10px currentColor';
        div.style.pointerEvents = 'none';
        div.style.opacity = '0';
        div.style.transition = 'opacity 0.3s';
        document.body.appendChild(div);
        mesh.userData.labelElement = div;
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5, // Strength
            0.4, // Radius
            0.85 // Threshold
        );
        this.composer.addPass(bloomPass);
    }

    addEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });

        const startPrompt = document.getElementById('start-prompt');
        startPrompt.addEventListener('click', () => this.startExperience());
        startPrompt.addEventListener('touchstart', () => this.startExperience());

        // Raycaster click
        document.addEventListener('click', this.onClick.bind(this));
        document.addEventListener('touchstart', this.onClick.bind(this));
    }

    onTouchMove(event) {
        if (event.touches.length > 0) {
            event.preventDefault(); // Prevent scrolling
            const touch = event.touches[0];
            // Normalize touch coordinates similar to mouse
            this.targetMouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
            this.targetMouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

            if (this.started) {
                this.audioEngine.modulate(this.targetMouse.x, this.targetMouse.y);
            }
        }
    }

    startExperience() {
        if (this.started) return;
        this.started = true;

        // Audio init
        this.audioEngine.init();
        this.audioEngine.playDrone();

        // UI transition
        document.getElementById('ui-layer').style.opacity = '0';
        document.getElementById('start-prompt').style.display = 'none';

        // Fly-in Animation
        this.camera.position.z = 200;
        this.targetCameraZ = 15;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseMove(event) {
        // Normalize mouse coordinates
        this.targetMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.targetMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        if (this.started) {
            // Interactive Audio Modulation
            this.audioEngine.modulate(this.targetMouse.x, this.targetMouse.y);
        }
    }

    onClick(event) {
        if (!this.started) return;

        this.raycaster.setFromCamera(this.targetMouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            const object = intersects[0].object;
            if (object.userData.isPortal) {
                this.enterPortal(object.userData.url);
            }
        }
    }

    enterPortal(url) {
        // Visual effect for entering
        document.body.style.transition = "filter 1s ease";
        document.body.style.filter = "invert(1)";

        this.audioEngine.playEnterSound();

        // Fly into portal effect
        this.targetCameraZ = -50;

        setTimeout(() => {
            window.location.href = url;
        }, 1000);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const time = this.clock.getElapsedTime();
        const delta = this.clock.getDelta();

        // Smooth mouse interpolation
        this.mouse.lerp(this.targetMouse, 0.05);

        // Camera movement based on mouse
        this.camera.position.x += (this.mouse.x * 5 - this.camera.position.x) * 0.05;
        this.camera.position.y += (this.mouse.y * 5 - this.camera.position.y) * 0.05;

        // Always look at center
        this.camera.lookAt(0, 0, 0);

        if (this.started && this.targetCameraZ) {
            this.camera.position.z += (this.targetCameraZ - this.camera.position.z) * 0.02;
        }

        // Update Uniforms
        if (this.particles.material.uniforms) {
            this.particles.material.uniforms.time.value = time;
        }

        // Update Portals
        this.portals.forEach((portal, index) => {
            portal.rotation.x = time * 0.5 + index;
            portal.rotation.y = time * 0.3 + index;

            // Project label position
            if (portal.userData.labelElement) {
                const vector = portal.position.clone();
                vector.project(this.camera);

                const x = (vector.x * .5 + .5) * window.innerWidth;
                const y = (-(vector.y * .5) + .5) * window.innerHeight;

                const el = portal.userData.labelElement;
                el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
            }
        });

        // Raycasting for hover effects
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        let isHovering = false;

        // Reset all labels opacity
        this.portals.forEach(p => {
            if (p.userData.labelElement) p.userData.labelElement.style.opacity = '0.3';
            p.scale.setScalar(1);
        });

        if (intersects.length > 0) {
            const obj = intersects[0].object;
            // Traverse up to find the main mesh with userData
            let portal = obj;
            while(portal.parent && !portal.userData.isPortal) {
                portal = portal.parent;
            }

            if (portal.userData.isPortal) {
                isHovering = true;
                portal.scale.setScalar(1.2);
                if(portal.userData.labelElement) {
                    portal.userData.labelElement.style.opacity = '1';
                    portal.userData.labelElement.style.fontSize = '1.5rem';
                }
            }
        }

        // Cursor change on hover
        document.body.style.cursor = isHovering ? 'pointer' : 'crosshair';

        this.composer.render();
    }
}

// Initialize
new World();
