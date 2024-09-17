////////////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//     Sýnir hvernig hægt er að nota bútalitarann til að lita
//     depil á ferning sem fyllir allan strigann.
//
//    Hjálmtýr Hafsteinsson, september 2024
////////////////////////////////////////////////////////////////////
var gl;
var uTimeLoc;
var uResolutionLoc;
var canvas;

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    
    //  Load shaders and initialize attribute buffers
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    uTimeLoc = gl.getUniformLocation(program, "time");
    uResolutionLoc = gl.getUniformLocation(program, "resolution");
    gl.uniform2fv(uResolutionLoc, [canvas.width, canvas.height]);


    //  The vertices of a square, filling the whole canvas
    var vertices = [ vec2( -1, -1 ), vec2( 1,  -1 ), vec2( 1, 1 ),
                     vec2( -1, -1 ), vec2( 1,  1 ), vec2( -1, 1 )
    ];

     // Load the data into the GPU
    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );

    // Associate shader variables with our data buffer
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    locTime = gl.getUniformLocation( program, "time" );
    
    iniTime = Date.now();

    //  Get canvas resolution and send to shaders
    canvasRes = vec2(canvas.width, canvas.height);
    gl.uniform2fv( gl.getUniformLocation( program, "resolution" ), flatten(canvasRes) )

    render();
};


function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );

    var msek = (Date.now() - iniTime) * 0.001; // Convert to seconds
    gl.uniform1f( uTimeLoc, msek );
    gl.uniform2fv(uResolutionLoc, [canvas.width, canvas.height]);
    
    gl.drawArrays( gl.TRIANGLES, 0, 6 );

    window.requestAnimFrame(render);
}