import {createBird, createBullet, checkCollision, getBoundingBox} from './utils.js'

var gl;
var canvas;

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
var birdBufferId;
var bulletBufferId;

var vPosition;

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    vertices = new Float32Array([
        0.02, -0.98,    // Byssa
        -0.02, -0.98,
        0, -0.92, 
    ]);

    //  Configure WebGL
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 0.02 );
    
    //  Load shaders and initialize attribute buffers
    
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    // Load the data into the GPU
    
    bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW );

    // Associate out shader variables with our data buffer
    
    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    
    birdBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, birdBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, maxBirds * 12 * 4, gl.DYNAMIC_DRAW);

    bulletBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bulletBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, maxBullets * 12 * 4, gl.DYNAMIC_DRAW);
    
    for (let i = 0; i < maxBirds; i++) {
        birdPool.push(createBird());
    }

    for (let i = 0; i < maxBullets; i++) {
        bulletPool.push(createBullet());
    }

    listenForCanvasEvents()
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
        birdX, birdY,
        birdX - 0.3 * direction, birdY,
        birdX, birdY + 0.05,
        birdX, birdY + 0.05,
        birdX - 0.3 * direction, birdY,
        birdX - 0.3 * direction, birdY + 0.05
    ]);
    inactiveBird.speed = (birdSpeed + (level/1000)) * direction;
    inactiveBird.visible = true;

    gl.bindBuffer(gl.ARRAY_BUFFER, birdBufferId);
    gl.bufferSubData(gl.ARRAY_BUFFER, birdPool.indexOf(inactiveBird) * 12 * 4, inactiveBird.vertices);
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
    
    // Draw Byssa
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
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
    birdPool.forEach((bird, index) => {
        if (bird.visible) {
            for (let i = 0; i < bird.vertices.length; i += 2) {
                bird.vertices[i] += bird.speed;
            }

            var birdOffScreen = (bird.speed > 0 && bird.vertices[0] > 1.1) || (bird.speed < 0 && bird.vertices[0] < -1.1);
            if (birdOffScreen) {
                bird.visible = false;
                addBird(); // Immediately add a new bird to replace the off-screen one
            } else {
                gl.bufferSubData(gl.ARRAY_BUFFER, index * 12 * 4, bird.vertices);
                gl.drawArrays(gl.TRIANGLES, index * 6, 6);
            }
        }
    });
    window.requestAnimFrame(render);
}

function startLevel(lvl){
    if (lvl > 5){
        console.log("game won!")
    }
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

function updateLevelInfo() {
    document.getElementById('level-number').textContent = level;
    document.getElementById('score-number').textContent = score;
}

function increaseScore() {
    score += level;
    updateLevelInfo();
}