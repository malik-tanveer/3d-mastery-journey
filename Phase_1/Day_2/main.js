
const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl');
if (!gl) { alert('WebGL not supported'); throw new Error('no-webgl'); }

// --- shaders ---
const vs = `
attribute vec3 a_pos;
uniform mat4 u_mvp;
void main(){
  gl_Position = u_mvp * vec4(a_pos, 1.0);
}
`;
const fs = `
precision mediump float;
uniform vec3 u_color;
void main(){ gl_FragColor = vec4(u_color, 1.0); }
`;

function compile(src,type){
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
    console.error(gl.getShaderInfoLog(s));
    gl.deleteShader(s); return null;
  }
  return s;
}
const prog = gl.createProgram();
gl.attachShader(prog, compile(vs, gl.VERTEX_SHADER));
gl.attachShader(prog, compile(fs, gl.FRAGMENT_SHADER));
gl.linkProgram(prog);
if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){ console.error(gl.getProgramInfoLog(prog)); }
gl.useProgram(prog);

// axis lines: each pair is start->end for a line
const axisVerts = new Float32Array([
  // X axis (red)
   0,0,0,   2,0,0,
  // Y axis (green)
   0,0,0,   0,2,0,
  // Z axis (blue)
   0,0,0,   0,0,2
]);

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, axisVerts, gl.STATIC_DRAW);

const aPos = gl.getAttribLocation(prog, 'a_pos');
gl.enableVertexAttribArray(aPos);
gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

const uMVP = gl.getUniformLocation(prog, 'u_mvp');
const uColor = gl.getUniformLocation(prog, 'u_color');

// ---- simple math helpers (column-major matrices) ----
function degToRad(d){ return d * Math.PI / 180; }

function perspective(fovDeg, aspect, near, far){
  const f = 1.0 / Math.tan(degToRad(fovDeg)/2);
  const nf = 1 / (near - far);
  // column-major
  return new Float32Array([
    f/aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, (2*far*near) * nf, 0
  ]);
}

function normalize(v){
  const len = Math.hypot(...v);
  return v.map(x=>x/len);
}
function cross(a,b){
  return [
    a[1]*b[2]-a[2]*b[1],
    a[2]*b[0]-a[0]*b[2],
    a[0]*b[1]-a[1]*b[0]
  ];
}
function subtract(a,b){ return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function dot(a,b){ return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }

// lookAt (eye, center, up) -> view matrix (column-major)
function lookAt(eye, center, up){
  const z = normalize(subtract(eye, center)); // camera forward
  const x = normalize(cross(up, z));
  const y = cross(z, x);

  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1
  ]);
}

// multiply 4x4 matrices (a * b) column-major
function mulMat(a,b){
  const out = new Float32Array(16);
  for(let r=0;r<4;r++){
    for(let c=0;c<4;c++){
      let sum=0;
      for(let k=0;k<4;k++) sum += a[k*4 + r] * b[c*4 + k];
      out[c*4 + r] = sum;
    }
  }
  return out;
}

// ---- camera state & interaction (simple orbit) ----
let yaw = 45, pitch = 25, radius = 6;
let isDown=false, lastX=0, lastY=0;
canvas.addEventListener('mousedown', e=> { isDown=true; lastX=e.clientX; lastY=e.clientY; });
window.addEventListener('mousemove', e=> {
  if(!isDown) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  yaw += dx * 0.3;
  pitch += dy * 0.3;
  pitch = Math.max(-85, Math.min(85, pitch));
  lastX = e.clientX; lastY = e.clientY;
});
window.addEventListener('mouseup', ()=> isDown=false);
canvas.addEventListener('wheel', e=> { radius += e.deltaY * 0.01; radius = Math.max(2, Math.min(20, radius)); });

// draw loop
function draw(){
  // adjust canvas resolution for DPR
  const dpr = window.devicePixelRatio || 1;
  const w = Math.floor(canvas.clientWidth * dpr);
  const h = Math.floor(canvas.clientHeight * dpr);
  if(canvas.width !== w || canvas.height !== h){
    canvas.width = w; canvas.height = h;
  }
  gl.viewport(0,0,canvas.width, canvas.height);
  gl.clearColor(0.06,0.06,0.07,1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);

  // camera from spherical coords
  const eyex = radius * Math.cos(degToRad(pitch)) * Math.sin(degToRad(yaw));
  const eyey = radius * Math.sin(degToRad(pitch));
  const eyez = radius * Math.cos(degToRad(pitch)) * Math.cos(degToRad(yaw));
  const eye = [eyex, eyey, eyez];
  const center = [0,0,0];
  const up = [0,1,0];

  const proj = perspective(60, canvas.width / canvas.height, 0.1, 100.0);
  const view = lookAt(eye, center, up);
  const mvp = mulMat(proj, view);

  gl.uniformMatrix4fv(uMVP, false, mvp);

  // draw X axis (red)
  gl.uniform3fv(uColor, [1,0.2,0.2]);
  gl.drawArrays(gl.LINES, 0, 2);
  // draw Y axis (green)
  gl.uniform3fv(uColor, [0.2,1,0.3]);
  gl.drawArrays(gl.LINES, 2, 2);
  // draw Z axis (blue)
  gl.uniform3fv(uColor, [0.2,0.5,1]);
  gl.drawArrays(gl.LINES, 4, 2);

  requestAnimationFrame(draw);
}

draw();