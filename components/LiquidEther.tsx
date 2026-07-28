/* ══════════════════════════════════════════════════════
   Liquid Ether — Monochrome WebGL Fluid Depth Layer

   Full Navier-Stokes fluid simulation via GPU shader passes,
   adapted from React Bits' LiquidEther for portfolio use.

   Adaptations from original:
   - Monochrome palette (dark greys) — no colour
   - Drastically reduced forces and intensity
   - Disabled on touch devices and prefers-reduced-motion
   - Pauses when document tab is hidden
   - Fixed full-viewport behind all content
   - Self-contained WebGL context (separate from R3F Orb)

   Performance:
   - Resolution 0.3 × viewport (cheap GPU passes)
   - Own RAF loop (necessary for WebGL render pipeline)
   - Single passive mousemove listener (needs velocity deltas)
   - Paused via IntersectionObserver + visibility API
   ══════════════════════════════════════════════════════ */

"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// ── Configuration (hardcoded for portfolio) ───────────

const PALETTE_COLORS = ["#333333", "#555555", "#444444"];
const MOUSE_FORCE = 5;
const CURSOR_SIZE = 60;
const RESOLUTION = 0.3;
const SIM_DT = 0.014;
const USE_BFECC = true;
const IS_VISCOUS = false;
const VISCOUS_COEFF = 30;
const ITERATIONS_VISCOUS = 32;
const ITERATIONS_POISSON = 20;
const IS_BOUNCE = false;
const AUTO_DEMO = true;
const AUTO_SPEED = 0.2;
const AUTO_INTENSITY = 0.8;
const TAKEOVER_DURATION = 0.3;
const AUTO_RESUME_DELAY = 2000;
const AUTO_RAMP_DURATION = 1.0;

// ── GLSL Shaders ──────────────────────────────────────

const FACE_VERT = `
  attribute vec3 position;
  uniform vec2 px;
  uniform vec2 boundarySpace;
  varying vec2 uv;
  precision highp float;
  void main(){
    vec3 pos = position;
    vec2 scale = 1.0 - boundarySpace * 2.0;
    pos.xy = pos.xy * scale;
    uv = vec2(0.5) + (pos.xy) * 0.5;
    gl_Position = vec4(pos, 1.0);
  }
`;

const LINE_VERT = `
  attribute vec3 position;
  uniform vec2 px;
  precision highp float;
  varying vec2 uv;
  void main(){
    vec3 pos = position;
    uv = 0.5 + pos.xy * 0.5;
    vec2 n = sign(pos.xy);
    pos.xy = abs(pos.xy) - px * 1.0;
    pos.xy *= n;
    gl_Position = vec4(pos, 1.0);
  }
`;

const MOUSE_VERT = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform vec2 center;
  uniform vec2 scale;
  uniform vec2 px;
  varying vec2 vUv;
  void main(){
    vec2 pos = position.xy * scale * 2.0 * px + center;
    vUv = uv;
    gl_Position = vec4(pos, 0.0, 1.0);
  }
`;

const ADVECTION_FRAG = `
  precision highp float;
  uniform sampler2D velocity;
  uniform float dt;
  uniform bool isBFECC;
  uniform vec2 fboSize;
  uniform vec2 px;
  varying vec2 uv;
  void main(){
    vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;
    if(isBFECC == false){
      vec2 vel = texture2D(velocity, uv).xy;
      vec2 uv2 = uv - vel * dt * ratio;
      vec2 newVel = texture2D(velocity, uv2).xy;
      gl_FragColor = vec4(newVel, 0.0, 0.0);
    } else {
      vec2 spot_new = uv;
      vec2 vel_old = texture2D(velocity, uv).xy;
      vec2 spot_old = spot_new - vel_old * dt * ratio;
      vec2 vel_new1 = texture2D(velocity, spot_old).xy;
      vec2 spot_new2 = spot_old + vel_new1 * dt * ratio;
      vec2 error = spot_new2 - spot_new;
      vec2 spot_new3 = spot_new - error / 2.0;
      vec2 vel_2 = texture2D(velocity, spot_new3).xy;
      vec2 spot_old2 = spot_new3 - vel_2 * dt * ratio;
      vec2 newVel2 = texture2D(velocity, spot_old2).xy;
      gl_FragColor = vec4(newVel2, 0.0, 0.0);
    }
  }
`;

const COLOR_FRAG = `
  precision highp float;
  uniform sampler2D velocity;
  uniform sampler2D palette;
  uniform vec4 bgColor;
  varying vec2 uv;
  void main(){
    vec2 vel = texture2D(velocity, uv).xy;
    float lenv = clamp(length(vel), 0.0, 1.0);
    vec3 c = texture2D(palette, vec2(lenv, 0.5)).rgb;
    vec3 outRGB = mix(bgColor.rgb, c, lenv);
    float outA = mix(bgColor.a, 1.0, lenv);
    gl_FragColor = vec4(outRGB, outA);
  }
`;

const DIVERGENCE_FRAG = `
  precision highp float;
  uniform sampler2D velocity;
  uniform float dt;
  uniform vec2 px;
  varying vec2 uv;
  void main(){
    float x0 = texture2D(velocity, uv - vec2(px.x, 0.0)).x;
    float x1 = texture2D(velocity, uv + vec2(px.x, 0.0)).x;
    float y0 = texture2D(velocity, uv - vec2(0.0, px.y)).y;
    float y1 = texture2D(velocity, uv + vec2(0.0, px.y)).y;
    float divergence = (x1 - x0 + y1 - y0) / 2.0;
    gl_FragColor = vec4(divergence / dt);
  }
`;

const EXTERNAL_FORCE_FRAG = `
  precision highp float;
  uniform vec2 force;
  uniform vec2 center;
  uniform vec2 scale;
  uniform vec2 px;
  varying vec2 vUv;
  void main(){
    vec2 circle = (vUv - 0.5) * 2.0;
    float d = 1.0 - min(length(circle), 1.0);
    d *= d;
    gl_FragColor = vec4(force * d, 0.0, 1.0);
  }
`;

const POISSON_FRAG = `
  precision highp float;
  uniform sampler2D pressure;
  uniform sampler2D divergence;
  uniform vec2 px;
  varying vec2 uv;
  void main(){
    float p0 = texture2D(pressure, uv + vec2(px.x * 2.0, 0.0)).r;
    float p1 = texture2D(pressure, uv - vec2(px.x * 2.0, 0.0)).r;
    float p2 = texture2D(pressure, uv + vec2(0.0, px.y * 2.0)).r;
    float p3 = texture2D(pressure, uv - vec2(0.0, px.y * 2.0)).r;
    float div = texture2D(divergence, uv).r;
    float newP = (p0 + p1 + p2 + p3) / 4.0 - div;
    gl_FragColor = vec4(newP);
  }
`;

const PRESSURE_FRAG = `
  precision highp float;
  uniform sampler2D pressure;
  uniform sampler2D velocity;
  uniform vec2 px;
  uniform float dt;
  varying vec2 uv;
  void main(){
    float step = 1.0;
    float p0 = texture2D(pressure, uv + vec2(px.x * step, 0.0)).r;
    float p1 = texture2D(pressure, uv - vec2(px.x * step, 0.0)).r;
    float p2 = texture2D(pressure, uv + vec2(0.0, px.y * step)).r;
    float p3 = texture2D(pressure, uv - vec2(0.0, px.y * step)).r;
    vec2 v = texture2D(velocity, uv).xy;
    vec2 gradP = vec2(p0 - p1, p2 - p3) * 0.5;
    v = v - gradP * dt;
    gl_FragColor = vec4(v, 0.0, 1.0);
  }
`;

const VISCOUS_FRAG = `
  precision highp float;
  uniform sampler2D velocity;
  uniform sampler2D velocity_new;
  uniform float v;
  uniform vec2 px;
  uniform float dt;
  varying vec2 uv;
  void main(){
    vec2 old = texture2D(velocity, uv).xy;
    vec2 new0 = texture2D(velocity_new, uv + vec2(px.x * 2.0, 0.0)).xy;
    vec2 new1 = texture2D(velocity_new, uv - vec2(px.x * 2.0, 0.0)).xy;
    vec2 new2 = texture2D(velocity_new, uv + vec2(0.0, px.y * 2.0)).xy;
    vec2 new3 = texture2D(velocity_new, uv - vec2(0.0, px.y * 2.0)).xy;
    vec2 newv = 4.0 * old + v * dt * (new0 + new1 + new2 + new3);
    newv /= 4.0 * (1.0 + v * dt);
    gl_FragColor = vec4(newv, 0.0, 0.0);
  }
`;

// ── Component ─────────────────────────────────────────

export default function LiquidEther() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Gate: disable on touch / coarse-pointer devices
    if (window.matchMedia("(pointer: coarse)").matches) return;

    // Gate: respect prefers-reduced-motion
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) return;

    // ── Palette texture ────────────────────────────────

    function makePaletteTexture(stops: string[]): THREE.DataTexture {
      const arr = stops.length >= 2 ? stops : [stops[0] || "#ffffff", stops[0] || "#ffffff"];
      const w = arr.length;
      const data = new Uint8Array(w * 4);
      for (let i = 0; i < w; i++) {
        const c = new THREE.Color(arr[i]);
        data[i * 4 + 0] = Math.round(c.r * 255);
        data[i * 4 + 1] = Math.round(c.g * 255);
        data[i * 4 + 2] = Math.round(c.b * 255);
        data[i * 4 + 3] = 255;
      }
      const tex = new THREE.DataTexture(data, w, 1, THREE.RGBAFormat);
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      return tex;
    }

    const paletteTex = makePaletteTexture(PALETTE_COLORS);
    const bgVec4 = new THREE.Vector4(0, 0, 0, 0);

    // ── Common (viewport / renderer state) ─────────────

    const Common = {
      width: 0,
      height: 0,
      renderer: null as THREE.WebGLRenderer | null,
      clock: null as THREE.Clock | null,
      delta: 0,
      time: 0,

      init(el: HTMLElement) {
        const rect = el.getBoundingClientRect();
        this.width = Math.max(1, Math.floor(rect.width));
        this.height = Math.max(1, Math.floor(rect.height));
        const pr = Math.min(window.devicePixelRatio || 1, 1.5);
        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        this.renderer.autoClear = false;
        this.renderer.setClearColor(new THREE.Color(0x000000), 0);
        this.renderer.setPixelRatio(pr);
        this.renderer.setSize(this.width, this.height);
        this.renderer.domElement.style.width = "100%";
        this.renderer.domElement.style.height = "100%";
        this.renderer.domElement.style.display = "block";
        this.clock = new THREE.Clock();
        this.clock.start();
      },

      resize(el: HTMLElement) {
        const rect = el.getBoundingClientRect();
        this.width = Math.max(1, Math.floor(rect.width));
        this.height = Math.max(1, Math.floor(rect.height));
        if (this.renderer) this.renderer.setSize(this.width, this.height, false);
      },

      update() {
        if (this.clock) {
          this.delta = this.clock.getDelta();
          this.time += this.delta;
        }
      },
    };

    // ── Mouse (pointer tracking) ───────────────────────

    const Mouse = {
      coords: new THREE.Vector2(),
      coords_old: new THREE.Vector2(),
      diff: new THREE.Vector2(),
      mouseMoved: false,
      isHoverInside: false,
      hasUserControl: false,
      isAutoActive: false,
      autoIntensity: AUTO_INTENSITY,
      takeoverActive: false,
      takeoverStartTime: 0,
      takeoverDuration: TAKEOVER_DURATION,
      takeoverFrom: new THREE.Vector2(),
      takeoverTo: new THREE.Vector2(),
      onInteract: null as (() => void) | null,
      timer: null as ReturnType<typeof setTimeout> | null,

      setCoords(x: number, y: number) {
        if (this.timer) clearTimeout(this.timer);
        const rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const nx = (x - rect.left) / rect.width;
        const ny = (y - rect.top) / rect.height;
        this.coords.set(nx * 2 - 1, -(ny * 2 - 1));
        this.mouseMoved = true;
        this.timer = setTimeout(() => { this.mouseMoved = false; }, 100);
      },

      setNormalized(nx: number, ny: number) {
        this.coords.set(nx, ny);
        this.mouseMoved = true;
      },

      update() {
        if (this.takeoverActive) {
          const t = (performance.now() - this.takeoverStartTime) / (this.takeoverDuration * 1000);
          if (t >= 1) {
            this.takeoverActive = false;
            this.coords.copy(this.takeoverTo);
            this.coords_old.copy(this.coords);
            this.diff.set(0, 0);
          } else {
            const k = t * t * (3 - 2 * t);
            this.coords.copy(this.takeoverFrom).lerp(this.takeoverTo, k);
          }
        }
        this.diff.subVectors(this.coords, this.coords_old);
        this.coords_old.copy(this.coords);
        if (this.coords_old.x === 0 && this.coords_old.y === 0) this.diff.set(0, 0);
        if (this.isAutoActive && !this.takeoverActive) this.diff.multiplyScalar(this.autoIntensity);
      },
    };

    // Single passive mousemove listener (needs velocity deltas for fluid sim)
    const onMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      Mouse.isHoverInside = inside;
      if (!inside) return;

      if (Mouse.onInteract) Mouse.onInteract();

      if (Mouse.isAutoActive && !Mouse.hasUserControl && !Mouse.takeoverActive) {
        const nx = (event.clientX - rect.left) / rect.width;
        const ny = (event.clientY - rect.top) / rect.height;
        Mouse.takeoverFrom.copy(Mouse.coords);
        Mouse.takeoverTo.set(nx * 2 - 1, -(ny * 2 - 1));
        Mouse.takeoverStartTime = performance.now();
        Mouse.takeoverActive = true;
        Mouse.hasUserControl = true;
        Mouse.isAutoActive = false;
        return;
      }

      Mouse.setCoords(event.clientX, event.clientY);
      Mouse.hasUserControl = true;
    };

    const onMouseLeave = () => { Mouse.isHoverInside = false; };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);

    // ── Auto Driver (idle animation) ───────────────────

    let lastUserInteraction = performance.now();

    Mouse.onInteract = () => {
      lastUserInteraction = performance.now();
      if (autoDriver) autoDriver.forceStop();
    };

    const autoDriver = {
      enabled: AUTO_DEMO,
      speed: AUTO_SPEED,
      resumeDelay: AUTO_RESUME_DELAY,
      rampDurationMs: AUTO_RAMP_DURATION * 1000,
      active: false,
      current: new THREE.Vector2(0, 0),
      target: new THREE.Vector2(),
      lastTime: performance.now(),
      activationTime: 0,
      margin: 0.2,
      _tmpDir: new THREE.Vector2(),

      pickNewTarget() {
        this.target.set(
          (Math.random() * 2 - 1) * (1 - this.margin),
          (Math.random() * 2 - 1) * (1 - this.margin),
        );
      },

      forceStop() {
        this.active = false;
        Mouse.isAutoActive = false;
      },

      update() {
        if (!this.enabled) return;
        const now = performance.now();
        const idle = now - lastUserInteraction;

        if (idle < this.resumeDelay) {
          if (this.active) this.forceStop();
          return;
        }
        if (Mouse.isHoverInside) {
          if (this.active) this.forceStop();
          return;
        }
        if (!this.active) {
          this.active = true;
          this.current.copy(Mouse.coords);
          this.lastTime = now;
          this.activationTime = now;
          this.pickNewTarget();
        }

        Mouse.isAutoActive = true;

        let dtSec = (now - this.lastTime) / 1000;
        this.lastTime = now;
        if (dtSec > 0.2) dtSec = 0.016;

        const dir = this._tmpDir.subVectors(this.target, this.current);
        const dist = dir.length();
        if (dist < 0.01) {
          this.pickNewTarget();
          return;
        }
        dir.normalize();

        let ramp = 1;
        if (this.rampDurationMs > 0) {
          const t = Math.min(1, (now - this.activationTime) / this.rampDurationMs);
          ramp = t * t * (3 - 2 * t);
        }
        const step = this.speed * dtSec * ramp;
        const move = Math.min(step, dist);
        this.current.addScaledVector(dir, move);
        Mouse.setNormalized(this.current.x, this.current.y);
      },
    };

    autoDriver.pickNewTarget();

    // ── ShaderPass (base for all GPU passes) ───────────

    /* eslint-disable @typescript-eslint/no-explicit-any */

    class ShaderPass {
      props: any;
      uniforms: any;
      scene: THREE.Scene;
      camera: THREE.Camera;
      material: THREE.RawShaderMaterial | null = null;
      geometry: THREE.PlaneGeometry | null = null;
      plane: THREE.Mesh | null = null;

      constructor(props: any) {
        this.props = props || {};
        this.uniforms = this.props.material?.uniforms;
        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();
      }

      init() {
        if (this.uniforms) {
          this.material = new THREE.RawShaderMaterial(this.props.material);
          this.geometry = new THREE.PlaneGeometry(2.0, 2.0);
          this.plane = new THREE.Mesh(this.geometry, this.material);
          this.scene.add(this.plane);
        }
      }

      update() {
        Common.renderer!.setRenderTarget(this.props.output || null);
        Common.renderer!.render(this.scene, this.camera);
        Common.renderer!.setRenderTarget(null);
      }
    }

    // ── Advection pass ─────────────────────────────────

    class Advection extends ShaderPass {
      line: THREE.LineSegments | null = null;

      constructor(simProps: any) {
        super({
          material: {
            vertexShader: FACE_VERT,
            fragmentShader: ADVECTION_FRAG,
            uniforms: {
              boundarySpace: { value: simProps.cellScale },
              px: { value: simProps.cellScale },
              fboSize: { value: simProps.fboSize },
              velocity: { value: simProps.src.texture },
              dt: { value: simProps.dt },
              isBFECC: { value: true },
            },
          },
          output: simProps.dst,
        });
        this.uniforms = this.props.material.uniforms;
        this.init();
        this.createBoundary();
      }

      createBoundary() {
        const boundaryG = new THREE.BufferGeometry();
        const verts = new Float32Array([
          -1, -1, 0, -1, 1, 0, -1, 1, 0, 1, 1, 0,
          1, 1, 0, 1, -1, 0, 1, -1, 0, -1, -1, 0,
        ]);
        boundaryG.setAttribute("position", new THREE.BufferAttribute(verts, 3));
        const boundaryM = new THREE.RawShaderMaterial({
          vertexShader: LINE_VERT,
          fragmentShader: ADVECTION_FRAG,
          uniforms: this.uniforms,
        });
        this.line = new THREE.LineSegments(boundaryG, boundaryM);
        this.scene.add(this.line);
      }

      updatePass(params: { dt: number; isBounce: boolean; BFECC: boolean }) {
        this.uniforms.dt.value = params.dt;
        if (this.line) this.line.visible = params.isBounce;
        this.uniforms.isBFECC.value = params.BFECC;
        super.update();
      }
    }

    // ── External force pass ────────────────────────────

    class ExternalForce extends ShaderPass {
      mouse: THREE.Mesh;

      constructor(simProps: any) {
        super({ output: simProps.dst });
        this.init();
        const mouseG = new THREE.PlaneGeometry(1, 1);
        const mouseM = new THREE.RawShaderMaterial({
          vertexShader: MOUSE_VERT,
          fragmentShader: EXTERNAL_FORCE_FRAG,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          uniforms: {
            px: { value: simProps.cellScale },
            force: { value: new THREE.Vector2(0.0, 0.0) },
            center: { value: new THREE.Vector2(0.0, 0.0) },
            scale: { value: new THREE.Vector2(simProps.cursor_size, simProps.cursor_size) },
          },
        });
        this.mouse = new THREE.Mesh(mouseG, mouseM);
        this.scene.add(this.mouse);
      }

      updatePass(params: { cursor_size: number; mouse_force: number; cellScale: THREE.Vector2 }) {
        const forceX = (Mouse.diff.x / 2) * params.mouse_force;
        const forceY = (Mouse.diff.y / 2) * params.mouse_force;
        const csX = params.cursor_size * params.cellScale.x;
        const csY = params.cursor_size * params.cellScale.y;
        const centerX = Math.min(
          Math.max(Mouse.coords.x, -1 + csX + params.cellScale.x * 2),
          1 - csX - params.cellScale.x * 2,
        );
        const centerY = Math.min(
          Math.max(Mouse.coords.y, -1 + csY + params.cellScale.y * 2),
          1 - csY - params.cellScale.y * 2,
        );
        const u = (this.mouse.material as THREE.RawShaderMaterial).uniforms;
        u.force.value.set(forceX, forceY);
        u.center.value.set(centerX, centerY);
        u.scale.value.set(params.cursor_size, params.cursor_size);
        super.update();
      }
    }

    // ── Viscous pass ───────────────────────────────────

    class Viscous extends ShaderPass {
      constructor(simProps: any) {
        super({
          material: {
            vertexShader: FACE_VERT,
            fragmentShader: VISCOUS_FRAG,
            uniforms: {
              boundarySpace: { value: simProps.boundarySpace },
              velocity: { value: simProps.src.texture },
              velocity_new: { value: simProps.dst_.texture },
              v: { value: simProps.viscous },
              px: { value: simProps.cellScale },
              dt: { value: simProps.dt },
            },
          },
          output: simProps.dst,
          output0: simProps.dst_,
          output1: simProps.dst,
        });
        this.init();
      }

      updatePass(params: { viscous: number; iterations: number; dt: number }): any {
        let fbo_out: any;
        this.uniforms.v.value = params.viscous;
        for (let i = 0; i < params.iterations; i++) {
          const fbo_in = i % 2 === 0 ? this.props.output0 : this.props.output1;
          fbo_out = i % 2 === 0 ? this.props.output1 : this.props.output0;
          this.uniforms.velocity_new.value = fbo_in.texture;
          this.props.output = fbo_out;
          this.uniforms.dt.value = params.dt;
          super.update();
        }
        return fbo_out;
      }
    }

    // ── Divergence pass ────────────────────────────────

    class Divergence extends ShaderPass {
      constructor(simProps: any) {
        super({
          material: {
            vertexShader: FACE_VERT,
            fragmentShader: DIVERGENCE_FRAG,
            uniforms: {
              boundarySpace: { value: simProps.boundarySpace },
              velocity: { value: simProps.src.texture },
              px: { value: simProps.cellScale },
              dt: { value: simProps.dt },
            },
          },
          output: simProps.dst,
        });
        this.init();
      }

      updatePass(params: { vel: any }) {
        this.uniforms.velocity.value = params.vel.texture;
        super.update();
      }
    }

    // ── Poisson pass ───────────────────────────────────

    class Poisson extends ShaderPass {
      constructor(simProps: any) {
        super({
          material: {
            vertexShader: FACE_VERT,
            fragmentShader: POISSON_FRAG,
            uniforms: {
              boundarySpace: { value: simProps.boundarySpace },
              pressure: { value: simProps.dst_.texture },
              divergence: { value: simProps.src.texture },
              px: { value: simProps.cellScale },
            },
          },
          output: simProps.dst,
          output0: simProps.dst_,
          output1: simProps.dst,
        });
        this.init();
      }

      updatePass(params: { iterations: number }): any {
        let p_out: any;
        for (let i = 0; i < params.iterations; i++) {
          const p_in = i % 2 === 0 ? this.props.output0 : this.props.output1;
          p_out = i % 2 === 0 ? this.props.output1 : this.props.output0;
          this.uniforms.pressure.value = p_in.texture;
          this.props.output = p_out;
          super.update();
        }
        return p_out;
      }
    }

    // ── Pressure pass ──────────────────────────────────

    class Pressure extends ShaderPass {
      constructor(simProps: any) {
        super({
          material: {
            vertexShader: FACE_VERT,
            fragmentShader: PRESSURE_FRAG,
            uniforms: {
              boundarySpace: { value: simProps.boundarySpace },
              pressure: { value: simProps.src_p.texture },
              velocity: { value: simProps.src_v.texture },
              px: { value: simProps.cellScale },
              dt: { value: simProps.dt },
            },
          },
          output: simProps.dst,
        });
        this.init();
      }

      updatePass(params: { vel: any; pressure: any }) {
        this.uniforms.velocity.value = params.vel.texture;
        this.uniforms.pressure.value = params.pressure.texture;
        super.update();
      }
    }

    // ── Simulation (orchestrates all passes) ───────────

    class Simulation {
      fbos: Record<string, THREE.WebGLRenderTarget>;
      fboSize: THREE.Vector2;
      cellScale: THREE.Vector2;
      boundarySpace: THREE.Vector2;
      advection!: Advection;
      externalForce!: ExternalForce;
      viscous!: Viscous;
      divergence!: Divergence;
      poisson!: Poisson;
      pressure!: Pressure;

      constructor() {
        this.fbos = {};
        this.fboSize = new THREE.Vector2();
        this.cellScale = new THREE.Vector2();
        this.boundarySpace = new THREE.Vector2();
        this.calcSize();
        this.createAllFBO();
        this.createShaderPasses();
      }

      getFloatType(): THREE.TextureDataType {
        const isIOS = /(iPad|iPhone|iPod)/i.test(navigator.userAgent);
        return isIOS ? THREE.HalfFloatType : THREE.FloatType;
      }

      calcSize() {
        const w = Math.max(1, Math.round(RESOLUTION * Common.width));
        const h = Math.max(1, Math.round(RESOLUTION * Common.height));
        this.cellScale.set(1.0 / w, 1.0 / h);
        this.fboSize.set(w, h);
      }

      createAllFBO() {
        const type = this.getFloatType();
        const opts = {
          type,
          depthBuffer: false,
          stencilBuffer: false,
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          wrapS: THREE.ClampToEdgeWrapping,
          wrapT: THREE.ClampToEdgeWrapping,
        };
        const keys = [
          "vel_0", "vel_1", "vel_viscous0", "vel_viscous1",
          "div", "pressure_0", "pressure_1",
        ];
        for (const key of keys) {
          this.fbos[key] = new THREE.WebGLRenderTarget(this.fboSize.x, this.fboSize.y, opts);
        }
      }

      createShaderPasses() {
        this.advection = new Advection({
          cellScale: this.cellScale,
          fboSize: this.fboSize,
          dt: SIM_DT,
          src: this.fbos.vel_0,
          dst: this.fbos.vel_1,
        });
        this.externalForce = new ExternalForce({
          cellScale: this.cellScale,
          cursor_size: CURSOR_SIZE,
          dst: this.fbos.vel_1,
        });
        this.viscous = new Viscous({
          cellScale: this.cellScale,
          boundarySpace: this.boundarySpace,
          viscous: VISCOUS_COEFF,
          src: this.fbos.vel_1,
          dst: this.fbos.vel_viscous1,
          dst_: this.fbos.vel_viscous0,
          dt: SIM_DT,
        });
        this.divergence = new Divergence({
          cellScale: this.cellScale,
          boundarySpace: this.boundarySpace,
          src: this.fbos.vel_viscous0,
          dst: this.fbos.div,
          dt: SIM_DT,
        });
        this.poisson = new Poisson({
          cellScale: this.cellScale,
          boundarySpace: this.boundarySpace,
          src: this.fbos.div,
          dst: this.fbos.pressure_1,
          dst_: this.fbos.pressure_0,
        });
        this.pressure = new Pressure({
          cellScale: this.cellScale,
          boundarySpace: this.boundarySpace,
          src_p: this.fbos.pressure_0,
          src_v: this.fbos.vel_viscous0,
          dst: this.fbos.vel_0,
          dt: SIM_DT,
        });
      }

      resize() {
        this.calcSize();
        for (const key in this.fbos) {
          this.fbos[key].setSize(this.fboSize.x, this.fboSize.y);
        }
      }

      update() {
        if (IS_BOUNCE) {
          this.boundarySpace.set(0, 0);
        } else {
          this.boundarySpace.copy(this.cellScale);
        }
        this.advection.updatePass({ dt: SIM_DT, isBounce: IS_BOUNCE, BFECC: USE_BFECC });
        this.externalForce.updatePass({
          cursor_size: CURSOR_SIZE,
          mouse_force: MOUSE_FORCE,
          cellScale: this.cellScale,
        });
        let vel: any = this.fbos.vel_1;
        if (IS_VISCOUS) {
          vel = this.viscous.updatePass({
            viscous: VISCOUS_COEFF,
            iterations: ITERATIONS_VISCOUS,
            dt: SIM_DT,
          });
        }
        this.divergence.updatePass({ vel });
        const pressure = this.poisson.updatePass({ iterations: ITERATIONS_POISSON });
        this.pressure.updatePass({ vel, pressure });
      }
    }

    // ── Output (renders velocity → colour) ─────────────

    class Output {
      simulation: Simulation;
      scene: THREE.Scene;
      camera: THREE.Camera;
      outputMesh: THREE.Mesh;

      constructor() {
        this.simulation = new Simulation();
        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();
        this.outputMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(2, 2),
          new THREE.RawShaderMaterial({
            vertexShader: FACE_VERT,
            fragmentShader: COLOR_FRAG,
            transparent: true,
            depthWrite: false,
            uniforms: {
              velocity: { value: this.simulation.fbos.vel_0.texture },
              boundarySpace: { value: new THREE.Vector2() },
              palette: { value: paletteTex },
              bgColor: { value: bgVec4 },
            },
          }),
        );
        this.scene.add(this.outputMesh);
      }

      resize() {
        this.simulation.resize();
      }

      render() {
        Common.renderer!.setRenderTarget(null);
        Common.renderer!.render(this.scene, this.camera);
      }

      update() {
        this.simulation.update();
        this.render();
      }
    }

    /* eslint-enable @typescript-eslint/no-explicit-any */

    // ── Initialize ─────────────────────────────────────

    Common.init(container);
    container.prepend(Common.renderer!.domElement);

    const output = new Output();
    let running = false;

    function loop() {
      if (!running) return;
      autoDriver.update();
      Mouse.update();
      Common.update();
      output.update();
      rafRef.current = requestAnimationFrame(loop);
    }

    function start() {
      if (running) return;
      running = true;
      loop();
    }

    function pause() {
      running = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    }

    function resize() {
      Common.resize(container);
      output.resize();
    }

    // ── Lifecycle handlers ─────────────────────────────

    const handleVisibility = () => {
      if (document.hidden) {
        pause();
      } else if (isVisibleRef.current) {
        start();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        pause();
      } else if (isVisibleRef.current && !document.hidden) {
        start();
      }
    };
    motionQuery.addEventListener("change", handleMotionChange);

    // ResizeObserver for viewport changes
    let resizeRafId = 0;
    const ro = new ResizeObserver(() => {
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
      resizeRafId = requestAnimationFrame(() => { resize(); });
    });
    ro.observe(container);

    // Start rendering
    start();

    // ── Cleanup ────────────────────────────────────────

    return () => {
      pause();
      ro.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      motionQuery.removeEventListener("change", handleMotionChange);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);

      if (Common.renderer) {
        const canvas = Common.renderer.domElement;
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
        Common.renderer.dispose();
        Common.renderer.forceContextLoss();
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="liquid-ether-root"
      aria-hidden="true"
    />
  );
}
