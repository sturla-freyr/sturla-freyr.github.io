/////////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//     Teiknar hring á strigann þar sem notandinn smellir
//     með músinni
//
//    Hjálmtýr Hafsteinsson, ágúst 2024
/////////////////////////////////////////////////////////////////
var canvas;
var gl;

var maxNumCircles = 200;  
var index = 0;
var circleVertices = [];

var program;
var vBuffer;

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.95, 1.0, 1.0, 1.0 );

    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 8 * maxNumCircles * 34, gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    canvas.addEventListener("mousedown", function(e){
        if (index >= maxNumCircles) return;

        var rect = canvas.getBoundingClientRect();
        var x = 2*(e.clientX - rect.left)/canvas.width - 1;
        var y = 2*(canvas.height - (e.clientY - rect.top))/canvas.height - 1;
        var center = vec2(x, y);
        var radius = Math.random()/10;

        var circlePoints = createCirclePoints(center, radius, 32);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 8 * index * 34, flatten(circlePoints));

        index++;
    } );

    render();
}

function createCirclePoints(cent, rad, numSegments) {
    var points = [];
    points.push(cent);  // Byrja á miðju
    
    for(var i = 0; i <= numSegments; i++) {
        var theta = (i / numSegments) * 2 * Math.PI;
        var x = rad * Math.cos(theta) + cent[0];
        var y = rad * Math.sin(theta) + cent[1];
        points.push(vec2(x, y)); // Restin af punktinum
    }
    
    return points;
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    for(var i = 0; i < index; i++) {
        gl.drawArrays(gl.TRIANGLE_FAN, i * 34, 34);
    }

    window.requestAnimFrame(render);
}