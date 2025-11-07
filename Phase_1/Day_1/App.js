const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext('webgl');
if (!gl) {
    alert('WebGL not supported in this browser.');
    throw new Error('WebGL not supported');
}

// Vertex shader: receives position and passes through
const vsSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

// Fragment shader: uses a uniform color
const fsSource = `
    precision mediump float;
    uniform vec4 u_color;
    void main() {
      gl_FragColor = u_color;
    }
  `;

function compileShader(src, type) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
    }
    return sh;
}

const vs = compileShader(vsSource, gl.VERTEX_SHADER);
const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);

const program = gl.createProgram();
gl.attachShader(program, vs);
gl.attachShader(program, fs);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
}
gl.useProgram(program);

// Triangle vertices in clip space (x, y) where each component is in [-1, 1]
// This is an upright triangle centered-ish on screen.
const vertices = new Float32Array([
    0.0, 0.6,   // top
    -0.7, -0.6,   // bottom-left
    0.7, -0.6    // bottom-right
]);

// Create buffer and upload vertices
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// Link attribute
const aPosition = gl.getAttribLocation(program, 'a_position');
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

// Uniform for color
const uColor = gl.getUniformLocation(program, 'u_color');
let color = [0.9, 0.4, 0.2, 1.0]; // initial orange-ish

// Keyboard to change color to red/green/blue
window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') color = [1, 0, 0, 1];
    if (e.key === 'g' || e.key === 'G') color = [0, 1, 0, 1];
    if (e.key === 'b' || e.key === 'B') color = [0, 0, 1, 1];
});

function draw() {
    // handle high-DPI / CSS scaling
    const realToCSSPixels = window.devicePixelRatio || 1;
    const displayWidth = Math.floor(gl.canvas.clientWidth * realToCSSPixels);
    const displayHeight = Math.floor(gl.canvas.clientHeight * realToCSSPixels);
    if (gl.canvas.width !== displayWidth || gl.canvas.height !== displayHeight) {
        gl.canvas.width = displayWidth;
        gl.canvas.height = displayHeight;
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.05, 0.05, 0.06, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform4fv(uColor, color);

    // Draw triangle (3 vertices)
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    requestAnimationFrame(draw);
}

draw();