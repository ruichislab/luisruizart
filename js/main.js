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


        // 2. The Artifact (Portal to Legacy)
        const artifactGeo = new THREE.IcosahedronGeometry(2, 0);
        const artifactMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
            transparent: true,
            opacity: 0.5
        });
        this.artifact = new THREE.Mesh(artifactGeo, artifactMat);
        this.artifact.position.set(0, 0, 0);
        this.scene.add(this.artifact);

        // Artifact Core
        const coreGeo = new THREE.IcosahedronGeometry(1, 1);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        this.core = new THREE.Mesh(coreGeo, coreMat);
        this.artifact.add(this.core);

        // Add userData for raycasting identification
        this.artifact.userData = { isPortal: true, name: "ARCHIVE_PORTAL" };
        this.core.userData = { isPortal: true, name: "ARCHIVE_PORTAL" };
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

        // Camera animation hint (zoom in)
        // In a real app we might use GSAP, here simple interpolation in animate loop
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
                this.enterPortal();
            }
        }
    }

    enterPortal() {
        // Visual effect for entering
        document.body.style.transition = "filter 1s ease";
        document.body.style.filter = "invert(1)";

        this.audioEngine.playEnterSound();

        setTimeout(() => {
            window.location.href = 'archive.html';
        }, 1000);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const time = this.clock.getElapsedTime();
        const delta = this.clock.getDelta();

        // Smooth mouse interpolation
        this.mouse.lerp(this.targetMouse, 0.05);

        // Camera movement based on mouse
        this.camera.position.x += (this.mouse.x * 10 - this.camera.position.x) * 0.05;
        this.camera.position.y += (this.mouse.y * 10 - this.camera.position.y) * 0.05;
        this.camera.lookAt(this.scene.position);

        if (this.started && this.targetCameraZ) {
            this.camera.position.z += (this.targetCameraZ - this.camera.position.z) * 0.02;
        }

        // Update Uniforms
        if (this.particles.material.uniforms) {
            this.particles.material.uniforms.time.value = time;
        }

        // Rotate Artifact
        this.artifact.rotation.x = time * 0.5;
        this.artifact.rotation.y = time * 0.3;
        this.core.rotation.x = -time * 1;
        this.core.rotation.y = -time * 0.5;

        // Pulsate Artifact
        const scale = 1 + Math.sin(time * 2) * 0.1;
        this.core.scale.set(scale, scale, scale);

        // Raycasting for hover effects
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        let isHovering = false;
        if (intersects.length > 0) {
            if (intersects[0].object.userData.isPortal) {
                isHovering = true;
            }
        }

        // Cursor change on hover
        document.body.style.cursor = isHovering ? 'pointer' : 'crosshair';
        if (isHovering) {
            this.artifact.material.color.setHex(0x00ff00);
            this.core.material.color.setHex(0x00ff00);
        } else {
            this.artifact.material.color.setHex(0xffffff);
            this.core.material.color.setHex(0x00ffff);
        }

        this.composer.render();
    }
}

// Initialize
new World();
