export function createBullet() {
    return {
        vertices: new Float32Array(12), // 6 vertices * 2 coordinates
        visible: false
    };
}

export function createBird() {
    return {
        vertices: new Float32Array(30), // 5 triangles *  3 vertices * 2 coordinates
        speed: 0,
        visible: false,
        wingUp: false,
        lastFlapTime: 0
    };
}

export function getBoundingBox(vertices) {
    var minX = Math.min(vertices[0], vertices[2], vertices[4]);
    var maxX = Math.max(vertices[0], vertices[2], vertices[4]);
    var minY = Math.min(vertices[1], vertices[3], vertices[5]);
    var maxY = Math.max(vertices[1], vertices[3], vertices[5]);

    return { minX, maxX, minY, maxY };
}

export function checkCollision(bulletBox, birdBox) {
    return (
        bulletBox.maxX > birdBox.minX &&
        bulletBox.minX < birdBox.maxX &&
        bulletBox.maxY > birdBox.minY &&
        bulletBox.minY < birdBox.maxY
    );
}