//////////////////////////////////////////////////////////////////////
//    Sýnisforrit í Tölvugrafík
//     L-laga form teiknað með TRIANGLE-FAN
//
//    Hjálmtýr Hafsteinsson, ágúst 2024
//////////////////////////////////////////////////////////////////////
var gl;
var points;

window.onload = function init()
{
    var canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    /*var vertices = new Float32Array([-0.75, -0.75,
                                     -0.75,  0.75,
                                     -0.35,  0.75,
                                     -0.35, -0.35,
                                      0.45, -0.35,
                                      0.45, -0.75]);

    
   
    var vertices = new Float32Array([
        -0.75,  0.75,  // A (Top-left corner)
        -0.25,  0.75,  // B (Top-right corner)
        -0.75,  0.25,  // D (Bottom-left corner of the vertical part)
        -0.25,  0.25,  // E (Bottom-right corner of the vertical part)
        -0.75, -0.25,  // F (Far-left corner of the bottom horizontal part)
        -0.25, -0.25,  // G (Far-right corner of the bottom horizontal part)
        -0.75, -0.75,  // H (Bottom-left corner of the full L-shape)
        -0.25, -0.75,  // I (Bottom-right corner of the full L-shape)
        0.25, -0.75,  // J (Far-right extended part)
        0.25, -0.25   // K (Far-right vertical continuation)
    ]);
    */
    var vertices = new Float32Array([
        0.75, -0.75, // 0
        0.75, -0.25, // 1
        0.25, -0.75, // 2
        0.25, -0.25, // 3
        -0.25, -0.75,// 4
        -0.25, -0.25,// 5
        -0.75, -0.75,// 6
        -0.75, -0.25,// 7
        -0.25, -0.25, // 5
        -0.75, -0.25,// 7
        -0.25, 0.25, // 8
        -0.75, 0.25, //9
        -0.25, 0.75, //10
        -0.75, 0.75, //11

    ]);
    //  Configure WebGL
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 0.02 );
    
    //  Load shaders and initialize attribute buffers
    
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    // Load the data into the GPU
    
    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER,vertices, gl.STATIC_DRAW );

    // Associate out shader variables with our data buffer
    
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    render();
};


function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 14 );
}