"use strict";

var canvas;
var gl;

var points = [];

var NumTimesToSubdivide = 8;

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    //
    //  Initialize our data for the Sierpinski Gasket
    //
    var vertices = [
        vec2( -1, -1 ),
        vec2(  1, -1 ),
        vec2(  1,  1 ),
        vec2( -1,  1 )
    ];

    divideCarpet( vertices[0], vertices[1], vertices[2], vertices[3], NumTimesToSubdivide);
    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    //  Load shaders and initialize attribute buffers

    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Load the data into the GPU

    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    // Associate out shader variables with our data buffer

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    render();
};

function square( a, b, c, d )
{
    points.push( a, b, c );
    points.push( a, c, d );
}
function vmix(p1, p2, t) {
    return [
        p1[0],
        p1[1] * (1 - t) + p2[1] * t
    ];
}
function hmix(p1, p2, t) {
    return [
        p1[0] * (1 - t) + p2[0] * t,
        p1[1]
    ];
}
/*
function divideCarpet(a, b, c, d, count) {
    if (count === 0) {
        square(a, b, c, d);
    } else {
        count--;

        // Compute the points for dividing the square into a 3x3 grid
        var ab1 = vec2( mix(a[0], b[0], 1/3), a[1]);
        var ab2 = vec2( mix(a[0], b[0], 2/3), a[1]);
        var bc1 = vec2( b[0], mix(b[1], c[1], 1/3));
        var bc2 = vec2( b[0], mix(b[1], c[1], 2/3),);
        var dc1 = vec2( mix(c[0], d[0], 1/3), c[1]);
        var dc2 = vec2( mix(c[0], d[0], 2/3), c[1]);
        var ad1 = vec2( d[0], mix(d[1], a[1], 1/3),);
        var ad2 = vec2( d[0], mix(d[1], a[1], 2/3),);

        var p1 = vec2( mix(ad1[0], bc1[0], 1/3), ad1[1]);  // Bottom-left of the center square
        var p2 = vec2( mix(ad1[0], bc1[0], 2/3), ad1[1]);  // Bottom-right of the center square
        var p3 = vec2( mix(ad2[0], bc2[0], 1/3), ad2[1]);  // Top-left of the center square
        var p4 = vec2( mix(ad2[0], bc2[0], 2/3), ad2[1]);  // Top-right of the center square

        divideCarpet(a, ab1, p1, ad1, count);     // Bottom-left
        divideCarpet(ab1, ab2, p2, p1, count);    // Bottom-middle
        divideCarpet(ab2, b, bc1, p2, count);     // Bottom-right
        
        divideCarpet(ad1, p1, p4, ad2, count);    // Middle-left
        divideCarpet(p2, bc1, bc2, p3, count);    // Middle-right
        
        divideCarpet(ad2, p4, dc1, d, count);    // Top-left
        divideCarpet(p4, p3, dc2, dc1, count);    // Top-middle
        divideCarpet(p3, bc2, c, dc2, count);     // Top-right
    }
}
*/
/*
function divideCarpet(a, b, c, d, count) {
    if (count === 0) {
        square(a, b, c, d);
    } else {
        count--;
        var h =0;
        var w=0;
        
    }
}

*//*
function divideCarpet( a, b, c, d, count )
{
    // check for end of recursion
    if ( count === 0 ) {
        square( a, b, c, d );
    }
    else {
        --count;

        var deltaX = (b[0] - a[0]) / 3;
        var deltaY = (c[1] - b[1]) / 3;

        var v1 = vec2(a[0], a[1]);
        var v2 = vec2(a[0] + deltaX, a[1]);
        var v3 = vec2(a[0] + 2*deltaX, a[1]);
        var v4 = vec2(b[0], b[1]);
        var v5 = vec2(a[0], a[1] + deltaY);
        var v6 = vec2(a[0] + deltaX, a[1] + deltaY);
        var v7 = vec2(a[0] + 2*deltaX, a[1] + deltaY);
        var v8 = vec2(a[0], a[1] + 2*deltaY);
        var v9 = vec2(a[0] + deltaX, a[1] + 2*deltaY);
        var v10 = vec2(a[0] + 2*deltaX, a[1] + 2*deltaY);
        var v11 = vec2(d[0], d[1]);
        var v12 = vec2(c[0], c[1]);

        divideCarpet(v1, v2, v6, v5, count);
        divideCarpet(v2, v3, v7, v6, count);
        divideCarpet(v3, v4, c, v7, count);
        divideCarpet(v5, v6, v9, v8, count);
        divideCarpet(v7, c, v12, v10, count);
        divideCarpet(v8, v9, d, v11, count);
        divideCarpet(v9, v10, v12, d, count);
        divideCarpet(v1, v5, v8, a, count);
    }
}
*/


function divideCarpet( a, b, c, d, count )
{
    // check for end of recursion
    if ( count === 0 ) {
        square( a, b, c, d );
    }
    else {
        --count;

        var deltaX = (b[0] - a[0]) / 3;
        var deltaY = (c[1] - b[1]) / 3;

        var ab1 = vec2(a[0] + deltaX, a[1]);
        var ab2 = vec2(a[0] + 2*deltaX, a[1]);
        var ad1 = vec2(a[0], a[1] + deltaY);
        var ad2 = vec2(a[0], a[1] + 2*deltaY);
        var dc1 = vec2(d[0] + deltaX, d[1]);
        var dc2 = vec2(d[0] + 2*deltaX, d[1]);
        var bc1 = vec2(b[0], b[1] + deltaY);
        var bc2 = vec2(b[0], b[1] + 2*deltaY);
        var p1 = vec2(a[0] + deltaX, a[1] + deltaY);
        var p2 = vec2(a[0] + 2*deltaX, a[1] + deltaY);
        var p4 = vec2(a[0] + deltaX, a[1] + 2*deltaY);
        var p3 = vec2(a[0] + 2*deltaX, a[1] + 2*deltaY);


        divideCarpet(a, ab1, p1, ad1, count);     // Bottom-left
        divideCarpet(ab1, ab2, p2, p1, count);    // Bottom-middle
        divideCarpet(ab2, b, bc1, p2, count);     // Bottom-right
        
        divideCarpet(ad1, p1, p4, ad2, count);    // Middle-left
        divideCarpet(p2, bc1, bc2, p3, count);    // Middle-right
        
        divideCarpet(ad2, p4, dc1, d, count);    // Top-left
        divideCarpet(p4, p3, dc2, dc1, count);    // Top-middle
        divideCarpet(p3, bc2, c, dc2, count);     // Top-right
    }
}


function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.TRIANGLES, 0, points.length );
}

