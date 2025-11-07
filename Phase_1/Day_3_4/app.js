const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl');
if(!gl){ alert('WebGL not supported'); throw new Error('no-webgl'); }

/* -------------------------
   Vertex Shader (GLSL)
   - receives a_position attribute
   - computes gl_Position
   - passes v_pos to fragment as varying
   ------------------------- */
const vsSource = `
attribute vec2 a_position;
varying vec2 v_pos;
void main(){
  // a_position is in clip-space already [-1..1]
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_pos = a_position; // pass to fragment shader (interpolated)
}
`;

/* -------------------------
   Fragment Shader (GLSL)
   - receives varying v_pos
   - uses uniforms u_time, u_mode, u_color
   - computes final color
   ------------------------- */
const fsSource = `
precision mediump float;
varying vec2 v_pos;
uniform float u_time;
uniform int u_mode;
uniform vec3 u_color;

void main(){
  // mode 0: rainbow by time + position
  if(u_mode == 0){
    float r = 0.5 + 0.5 * sin(u_time + v_pos.x * 3.0);
    float g = 0.5 + 0.5 * sin(u_time + v_pos.y * 4.0 + 2.0);
    float b = 0.5 + 0.5 * sin(u_time + (v_pos.x+v_pos.y) * 2.5 + 4.0);
    gl_FragColor = vec4(r, g, b, 1.0);
    return;
  }
  // mode 1: solid color from JS uniform
  if(u_mode == 1){
    gl_FragColor = vec4(u_color, 1.0);
    return;
  }
  // default: gradient by position
  vec3 col = vec3(0.5 + 0.5 * v_pos.x, 0.5 + 0.5 * v_pos.y, 0.7);
  gl_FragColor = vec4(col, 1.0);
}
`;

/* -------- compile helpers -------- */
function compileShader(src, type){
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
    console.error('Shader compile error:', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}
const vs = compileShader(vsSource, gl.VERTEX_SHADER);
const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);
const program = gl.createProgram();
gl.attachShader(program, vs);
gl.attachShader(program, fs);
gl.linkProgram(program);
if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
  console.error('Program link error:', gl.getProgramInfoLog(program));
}
gl.useProgram(program);

/* -------- geometry: a single triangle (clip-space coords) --------
   coords in clip-space (-1..1). We'll draw a filled triangle.
*/
const vertices = new Float32Array([
   0.0,  0.6,   // top
  -0.7, -0.6,   // bottom-left
   0.7, -0.6    // bottom-right
]);

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

const aPos = gl.getAttribLocation(program, 'a_position');
gl.enableVertexAttribArray(aPos);
gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

/* -------- get uniform locations -------- */
const uTimeLoc = gl.getUniformLocation(program, 'u_time');
const uModeLoc = gl.getUniformLocation(program, 'u_mode');
const uColorLoc = gl.getUniformLocation(program, 'u_color');

/* -------- state -------- */
let start = performance.now();
let mode = 0; // 0 = animated rainbow, 1 = solid color, 2 = gradient by pos
let solidColor = [0.9, 0.4, 0.2]; // default orange

window.addEventListener('keydown', (e) => {
  if(e.key === '1') mode = 0;
  if(e.key === '2') mode = 1;
  if(e.key === '3') mode = 2;
  // change solid color quickly: r/g/b keys
  if(e.key === 'r' || e.key === 'R') solidColor = [1,0,0];
  if(e.key === 'g' || e.key === 'G') solidColor = [0,1,0];
  if(e.key === 'b' || e.key === 'B') solidColor = [0,0,1];
});

/* -------- draw loop -------- */
function draw(){
  const now = performance.now();
  const t = (now - start) / 1000.0; // seconds
  // resize for DPR
  const dpr = window.devicePixelRatio || 1;
  const displayW = Math.floor(canvas.clientWidth * dpr);
  const displayH = Math.floor(canvas.clientHeight * dpr);
  if(canvas.width !== displayW || canvas.height !== displayH){
    canvas.width = displayW; canvas.height = displayH;
  }
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.clearColor(0.05,0.05,0.06,1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // set uniforms
  gl.uniform1f(uTimeLoc, t);
  gl.uniform1i(uModeLoc, mode);
  gl.uniform3fv(uColorLoc, solidColor);

  // draw triangle
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  requestAnimationFrame(draw);
}
draw();