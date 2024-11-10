import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';

//////////////////////////////////////////////////////////
//  Constants and Configuration
//////////////////////////////////////////////////////////
const ObjectTypes = {
    OBSTACLE: 'obstacle',    
    PLATFORM: 'platform',    
    HAZARD: 'hazard',       
    COLLECTIBLE: 'collectible',
    WATER: 'water'
};

const PHYSICS_CONFIG = {
    gravity: 0.002,
    platformGravity: 0.001,
    groundLevel: -0.5,
    jumpCooldown: 500, // ms
    platformFriction: 0.8,
    groundFriction: 0.95,
    stickyForce: 0.5  
}

//////////////////////////////////////////////////////////
//  Core Scene Setup
//////////////////////////////////////////////////////////
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

// Renderer configuration
function initRenderer() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
}

//////////////////////////////////////////////////////////
//  Asset Loaders
//////////////////////////////////////////////////////////
const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();

// Texture loading utility
function loadTexture(path, options = {}) {
    const texture = textureLoader.load(path);
    if (options.repeat) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(options.repeat.x, options.repeat.y);
    }
    if (options.rotation) {
        texture.rotation = options.rotation;
    }
    if (options.center) {
        texture.center.set(options.center.x, options.center.y);
    }
    if (options.offset) {
        texture.offset.set(options.offset.x, options.offset.y);
    }
    return texture;
}

// New transparent texture loading utility
function loadTransparentTexture(path, options = {}) {
    const texture = textureLoader.load(path);
    if (options.repeat) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(options.repeat.x, options.repeat.y);
    }
    // Enable mipmapping and set correct filter
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    // Prevent texture bleeding
    texture.premultiplyAlpha = true;
    return texture;
}

//////////////////////////////////////////////////////////
//  Scene Classes
//////////////////////////////////////////////////////////
class SceneObject {
    constructor(mesh, type, objectType = ObjectTypes.OBSTACLE, bounds = { radius: 1 }) {
        this.mesh = mesh;
        this.type = type;
        this.objectType = objectType;
        this.bounds = bounds;
        this.velocity = new THREE.Vector3(0, 0, 0);
        
        if (type === 'sphere') {
            this.animationState = new TurtleState(mesh);
        }

        // Create bounding geometry and helper
        switch (type) {
            case 'box':
                this.boundingBox = new THREE.Box3();
                this.updateBoundingBox();
//                this.helper = new THREE.Box3Helper(this.boundingBox, 0xff0000);
                break;
            case 'cylinder':
                // Create a cylindrical helper
                const geometry = new THREE.CylinderGeometry(bounds.radius, bounds.radius, bounds.height, 16, 1, true);
                const material = new THREE.LineBasicMaterial({ color: 0xff0000, wireframe: true });
/*                this.helper = new THREE.LineSegments(
                    new THREE.WireframeGeometry(geometry),
                    material
                );
                this.helper.matrix = mesh.matrix;
                this.helper.matrixAutoUpdate = false;*/
                break;
            case 'sphere':
                // Create a spherical helper
                const sphereGeom = new THREE.SphereGeometry(bounds.radius, 16, 16);
                const sphereMat = new THREE.LineBasicMaterial({ color: 0xff0000, wireframe: true });
                /*this.helper = new THREE.LineSegments(
                    new THREE.WireframeGeometry(sphereGeom),
                    sphereMat
                );*/
                break;
        }
    }

    addToScene(scene) {
        if (this.helper) {
            scene.add(this.helper);
            // Update helper position to match mesh
            this.helper.position.copy(this.mesh.position);
            this.helper.rotation.copy(this.mesh.rotation);
            this.helper.updateMatrix();
        }
    }

    removeFromScene(scene) {
        if (this.helper) {
            scene.remove(this.helper);
        }
    }

    updateBoundingBox() {
        if (this.type === 'box') {
            this.boundingBox.setFromObject(this.mesh);
        }
    }

    updateMatrix() {
        this.mesh.updateMatrix();
        this.mesh.updateMatrixWorld(true);
        
        // Update helper position and rotation
        if (this.helper) {
            switch (this.type) {
                case 'box':
                    this.updateBoundingBox();
                    this.helper.updateMatrixWorld(true);
                    break;
                case 'cylinder':
                case 'sphere':
                    this.helper.position.copy(this.mesh.position);
                    this.helper.rotation.copy(this.mesh.rotation);
                    this.helper.updateMatrix();
                    break;
            }
        }
    }

    checkCollision(position, playerSize = { width: 1, height: 1, depth: 1 }) {
        this.updateMatrix();
        const objectPos = this.mesh.position;
        
        switch (this.type) {
            case 'sphere': {
                const distance = position.distanceTo(objectPos);
                const collisionRadius = this.bounds.radius + Math.max(playerSize.width, playerSize.depth) / 2;
                return {
                    collides: distance < collisionRadius,
                    type: this.objectType,
                    normal: position.clone().sub(objectPos).normalize(),
                    depth: collisionRadius - distance,
                    onTop: false
                };
            }
            
            case 'cylinder': {
                const localMatrix = this.mesh.matrix.clone().invert();
                const localPos = position.clone().applyMatrix4(localMatrix);
                
                const radialDist = Math.sqrt(localPos.x * localPos.x + localPos.z * localPos.z);
                const heightDiff = Math.abs(localPos.y);
                
                const radiusCollision = radialDist < (this.bounds.radius + playerSize.width / 2);
                const heightCollision = heightDiff < (this.bounds.height / 2 + playerSize.height / 2);
                
                const onTop = radiusCollision && 
                            Math.abs(heightDiff - (this.bounds.height / 2 + playerSize.height / 2)) < 0.1;
                
                if (radiusCollision && heightCollision) {
                    const normal = new THREE.Vector3(localPos.x, 0, localPos.z)
                        .normalize()
                        .applyMatrix4(this.mesh.matrix)
                        .sub(this.mesh.position)
                        .normalize();
                    
                    return {
                        collides: true,
                        type: this.objectType,
                        normal: normal,
                        depth: this.bounds.radius + playerSize.width / 2 - radialDist,
                        onTop: onTop
                    };
                }
                return { collides: false, onTop: false };
            }
            
            case 'box': {
                this.updateBoundingBox();
                const playerBox = new THREE.Box3().setFromCenterAndSize(
                    position,
                    new THREE.Vector3(playerSize.width, playerSize.height, playerSize.depth)
                );
                
                if (this.boundingBox.intersectsBox(playerBox)) {
                    const thisCenter = new THREE.Vector3();
                    this.boundingBox.getCenter(thisCenter);
                    const normal = position.clone().sub(thisCenter).normalize();
                    
                    const onTop = position.y > thisCenter.y + (this.bounds.height / 2 - 0.1);
                    
                    return {
                        collides: true,
                        type: this.objectType,
                        normal: normal,
                        depth: 0.1,
                        onTop: onTop
                    };
                }
                return { collides: false, onTop: false };
            }
        }
        return { collides: false, onTop: false };
    }
    update(deltaTime) {
        if (this.animationState) {
            this.animationState.update(deltaTime);
        }
    }
}

class SceneManager {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
    }

    addObject(mesh, type, objectType = ObjectTypes.OBSTACLE, bounds) {
        const object = new SceneObject(mesh, type, objectType, bounds);
        this.objects.push(object);
        this.scene.add(mesh);
        object.addToScene(this.scene);
        return object;
    }

    removeObject(object) {
        const index = this.objects.indexOf(object);
        if (index > -1) {
            object.removeFromScene(this.scene);
            this.objects.splice(index, 1);
            this.scene.remove(object.mesh);
        }
    }

    checkCollisions(position, playerSize = { width: 1, height: 1, depth: 1 }) {
        const collisions = [];
        
        for (const object of this.objects) {
            const collision = object.checkCollision(position, playerSize);
            if (collision.collides) {
                collisions.push({
                    object: object,
                    ...collision
                });
            }
        }
        
        return collisions;
    }

    checkSupport(position, playerSize = { width: 1, height: 1, depth: 1 }) {
        const checkPos = position.clone();
        checkPos.y -= 0.1;
        
        const collisions = this.checkCollisions(checkPos, playerSize);
        return collisions.some(collision => 
            collision.type === ObjectTypes.PLATFORM && collision.onTop ||
            collision.type === ObjectTypes.OBSTACLE && collision.onTop
        );
    }

    handleCollisions(playerSystem, collisions) {
        let onPlatform = false;
        let inWater = false;
        let hitHazard = false;
        let platformVelocity = null;
        
        // First pass: check for platforms and water
        for (const collision of collisions) {
            if (collision.type === ObjectTypes.PLATFORM && collision.onTop) {
                onPlatform = true;
                platformVelocity = collision.object.velocity.clone();
                playerSystem.position.y = collision.object.mesh.position.y + 
                                       collision.object.bounds.height / 2 + 0.5;
            }
        }

        // Second pass: check for hazards and water
        for (const collision of collisions) {
            switch (collision.type) {
                case ObjectTypes.WATER:
                    if (!onPlatform) {
                        inWater = true;
                    }
                    break;

                case ObjectTypes.HAZARD:
                    hitHazard = true;
                    break;
                    
                case ObjectTypes.PLATFORM:
                    if (!collision.onTop) {
                        playerSystem.position.add(
                            collision.normal.multiplyScalar(collision.depth)
                        );
                    }
                    break;
                    
                case ObjectTypes.COLLECTIBLE:
                    this.removeObject(collision.object);
                    break;
            }
        }
        
        // Handle death conditions
        if ((inWater && !onPlatform) || hitHazard) {
            playerSystem.die();
        }
        
        return { onPlatform, platformVelocity };
    }
}

//////////////////////////////////////////////////////////
//  Player System
//////////////////////////////////////////////////////////
class PlayerSystem {
    constructor(scene, initialPosition) {
        this.scene = scene;
        this.createPlayerMesh(scene);
        this.initializeState(initialPosition);
        this.setupInputHandling();
        this.isDying = false;
        this.deathAnimationTime = 0;
        this.deathAnimationDuration = 1.0;
        this.invulnerable = false;
        this.loadPlayerModel();
    }

    createPlayerMesh(scene) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x00ff00,
            shininess: 60,
            specular: 0x004400
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        scene.add(this.mesh);
    }
    loadPlayerModel() {
        const loader = new PLYLoader();
        
        loader.load(
            'textures/frog.ply',
            (geometry) => {
                // Scale the geometry if needed
                let s = 0.33;
                geometry.scale(s, s, s);  // Adjust scale as needed

                // Center the geometry if needed
                geometry.center();

                geometry.rotateX(Math.PI / -2);

                // Compute vertex normals if they're not included in the PLY
                geometry.computeVertexNormals();

                // Create custom material
                const material = new THREE.MeshPhongMaterial({
                    color: 0x55ff55,
                    shininess: 30,
                    specular: 0x444444,
                });

                // Create the mesh
                const plyMesh = new THREE.Mesh(geometry, material);
                plyMesh.castShadow = true;
                plyMesh.receiveShadow = true;

                // Replace the cube with the loaded model
                this.scene.remove(this.mesh);  // Now this.scene is defined
                this.mesh = plyMesh;
                this.scene.add(this.mesh);

                // Position the new mesh at the current position
                this.mesh.position.copy(this.position);
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.error('Error loading PLY:', error);
            }
        );
    }

    initializeState(initialPosition) {
        this.position = initialPosition.clone();
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.startPosition = initialPosition.clone();
        
        // Adjust movement parameters
        this.state = {
            speed: 0.015,        // Increased base speed for better control
            friction: PHYSICS_CONFIG.groundFriction,
            isJumping: false,
            jumpVelocity: 0.06,
            jumpCooldown: false,
            isOnPlatform: false  // New state to track platform contact
        };
    }

    setupInputHandling() {
        this.keys = {
            ArrowLeft: false,
            ArrowRight: false,
            ArrowUp: false,
            ArrowDown: false,
            Space: false
        };

        window.addEventListener('keydown', (e) => {
            if (this.keys.hasOwnProperty(e.code)) {
                this.keys[e.code] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.keys.hasOwnProperty(e.code)) {
                this.keys[e.code] = false;
            }
        });
    }

    die() {
        if (!this.isDying && !this.invulnerable) {
            this.isDying = true;
            this.deathAnimationTime = 0;
            // Optional: Play sound or particle effect
        }
    }

    handleDeath(deltaTime) {
        this.deathAnimationTime += deltaTime;
        
        // Death animation (spin and sink)
        this.mesh.rotation.y += 10 * deltaTime;
        this.mesh.position.y -= 2 * deltaTime;
        
        if (this.deathAnimationTime >= this.deathAnimationDuration) {
            this.isDying = false;
            this.reset();
        }
    }

    reset() {
        this.position.copy(this.startPosition);
        this.velocity.set(0, 0, 0);
        this.state.isJumping = false;
        this.state.jumpCooldown = false;
        this.mesh.rotation.set(0, 0, 0);
        this.mesh.position.copy(this.startPosition);
        
        // Add brief invulnerability after reset
        this.invulnerable = true;
        setTimeout(() => {
            this.invulnerable = false;
        }, 1000); // 1 second of invulnerability
    }

    handleJump() {
        if (!this.state.jumpCooldown) {  
            this.velocity.y = this.state.jumpVelocity;
            this.state.isJumping = true;
            this.state.jumpCooldown = true;
            this.state.isOnPlatform = false;  // Clear platform state when jumping

            setTimeout(() => {
                this.state.jumpCooldown = false;
            }, PHYSICS_CONFIG.jumpCooldown);
        }
    }

    update(deltaTime, sceneManager) {
        if (this.isDying) {
            this.handleDeath(deltaTime);
            return;
        }

        const nextPosition = this.position.clone();
        
        // Handle input with more controlled velocities
        const moveSpeed = this.state.isOnPlatform ? this.state.speed * 1.2 : this.state.speed;
        
        if (this.keys.ArrowLeft) this.velocity.x = Math.max(this.velocity.x - moveSpeed, -0.2);
        if (this.keys.ArrowRight) this.velocity.x = Math.min(this.velocity.x + moveSpeed, 0.2);
        if (this.keys.ArrowUp) this.velocity.z = Math.max(this.velocity.z - moveSpeed, -0.2);
        if (this.keys.ArrowDown) this.velocity.z = Math.min(this.velocity.z + moveSpeed, 0.2);
        
        // Handle jumping
        if (this.keys.Space) {
            this.handleJump();
        }

        // Check for support
        const isSupported = nextPosition.y <= PHYSICS_CONFIG.groundLevel + 0.5 || 
                           sceneManager.checkSupport(nextPosition, {
                               width: 1,
                               height: 1,
                               depth: 1
                           });

        // Apply gravity or sticky force
        if (!isSupported) {
            this.velocity.y -= PHYSICS_CONFIG.gravity;
            this.state.isOnPlatform = false;
        } else if (this.state.isOnPlatform && !this.state.isJumping) {
            // Apply sticky force when on platform and not jumping
            this.velocity.y = -PHYSICS_CONFIG.stickyForce;
        }

        nextPosition.add(this.velocity);

        // Ground collision
        if (nextPosition.y <= PHYSICS_CONFIG.groundLevel + 0.5) {
            nextPosition.y = PHYSICS_CONFIG.groundLevel + 0.5;
            this.velocity.y = 0;
            this.state.isJumping = false;
            this.state.isOnPlatform = false;
        }

        // Object collisions
        const collisions = sceneManager.checkCollisions(nextPosition, {
            width: 1,
            height: 1,
            depth: 1
        });

        this.position.copy(nextPosition);
        
        if (collisions.length > 0) {
            const { onPlatform, platformVelocity } = sceneManager.handleCollisions(this, collisions);
            
            if (onPlatform && !this.state.isJumping) {  // Don't stick to platform if jumping
                this.state.isOnPlatform = true;
                
                // Apply platform velocity
                if (platformVelocity) {
                    // More direct platform velocity transfer
                    platformVelocity.multiplyScalar(0.95);
                    this.position.add(platformVelocity);
                }

                // Only zero out downward velocity
                if (this.velocity.y < 0) {
                    this.velocity.y = 0;
                }
            }
        } else {
            // Only clear platform state if we're not jumping
            // This prevents clearing it during a jump
            if (!this.state.isJumping) {
                this.state.isOnPlatform = false;
            }
        }

        // Update mesh
        this.mesh.position.copy(this.position);
        if (this.velocity.lengthSq() > 0.0001) {
            this.mesh.rotation.y = Math.atan2(this.velocity.x, this.velocity.z);
        }

        // Apply appropriate friction
        const frictionCoeff = this.state.isOnPlatform ? 
            PHYSICS_CONFIG.platformFriction : 
            PHYSICS_CONFIG.groundFriction;
        
        // Apply friction only to player's own velocity, not platform movement
        if (!this.keys.ArrowLeft && !this.keys.ArrowRight) {
            this.velocity.x *= frictionCoeff;
        }
        if (!this.keys.ArrowUp && !this.keys.ArrowDown) {
            this.velocity.z *= frictionCoeff;
        }

        // Clear jumping state if we've landed on something
        if (this.state.isJumping && isSupported && this.velocity.y <= 0) {
            this.state.isJumping = false;
        }
    }
}

//////////////////////////////////////////////////////////
//  Camera System
//////////////////////////////////////////////////////////
class CameraSystem {
    constructor(camera, playerSystem) {  // Change to take playerSystem instead of just target
        this.camera = camera;
        this.playerSystem = playerSystem;  // Store reference to player system
        this.offset = new THREE.Vector3(0, 3, 10);
        this.setupCamera();
    }

    setupCamera() {
        this.camera.position.set(0, 10, 45);
        this.camera.lookAt(this.playerSystem.mesh.position);
    }

    update() {
        // Use player's current mesh position
        const desiredPosition = this.playerSystem.mesh.position.clone().add(this.offset);
        this.camera.position.lerp(desiredPosition, 0.1);
        this.camera.lookAt(this.playerSystem.mesh.position);
    }
}

//////////////////////////////////////////////////////////
//  Lighting System
//////////////////////////////////////////////////////////
class LightingSystem {
    constructor(scene, target) {
        this.target = target;
        this.setupLights(scene);
    }

    setupLights(scene) {
        // Ambient light
        this.ambient = new THREE.AmbientLight(0x404040, 0.5);
        scene.add(this.ambient);

        // Main directional light (sun)
        this.directional = new THREE.DirectionalLight(0xffffff, 2.0);
        this.directional.position.set(15, 25, 15);
        this.directional.castShadow = true;
        
        // Create and set the target object explicitly
        this.lightTarget = new THREE.Object3D();
        scene.add(this.lightTarget);
        this.directional.target = this.lightTarget;
        
        this.setupShadowProperties();
        scene.add(this.directional);

        // Helper for debugging shadows (uncomment to see light camera)
        // const helper = new THREE.CameraHelper(this.directional.shadow.camera);
        // scene.add(helper);

        // Hemisphere light
        this.hemisphere = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
        scene.add(this.hemisphere);

        // Subtle fill light
        this.fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        this.fillLight.position.set(-5, 3, -5);
        scene.add(this.fillLight);
    }

    setupShadowProperties() {
        // Shadow map settings
        this.directional.shadow.mapSize.width = 4096;
        this.directional.shadow.mapSize.height = 4096;
        
        // Camera bounds
        this.directional.shadow.camera.near = 0.5;
        this.directional.shadow.camera.far = 75;
        this.directional.shadow.camera.left = -20;
        this.directional.shadow.camera.right = 20;
        this.directional.shadow.camera.top = 20;
        this.directional.shadow.camera.bottom = -20;
        
        // Shadow quality settings
        this.directional.shadow.bias = -0.0001;
        this.directional.shadow.normalBias = 0.02;
        this.directional.shadow.radius = 1;
        
        // Ensure shadow map updates
        this.directional.shadow.needsUpdate = true;
        
        // Force camera to update its matrix
        this.directional.shadow.camera.updateProjectionMatrix();
    }

    update() {
        // Update light and target positions
        const lightOffset = new THREE.Vector3(15, 25, 15);
        this.directional.position.copy(this.target.position).add(lightOffset);
        
        // Update light target position
        this.lightTarget.position.copy(this.target.position);
        
        // Ensure matrices are updated
        this.directional.updateMatrix();
        this.directional.updateMatrixWorld();
        this.lightTarget.updateMatrix();
        this.lightTarget.updateMatrixWorld();
    }
}

//////////////////////////////////////////////////////////
//  Environment Setup
//////////////////////////////////////////////////////////
function createEnvironment(scene, sceneManager) {
    // Skybox
    const skyLoader = new THREE.CubeTextureLoader();
    const skyboxTexture = skyLoader.load([
        'textures/cloud07.jpg',
        'textures/cloud07.jpg',
        'textures/cloud07.jpg',
        'textures/cloud07.jpg',
        'textures/cloud07.jpg',
        'textures/cloud07.jpg'
    ]);
    scene.background = skyboxTexture;

    // Ground
    const groundTexture = loadTexture('textures/grainygrass1.jpg', { repeat: { x: 10, y: 10 }});
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(300, 120),
        new THREE.MeshPhongMaterial({ map: groundTexture })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = PHYSICS_CONFIG.groundLevel;
    ground.receiveShadow = true;
    scene.add(ground);

    // Define lanes
    const lanes = [
        { type: 'water', z: 35 },
        { type: 'water', z: 30 },
        { type: 'road', z: 20 },
        { type: 'road', z: 15 },
        { type: 'water', z: 5 },
        { type: 'water', z: 0 },
        { type: 'road', z: -10 },
        { type: 'road', z: -15 },
        { type: 'water', z: -25 },
        { type: 'water', z: -30 }
    ];

    // Create lanes
    lanes.forEach(lane => {
        let texture;
        if (lane.type === 'road') {
            texture = loadTexture('textures/asphalt.jfif', { 
                repeat: { x: 1, y: 10 },
                rotation: Math.PI / 2
            });
        } else if (lane.type === 'water') {
            texture = loadTexture('textures/water15.jpg', { 
                repeat: { x: 10, y: 1 }
            });
        }

        const laneMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(300, 5),
            new THREE.MeshPhongMaterial({ map: texture })
        );
        laneMesh.rotation.x = -Math.PI / 2;
        laneMesh.position.set(0, -0.49, lane.z);
        laneMesh.receiveShadow = true;
        scene.add(laneMesh);

        if (lane.type === 'water') {
            const waterCollision = new THREE.Mesh(
                new THREE.PlaneGeometry(100, 5),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            waterCollision.rotation.x = -Math.PI / 2;
            waterCollision.position.copy(laneMesh.position);
            
            // Add to scene manager for collision detection
            sceneManager.addObject(waterCollision, 'box', ObjectTypes.WATER, {
                width: 100,
                height: 0.1,  // Thin collision plane
                depth: 5
            });
        }
    });
}

function createEnvironmentBillboards(scene, camera) {
    function createVegetationMaterial(texture, threshold = 0.1, tintColor = new THREE.Color(0.2, 0.8, 0.2)) {
        return new THREE.ShaderMaterial({
            uniforms: {
                map: { value: texture },
                threshold: { value: threshold },
                tint: { value: tintColor }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D map;
                uniform float threshold;
                uniform vec3 tint;
                varying vec2 vUv;
                void main() {
                    vec4 texColor = texture2D(map, vUv);
                    float brightness = (texColor.r + texColor.g + texColor.b) / 3.0;
                    vec3 finalColor = mix(texColor.rgb, texColor.rgb * tint, 0.5);
                    gl_FragColor = vec4(finalColor, step(threshold, brightness));
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });
    }

    let treeMaterial, grassMaterial;
    let billboards = [];
    const billboardGeometry = new THREE.PlaneGeometry(2, 2);

    const loadTexture = (url) => {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(
                url,
                (texture) => {
                    texture.generateMipmaps = true;
                    texture.minFilter = THREE.LinearMipmapLinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.premultiplyAlpha = true;
                    resolve(texture);
                },
                undefined,
                reject
            );
        });
    };

    Promise.all([
        loadTexture('textures/tree.jpg'),
        loadTexture('textures/grass.png')
    ]).then(([treeTexture, grassTexture]) => {
        treeMaterial = createVegetationMaterial(
            treeTexture, 
            0.1,
            new THREE.Color(0.2, 0.8, 0.2)
        );

        grassMaterial = createVegetationMaterial(
            grassTexture, 
            0.15,
            new THREE.Color(0.3, 0.9, 0.3)
        );

        const vegetationTypes = {
            trees: {
                material: treeMaterial,
                count: 120,
                scales: {
                    large: {
                        baseScale: 15.0,
                        y: 13
                    },
                    small: {
                        baseScale: 5.0,
                        y: 1.1
                    }
                },
                scaleVariation: 0.1,
                positionVariation: 0.2,
                alwaysFaceCamera: true,
                xPosition: 26, // Moved closer to center from 42
                spacing: 1.5
            },
            tallGrass: {
                material: grassMaterial,
                count: 600, // Reduced from 1000
                baseScale: 1.0,
                scaleVariation: 0.3,
                positionVariation: 0.5,
                y: 0.5,
                alwaysFaceCamera: false,
                spreadX: { min: -20, max: 20 }, // Reduced from -30/30
                spreadZ: { min: -45, max: 45 }
            },
            shortGrass: {
                material: grassMaterial,
                count: 2500, // Reduced from 5000
                baseScale: 0.7,
                scaleVariation: 0.2,
                positionVariation: 0.3,
                y: 0.3,
                alwaysFaceCamera: false,
                spreadX: { min: -25, max: 25 }, // Reduced from -35/35
                spreadZ: { min: -50, max: 50 }
            }
        };

        const excludeZones = [
            { min: -17, max: -8 },   // Road zone 1
            { min: 13, max: 22 },    // Road zone 2
            { min: -32, max: -23 },  // Water zone 1
            { min: -2, max: 7 },     // Water zone 2
            { min: 28, max: 37 }     // Water zone 3
        ];

        function isValidPosition(z) {
            return !excludeZones.some(zone => z >= zone.min && z <= zone.max);
        }

        function populateEnvironment() {
            // Place trees
            placeBoundaryVegetation(vegetationTypes.trees);
            
            // Place regular grass
            placeCenterVegetation('tallGrass', vegetationTypes.tallGrass);
            placeCenterVegetation('shortGrass', vegetationTypes.shortGrass);
        }

        function placeBoundaryVegetation(config) {
            const totalLength = 100;
            const positions = Math.floor(totalLength / config.spacing);
            
            [-1, 1].forEach(side => {
                const xPos = config.xPosition * side;
                
                for (let i = 0; i < positions; i++) {
                    const z = -50 + (i * config.spacing);
                    
                    if (isValidPosition(z)) {
                        const isLarge = i % 2 === 0;
                        const scaleConfig = isLarge ? config.scales.large : config.scales.small;
                        
                        createBillboard(config.material, {
                            position: new THREE.Vector3(xPos, scaleConfig.y, z),
                            baseScale: scaleConfig.baseScale,
                            scaleVariation: config.scaleVariation,
                            positionVariation: config.positionVariation,
                            alwaysFaceCamera: config.alwaysFaceCamera
                        });
                    }
                }
            });
        }

        function placeCenterVegetation(type, config) {
            for (let i = 0; i < config.count; i++) {
                let attempts = 0;
                let validPosition = false;
                let x, z;
                
                while (!validPosition && attempts < 10) {
                    const centerBias = Math.pow(Math.random(), 1.5) * 2 - 1;
                    const range = config.spreadX.max - config.spreadX.min;
                    x = centerBias * range / 2;
                    z = config.spreadZ.min + Math.random() * (config.spreadZ.max - config.spreadZ.min);
                    
                    if (isValidPosition(z)) {
                        validPosition = true;
                    }
                    attempts++;
                }
                
                if (validPosition) {
                    createBillboard(config.material, {
                        position: new THREE.Vector3(x, config.y, z),
                        baseScale: config.baseScale,
                        scaleVariation: config.scaleVariation,
                        positionVariation: config.positionVariation,
                        alwaysFaceCamera: config.alwaysFaceCamera
                    });
                }
            }
        }

        populateEnvironment();
    }).catch(error => {
        console.error('Error loading textures:', error);
    });

    function createBillboard(material, config) {
        const billboard = new THREE.Mesh(billboardGeometry, material.clone());
        
        const scale = config.baseScale * (1 + (Math.random() - 0.5) * config.scaleVariation);
        billboard.scale.set(scale, scale, scale);
        
        billboard.position.set(
            config.position.x + (Math.random() - 0.5) * config.positionVariation,
            config.position.y,
            config.position.z + (Math.random() - 0.5) * config.positionVariation
        );
        
        if (!config.alwaysFaceCamera) {
            // For grass, use the fixed rotation if specified, otherwise small random
            billboard.rotation.y = config.fixedRotation || (Math.random() * 0.2 - 0.1);
            billboard.userData.fixedRotation = billboard.rotation.y;
        }
        
        billboard.userData.alwaysFaceCamera = config.alwaysFaceCamera;
        
        billboard.userData.update = () => {
            if (billboard.userData.alwaysFaceCamera) {
                billboard.quaternion.copy(camera.quaternion);
            } else {
                billboard.rotation.y = billboard.userData.fixedRotation;
            }
        };
        
        scene.add(billboard);
        billboards.push(billboard);
        return billboard;
    }

    return function updateBillboards() {
        billboards.forEach(billboard => billboard.userData.update());
    };

    function createBillboard(material, config) {
        const billboard = new THREE.Mesh(billboardGeometry, material.clone());
        
        const scale = config.baseScale * (1 + (Math.random() - 0.5) * config.scaleVariation);
        billboard.scale.set(scale, scale, scale);
        
        billboard.position.set(
            config.position.x + (Math.random() - 0.5) * config.positionVariation,
            config.position.y,
            config.position.z + (Math.random() - 0.5) * config.positionVariation
        );
        
        // Set initial rotation only once for grass
        if (!config.alwaysFaceCamera) {
            // Lock rotation to just a small random offset for grass
            billboard.rotation.y = (Math.random() * 0.2 - 0.1); // Small random rotation ±0.1 radians
            billboard.userData.fixedRotation = billboard.rotation.y;
        }
        
        billboard.userData.alwaysFaceCamera = config.alwaysFaceCamera;
        
        // Updated update function to handle rotations properly
        billboard.userData.update = () => {
            if (billboard.userData.alwaysFaceCamera) {
                // Trees: Always face camera completely
                billboard.quaternion.copy(camera.quaternion);
            } else {
                // Grass: Maintain fixed Y rotation, only update if camera moves significantly
                billboard.rotation.y = billboard.userData.fixedRotation;
            }
        };
        
        scene.add(billboard);
        billboards.push(billboard);
        return billboard;
    }

    // Update function remains the same
    return function updateBillboards() {
        billboards.forEach(billboard => billboard.userData.update());
    };
}

//////////////////////////////////////////////////////////
//  Movement System
//////////////////////////////////////////////////////////
class MovementSystem {
    constructor(scene, sceneManager) {
        this.scene = scene;
        this.sceneManager = sceneManager;
        this.movingObjects = new Map();
        this.boundaries = {
            min: -25,
            max: 25
        };
    }

    addObject(object, config) {
        // For oscillating objects (turtle groups), store starting position
        const startX = object.mesh.position.x;
        
        this.movingObjects.set(object, {
            config: config,
            direction: config.direction || 1,
            lane: object.mesh.position.z,
            startX: startX,
            time: 0 // For oscillation
        });
    }

    removeObject(object) {
        this.movingObjects.delete(object);
    }

    recycleObject(object, data) {
        if (data.config.oscillation?.enabled) {
            // For oscillating objects, reset time when reaching amplitude
            data.direction *= -1;
        } else {
            // For continuously moving objects, reset to opposite side
            if (data.direction > 0) {
                object.mesh.position.x = this.boundaries.min;
            } else {
                object.mesh.position.x = this.boundaries.max;
            }
        }
        object.mesh.position.z = data.lane;
    }

    update(deltaTime = 1/60) {
        for (const [object, data] of this.movingObjects) {
            if (object.animationState) {
                object.animationState.update(deltaTime);
            }

            if (data.config.oscillation?.enabled) {
                // Oscillating movement for turtle groups
                data.time += deltaTime;
                const newX = data.startX + Math.sin(data.time * data.config.oscillation.frequency * Math.PI * 2) 
                    * data.config.oscillation.distance;
                
                object.mesh.position.x = newX;
                object.velocity.x = (newX - object.mesh.position.x) / deltaTime;
            } else {
                // Regular movement for other objects
                object.mesh.position.x += data.direction * data.config.speed;
                object.velocity.x = data.direction * data.config.speed;
                
                // Check boundaries for non-oscillating objects
                if (data.direction > 0 && object.mesh.position.x > this.boundaries.max) {
                    this.recycleObject(object, data);
                } else if (data.direction < 0 && object.mesh.position.x < this.boundaries.min) {
                    this.recycleObject(object, data);
                }
            }
            
            // Update helper position
            object.updateMatrix();
        }
    }
}

//////////////////////////////////////////////////////////
//  Game Objects Configuration
//////////////////////////////////////////////////////////
const GAME_OBJECTS = {
    WATER_OBJECTS: [
        {
            // Logs
            type: 'cylinder',
            objectType: ObjectTypes.PLATFORM,
            lanePairs: [
                { lanes: [35], direction: 1 },
                { lanes: [5], direction: -1 },
                { lanes: [-25], direction: 1 }
            ],
            instances: 2,
            bounds: { radius: 1, height: 5 },
            rotation: { x: -Math.PI / 2, z: -Math.PI / 2 },
            movement: {
                speed: 0.02  // Slowed down for better control
            }
        },
        {
            // Turtle groups
            type: 'sphere',
            objectType: ObjectTypes.PLATFORM,
            lanePairs: [
                { lanes: [30], direction: 1 },
                { lanes: [0], direction: -1 },
                { lanes: [-30], direction: 1 }
            ],
            instances: 2,
            turtlesPerGroup: 3,
            spacing: 1.9,
            bounds: { radius: 0.9 },
            movement: {
                speed: 0.15,
                oscillation: {
                    enabled: true,
                    distance: 3,    // Reduced oscillation distance
                    frequency: 0.008 // Slowed down frequency
                }
            }
        }
    ],
    ROAD_OBJECTS: [
        {
            // Cars
            type: 'box',
            objectType: ObjectTypes.HAZARD,
            model: 'textures/free_car_001.gltf',
            lanes: [
                { z: 20, direction: -1, rotation: -Math.PI/2 },   // Left road, facing left
                { z: 15, direction: 1, rotation: Math.PI/2 },   // Left road, facing left
                { z: -10, direction: -1, rotation: -Math.PI/2 },  // Right road, facing right
                { z: -15, direction: 1, rotation: Math.PI/2 }   // Right road, facing right
            ],
            instances: 1,  // Only one car per lane
            movement: {
                speed: 0.2
            }
        }
    ]
};

class TurtleState {
    constructor(mesh) {
        this.mesh = mesh;
        this.state = 'floating'; // floating, shaking, submerging, submerged, emerging
        this.animationTime = 0;
        this.shakeDuration = 1.0;  // seconds
        this.submergeDuration = 0.5;  // seconds
        this.submergedDuration = 2.0;  // seconds
        this.shakeRotationMax = Math.PI / 8;  // Max rotation during shake
        this.originalY = mesh.position.y;
        this.submergeDist = 1.5;  // How far to submerge
        
        // Random timer for next animation
        this.nextAnimationTime = Math.random() * 10 + 5;  // 5-15 seconds
    }

    update(deltaTime) {
        switch(this.state) {
            case 'floating':
                this.nextAnimationTime -= deltaTime;
                if (this.nextAnimationTime <= 0) {
                    this.state = 'shaking';
                    this.animationTime = 0;
                }
                break;

            case 'shaking':
                this.animationTime += deltaTime;
                // Shake animation
                const shakeProgress = this.animationTime / this.shakeDuration;
                if (shakeProgress <= 1) {
                    // Faster shake frequency as time progresses
                    const frequency = 10 + shakeProgress * 20;
                    const rotation = Math.sin(shakeProgress * frequency) * 
                        this.shakeRotationMax * (1 - shakeProgress);
                    this.mesh.rotation.y = rotation;
                } else {
                    this.state = 'submerging';
                    this.animationTime = 0;
                }
                break;

            case 'submerging':
                this.animationTime += deltaTime;
                const submergeProgress = this.animationTime / this.submergeDuration;
                if (submergeProgress <= 1) {
                    this.mesh.position.y = this.originalY - 
                        (this.submergeDist * submergeProgress);
                } else {
                    this.state = 'submerged';
                    this.animationTime = 0;
                }
                break;

            case 'submerged':
                this.animationTime += deltaTime;
                if (this.animationTime >= this.submergedDuration) {
                    this.state = 'emerging';
                    this.animationTime = 0;
                }
                break;

            case 'emerging':
                this.animationTime += deltaTime;
                const emergeProgress = this.animationTime / this.submergeDuration;
                if (emergeProgress <= 1) {
                    this.mesh.position.y = (this.originalY - this.submergeDist) + 
                        (this.submergeDist * emergeProgress);
                } else {
                    this.state = 'floating';
                    this.mesh.position.y = this.originalY;
                    this.mesh.rotation.z = 0;
                    this.nextAnimationTime = Math.random() * 10 + 5;  // Reset timer
                }
                break;
        }
    }
}

function createTurtleGroup(config, laneZ, xPos, scene, sceneManager, movementSystem) {
    const groupObjects = [];
    
    // Create the group of turtles
    for (let i = 0; i < config.turtlesPerGroup; i++) {
        const texture = loadTexture('textures/hextile.jpg', { repeat: { x: 4, y: 4 }});
        const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(config.bounds.radius, 32, 32),
            new THREE.MeshPhongMaterial({ map: texture })
        );
        
        // Position each turtle in the group
        const offsetX = (i - (config.turtlesPerGroup - 1) / 2) * config.spacing;
        mesh.position.set(xPos + offsetX, -0.5, laneZ);
        mesh.castShadow = true;
        
        const object = sceneManager.addObject(
            mesh,
            config.type,
            config.objectType,
            config.bounds
        );
        
        movementSystem.addObject(object, {
            speed: config.movement.speed,
            oscillation: {
                enabled: true,
                distance: config.movement.oscillation.distance,
                frequency: config.movement.oscillation.frequency
            },
            direction: 1
        });
        
        groupObjects.push(object);
    }
    
    return groupObjects;
}

//////////////////////////////////////////////////////////
// Game Objects Setup
//////////////////////////////////////////////////////////
function createGameObjects(scene, sceneManager, movementSystem) {
    function getSpacedPositions(count, minX = -25, maxX = 25) {
        const positions = [];
        const spacing = (maxX - minX) / count;
        for (let i = 0; i < count; i++) {
            positions.push(minX + (spacing * i) + (spacing/2));
        }
        return positions;
    }

    // Create water objects
    GAME_OBJECTS.WATER_OBJECTS.forEach(config => {
        config.lanePairs.forEach(pair => {
            pair.lanes.forEach(laneZ => {
                const xPositions = getSpacedPositions(config.instances);
                
                xPositions.forEach(xPos => {
                    if (config.type === 'cylinder') {
                        // Create logs
                        const logTexture = loadTexture('textures/wood15.jpg', {
                            repeat: { x: 1, y: 1 },
                            rotation: Math.PI / 2,
                            center: { x: 0.5, y: 0.5 }
                        });
                        const endTexture = loadTexture('textures/woodRings2.jpg', {
                            repeat: { x: 1, y: 1 },
                            offset: { x: 0.1, y: 0 },
                            center: { x: 0.5, y: 0.5 }
                        });
                        
                        const mesh = new THREE.Mesh(
                            new THREE.CylinderGeometry(1, 1, 5, 32),
                            [
                                new THREE.MeshPhongMaterial({ map: logTexture }),
                                new THREE.MeshPhongMaterial({ map: endTexture }),
                                new THREE.MeshPhongMaterial({ map: endTexture })
                            ]
                        );
                        
                        mesh.position.set(xPos, -0.5, laneZ);
                        mesh.castShadow = true;
                        
                        if (config.rotation) {
                            mesh.rotation.x = config.rotation.x || 0;
                            mesh.rotation.y = config.rotation.y || 0;
                            mesh.rotation.z = config.rotation.z || 0;
                        }
                        
                        const object = sceneManager.addObject(
                            mesh,
                            config.type,
                            config.objectType,
                            config.bounds
                        );
                        
                        movementSystem.addObject(object, {
                            speed: config.movement.speed,
                            direction: pair.direction
                        });
                    } else if (config.type === 'sphere') {
                        // Create turtle groups
                        createTurtleGroup(config, laneZ, xPos, scene, sceneManager, movementSystem);
                    }
                });
            });
        });
    });

    // Create road objects (cars)
    GAME_OBJECTS.ROAD_OBJECTS.forEach(config => {
        config.lanes.forEach(lane => {
            const xPositions = getSpacedPositions(config.instances);
            
            xPositions.forEach(xPos => {
                gltfLoader.load(config.model, function (gltf) {
                    gltf.scene.traverse((node) => {
                        if (node.isMesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;
                            node.material.metalness = 0.003;
                            node.material.roughness = 0.6;
                        }
                    });
                    
                    const model = gltf.scene;
                    model.position.set(xPos, -0.5, lane.z);
                    model.rotation.y = lane.rotation;
                    
                    const carBounds = new THREE.Box3().setFromObject(model);
                    const size = new THREE.Vector3();
                    carBounds.getSize(size);
                    
                    const object = sceneManager.addObject(model, config.type,
                        config.objectType, {
                            width: size.x,
                            height: size.y,
                            depth: size.z
                        }
                    );
                    
                    movementSystem.addObject(object, {
                        ...config.movement,
                        direction: lane.direction
                    });
                });
            });
        });
    });
}

//////////////////////////////////////////////////////////
//  Main Game Setup and Loop
//////////////////////////////////////////////////////////
function initGame() {
    // Initialize core systems
    initRenderer();
    const sceneManager = new SceneManager(scene);
    const movementSystem = new MovementSystem(scene, sceneManager);
    const updateBillboards = createEnvironmentBillboards(scene, camera);
    
    // Create environment and objects
    createEnvironment(scene, sceneManager);
    createGameObjects(scene, sceneManager, movementSystem);
    
    // Initialize game systems
    const playerSystem = new PlayerSystem(scene, new THREE.Vector3(0, 0, 42));
    const cameraSystem = new CameraSystem(camera, playerSystem);
    const lightingSystem = new LightingSystem(scene, playerSystem.mesh);
    
    // Setup resize handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Track time for consistent movement
    let lastTime = performance.now();

    // Game loop
    function animate(currentTime) {
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        movementSystem.update(deltaTime);
        playerSystem.update(deltaTime, sceneManager);  // Pass deltaTime
        cameraSystem.update();
        lightingSystem.update();
        updateBillboards(currentTime * 0.001);
        renderer.render(scene, camera);
    }

    // Start the game loop
    renderer.setAnimationLoop(animate);
}

initGame();