/**
 * Three.js Refrigerator 3D Viewer & AR Simulator Engine
 * Generates a high-quality 3D refrigerator model procedurally and manages interactions.
 */

class Refrigerator3DViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;

        // Fridge Dimensions (in meters)
        this.fridgeWidth = 0.912;
        this.fridgeHeight = 1.853;
        this.fridgeDepth = 0.673;
        this.doorThickness = 0.04;
        
        // Colors mapping
        this.colors = {
            silver: {
                body: 0xa0a0a0,
                doors: 0xdcdcdc,
                roughness: 0.25,
                metalness: 0.8
            },
            navy: {
                body: 0x0c1424,
                doors: 0x112b54,
                roughness: 0.1,
                metalness: 0.55 // glass-like shine
            },
            charcoal: {
                body: 0x1f1f1f,
                doors: 0x2e2e2e,
                roughness: 0.35,
                metalness: 0.7
            }
        };

        this.currentStyle = 'silver';
        this.doorOpenProgress = 0; // 0 to 1
        this.dimensionsVisible = true;
        this.arModeActive = false;

        this.init();
        this.buildScene();
        this.animate();

        // Handle Resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = null; // transparent background so we can show camera/images in AR mode

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 10);
        this.camera.position.set(1.5, 1.2, 2.2); // angled front view

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
        this.container.appendChild(this.renderer.domElement);

        // Orbit Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 + 0.05; // prevent going below floor
        this.controls.minDistance = 0.8;
        this.controls.maxDistance = 5;
        this.controls.target.set(0, this.fridgeHeight / 2, 0);

        // Lights
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.dirLight.position.set(2, 4, 3);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 1024;
        this.dirLight.shadow.mapSize.height = 1024;
        this.dirLight.shadow.camera.near = 0.5;
        this.dirLight.shadow.camera.far = 10;
        this.dirLight.shadow.bias = -0.001;
        this.scene.add(this.dirLight);

        // Fill Light
        this.fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
        this.fillLight.position.set(-2, 2, -1);
        this.scene.add(this.fillLight);
    }

    buildScene() {
        // Root group for the refrigerator, lets us move/scale it in AR easily
        this.fridgeGroup = new THREE.Group();
        this.scene.add(this.fridgeGroup);

        // Ground Shadow/Plane (visible in normal 3D mode, invisible in AR)
        const shadowGeo = new THREE.PlaneGeometry(3, 3);
        const shadowMat = new THREE.ShadowMaterial({ opacity: 0.2 });
        this.floorPlane = new THREE.Mesh(shadowGeo, shadowMat);
        this.floorPlane.rotation.x = -Math.PI / 2;
        this.floorPlane.position.y = 0;
        this.floorPlane.receiveShadow = true;
        this.scene.add(this.floorPlane);

        // Grid helper (visual aid in normal mode)
        this.gridHelper = new THREE.GridHelper(3, 30, 0x94a3b8, 0xe2e8f0);
        this.gridHelper.position.y = 0.001;
        this.scene.add(this.gridHelper);

        // CREATE FRIDGE MODEL
        this.createFridgeGeometry();

        // DIMENSIONS DISPLAY
        this.dimensionsGroup = new THREE.Group();
        this.fridgeGroup.add(this.dimensionsGroup);
        this.createDimensionIndicators();
    }

    createFridgeGeometry() {
        // Common materials
        this.bodyMaterial = new THREE.MeshStandardMaterial({
            color: this.colors[this.currentStyle].body,
            roughness: this.colors[this.currentStyle].roughness,
            metalness: this.colors[this.currentStyle].metalness
        });

        this.doorMaterial = new THREE.MeshStandardMaterial({
            color: this.colors[this.currentStyle].doors,
            roughness: this.colors[this.currentStyle].roughness - 0.05,
            metalness: this.colors[this.currentStyle].metalness + 0.05
        });

        const interiorMaterial = new THREE.MeshStandardMaterial({
            color: 0xfafafa,
            roughness: 0.2,
            metalness: 0.1
        });

        const shelfMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
            roughness: 0.1,
            transmission: 0.9,
            thickness: 0.02
        });

        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.1,
            metalness: 0.9
        });

        // 1. REFRIGERATOR BODY (Outer casing)
        // We make a hollow box by building the back, sides, top, and bottom.
        const bodyThickness = 0.04;
        this.bodyGroup = new THREE.Group();
        this.fridgeGroup.add(this.bodyGroup);

        // Back wall
        const backWall = new THREE.Mesh(
            new THREE.BoxGeometry(this.fridgeWidth, this.fridgeHeight, bodyThickness),
            this.bodyMaterial
        );
        backWall.position.set(0, this.fridgeHeight / 2, -this.fridgeDepth / 2 + bodyThickness / 2);
        backWall.castShadow = true;
        this.bodyGroup.add(backWall);

        // Left wall
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(bodyThickness, this.fridgeHeight, this.fridgeDepth - bodyThickness),
            this.bodyMaterial
        );
        leftWall.position.set(-this.fridgeWidth / 2 + bodyThickness / 2, this.fridgeHeight / 2, bodyThickness / 2);
        leftWall.castShadow = true;
        this.bodyGroup.add(leftWall);

        // Right wall
        const rightWall = leftWall.clone();
        rightWall.position.x = this.fridgeWidth / 2 - bodyThickness / 2;
        this.bodyGroup.add(rightWall);

        // Top cap
        const topCap = new THREE.Mesh(
            new THREE.BoxGeometry(this.fridgeWidth, bodyThickness, this.fridgeDepth),
            this.bodyMaterial
        );
        topCap.position.set(0, this.fridgeHeight - bodyThickness / 2, 0);
        topCap.castShadow = true;
        this.bodyGroup.add(topCap);

        // Bottom cap
        const bottomCap = new THREE.Mesh(
            new THREE.BoxGeometry(this.fridgeWidth, bodyThickness, this.fridgeDepth),
            this.bodyMaterial
        );
        bottomCap.position.set(0, bodyThickness / 2, 0);
        bottomCap.castShadow = true;
        this.bodyGroup.add(bottomCap);

        // Partition shelf (splits upper and lower compartments)
        const partitionY = 0.75; // height of freezer separation
        const partition = new THREE.Mesh(
            new THREE.BoxGeometry(this.fridgeWidth - bodyThickness * 2, bodyThickness, this.fridgeDepth - bodyThickness * 2),
            interiorMaterial
        );
        partition.position.set(0, partitionY, bodyThickness / 2);
        this.bodyGroup.add(partition);

        // 2. COMPARTMENT INTERIORS (Inside white walls & shelves)
        // Upper compartment shelves
        const shelfW = this.fridgeWidth - bodyThickness * 2;
        const shelfD = this.fridgeDepth - bodyThickness * 2.5;
        const upperHeight = this.fridgeHeight - partitionY - bodyThickness;
        const shelfSpacing = upperHeight / 4;

        for (let i = 1; i <= 3; i++) {
            const shelf = new THREE.Mesh(new THREE.BoxGeometry(shelfW, 0.015, shelfD), shelfMaterial);
            shelf.position.set(0, partitionY + bodyThickness / 2 + i * shelfSpacing, bodyThickness / 2);
            this.bodyGroup.add(shelf);
        }

        // Lower compartment shelves
        const lowerHeight = partitionY - bodyThickness;
        const lowerSpacing = lowerHeight / 3;
        for (let i = 1; i <= 2; i++) {
            const shelf = new THREE.Mesh(new THREE.BoxGeometry(shelfW, 0.015, shelfD), shelfMaterial);
            shelf.position.set(0, bodyThickness / 2 + i * lowerSpacing, bodyThickness / 2);
            this.bodyGroup.add(shelf);
        }

        // Interior Back Panel (metallic detail inside)
        const interiorBack = new THREE.Mesh(
            new THREE.BoxGeometry(shelfW, this.fridgeHeight - bodyThickness * 2, 0.005),
            new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.1, metalness: 0.9 })
        );
        interiorBack.position.set(0, this.fridgeHeight / 2, -this.fridgeDepth / 2 + bodyThickness + 0.003);
        this.bodyGroup.add(interiorBack);

        // Interior light source (LED strip at top back)
        this.interiorLight = new THREE.PointLight(0xffffff, 0, 1.5);
        this.interiorLight.position.set(0, this.fridgeHeight - 0.15, 0.1);
        this.fridgeGroup.add(this.interiorLight);

        const ledStrip = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.02, 0.06),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        ledStrip.position.set(0, this.fridgeHeight - bodyThickness - 0.01, 0);
        this.bodyGroup.add(ledStrip);

        // 3. DOORS (Interactive Hinge Groups)
        const upperDoorHeight = this.fridgeHeight - partitionY;
        const lowerDoorHeight = partitionY;

        // A. Upper Left Door (hinge at bottom left corner of upper partition)
        this.hingeUpperLeft = new THREE.Group();
        this.hingeUpperLeft.position.set(-this.fridgeWidth / 2, partitionY + upperDoorHeight / 2, this.fridgeDepth / 2 - this.doorThickness / 2);
        this.fridgeGroup.add(this.hingeUpperLeft);

        const leftDoorMesh = new THREE.Mesh(
            new THREE.BoxGeometry(this.fridgeWidth / 2 - 0.002, upperDoorHeight - 0.004, this.doorThickness),
            this.doorMaterial
        );
        leftDoorMesh.position.set(this.fridgeWidth / 4, 0, this.doorThickness / 2);
        leftDoorMesh.castShadow = true;
        this.hingeUpperLeft.add(leftDoorMesh);

        // B. Upper Right Door (hinge at bottom right corner of upper partition)
        this.hingeUpperRight = new THREE.Group();
        this.hingeUpperRight.position.set(this.fridgeWidth / 2, partitionY + upperDoorHeight / 2, this.fridgeDepth / 2 - this.doorThickness / 2);
        this.fridgeGroup.add(this.hingeUpperRight);

        const rightDoorMesh = new THREE.Mesh(
            new THREE.BoxGeometry(this.fridgeWidth / 2 - 0.002, upperDoorHeight - 0.004, this.doorThickness),
            this.doorMaterial
        );
        rightDoorMesh.position.set(-this.fridgeWidth / 4, 0, this.doorThickness / 2);
        rightDoorMesh.castShadow = true;
        this.hingeUpperRight.add(rightDoorMesh);

        // Add visual Touchscreen Panel to Upper Right Door front
        const ledScreenGeo = new THREE.BoxGeometry(0.18, 0.28, 0.002);
        const ledScreenMat = new THREE.MeshStandardMaterial({
            color: 0x050505,
            roughness: 0.05,
            metalness: 0.9,
            emissive: 0x001a1a
        });
        const ledScreen = new THREE.Mesh(ledScreenGeo, ledScreenMat);
        ledScreen.position.set(-this.fridgeWidth / 4 + 0.08, 0.1, this.doorThickness / 2 + 0.002);
        this.hingeUpperRight.add(ledScreen);

        // Tiny glowing temperature indicator
        const ledTextGeo = new THREE.BoxGeometry(0.06, 0.02, 0.001);
        const ledTextMat = new THREE.MeshBasicMaterial({ color: 0x00f3f3 });
        const ledText = new THREE.Mesh(ledTextGeo, ledTextMat);
        ledText.position.set(-this.fridgeWidth / 4 + 0.08, 0.18, this.doorThickness / 2 + 0.004);
        this.hingeUpperRight.add(ledText);

        // C. Bottom Drawer (Slides forward)
        this.bottomDrawerGroup = new THREE.Group();
        // Base coordinate is center bottom of drawer
        this.bottomDrawerGroup.position.set(0, lowerDoorHeight / 2, this.fridgeDepth / 2 - this.doorThickness / 2);
        this.fridgeGroup.add(this.bottomDrawerGroup);

        const drawerFrontMesh = new THREE.Mesh(
            new THREE.BoxGeometry(this.fridgeWidth - 0.002, lowerDoorHeight - 0.004, this.doorThickness),
            this.doorMaterial
        );
        drawerFrontMesh.position.set(0, 0, this.doorThickness / 2);
        drawerFrontMesh.castShadow = true;
        this.bottomDrawerGroup.add(drawerFrontMesh);

        // Inner storage box of drawer (the tub that slides out)
        const tubW = shelfW - 0.02;
        const tubH = lowerDoorHeight - 0.15;
        const tubD = shelfD;
        const tubMesh = new THREE.Mesh(
            new THREE.BoxGeometry(tubW, tubH, tubD),
            interiorMaterial
        );
        tubMesh.position.set(0, -0.05, -tubD / 2);
        this.bottomDrawerGroup.add(tubMesh);

        // Handle Details (Recessed slots or black bars)
        const handleLeft = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.015), handleMaterial);
        handleLeft.position.set(this.fridgeWidth / 4 - 0.03, -0.1, this.doorThickness / 2 + 0.01);
        this.hingeUpperLeft.add(handleLeft);

        const handleRight = handleLeft.clone();
        handleRight.position.x = -this.fridgeWidth / 4 + 0.03;
        this.hingeUpperRight.add(handleRight);

        const handleDrawer = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.015), handleMaterial);
        handleDrawer.position.set(0, lowerDoorHeight / 2 - 0.08, this.doorThickness / 2 + 0.01);
        this.bottomDrawerGroup.add(handleDrawer);

        // Store references for materials so we can swap styles easily
        this.modelMeshes = {
            body: [backWall, leftWall, rightWall, topCap, bottomCap],
            doors: [leftDoorMesh, rightDoorMesh, drawerFrontMesh]
        };
    }

    createDimensionIndicators() {
        const lineMaterial = new THREE.LineDashedMaterial({
            color: 0x0f52ba,
            dashSize: 0.04,
            gapSize: 0.02,
            linewidth: 2 // WebGL limit ignores this on some systems, so we keep lines thin
        });

        // 1. WIDTH LINE (Bottom Front)
        const wPoints = [
            new THREE.Vector3(-this.fridgeWidth / 2 - 0.05, 0.01, this.fridgeDepth / 2 + 0.05),
            new THREE.Vector3(this.fridgeWidth / 2 + 0.05, 0.01, this.fridgeDepth / 2 + 0.05)
        ];
        const wGeo = new THREE.BufferGeometry().setFromPoints(wPoints);
        const wLine = new THREE.Line(wGeo, lineMaterial);
        wLine.computeLineDistances();
        this.dimensionsGroup.add(wLine);

        // Width Label
        const wLabel = this.createTextSprite('91.2 cm', '#0f52ba');
        wLabel.position.set(0, -0.06, this.fridgeDepth / 2 + 0.05);
        this.dimensionsGroup.add(wLabel);

        // 2. HEIGHT LINE (Left Side Front)
        const hPoints = [
            new THREE.Vector3(-this.fridgeWidth / 2 - 0.05, 0, this.fridgeDepth / 2 + 0.05),
            new THREE.Vector3(-this.fridgeWidth / 2 - 0.05, this.fridgeHeight, this.fridgeDepth / 2 + 0.05)
        ];
        const hGeo = new THREE.BufferGeometry().setFromPoints(hPoints);
        const hLine = new THREE.Line(hGeo, lineMaterial);
        hLine.computeLineDistances();
        this.dimensionsGroup.add(hLine);

        // Height Label
        const hLabel = this.createTextSprite('185.3 cm', '#0f52ba');
        hLabel.position.set(-this.fridgeWidth / 2 - 0.16, this.fridgeHeight / 2, this.fridgeDepth / 2 + 0.05);
        this.dimensionsGroup.add(hLabel);

        // 3. DEPTH LINE (Bottom Right Side)
        const dPoints = [
            new THREE.Vector3(this.fridgeWidth / 2 + 0.05, 0.01, -this.fridgeDepth / 2),
            new THREE.Vector3(this.fridgeWidth / 2 + 0.05, 0.01, this.fridgeDepth / 2)
        ];
        const dGeo = new THREE.BufferGeometry().setFromPoints(dPoints);
        const dLine = new THREE.Line(dGeo, lineMaterial);
        dLine.computeLineDistances();
        this.dimensionsGroup.add(dLine);

        // Depth Label
        const dLabel = this.createTextSprite('67.3 cm', '#0f52ba');
        dLabel.position.set(this.fridgeWidth / 2 + 0.12, 0.05, 0);
        this.dimensionsGroup.add(dLabel);
    }

    createTextSprite(text, colorHex) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        // Draw rounded capsule backdrop
        ctx.beginPath();
        ctx.roundRect(40, 10, 176, 44, 22);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = colorHex;
        ctx.stroke();

        ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = colorHex;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(0.65, 0.16, 1);
        return sprite;
    }

    setStyle(styleName) {
        if (!this.colors[styleName]) return;
        this.currentStyle = styleName;

        const theme = this.colors[styleName];
        this.bodyMaterial.color.setHex(theme.body);
        this.bodyMaterial.roughness = theme.roughness;
        this.bodyMaterial.metalness = theme.metalness;

        this.doorMaterial.color.setHex(theme.doors);
        this.doorMaterial.roughness = theme.roughness - 0.05;
        this.doorMaterial.metalness = theme.metalness + 0.05;
    }

    setDoorOpen(progress) {
        this.doorOpenProgress = Math.max(0, Math.min(1, progress));
        
        // Handle interior light turning on as doors open
        if (this.doorOpenProgress > 0.05) {
            this.interiorLight.intensity = this.doorOpenProgress * 2.5;
            document.getElementById('fridge-interior-badge')?.classList.remove('hidden');
        } else {
            this.interiorLight.intensity = 0;
            document.getElementById('fridge-interior-badge')?.classList.add('hidden');
        }
    }

    setDimensionsVisible(visible) {
        this.dimensionsVisible = visible;
        this.dimensionsGroup.visible = visible;
    }

    setARMode(active) {
        this.arModeActive = active;
        if (active) {
            // Hide ground visual helpers
            this.gridHelper.visible = false;
            this.floorPlane.visible = false;
            this.camera.position.set(0, 1.0, 2.5); // lower angle for looking from floor standing point
            this.controls.target.set(0, this.fridgeHeight / 2, 0);
        } else {
            // Restore normal 3D view helpers
            this.gridHelper.visible = true;
            this.floorPlane.visible = true;
            this.fridgeGroup.position.set(0, 0, 0);
            this.fridgeGroup.rotation.set(0, 0, 0);
            this.fridgeGroup.scale.set(1, 1, 1);
        }
    }

    resetView() {
        this.camera.position.set(1.5, 1.2, 2.2);
        this.controls.target.set(0, this.fridgeHeight / 2, 0);
        this.fridgeGroup.position.set(0, 0, 0);
        this.fridgeGroup.rotation.set(0, 0, 0);
        this.fridgeGroup.scale.set(1, 1, 1);
        this.setDoorOpen(0);
        document.getElementById('door-open-slider').value = 0;
        document.getElementById('door-angle-text').textContent = 'Đang đóng (0%)';
        document.getElementById('btn-quick-close').classList.add('active');
        document.getElementById('btn-quick-open').classList.remove('active');
    }

    onWindowResize() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;

        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(this.width, this.height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Smooth door animations
        // Left door swings to Y rotation of -125 degrees (-2.18 rad)
        const targetLeftRot = -this.doorOpenProgress * 2.18;
        this.hingeUpperLeft.rotation.y = THREE.MathUtils.lerp(this.hingeUpperLeft.rotation.y, targetLeftRot, 0.1);

        // Right door swings to Y rotation of 125 degrees (2.18 rad)
        const targetRightRot = this.doorOpenProgress * 2.18;
        this.hingeUpperRight.rotation.y = THREE.MathUtils.lerp(this.hingeUpperRight.rotation.y, targetRightRot, 0.1);

        // Drawer slides out in Z axis by 0.35m
        const targetDrawerSlide = this.doorOpenProgress * 0.35;
        this.bottomDrawerGroup.position.z = THREE.MathUtils.lerp(
            this.bottomDrawerGroup.position.z,
            (this.fridgeDepth / 2 - this.doorThickness / 2) + targetDrawerSlide,
            0.1
        );

        // Update controls
        this.controls.update();

        // Render
        this.renderer.render(this.scene, this.camera);
    }
}
