var gl;
var points;
var mouseX;  
var movement = false;

var bullets = [];
var bulletSpeed = 0.01;
var maxBullets = 3;
var bulletPool = [];

var birds = [];
var maxBirds = 3;
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
    var canvas = document.getElementById( "gl-canvas" );
    
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

    canvas.addEventListener("mousedown", function(e){
        movement = true;
        mouseX = e.offsetX;
    } );

    canvas.addEventListener("mouseup", function(e){
        movement = false;
    } );

    canvas.addEventListener("mousemove", function(e){
        if(movement) {
            var xmove = 2 * (e.offsetX - mouseX) / canvas.width;
            mouseX = e.offsetX;
    
            for (let i = 0; i < 3; i++) {
                vertices[i * 2] += xmove;
            }
    
            gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
        }
    });
    
    for (let i = 0; i < maxBirds; i++) {
        birdPool.push(createBird());
    }

    for (let i = 0; i < maxBirds; i++) {
        addBird();
    }

    for (let i = 0; i < maxBullets; i++) {
        bulletPool.push(createBullet());
    }
    

    render();
};

function createBullet() {
    return {
        vertices: new Float32Array(12), // 6 vertices * 2 coordinates
        visible: false
    };
}

function createBird() {
    return {
        vertices: new Float32Array(12), // 6 vertices * 2 coordinates
        speed: 0,
        visible: false
    };
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
    inactiveBird.speed = birdSpeed * direction;
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

function resetBird(bird, index) {
    var birdX = Math.random() > 0.5 ? -1.3 : 1.3;
    var birdY = Math.random() * (birdHeightRange[1] - birdHeightRange[0]) + birdHeightRange[0];
    var direction = birdX < 0 ? 1 : -1;

    bird.vertices = new Float32Array([
        birdX, birdY,
        birdX - 0.3 * direction, birdY,
        birdX, birdY + 0.05,
        birdX, birdY + 0.05,
        birdX - 0.3 * direction, birdY,
        birdX - 0.3 * direction, birdY + 0.05
    ]);

    bird.speed = direction * (Math.random() * (birdSpeedRange[1] - birdSpeedRange[0]) + birdSpeedRange[0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, birdBufferId);
    gl.bufferSubData(gl.ARRAY_BUFFER, index * 12 * 4, bird.vertices);
}

function getBoundingBox(vertices) {
    var minX = Math.min(vertices[0], vertices[2], vertices[4]);
    var maxX = Math.max(vertices[0], vertices[2], vertices[4]);
    var minY = Math.min(vertices[1], vertices[3], vertices[5]);
    var maxY = Math.max(vertices[1], vertices[3], vertices[5]);

    return { minX, maxX, minY, maxY };
}

function checkCollision(bulletBox, birdBox) {
    return (
        bulletBox.maxX > birdBox.minX &&
        bulletBox.minX < birdBox.maxX &&
        bulletBox.maxY > birdBox.minY &&
        bulletBox.minY < birdBox.maxY
    );
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

            if (bullet.vertices[1] > 1.0) {
                bullet.visible = false;
            } else {
                gl.bufferSubData(gl.ARRAY_BUFFER, bulletIndex * 12 * 4, bullet.vertices);
                gl.drawArrays(gl.TRIANGLES, bulletIndex * 6, 6);

                var bulletBox = getBoundingBox(bullet.vertices);
                birdPool.forEach((bird) => {
                    if (bird.visible) {
                        var birdBox = getBoundingBox(bird.vertices);
                        if (checkCollision(bulletBox, birdBox)) {
                            bird.visible = false;
                            bullet.visible = false;
                            console.log("Collision detected between bullet and bird!");
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