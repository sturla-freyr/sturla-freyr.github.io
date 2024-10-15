/////////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//     Stigveldislíkan af fígúru.  Byggt á sýnidæmi úr kennslubók.
//     Í þessari útgáfu eru líkamshlutar hreyfðir með örvalyklum
//     og valið hvaða líkamshluta á að hreyfa með hnöppum.
//     Nú með teningum með mislitum hliðum
//
//    Hjálmtýr Hafsteinsson, september 2024
/////////////////////////////////////////////////////////////////
var canvas;
var gl;
var program;

var movement = false;
var spinX = 0;
var spinY = 0;
var origX;
var origY;

var zDist = -25.0;

var projectionMatrix; 
var modelViewMatrix;

var instanceMatrix;

var modelViewMatrixLoc;

var vertices = [

    vec4( -0.5, -0.5,  0.5, 1.0 ),
    vec4( -0.5,  0.5,  0.5, 1.0 ),
    vec4( 0.5,  0.5,  0.5, 1.0 ),
    vec4( 0.5, -0.5,  0.5, 1.0 ),
    vec4( -0.5, -0.5, -0.5, 1.0 ),
    vec4( -0.5,  0.5, -0.5, 1.0 ),
    vec4( 0.5,  0.5, -0.5, 1.0 ),
    vec4( 0.5, -0.5, -0.5, 1.0 )
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


var torsoId = 0;
var headId  = 1;
var head1Id = 1;
var head2Id = 10;
var leftUpperArmId = 2;
var leftLowerArmId = 3;
var rightUpperArmId = 4;
var rightLowerArmId = 5;
var leftUpperLegId = 6;
var leftLowerLegId = 7;
var rightUpperLegId = 8;
var rightLowerLegId = 9;

var currBodyPart = 0;

var torsoHeight = 5.0;
var torsoWidth = 1.0;
var upperArmHeight = 3.0;
var lowerArmHeight = 2.0;
var upperArmWidth  = 0.5;
var lowerArmWidth  = 0.5;
var upperLegWidth  = 0.5;
var lowerLegWidth  = 0.5;
var lowerLegHeight = 2.0;
var upperLegHeight = 3.0;
var headHeight = 1.5;
var headWidth = 1.0;

var numNodes = 10;
var numAngles = 11;
var angle = 0;

var theta = [40, -10, 125, 80, -130, 90, 60, -55, -30, -30, 0];

var numVertices = 24;

var stack = [];

var figure = [];

for( var i=0; i<numNodes; i++) figure[i] = createNode(null, null, null, null);

var vBuffer;
var modelViewLoc;

var pointsArray = [];
var colorsArray = [];

var legAngle = 0;
var legSpeed = 2
//-------------------------------------------

function scale4(a, b, c) {
   var result = mat4();
   result[0][0] = a;
   result[1][1] = b;
   result[2][2] = c;
   return result;
}

//--------------------------------------------


function createNode(transform, render, sibling, child){
    var node = {
    transform: transform,
    render: render,
    sibling: sibling,
    child: child,
    }
    return node;
}


function initNodes(Id) {

    var m = mat4();
    
    switch(Id) {
    
    case torsoId:
    
    m = rotateY(theta[torsoId]);
    figure[torsoId] = createNode( m, torso, null, headId );
    break;

    case headId: 
    case head1Id: 
    case head2Id:
    

    m = translate(0.0, torsoHeight+0.5*headHeight, 0.0);
    m = mult(m, rotateX(theta[head1Id]))
    m = mult(m, rotateY(theta[head2Id]));
    m = mult(m, translate(0.0, -0.5*headHeight, 0.0));
    figure[headId] = createNode( m, head, leftUpperArmId, null);
    break;
    
    
    case leftUpperArmId:
    
    m = translate(-(torsoWidth+upperArmWidth), 0.9*torsoHeight, 0.0);
    m = mult(m, rotateX(theta[leftUpperArmId]));
    figure[leftUpperArmId] = createNode( m, leftUpperArm, rightUpperArmId, leftLowerArmId );
    break;

    case rightUpperArmId:
    
    m = translate(torsoWidth+upperArmWidth, 0.9*torsoHeight, 0.0);
    m = mult(m, rotateX(theta[rightUpperArmId]));
    figure[rightUpperArmId] = createNode( m, rightUpperArm, leftUpperLegId, rightLowerArmId );
    break;
    
    case leftUpperLegId:
    
    m = translate(-(torsoWidth+upperLegWidth), 0.1*upperLegHeight, 0.0);
    m = mult(m , rotateX(theta[leftUpperLegId]+180));
    figure[leftUpperLegId] = createNode( m, leftUpperLeg, rightUpperLegId, leftLowerLegId );
    break;

    case rightUpperLegId:
    
    m = translate(torsoWidth+upperLegWidth, 0.1*upperLegHeight, 0.0);
    m = mult(m, rotateX(theta[rightUpperLegId]+180));
    figure[rightUpperLegId] = createNode( m, rightUpperLeg, null, rightLowerLegId );
    break;
    
    case leftLowerArmId:

    m = translate(0.0, upperArmHeight, 0.0);
    m = mult(m, rotateX(theta[leftLowerArmId]));
    figure[leftLowerArmId] = createNode( m, leftLowerArm, null, null );
    break;
    
    case rightLowerArmId:

    m = translate(0.0, upperArmHeight, 0.0);
    m = mult(m, rotateX(theta[rightLowerArmId]));
    figure[rightLowerArmId] = createNode( m, rightLowerArm, null, null );
    break;
    
    case leftLowerLegId:

    m = translate(0.0, upperLegHeight, 0.0);
    m = mult(m, rotateX(theta[leftLowerLegId]));
    figure[leftLowerLegId] = createNode( m, leftLowerLeg, null, null );
    break;
    
    case rightLowerLegId:

    m = translate(0.0, upperLegHeight, 0.0);
    m = mult(m, rotateX(theta[rightLowerLegId]));
    figure[rightLowerLegId] = createNode( m, rightLowerLeg, null, null );
    break;
    
    }

}

function traverse(Id) {
   
   if(Id == null) return; 
   stack.push(modelViewMatrix);
   modelViewMatrix = mult(modelViewMatrix, figure[Id].transform);
   figure[Id].render();
   if(figure[Id].child != null) traverse(figure[Id].child); 
    modelViewMatrix = stack.pop();
   if(figure[Id].sibling != null) traverse(figure[Id].sibling); 
}

function torso() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5*torsoHeight, 0.0) );
    instanceMatrix = mult(instanceMatrix, scale4( torsoWidth, torsoHeight, torsoWidth));
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function head() {
   
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * headHeight, 0.0 ));
	instanceMatrix = mult(instanceMatrix, scale4(headWidth, headHeight, headWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function leftUpperArm() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upperArmHeight, 0.0) );
	instanceMatrix = mult(instanceMatrix, scale4(upperArmWidth, upperArmHeight, upperArmWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function leftLowerArm() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * lowerArmHeight, 0.0) );
	instanceMatrix = mult(instanceMatrix, scale4(lowerArmWidth, lowerArmHeight, lowerArmWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function rightUpperArm() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upperArmHeight, 0.0) );
	instanceMatrix = mult(instanceMatrix, scale4(upperArmWidth, upperArmHeight, upperArmWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function rightLowerArm() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * lowerArmHeight, 0.0) );
	instanceMatrix = mult(instanceMatrix, scale4(lowerArmWidth, lowerArmHeight, lowerArmWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function  leftUpperLeg() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upperLegHeight, 0.0) );
	instanceMatrix = mult(instanceMatrix, scale4(upperLegWidth, upperLegHeight, upperLegWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function leftLowerLeg() {
    
    instanceMatrix = mult(modelViewMatrix, translate( 0.0, 0.5 * lowerLegHeight, 0.0) );
	instanceMatrix = mult(instanceMatrix, scale4(lowerLegWidth, lowerLegHeight, lowerLegWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function rightUpperLeg() {
    
    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * upperLegHeight, 0.0) );
	instanceMatrix = mult(instanceMatrix, scale4(upperLegWidth, upperLegHeight, upperLegWidth) );
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function rightLowerLeg() {

    instanceMatrix = mult(modelViewMatrix, translate(0.0, 0.5 * lowerLegHeight, 0.0) );
	instanceMatrix = mult(instanceMatrix, scale4(lowerLegWidth, lowerLegHeight, lowerLegWidth) )
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    for(var i =0; i<6; i++) gl.drawArrays(gl.TRIANGLE_FAN, 4*i, 4);
}

function quad(a, b, c, d) {
    pointsArray.push(vertices[a]); 
    pointsArray.push(vertices[b]); 
    pointsArray.push(vertices[c]);     
    pointsArray.push(vertices[d]);

    colorsArray.push(vertexColors[a]);
    colorsArray.push(vertexColors[a]);
    colorsArray.push(vertexColors[a]);
    colorsArray.push(vertexColors[a]);
}


function cube()
{
    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );
}


window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
 
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
 
    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader");
    
    gl.useProgram( program);

    instanceMatrix = mat4();
    
    projectionMatrix = perspective( 50.0, 1.0, 0.01, 100.0 );
    modelViewMatrix = mat4();

        
    gl.uniformMatrix4fv(gl.getUniformLocation( program, "modelViewMatrix"), false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv( gl.getUniformLocation( program, "projectionMatrix"), false, flatten(projectionMatrix) );
    
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix")
    
    cube();

    var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW );

    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );
        
    vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );
    
    
    // Event listener for keyboard
     window.addEventListener("keydown", function(e){
         switch( e.keyCode ) {
            case 38:	// upp ör
                theta[currBodyPart] = (theta[currBodyPart] < 180.0) ? theta[currBodyPart] + 5 : 180.0;
                document.getElementById("currAngle").innerHTML = theta[currBodyPart];
                initNodes(currBodyPart);
                break;
            case 40:	// niður ör
                theta[currBodyPart] = (theta[currBodyPart] > -180.0) ? theta[currBodyPart] - 5 : -180.0;
                document.getElementById("currAngle").innerHTML = theta[currBodyPart];
                initNodes(currBodyPart);
                break;
         }
     } );  

    document.getElementById("btnTorso").onclick = function(){
        currBodyPart = torsoId;
        document.getElementById("currAngle").innerHTML = theta[currBodyPart];
    };
    
    document.getElementById("btnHead2").onclick = function(){
        currBodyPart = head2Id;
        document.getElementById("currAngle").innerHTML = theta[currBodyPart];
    };
    
    document.getElementById("btnHead1").onclick = function(){
        currBodyPart = head1Id;
        document.getElementById("currAngle").innerHTML = theta[currBodyPart];
    };
    
    document.getElementById("btnLeftUpperArm").onclick = function(){
        currBodyPart = leftUpperArmId;
        document.getElementById("currAngle").innerHTML = theta[currBodyPart];
    };
    
    document.getElementById("btnLeftLowerArm").onclick = function(){
        currBodyPart = leftLowerArmId;
        document.getElementById("currAngle").innerHTML = theta[currBodyPart];
    };
    
    document.getElementById("btnRightUpperArm").onclick = function(){
        currBodyPart = rightUpperArmId;
        document.getElementById("currAngle").innerHTML = theta[currBodyPart];
    };
    
    document.getElementById("btnRightLowerArm").onclick = function(){
        currBodyPart = rightLowerArmId;
        document.getElementById("currAngle").innerHTML = theta[currBodyPart];
    };
    
    document.getElementById("btnLeftUpperLeg").onclick = function(){
        currBodyPart = leftUpperLegId;
        document.getElementById("currAngle").innerHTML = theta[currBodyPart];
    };
    
    document.getElementById("btnLeftLowerLeg").onclick = function(){
        currBodyPart = leftLowerLegId;
        document.getElementById("currAngle").innerHTML = theta[currBodyPart];
    };
    
    document.getElementById("btnRightUpperLeg").onclick = function(){
        currBodyPart = rightUpperLegId;
        document.getElementById("currAngle").innerHTML = theta[currBodyPart];
    };
    
    document.getElementById("btnRightLowerLeg").onclick = function(){
        currBodyPart = rightLowerLegId;
        document.getElementById("currAngle").innerHTML = theta[currBodyPart];
    };
    
    
    for(i=0; i<numNodes; i++) initNodes(i);

    //event listeners for mouse
    canvas.addEventListener("mousedown", function(e){
        movement = true;
        origX = e.clientX;
        origY = e.clientY;
        e.preventDefault();         // Disable drag and drop
    } );

    canvas.addEventListener("mouseup", function(e){
        movement = false;
    } );

    canvas.addEventListener("mousemove", function(e){
        if(movement) {
    	    spinY = ( spinY + (e.clientX - origX) ) % 360;
            spinX = ( spinX + (origY - e.clientY) ) % 360;
            origX = e.clientX;
            origY = e.clientY;
        }
    } );

    // Event listener for mousewheel
     window.addEventListener("mousewheel", function(e){
         if( e.wheelDelta > 0.0 ) {
             zDist += 0.5;
         } else {
             zDist -= 0.5;
         }
     }  );  
       
    animateLegs();
    render();
}

function animateLegs() {
    legAngle = (legAngle + legSpeed) % 360;
    var upperLegRotation = 45 * Math.sin(radians(legAngle));

    // Update upper leg angles
    theta[leftUpperLegId] = upperLegRotation;
    theta[rightUpperLegId] = -upperLegRotation;

    // Calculate lower leg angles with delayed bending
    var bendThreshold = 5.5; // 30% of 45 degrees
    var bendFactor = 1.25;

    function calculateLowerLegRotation(upperRotation) {
        if (upperRotation > bendThreshold) {
            return 0; // Leg is straight when upper leg is forward or slightly back
        } else {
            // Map the remaining backward motion to the full range of knee bend
            var bendRange = -45 - bendThreshold;
            var currentBend = upperRotation - bendThreshold;
            var bendPercentage = currentBend / bendRange;
            return Math.min(0, bendPercentage * upperRotation * bendFactor);
        }
    }

    var leftLowerLegRotation = calculateLowerLegRotation(upperLegRotation);
    var rightLowerLegRotation = calculateLowerLegRotation(-upperLegRotation);

    theta[leftLowerLegId] = leftLowerLegRotation;
    theta[rightLowerLegId] = rightLowerLegRotation;

    // Reinitialize the leg nodes
    initNodes(leftUpperLegId);
    initNodes(rightUpperLegId);
    initNodes(leftLowerLegId);
    initNodes(rightLowerLegId);

    requestAnimationFrame(animateLegs);
}

var render = function() {

    gl.clear( gl.COLOR_BUFFER_BIT );
        
    // staðsetja áhorfanda og meðhöndla músarhreyfingu
    var mv = lookAt( vec3(0.0, 0.0, zDist), vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0) );
    mv = mult( mv, rotateX( spinX ) );
    mv = mult( mv, rotateY( spinY ) );

    modelViewMatrix = mv;
    traverse(torsoId);
    requestAnimFrame(render);
}

function radians(degrees) {
    return degrees * Math.PI / 180;
}