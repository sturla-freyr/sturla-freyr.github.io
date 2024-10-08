import {createBird, createBullet, checkCollision, getBoundingBox} from './utils.js'

var gl;
var canvas;
var program;
var vPosition;
var fColor;

var mouseX;  
var movement = false;

var level;
var gameStatus;
var score = 0;
var bulletSpeed = 0.01;
var maxBullets = 8;
var bulletPool = [];
var hits;

var maxBirds = 25;
var levelBirds;
var birdSpeedRange = [0.003, 0.01];
var birdHeightRange = [0.5, 0.85];
var birdPool = [];

var vertices;
var bufferId;
var bulletBufferId;

var birdBufferId;
var birdColorBufferId;
const wingSpan = 0.1;
const flapInterval = 670;

var grassBufferId;
var grassVertices = [];
var grassCount = 500;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    vPosition = gl.getAttribLocation(program, "vPosition");
    fColor = gl.getAttribLocation(program, "vColor");

    //  Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 1.0, 0.02);

    vertices = new Float32Array([
        0.06, -0.98,    // Gun bottom left
        -0.06, -0.98,   // Bottom right
        0, -0.85,       // Top angle
    ]);

    // Load the data into the GPU
    bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Associate shader variables with data buffer
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    birdBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, birdBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, maxBirds * 30 * 4, gl.DYNAMIC_DRAW);

    for (let i = 0; i < maxBirds; i++) {
        birdPool.push(createBird());
    }

    // Set up bird color buffer
    birdColorBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, birdColorBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(maxBirds * 30 * 4), gl.STATIC_DRAW);
    
    let colorData = new Float32Array(maxBirds * 15 * 4);
    for (let i = 0; i < maxBirds; i++) {
    // Colors for birds, 5 colors for 5 triangles
    const colors = [
        [1.0, 1.0, 1.0, 1.0], // white
        [1.0, 1.0, 1.0, 1.0], // white
        [1.0, 1.0, 1.0, 1.0], // white
        [1.0, 1.0, 0.0, 1.0], // Yellow
        [0.0, 0.0, 0.0, 1.0]  // black
    ];

    for (let j = 0; j < 5; j++) { // 5 triangles per bird
        for (let k = 0; k < 3; k++) { // 3 vertices per triangle
            const colorIndex = (i * 15 + j * 3 + k) * 4;
            colorData.set(colors[j], colorIndex);
        }
    }
}
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, colorData);

    // Generate bullets
    bulletBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bulletBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, maxBullets * 12 * 4, gl.DYNAMIC_DRAW);

    for (let i = 0; i < maxBullets; i++) {
        bulletPool.push(createBullet());
    }

//////////////////////////////////////////////////////////
    // Generate grass
//////////////////////////////////////////////////////////
    for (let i = 0; i < grassCount; i++) {
        // Random grass blades along the X-axis
        let x = Math.random() * 2 - 1;
        let y = -1;
    
        let grassHeight = 0.1 + Math.random() * 0.05;
        let grassWidth = 0.01;
    
        grassVertices.push(
            x, y,  // Bottom-left vertex
            x + grassWidth / 2, y,  // Bottom-right vertex
            x + grassWidth / 2, y + grassHeight  // Top-right vertex
        );
    }

    grassBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, grassBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(grassVertices), gl.STATIC_DRAW);

    listenForCanvasEvents();
    startLevel(1);
};

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
//////////////////////////////////////////////////////////
    // Draw grass
//////////////////////////////////////////////////////////
    gl.bindBuffer(gl.ARRAY_BUFFER, grassBufferId);
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.disableVertexAttribArray(fColor);
    gl.vertexAttrib4f(fColor, 0.0, 1.0, 0.0, 1.0);

    gl.drawArrays(gl.TRIANGLES, 0, grassCount * 3);
//////////////////////////////////////////////////////////
    // Draw gun
//////////////////////////////////////////////////////////    
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.disableVertexAttribArray(fColor);  // Disable the color attribute array
    gl.vertexAttrib4f(fColor, 1.0, 0.0, 0.0, 1.0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

//////////////////////////////////////////////////////////
    // Draw bullets
//////////////////////////////////////////////////////////
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
//////////////////////////////////////////////////////////
    // Draw birds
//////////////////////////////////////////////////////////
    gl.bindBuffer(gl.ARRAY_BUFFER, birdBufferId);
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, birdColorBufferId);
    gl.vertexAttribPointer(fColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(fColor);

    birdPool.forEach((bird, index) => {
        if (bird.visible) {
            for (let i = 0; i < bird.vertices.length; i += 2) {
                bird.vertices[i] += bird.speed;
            }

            // Simple wing flap
            var currentTime = Date.now();
            if (currentTime - bird.lastFlapTime >= flapInterval) {
                const bodyY = bird.vertices[1];  // Y-coordinate of the bird's body
                
                if (bird.wingUp) {
                    bird.vertices[27] = bodyY + wingSpan;
                } else {
                    bird.vertices[27] = bodyY - wingSpan;
                }
                bird.wingUp = !bird.wingUp;  // Toggle wing state
                bird.lastFlapTime = currentTime; 
            }

            var birdOffScreen = (bird.speed > 0 && bird.vertices[0] > 1.3) || (bird.speed < 0 && bird.vertices[0] < -1.3);
            if (birdOffScreen) {
                bird.visible = false;
                addBird(); // Add a new bird to replace the off-screen one
            } else {
                // Update bird vertex buffer
                gl.bindBuffer(gl.ARRAY_BUFFER, birdBufferId);
                gl.bufferSubData(gl.ARRAY_BUFFER, index * 30 * 4, bird.vertices);

                gl.drawArrays(gl.TRIANGLES, index * 15, 15);
            }
        }
    });

    window.requestAnimFrame(render);
}

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
        birdX = -1.1; 
        direction = 1; 
    } else {
        birdX = 1.1;
        direction = -1;
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
        birdX - 0.2 * direction, birdY + 0.05,     // Top of the tail
        birdX - 0.3 * direction, birdY + 0.05,     // Sharp corner of the tail

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

    var bulletX = vertices[4]; // Top angle in gun triangle
    var bulletY = vertices[5];

    inactiveBullet.vertices.set([
        bulletX, bulletY,
        bulletX, bulletY + 0.04,
        bulletX + 0.02, bulletY + 0.04,
        bulletX + 0.02, bulletY,
        bulletX + 0.02, bulletY + 0.04,
        bulletX, bulletY
    ]);
    inactiveBullet.visible = true;

    gl.bindBuffer(gl.ARRAY_BUFFER, bulletBufferId);
    gl.bufferSubData(gl.ARRAY_BUFFER, bulletPool.indexOf(inactiveBullet) * 12 * 4, inactiveBullet.vertices);
}

function startLevel(lvl){

    switch(lvl){
        case 1:
            level = lvl;
            levelBirds = 2;
            addBird();
            addBird();
            addBird();
            break;
        case 2:
            level = lvl;
            levelBirds = 5;
            addBird();
            addBird();
            addBird();
            addBird();
            addBird();
            break;
        case 3:
            level = lvl;
            levelBirds = 9;
            for (let i = 0; i < 10; i++) {
                addBird();
            }
            break;
        case 4:
            level = lvl;
            levelBirds = 10;
            for (let i = 0; i < 8; i++) {
                addBird();
            }
            break;
        case 5:
            level = lvl;
            levelBirds = 25;
            for (let i = 0; i < 25; i++) {
                addBird();
            }
            break;
        case 6:
            gameStatus = "You win!";
            hits = 0;
            updateLevelInfo();
            render()
            break;
    }
    if(lvl <= 5){
    level = lvl;
    hits = 0;
    updateLevelInfo();
    render()
    }
}

function updateLevelInfo() {
    document.getElementById('level-number').textContent = level;
    document.getElementById('score-number').textContent = score;
    document.getElementById('game-status').textContent = gameStatus;
}

function increaseScore() {
    score += level;
    updateLevelInfo();
}