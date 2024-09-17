"use strict";

var gl;
var points;

var uScaleLoc;
var uColorLoc;
var uTranslateLoc;

var translationOffset = vec2(0.0, 0.0);
var translation = vec2(0.0, 0.0);
var scaler = 1;

var NumPoints = 50000;

window.onload = function init()
{
    var canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    //
    //  Initialize our data for the Sierpinski Gasket
    //

    // First, initialize the corners of our gasket with three points.

    var vertices = [
        vec2( -1, -1 ),
        vec2(  0,  1 ),
        vec2(  1, -1 )
    ];

    // Specify a starting point p for our iterations
    // p must lie inside any set of three vertices

    var u = add( vertices[0], vertices[1] );
    var v = add( vertices[0], vertices[2] );
    var p = scale( 0.25, add( u, v ) );

    // And, add our initial point into our array of points

    points = [ p ];

    // Compute new points
    // Each new point is located midway between
    // last point and a randomly chosen vertex

    for ( var i = 0; points.length < NumPoints; ++i ) {
        var j = Math.floor(Math.random() * 3);
        p = add( points[i], vertices[j] );
        p = scale( 0.5, p );
        points.push( p );
    }

    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 0.02 );

    //  Load shaders and initialize attribute buffers

    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Load the data into the GPU

    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    // Associate the shader attribute with the buffer data
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);


    // Get uniform locations
    uScaleLoc = gl.getUniformLocation(program, "uScale");
    uColorLoc = gl.getUniformLocation(program, "uColor");
    uTranslateLoc = gl.getUniformLocation(program, "uTranslate");

    
    // Set initial uniform values
    gl.uniform1f(uScaleLoc, 1.0); // No scaling initially
    gl.uniform4fv(uColorLoc, [1.0, 0.0, 0.0, 1.0]); // White color initially
    gl.uniform2fv(uTranslateLoc, translation);

    addEventListener("keydown", function (e) {
        if (e.code === "Space") {
            //var scale = Math.abs(Math.sin(Date.now() * 0.001)); // Scale changes over time
            //var color = [scale, 0.5, 1.0 - scale, 1.0]; // Color based on scale
            gl.uniform4fv(uColorLoc, [Math.random(), Math.random(), Math.random(), Math.random()]);
        }
    });
    addEventListener('wheel', function(event) {
        if (event.deltaY > 0) {
            scaler = scaler + 0.1;
            gl.uniform1f(uScaleLoc, scale);
        } else {
            scaler = scaler - 0.1;
            gl.uniform1f(uScaleLoc, scaler);
        }
    });

    var dragging = false;
    var lastMousePosition = vec2(0, 0);

    canvas.addEventListener('mousedown', function(event) {
        dragging = true;
        console.log("mousedown");
        lastMousePosition = vec2(event.clientX, event.clientY);
    });

    canvas.addEventListener('mouseup', function() {
        dragging = false;
        console.log("mouseup");
    });

    canvas.addEventListener('mousemove', function(event) {
        console.log("mousemove");
        if (dragging) {
            console.log("dragging");
            var currentMousePosition = vec2(event.clientX, event.clientY);
            var delta = subtract(currentMousePosition, lastMousePosition);
    
            // Update translation offset based on mouse drag
            translationOffset = add(translationOffset, scale(1.0 / canvas.width, delta)); // Normalize to canvas coordinates
            gl.uniform2fv(uTranslateLoc, translationOffset);
    
            // Update last mouse position
            lastMousePosition = currentMousePosition;
        }
    });

    // Define the render function
    render(uScaleLoc, uColorLoc, uTranslateLoc);
};


function render(uScaleLoc, uColorLoc, uTranslateLoc) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2fv(uTranslateLoc, translationOffset);
    gl.drawArrays(gl.POINTS, 0, points.length);
    requestAnimationFrame(function() { render(uScaleLoc, uColorLoc, uTranslateLoc); });
}
