var canvas;
var gl;

var numVertices  = 36;

var points = [];
var colors = [];

var movement = false;     // Do we rotate?
var spinX = 0;
var spinY = 0;
var origX;
var origY;

var matrixLoc;

var cameraAngle = 0;       // Horizontal camera angle (azimuth)
var cameraElevation = 0;   // Vertical camera angle (elevation)
var cameraRadius = 10;


var eye = vec3(0, 0, 5);
var at = vec3(0, 0, 0);
var up = vec3(0, 1, 0);

var near = 0.3;
var far = 100.0;
var  fovy = 45.0;        // Field-of-view in Y direction angle (in degrees)
var  aspect;

var gameState = [];
var numberCells = 0;
const gridSize = 10;

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    colorCube();

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.02, 0.02 );
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    projMatrixLoc = gl.getUniformLocation( program, "projectionMat" );
    aspect = canvas.width / canvas.height;
    projMatrix = perspective(fovy, aspect, near, far);
    gl.uniformMatrix4fv( projMatrixLoc, false, flatten(projMatrix));

    var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );

    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    //matrixLoc = gl.getUniformLocation( program, "transform" );
    matrixLoc = gl.getUniformLocation( program, "modelViewMat" );

    //event listeners for mouse
    canvas.addEventListener("mousedown", function(e){
        movement = true;
        origX = e.offsetX;
        origY = e.offsetY;
        e.preventDefault();
    });
    
    canvas.addEventListener("mouseup", function(e){
        movement = false;
    });
    
    canvas.addEventListener("mousemove", function(e){
        if(movement) {
            spinY = (spinY + (e.offsetX - origX) * 0.5) % 360;
            spinX = Math.max(-60, Math.min(60, spinX + (e.offsetY - origY) * 0.5));
            origX = e.offsetX;
            origY = e.offsetY;
        }
    });
    
    window.addEventListener("keydown", handleKeyDown);
    initializeGameState();
    gameLoop();
    render();
}

function initializeGameState() {
    for (var x = 0; x < gridSize; x++) {
      gameState[x] = [];
      for (var y = 0; y < gridSize; y++) {
        gameState[x][y] = [];
        for (var z = 0; z < gridSize; z++) {
          // Initialize each cell randomly (alive or dead)
          gameState[x][y][z] = Math.random() < 0.25 ? 1 : 0;
        }
      }
    }
  }

  function countNeighbors(x, y, z) {
    let count = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          
          let nx = (x + dx + gridSize) % gridSize;
          let ny = (y + dy + gridSize) % gridSize;
          let nz = (z + dz + gridSize) % gridSize;
          
          count += gameState[nx][ny][nz];
        }
      }
    }
    return count;
  }

  function updateGameState() {
    let newState = JSON.parse(JSON.stringify(gameState)); // Deep copy
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
          let neighbors = countNeighbors(x, y, z);
          if (gameState[x][y][z] === 1) {
            // Cell is alive
            if (neighbors < 5 || neighbors > 7) {
              newState[x][y][z] = 0; // Cell dies
            }
          } else {
            // Cell is dead
            if (neighbors === 6 || neighbors === 6) {
              newState[x][y][z] = 1; // Cell becomes alive
            }
          }
        }
      }
    }
  
    gameState = newState;
  }

function handleKeyDown(event) {
    switch(event.key) {
        case 'a':
        case 'A':
            // Move camera left
            cameraAngle -= 0.1;
            break;
        case 'd':
        case 'D':
            // Move camera right
            cameraAngle += 0.1;
            break;
            case 'w':
        case 'W':
            // Rotate camera upwards
            cameraElevation = Math.min(cameraElevation + 0.1, Math.PI / 2); // Clamp to 90 degrees max
            break;
        case 's':
        case 'S':
            // Rotate camera downwards
            cameraElevation = Math.max(cameraElevation - 0.1, -Math.PI / 2); // Clamp to -90 degrees min
            break;
    }
}

function colorCube()
{
    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );
}

function quad(a, b, c, d) 
{
    var vertices = [
        vec3( -0.5, -0.5,  0.5 ),
        vec3( -0.5,  0.5,  0.5 ),
        vec3(  0.5,  0.5,  0.5 ),
        vec3(  0.5, -0.5,  0.5 ),
        vec3( -0.5, -0.5, -0.5 ),
        vec3( -0.5,  0.5, -0.5 ),
        vec3(  0.5,  0.5, -0.5 ),
        vec3(  0.5, -0.5, -0.5 )
    ];

    var vertexColors = [
        [ 0.0, 0.0, 0.0, 1.0 ],  // black
        [ 1.0, 0.0, 0.0, 1.0 ],  // red
        [ 1.0, 1.0, 0.0, 1.0 ],  // yellow
        [ 0.0, 1.0, 0.0, 1.0 ],  // green
        [ 0.0, 0.0, 1.0, 1.0 ],  // blue
        [ 1.0, 0.0, 1.0, 1.0 ],  // magenta
        [ 0.0, 1.0, 1.0, 1.0 ],  // cyan
        [ 1.0, 1.0, 1.0, 1.0 ]   // white
    ];

    //vertex color assigned by the index of the vertex
    var indices = [ a, b, c, a, c, d ];

    for ( var i = 0; i < indices.length; ++i ) {
        points.push( vertices[indices[i]] );
        colors.push(vertexColors[a]);
        
    }
}

function render()
{
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var cameraRadius = 25.0;
    var theta = cameraAngle;  
    var phi = cameraElevation;

    eye[0] = cameraRadius * Math.cos(phi) * Math.sin(theta);  // X-coordinate
    eye[1] = cameraRadius * Math.sin(phi);                    // Y-coordinate (vertical movement)
    eye[2] = cameraRadius * Math.cos(phi) * Math.cos(theta);  // Z-coordinate

    at = vec3(0, 0, 0);
    var mv = lookAt(eye, at, up);

    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            for (let z = 0; z < gridSize; z++) {
                if (gameState[x][y][z] === 1) {
                    // Cell is alive, render a cube
                    var cellMv = mult(mv, translate(x - gridSize/2 + 0.5, y - gridSize/2 + 0.5, z - gridSize/2 + 0.5));
                    cellMv = mult(cellMv, scalem(0.9, 0.9, 0.9));
                    gl.uniformMatrix4fv(matrixLoc, false, flatten(cellMv));
                    gl.drawArrays(gl.TRIANGLES, 0, 36); // 36 vertices for a cube (6 faces * 2 triangles * 3 vertices)
                }
            }
        }
    }

    requestAnimFrame(render);
}

function gameLoop() {
    updateGameState();
    setTimeout(gameLoop, 750);
}