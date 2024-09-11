import {createBird, createBullet, checkCollision, getBoundingBox} from './utils.js'

var gl;
var canvas;
var program;
var vPosition;
var fColor;

var mouseX;  
var movement = false;

var level;
var score = 0;
var bulletSpeed = 0.01;
var maxBullets = 30;
var bulletPool = [];
var hits;

var maxBirds = 25;
var levelBirds;
var birdSpeedRange = [0.003, 0.01];
var birdHeightRange = [0.75, 0.95];
var birdPool = [];

var vertices;
var bufferId;
var bulletBufferId;

var birdBufferId;
var birdColorBufferId;
const wingSpan = 0.1;  // Adjust this value to change the wing flap height
const flapInterval = 700;  // Adjust this to change how often the wing flaps (higher number = slower flap)



window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    vPosition = gl.getAttribLocation(program, "vPosition");
    fColor = gl.getAttribLocation(program, "vColor");

    vertices = new Float32Array([
        0.02, -0.98,    // Byssa
        -0.02, -0.98,
        0, -0.92, 
    ]);

    //  Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 0.02);

    // Set up bird color buffer
    birdColorBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, birdColorBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(maxBirds * 30 * 4), gl.STATIC_DRAW);
    
    let colorData = new Float32Array(maxBirds * 15 * 4);
    for (let i = 0; i < maxBirds; i++) {
    // Colors for each triangle (RGBA format)
    const colors = [
        [1.0, 0.0, 0.0, 1.0], // Red (body triangle 1)
        [0.0, 1.0, 0.0, 1.0], // Green (body triangle 2)
        [0.0, 0.0, 1.0, 1.0], // Blue (tail)
        [1.0, 1.0, 0.0, 1.0], // Yellow (beak)
        [1.0, 0.0, 1.0, 1.0]  // Magenta (wing)
    ];

    for (let j = 0; j < 5; j++) { // 5 triangles per bird
        for (let k = 0; k < 3; k++) { // 3 vertices per triangle
            const colorIndex = (i * 15 + j * 3 + k) * 4;
            colorData.set(colors[j], colorIndex);
        }
    }
}
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, colorData);

    // Load the data into the GPU
    bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Associate our shader variables with our data buffer
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    birdBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, birdBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, maxBirds * 30 * 4, gl.DYNAMIC_DRAW);

    bulletBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bulletBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, maxBullets * 12 * 4, gl.DYNAMIC_DRAW);
    
    for (let i = 0; i < maxBirds; i++) {
        birdPool.push(createBird());
    }

    for (let i = 0; i < maxBullets; i++) {
        bulletPool.push(createBullet());
    }

    listenForCanvasEvents();
    startLevel(1);
};

function listenForCanvasEvents(){
    canvas.addEventListener("mousedown", function(e){
        movement = true;
        mouseX = e.offsetX;
    } );

    canvas.addEventListener("mouseup", function(e){
        movement = false;
    } );

    canvas.addEventListener("mousemove", function(e) {
        if (movement) {
            var xmove = 2 * (e.offsetX - mouseX) / canvas.width;
            mouseX = e.offsetX;
    
            // Calculate new positions for boundary check
            var newPositions = vertices.slice(); // Copy current vertices
            for (let i = 0; i < 3; i++) {
                newPositions[i * 2] += xmove;
            }
    
            // Boundary check: Prevent going off-screen
            var minX = Math.min(newPositions[0], newPositions[2], newPositions[4]); // Left-most point
            var maxX = Math.max(newPositions[0], newPositions[2], newPositions[4]); // Right-most point
    
            if (minX >= -1 && maxX <= 1) {
                // Update vertices if within bounds
                vertices = newPositions;
                gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
            }
        }
    });
}

function addBird() {
    let inactiveBird = birdPool.find(bird => !bird.visible);
    if (!inactiveBird) return;

    var birdY = Math.random() * (birdHeightRange[1] - birdHeightRange[0]) + birdHeightRange[0];
    var birdSpeed = Math.random() * (birdSpeedRange[1] - birdSpeedRange[0]) + birdSpeedRange[0];

    var birdX, direction;
    if (Math.random() > 0.5) {
        birdX = -1.1; // Start slightly off-screen to the left
        direction = 1; // Move right
    } else {
        birdX = 1.1; // Start slightly off-screen to the right
        direction = -1; // Move left
    }

    inactiveBird.vertices.set([
        // Body (2 triangles)
        birdX, birdY,                              // Bottom-left
        birdX, birdY + 0.05,                       // Top-left
        birdX - 0.2 * direction, birdY,            // Bottom-right
        birdX, birdY + 0.05,                       // Top-left
        birdX - 0.2 * direction, birdY,            // Bottom-right
        birdX - 0.2 * direction, birdY + 0.05,     // Top-right

        // Tail (1 triangle)
        birdX - 0.2 * direction, birdY,            // Base of the tail
        birdX - 0.2 * direction, birdY + 0.05,      // Top of the tail
        birdX - 0.3 * direction, birdY + 0.05,            // Sharp corner of the tail

        // Beak (1 triangle)
        birdX, birdY + 0.05,                       // Top of the beak
        birdX + 0.08 * direction, birdY + 0.025,   // Tip of the beak
        birdX, birdY,                              // Bottom of the beak
       // Wing (1 triangle)
        birdX - 0.02 * direction, birdY + 0.025,   // Inner vertex
        birdX - 0.15 * direction, birdY + 0.1,     // Tip of the wing
        birdX - 0.18 * direction, birdY + 0.025    // Another point on the body
    ]);

    inactiveBird.speed = (birdSpeed + (level/1000)) * direction;
    inactiveBird.visible = true;
    inactiveBird.lastFlapTime = Date.now();

    gl.bindBuffer(gl.ARRAY_BUFFER, birdBufferId);
    gl.bufferSubData(gl.ARRAY_BUFFER, birdPool.indexOf(inactiveBird) * 15 * 4, inactiveBird.vertices);
}

window.addEventListener("keydown", function (e) {
    if (e.code === "Space") {
        shootBullet();
    }
});

function shootBullet() {
    let inactiveBullet = bulletPool.find(bullet => !bullet.visible);
    if (!inactiveBullet) return;

    var bulletX = vertices[4];
    var bulletY = vertices[5];

    inactiveBullet.vertices.set([
        bulletX, bulletY,
        bulletX, bulletY + 0.03,
        bulletX + 0.01, bulletY + 0.03,
        bulletX + 0.01, bulletY,
        bulletX + 0.01, bulletY + 0.03,
        bulletX, bulletY
    ]);
    inactiveBullet.visible = true;

    gl.bindBuffer(gl.ARRAY_BUFFER, bulletBufferId);
    gl.bufferSubData(gl.ARRAY_BUFFER, bulletPool.indexOf(inactiveBullet) * 12 * 4, inactiveBullet.vertices);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.disableVertexAttribArray(fColor);  // Disable the color attribute array
    gl.vertexAttrib4f(fColor, 1.0, 0.0, 0.0, 1.0);  // Set a constant color
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Draw bullets
    gl.bindBuffer(gl.ARRAY_BUFFER, bulletBufferId);
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    bulletPool.forEach((bullet, bulletIndex) => {
        if (bullet.visible) {
            for (let i = 1; i < bullet.vertices.length; i += 2) {
                bullet.vertices[i] += bulletSpeed;
            }

            if (bullet.vertices[1] > 1.1) {
                bullet.visible = false;
            } else {
                gl.bufferSubData(gl.ARRAY_BUFFER, bulletIndex * 12 * 4, bullet.vertices);
                gl.disableVertexAttribArray(fColor);
                gl.vertexAttrib4f(fColor, 1.0, 0.0, 0.0, 1.0);
                gl.drawArrays(gl.TRIANGLES, bulletIndex * 6, 6);

                var bulletBox = getBoundingBox(bullet.vertices);
                birdPool.forEach((bird) => {
                    if (bird.visible) {
                        var birdBox = getBoundingBox(bird.vertices);
                        if (checkCollision(bulletBox, birdBox)) {
                            hits++;
                            bird.visible = false;
                            bullet.visible = false;
                            increaseScore();
                            if (hits == levelBirds){
                                startLevel(level+1);
                            }
                        }
                    }
                });
            }
        }
    });

    // Draw birds
    gl.bindBuffer(gl.ARRAY_BUFFER, birdBufferId);
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, birdColorBufferId);
    gl.vertexAttribPointer(fColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(fColor);

    birdPool.forEach((bird, index) => {
        if (bird.visible) {
            // Update bird position
            for (let i = 0; i < bird.vertices.length; i += 2) {
                bird.vertices[i] += bird.speed;
            }

            // Simple wing flap
            var currentTime = Date.now();
            if (currentTime - bird.lastFlapTime >= flapInterval) {  // Only flap every few frames
                const bodyY = bird.vertices[1];  // Y-coordinate of the bird's body
                
                if (bird.wingUp) {
                    bird.vertices[27] = bodyY + wingSpan;  // Move wing up
                } else {
                    bird.vertices[27] = bodyY - wingSpan;  // Move wing down
                }
                bird.wingUp = !bird.wingUp;  // Toggle wing state
                bird.lastFlapTime = currentTime; 
            }

            var birdOffScreen = (bird.speed > 0 && bird.vertices[0] > 1.1) || (bird.speed < 0 && bird.vertices[0] < -1.1);
            if (birdOffScreen) {
                bird.visible = false;
                addBird(); // Add a new bird to replace the off-screen one
            } else {
                // Update bird vertex buffer
                gl.bindBuffer(gl.ARRAY_BUFFER, birdBufferId);
                gl.bufferSubData(gl.ARRAY_BUFFER, index * 30 * 4, bird.vertices);

                // Draw the bird
                gl.drawArrays(gl.TRIANGLES, index * 15, 15);
            }
        }
    });

    window.requestAnimFrame(render);
}

function startLevel(lvl){
    if(lvl <= 5){
    level = lvl;
    var b = maxBirds/5;
    b *= level;
    levelBirds = b;
    hits = 0;

    for (let i = 0; i < b; i++) {
        addBird();
    }
    updateLevelInfo();
    render()
    }
}

function updateLevelInfo() {
    document.getElementById('level-number').textContent = level;
    document.getElementById('score-number').textContent = score;
}

function increaseScore() {
    score += level;
    updateLevelInfo();
}