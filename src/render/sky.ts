/**
 * The sky: a full-screen WebGL2 fragment shader. A dithered five-stop dusk
 * ramp (no banding), the sun with its halo, slow lit cloud streaks and
 * twinkling stars. `sun` (0..1) is driven by the chart: a rally lifts the
 * sun into golden hour, a sell-off sinks it toward night.
 */

const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uSun;
uniform float uHorizon;
uniform float uDrift;
uniform vec3 uSunDisc; // x, y, radius in device px (top-left origin)
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
vec3 ramp(float t, vec3 a, vec3 b, vec3 c, vec3 d, vec3 e) {
  if (t < 0.34) return mix(a, b, smoothstep(0.0, 0.34, t));
  if (t < 0.6) return mix(b, c, smoothstep(0.34, 0.6, t));
  if (t < 0.83) return mix(c, d, smoothstep(0.6, 0.83, t));
  return mix(d, e, smoothstep(0.83, 1.0, t));
}
vec3 hex(float r, float g, float b) { return vec3(r, g, b) / 255.0; }

void main() {
  vec2 fc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float hz = max(uHorizon * uRes.y, 1.0);
  float t = clamp(fc.y / hz, 0.0, 1.0);

  vec3 night = ramp(t, hex(10.,8.,32.), hex(29.,20.,66.), hex(74.,37.,102.), hex(159.,68.,121.), hex(224.,122.,108.));
  vec3 gold  = ramp(t, hex(26.,18.,62.), hex(60.,36.,112.), hex(140.,63.,128.), hex(226.,122.,112.), hex(255.,203.,156.));
  vec3 col = mix(night, gold, uSun);

  float r = uSunDisc.z;
  float d = length(fc - uSunDisc.xy);
  col += vec3(1.0, 0.6, 0.45) * exp(-d / (r * 7.0)) * (0.12 + 0.12 * uSun);
  col += vec3(1.0, 0.78, 0.6) * exp(-d / (r * 1.9)) * 0.26;

  float band = smoothstep(0.34, 0.52, t) * (1.0 - smoothstep(0.8, 0.96, t));
  vec2 cp = vec2(fc.x / uRes.x * 2.4 + uTime * 0.006 + uDrift, fc.y / hz * 10.0);
  float n = fbm(cp * vec2(1.0, 0.55) + vec2(0.0, uTime * 0.01));
  float cloud = smoothstep(0.56, 0.8, n) * band;
  vec3 cloudCol = mix(hex(92., 38., 96.), hex(255., 168., 142.), smoothstep(0.45, 1.0, t));
  cloudCol += vec3(0.35, 0.2, 0.12) * exp(-d / (r * 4.5));
  col = mix(col, cloudCol, cloud * 0.5);

  float disc = smoothstep(r + 1.0, r - 1.0, d);
  vec3 sunCol = mix(vec3(1.0, 0.98, 0.93), vec3(1.0, 0.77, 0.6), smoothstep(0.0, r, d));
  col = mix(col, sunCol, disc);

  float sv = (1.0 - smoothstep(0.12, 0.5, t)) * (1.0 - uSun * 0.7);
  vec2 cell = floor(fc / 3.0);
  float h = hash(cell);
  float star = step(0.9968, h) * (0.55 + 0.45 * sin(uTime * (1.5 + h * 3.0) + h * 60.0));
  col += star * sv * 0.85;

  col += (hash(fc + fract(uTime) * 91.7) - 0.5) / 255.0 * 1.6;
  outColor = vec4(col, 1.0);
}`;

export class Sky {
  private gl: WebGL2RenderingContext | null;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private w = 1;
  private h = 1;
  private dpr = 1;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: false });
    if (!this.gl) { canvas.classList.add('sky-fallback'); return; }
    const gl = this.gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const n of ['uRes', 'uTime', 'uSun', 'uHorizon', 'uDrift', 'uSunDisc']) this.u[n] = gl.getUniformLocation(prog, n);
  }

  resize(cssW: number, cssH: number): void {
    // The sky is soft; one sample per CSS pixel is plenty and keeps phones cool.
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    this.w = cssW;
    this.h = cssH;
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
  }

  /** `sunX/sunY/sunR` in CSS px; `horizon` is the ground line in CSS px. */
  render(time: number, sun: number, horizon: number, drift: number, sunX: number, sunY: number, sunR: number): void {
    const gl = this.gl;
    if (!gl) return;
    const k = this.dpr;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.u.uRes!, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.u.uTime!, time);
    gl.uniform1f(this.u.uSun!, sun);
    gl.uniform1f(this.u.uHorizon!, horizon / this.h);
    gl.uniform1f(this.u.uDrift!, drift);
    gl.uniform3f(this.u.uSunDisc!, sunX * k, sunY * k, sunR * k);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  get width(): number { return this.w; }
}
