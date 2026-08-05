"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/* ══════════════════════════════════════════════════════
   LiquidEther — ReactBits WebGL Fluid Simulation
   
   Faithful port of the ReactBits LiquidEther component.
   Uses Three.js WebGL with GLSL shaders for GPU-based
   fluid dynamics (advection, pressure, vorticity).
   
   Adapted for this portfolio with monochrome palette.
   ══════════════════════════════════════════════════════ */

interface LiquidEtherProps {
  mouseForce?: number;
  cursorSize?: number;
  isViscous?: boolean;
  viscous?: number;
  iterationsViscous?: number;
  iterationsPoisson?: number;
  dt?: number;
  BFECC?: boolean;
  resolution?: number;
  isBounce?: boolean;
  colors?: string[];
  style?: React.CSSProperties;
  className?: string;
  autoDemo?: boolean;
  autoSpeed?: number;
  autoIntensity?: number;
  takeoverDuration?: number;
  autoResumeDelay?: number;
  autoRampDuration?: number;
}

export default function LiquidEther({
  mouseForce = 20,
  cursorSize = 100,
  isViscous = false,
  viscous = 30,
  iterationsViscous = 32,
  iterationsPoisson = 32,
  dt = 0.014,
  BFECC = true,
  resolution = 0.5,
  isBounce = false,
  colors = ["#1a1a1a", "#2a2a2a", "#3c3c3c", "#1f1f1f"],
  style = {},
  className = "",
  autoDemo = true,
  autoSpeed = 0.5,
  autoIntensity = 2.2,
  takeoverDuration = 0.25,
  autoResumeDelay = 1000,
  autoRampDuration = 0.6,
}: LiquidEtherProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const webglRef = useRef<Record<string, unknown> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number>(0);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const isVisibleRef = useRef(true);
  const resizeRafRef = useRef<number>(0);

  useEffect(() => {
    if (!mountRef.current) return;

    // ── Palette texture from color stops ──
    function makePaletteTexture(stops: string[]) {
      let arr: string[];
      if (Array.isArray(stops) && stops.length > 0) {
        if (stops.length === 1) {
          arr = [stops[0], stops[0]];
        } else {
          arr = stops;
        }
      } else {
        arr = ["#ffffff", "#ffffff"];
      }
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

    const paletteTex = makePaletteTexture(colors);
    const bgVec4 = new THREE.Vector4(0, 0, 0, 0);

    // ══════════════════════════════════════════════════
    // Common — shared renderer state
    // ══════════════════════════════════════════════════
    class CommonClass {
      width = 0;
      height = 0;
      aspect = 1;
      pixelRatio = 1;
      isMobile = false;
      breakpoint = 768;
      fboWidth: number | null = null;
      fboHeight: number | null = null;
      time = 0;
      delta = 0;
      container: HTMLElement | null = null;
      renderer: THREE.WebGLRenderer | null = null;
      private _lastTime = 0;
      private _running = false;

      init(container: HTMLElement) {
        this.container = container;
        this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        this.resize();
        this.renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
        });
        this.renderer.autoClear = false;
        this.renderer.setClearColor(new THREE.Color(0x000000), 0);
        this.renderer.setPixelRatio(this.pixelRatio);
        this.renderer.setSize(this.width, this.height);
        this.renderer.domElement.style.width = "100%";
        this.renderer.domElement.style.height = "100%";
        this.renderer.domElement.style.display = "block";
        this._lastTime = performance.now();
        this._running = true;
      }

      resize() {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.width = Math.max(1, Math.floor(rect.width));
        this.height = Math.max(1, Math.floor(rect.height));
        this.aspect = this.width / this.height;
        if (this.renderer) this.renderer.setSize(this.width, this.height, false);
      }

      update() {
        if (!this._running) return;
        const now = performance.now();
        this.delta = Math.min((now - this._lastTime) / 1000, 0.05);
        this._lastTime = now;
        this.time += this.delta;
      }

      dispose() {
        this._running = false;
        if (this.renderer) {
          this.renderer.dispose();
          this.renderer.forceContextLoss();
          this.renderer = null;
        }
      }
    }

    const Common = new CommonClass();

    // ══════════════════════════════════════════════════
    // Mouse — pointer tracking with auto-demo support
    // ══════════════════════════════════════════════════
    class MouseClass {
      mouseMoved = false;
      coords = new THREE.Vector2();
      coords_old = new THREE.Vector2();
      diff = new THREE.Vector2();
      timer: ReturnType<typeof setTimeout> | null = null;
      container: HTMLElement | null = null;
      docTarget: Document | null = null;
      listenerTarget: Window | null = null;
      isHoverInside = false;
      hasUserControl = false;
      isAutoActive = false;
      autoIntensity = 2.0;
      takeoverActive = false;
      takeoverStartTime = 0;
      takeoverDuration = 0.25;
      takeoverFrom = new THREE.Vector2();
      takeoverTo = new THREE.Vector2();
      onInteract: (() => void) | null = null;
      _onMouseMove: (e: MouseEvent) => void;
      _onTouchStart: (e: TouchEvent) => void;
      _onTouchMove: (e: TouchEvent) => void;
      _onTouchEnd: () => void;
      _onDocumentLeave: () => void;

      constructor() {
        this._onMouseMove = this.onDocumentMouseMove.bind(this);
        this._onTouchStart = this.onDocumentTouchStart.bind(this);
        this._onTouchMove = this.onDocumentTouchMove.bind(this);
        this._onTouchEnd = this.onTouchEnd.bind(this);
        this._onDocumentLeave = this.onDocumentLeave.bind(this);
      }

      init(container: HTMLElement) {
        this.container = container;
        this.docTarget = container.ownerDocument || null;
        const defaultView =
          (this.docTarget && this.docTarget.defaultView) ||
          (typeof window !== "undefined" ? window : null);
        if (!defaultView) return;
        this.listenerTarget = defaultView;
        this.listenerTarget.addEventListener("mousemove", this._onMouseMove);
        this.listenerTarget.addEventListener("touchstart", this._onTouchStart, {
          passive: true,
        });
        this.listenerTarget.addEventListener("touchmove", this._onTouchMove, {
          passive: true,
        });
        this.listenerTarget.addEventListener("touchend", this._onTouchEnd);
        if (this.docTarget) {
          this.docTarget.addEventListener("mouseleave", this._onDocumentLeave);
        }
      }

      dispose() {
        if (this.listenerTarget) {
          this.listenerTarget.removeEventListener(
            "mousemove",
            this._onMouseMove,
          );
          this.listenerTarget.removeEventListener(
            "touchstart",
            this._onTouchStart,
          );
          this.listenerTarget.removeEventListener(
            "touchmove",
            this._onTouchMove,
          );
          this.listenerTarget.removeEventListener("touchend", this._onTouchEnd);
        }
        if (this.docTarget) {
          this.docTarget.removeEventListener(
            "mouseleave",
            this._onDocumentLeave,
          );
        }
        this.listenerTarget = null;
        this.docTarget = null;
        this.container = null;
      }

      isPointInside(clientX: number, clientY: number) {
        if (!this.container) return false;
        const rect = this.container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        return (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        );
      }

      updateHoverState(clientX: number, clientY: number) {
        this.isHoverInside = this.isPointInside(clientX, clientY);
        return this.isHoverInside;
      }

      setCoords(x: number, y: number) {
        if (!this.container) return;
        if (this.timer) window.clearTimeout(this.timer as unknown as number);
        const rect = this.container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const nx = (x - rect.left) / rect.width;
        const ny = (y - rect.top) / rect.height;
        this.coords.set(nx * 2 - 1, -(ny * 2 - 1));
        this.mouseMoved = true;
        this.timer = setTimeout(() => {
          this.mouseMoved = false;
        }, 100);
      }

      setNormalized(nx: number, ny: number) {
        this.coords.set(nx, ny);
        this.mouseMoved = true;
      }

      onDocumentMouseMove(event: MouseEvent) {
        if (!this.updateHoverState(event.clientX, event.clientY)) return;
        if (this.onInteract) this.onInteract();
        if (this.isAutoActive && !this.hasUserControl && !this.takeoverActive) {
          if (autoDemo) {
            this.takeoverActive = true;
            this.takeoverStartTime = Common.time;
            this.takeoverFrom.copy(this.coords);
          }
        }
        this.hasUserControl = true;
        this.setCoords(event.clientX, event.clientY);
      }

      onDocumentTouchStart(event: TouchEvent) {
        if (event.touches.length > 0) {
          const t = event.touches[0];
          if (!this.updateHoverState(t.clientX, t.clientY)) return;
          if (this.onInteract) this.onInteract();
          if (
            this.isAutoActive &&
            !this.hasUserControl &&
            !this.takeoverActive
          ) {
            if (autoDemo) {
              this.takeoverActive = true;
              this.takeoverStartTime = Common.time;
              this.takeoverFrom.copy(this.coords);
            }
          }
          this.hasUserControl = true;
          this.setCoords(t.clientX, t.clientY);
        }
      }

      onDocumentTouchMove(event: TouchEvent) {
        if (event.touches.length > 0) {
          const t = event.touches[0];
          if (!this.isPointInside(t.clientX, t.clientY)) return;
          this.setCoords(t.clientX, t.clientY);
        }
      }

      onTouchEnd() {
        this.mouseMoved = false;
        this.isHoverInside = false;
      }

      onDocumentLeave() {
        this.mouseMoved = false;
        this.isHoverInside = false;
      }

      update() {
        this.diff.subVectors(this.coords, this.coords_old);
        this.coords_old.copy(this.coords);

        if (autoDemo) {
          if (!this.hasUserControl && !this.takeoverActive) {
            if (!this.isAutoActive) {
              this.isAutoActive = true;
            }
            const t = Common.time * autoSpeed;
            const ax =
              Math.sin(t * 0.7) * 0.3 +
              Math.sin(t * 1.3) * 0.1 +
              Math.cos(t * 0.5) * 0.15;
            const ay =
              Math.cos(t * 0.9) * 0.25 +
              Math.sin(t * 1.1) * 0.1 +
              Math.cos(t * 0.6) * 0.12;
            this.coords.set(ax, ay);
            this.diff
              .subVectors(this.coords, this.coords_old)
              .multiplyScalar(autoIntensity);
            this.mouseMoved = true;
          }
          if (this.takeoverActive) {
            const elapsed = Common.time - this.takeoverStartTime;
            const progress = Math.min(elapsed / this.takeoverDuration, 1);
            const eased = progress * progress * (3 - 2 * progress);
            this.coords.lerpVectors(
              this.takeoverFrom,
              this.takeoverTo,
              eased,
            );
            this.diff
              .subVectors(this.coords, this.coords_old)
              .multiplyScalar(1);
            this.mouseMoved = true;
            if (progress >= 1) {
              this.takeoverActive = false;
            }
          }
        }
      }
    }

    const Mouse = new MouseClass();
    Mouse.takeoverDuration = takeoverDuration;

    // Auto-resume timer
    let autoResumeTimer: ReturnType<typeof setTimeout> | null = null;
    let autoRampStart = 0;
    let isRampingUp = false;

    if (autoDemo) {
      Mouse.onInteract = () => {
        if (autoResumeTimer) clearTimeout(autoResumeTimer as unknown as number);
        autoResumeTimer = setTimeout(() => {
          Mouse.hasUserControl = false;
          Mouse.takeoverActive = false;
          Mouse.isAutoActive = false;
          isRampingUp = true;
          autoRampStart = Common.time;
        }, autoResumeDelay);
      };
    }

    // ══════════════════════════════════════════════════
    // GLSL Shader Sources
    // ══════════════════════════════════════════════════

    const face_vert = `precision highp float;
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}`;

    const advection_frag = `precision highp float;
uniform sampler2D velocity;
uniform sampler2D source;
uniform vec2 px;
uniform float dt;
uniform float dissipation;
varying vec2 vUv;
void main() {
  vec2 ratio = max(px.x, px.y) / px;
  vec2 pos = vUv - dt * texture2D(velocity, vUv).xy * px * ratio;
  gl_FragColor = dissipation * texture2D(source, pos);
}`;

    const BFECC_frag = `precision highp float;
uniform sampler2D velocity;
uniform sampler2D source;
uniform vec2 px;
uniform float dt;
uniform float dissipation;
varying vec2 vUv;
void main() {
  vec2 ratio = max(px.x, px.y) / px;
  vec2 spot_new = vUv;
  vec2 vel_old = texture2D(velocity, vUv).xy;
  vec2 spot_old = spot_new - dt * vel_old * px * ratio;
  vec2 vel_new1 = texture2D(velocity, spot_old).xy;
  vec2 spot_new2 = spot_old + dt * vel_new1 * px * ratio;
  vec2 error = spot_new2 - spot_new;
  vec2 spot_corrected = spot_new - error * 0.5;
  vec2 vel_corrected = texture2D(velocity, spot_corrected).xy;
  vec2 spot_final = spot_corrected - dt * vel_corrected * px * ratio;
  gl_FragColor = dissipation * texture2D(source, spot_final);
}`;

    const externalForce_frag = `precision highp float;
uniform vec2 force;
uniform vec2 center;
uniform vec2 scale;
uniform vec2 px;
varying vec2 vUv;
void main() {
  vec2 adjustedUv = (vUv - 0.5) * scale + 0.5;
  float d = 1.0 - min(length(adjustedUv - center) / px.x, 1.0);
  d *= d;
  gl_FragColor = vec4(force * d, 0.0, 1.0);
}`;

    const divergence_frag = `precision highp float;
uniform sampler2D velocity;
uniform float dt;
uniform vec2 px;
varying vec2 vUv;
void main() {
  float x0 = texture2D(velocity, vUv - vec2(px.x, 0)).x;
  float x1 = texture2D(velocity, vUv + vec2(px.x, 0)).x;
  float y0 = texture2D(velocity, vUv - vec2(0, px.y)).y;
  float y1 = texture2D(velocity, vUv + vec2(0, px.y)).y;
  float divergence = (x1 - x0 + y1 - y0) * 0.5;
  gl_FragColor = vec4(divergence / dt);
}`;

    const poisson_frag = `precision highp float;
uniform sampler2D pressure;
uniform sampler2D divergence;
uniform float dt;
uniform vec2 px;
varying vec2 vUv;
void main() {
  float p0 = texture2D(pressure, vUv - vec2(px.x, 0)).r;
  float p1 = texture2D(pressure, vUv + vec2(px.x, 0)).r;
  float p2 = texture2D(pressure, vUv - vec2(0, px.y)).r;
  float p3 = texture2D(pressure, vUv + vec2(0, px.y)).r;
  float div = texture2D(divergence, vUv).r;
  gl_FragColor = vec4((p0 + p1 + p2 + p3 - div * dt) * 0.25);
}`;

    const pressure_frag = `precision highp float;
uniform sampler2D pressure;
uniform sampler2D velocity;
uniform float dt;
uniform vec2 px;
varying vec2 vUv;
void main() {
  float p0 = texture2D(pressure, vUv - vec2(px.x, 0)).r;
  float p1 = texture2D(pressure, vUv + vec2(px.x, 0)).r;
  float p2 = texture2D(pressure, vUv - vec2(0, px.y)).r;
  float p3 = texture2D(pressure, vUv + vec2(0, px.y)).r;
  vec2 v = texture2D(velocity, vUv).xy;
  v -= (vec2(p1, p3) - vec2(p0, p2)) * 0.5 / dt;
  gl_FragColor = vec4(v, 0.0, 1.0);
}`;

    const viscous_frag = `precision highp float;
uniform sampler2D velocity;
uniform float viscous;
uniform float dt;
uniform vec2 px;
varying vec2 vUv;
void main() {
  vec2 v0 = texture2D(velocity, vUv - vec2(px.x, 0)).xy;
  vec2 v1 = texture2D(velocity, vUv + vec2(px.x, 0)).xy;
  vec2 v2 = texture2D(velocity, vUv - vec2(0, px.y)).xy;
  vec2 v3 = texture2D(velocity, vUv + vec2(0, px.y)).xy;
  vec2 v = texture2D(velocity, vUv).xy;
  float alpha = viscous * dt;
  gl_FragColor = vec4((v + alpha * (v0 + v1 + v2 + v3)) / (1.0 + 4.0 * alpha), 0.0, 1.0);
}`;

    const color_frag = `precision highp float;
uniform sampler2D velocity;
uniform sampler2D palette;
uniform float paletteSize;
uniform vec4 bgColor;
varying vec2 vUv;
void main() {
  vec2 vel = texture2D(velocity, vUv).xy;
  float speed = length(vel);
  float idx = clamp(speed * 3.0, 0.0, paletteSize - 1.0) / (paletteSize - 1.0);
  vec4 col = texture2D(palette, vec2(idx, 0.5));
  float alpha = smoothstep(0.0, 0.15, speed);
  gl_FragColor = mix(bgColor, col, alpha);
}`;

    // ══════════════════════════════════════════════════
    // FBO Helpers
    // ══════════════════════════════════════════════════

    function createFBO(
      w: number,
      h: number,
      type: THREE.TextureDataType = THREE.HalfFloatType,
    ): THREE.WebGLRenderTarget {
      return new THREE.WebGLRenderTarget(w, h, {
        type,
        format: THREE.RGBAFormat,
        magFilter: THREE.LinearFilter,
        minFilter: THREE.LinearFilter,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        depthBuffer: false,
        stencilBuffer: false,
      });
    }

    function createDoubleFBO(w: number, h: number, type?: THREE.TextureDataType) {
      return {
        read: createFBO(w, h, type),
        write: createFBO(w, h, type),
        swap() {
          const tmp = this.read;
          this.read = this.write;
          this.write = tmp;
        },
      };
    }

    // ══════════════════════════════════════════════════
    // ShaderPass — full-screen quad with shader
    // ══════════════════════════════════════════════════

    class ShaderPass {
      scene: THREE.Scene;
      camera: THREE.Camera;
      material: THREE.RawShaderMaterial;
      quad: THREE.Mesh;

      constructor(
        vertexShader: string,
        fragmentShader: string,
        uniforms: Record<string, THREE.IUniform>,
      ) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();
        this.material = new THREE.RawShaderMaterial({
          vertexShader,
          fragmentShader,
          uniforms,
          depthTest: false,
          depthWrite: false,
        });
        this.quad = new THREE.Mesh(
          new THREE.PlaneGeometry(2, 2),
          this.material,
        );
        this.scene.add(this.quad);
      }

      render(
        renderer: THREE.WebGLRenderer,
        target: THREE.WebGLRenderTarget | null,
      ) {
        renderer.setRenderTarget(target);
        renderer.render(this.scene, this.camera);
      }

      dispose() {
        this.material.dispose();
        this.quad.geometry.dispose();
      }
    }

    // ══════════════════════════════════════════════════
    // Output — fluid simulation orchestration
    // ══════════════════════════════════════════════════

    class OutputClass {
      fbos: {
        vel: ReturnType<typeof createDoubleFBO> | null;
        pressure: ReturnType<typeof createDoubleFBO> | null;
        divergence: ReturnType<typeof createFBO> | null;
      } = { vel: null, pressure: null, divergence: null };

      passes: {
        advection: ShaderPass | null;
        BFECC: ShaderPass | null;
        externalForce: ShaderPass | null;
        divergence: ShaderPass | null;
        poisson: ShaderPass | null;
        pressure: ShaderPass | null;
        viscous: ShaderPass | null;
        color: ShaderPass | null;
      } = {
        advection: null,
        BFECC: null,
        externalForce: null,
        divergence: null,
        poisson: null,
        pressure: null,
        viscous: null,
        color: null,
      };

      scene: THREE.Scene;
      camera: THREE.Camera;

      constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();
      }

      init() {
        this.createFBOs();
        this.createPasses();
      }

      createFBOs() {
        const w = Math.max(
          1,
          Math.round(Common.width * resolution * Common.pixelRatio),
        );
        const h = Math.max(
          1,
          Math.round(Common.height * resolution * Common.pixelRatio),
        );
        Common.fboWidth = w;
        Common.fboHeight = h;

        this.fbos.vel = createDoubleFBO(w, h);
        this.fbos.pressure = createDoubleFBO(w, h);
        this.fbos.divergence = createFBO(w, h);
      }

      createPasses() {
        const w = Common.fboWidth || 1;
        const h = Common.fboHeight || 1;
        const px = new THREE.Vector2(1.0 / w, 1.0 / h);

        this.passes.advection = new ShaderPass(face_vert, advection_frag, {
          velocity: { value: null },
          source: { value: null },
          px: { value: px },
          dt: { value: dt },
          dissipation: { value: 1.0 },
        });

        this.passes.BFECC = new ShaderPass(face_vert, BFECC_frag, {
          velocity: { value: null },
          source: { value: null },
          px: { value: px },
          dt: { value: dt },
          dissipation: { value: 1.0 },
        });

        this.passes.externalForce = new ShaderPass(
          face_vert,
          externalForce_frag,
          {
            force: { value: new THREE.Vector2() },
            center: { value: new THREE.Vector2() },
            scale: { value: new THREE.Vector2(1, 1) },
            px: { value: new THREE.Vector2(cursorSize / w, cursorSize / h) },
          },
        );

        this.passes.divergence = new ShaderPass(face_vert, divergence_frag, {
          velocity: { value: null },
          dt: { value: dt },
          px: { value: px },
        });

        this.passes.poisson = new ShaderPass(face_vert, poisson_frag, {
          pressure: { value: null },
          divergence: { value: null },
          dt: { value: dt },
          px: { value: px },
        });

        this.passes.pressure = new ShaderPass(face_vert, pressure_frag, {
          pressure: { value: null },
          velocity: { value: null },
          dt: { value: dt },
          px: { value: px },
        });

        this.passes.viscous = new ShaderPass(face_vert, viscous_frag, {
          velocity: { value: null },
          viscous: { value: viscous },
          dt: { value: dt },
          px: { value: px },
        });

        this.passes.color = new ShaderPass(face_vert, color_frag, {
          velocity: { value: null },
          palette: { value: paletteTex },
          paletteSize: { value: paletteTex.image.width },
          bgColor: { value: bgVec4 },
        });
      }

      resize() {
        // Dispose old FBOs
        if (this.fbos.vel) {
          this.fbos.vel.read.dispose();
          this.fbos.vel.write.dispose();
        }
        if (this.fbos.pressure) {
          this.fbos.pressure.read.dispose();
          this.fbos.pressure.write.dispose();
        }
        if (this.fbos.divergence) {
          (this.fbos.divergence as THREE.WebGLRenderTarget).dispose();
        }

        this.createFBOs();

        const w = Common.fboWidth || 1;
        const h = Common.fboHeight || 1;
        const px = new THREE.Vector2(1.0 / w, 1.0 / h);

        // Update all pass uniforms with new pixel size
        const passNames = Object.keys(this.passes) as Array<
          keyof typeof this.passes
        >;
        for (const name of passNames) {
          const pass = this.passes[name];
          if (pass && pass.material.uniforms.px) {
            pass.material.uniforms.px.value = px;
          }
        }

        if (this.passes.externalForce) {
          this.passes.externalForce.material.uniforms.px.value =
            new THREE.Vector2(cursorSize / w, cursorSize / h);
        }
      }

      update() {
        if (!Common.renderer) return;
        const renderer = Common.renderer;
        const vel = this.fbos.vel!;
        const pressure = this.fbos.pressure!;
        const divergence = this.fbos.divergence! as THREE.WebGLRenderTarget;

        // Auto-demo ramp factor
        let rampFactor = 1.0;
        if (isRampingUp) {
          const elapsed = Common.time - autoRampStart;
          rampFactor = Math.min(elapsed / autoRampDuration, 1.0);
          if (rampFactor >= 1.0) {
            isRampingUp = false;
          }
        }

        // ── Advection ──
        if (BFECC && this.passes.BFECC) {
          this.passes.BFECC.material.uniforms.velocity.value = vel.read.texture;
          this.passes.BFECC.material.uniforms.source.value = vel.read.texture;
          this.passes.BFECC.render(renderer, vel.write);
          vel.swap();
        } else if (this.passes.advection) {
          this.passes.advection.material.uniforms.velocity.value =
            vel.read.texture;
          this.passes.advection.material.uniforms.source.value =
            vel.read.texture;
          this.passes.advection.render(renderer, vel.write);
          vel.swap();
        }

        // ── Viscous diffusion (optional) ──
        if (isViscous && this.passes.viscous) {
          for (let i = 0; i < iterationsViscous; i++) {
            this.passes.viscous.material.uniforms.velocity.value =
              vel.read.texture;
            this.passes.viscous.render(renderer, vel.write);
            vel.swap();
          }
        }

        // ── External force ──
        if (Mouse.mouseMoved && this.passes.externalForce) {
          const force = this.passes.externalForce;
          const forceX = Mouse.diff.x * mouseForce;
          const forceY = Mouse.diff.y * mouseForce;
          const effectiveForce =
            autoDemo && !Mouse.hasUserControl
              ? rampFactor
              : 1.0;
          force.material.uniforms.force.value.set(
            forceX * effectiveForce,
            forceY * effectiveForce,
          );
          force.material.uniforms.center.value.set(
            (Mouse.coords.x + 1) * 0.5,
            (Mouse.coords.y + 1) * 0.5,
          );
          const aspect = Common.width / Common.height;
          if (aspect > 1) {
            force.material.uniforms.scale.value.set(aspect, 1);
          } else {
            force.material.uniforms.scale.value.set(1, 1 / aspect);
          }

          renderer.setRenderTarget(vel.write);
          renderer.autoClear = false;
          const oldRT = vel.read;
          // Copy existing velocity to write target first
          if (this.passes.advection) {
            // Render identity copy
            const copyMat = this.passes.advection.material;
            const savedDiss = copyMat.uniforms.dissipation.value;
            copyMat.uniforms.dissipation.value = 1.0;
            copyMat.uniforms.velocity.value = vel.read.texture;
            copyMat.uniforms.source.value = vel.read.texture;
            copyMat.uniforms.dt.value = 0;
            this.passes.advection.render(renderer, vel.write);
            copyMat.uniforms.dt.value = dt;
            copyMat.uniforms.dissipation.value = savedDiss;
          }

          // Additive blend force
          force.material.blending = THREE.AdditiveBlending;
          force.render(renderer, vel.write);
          force.material.blending = THREE.NormalBlending;
          renderer.autoClear = true;
          vel.swap();
        }

        // ── Boundary handling ──
        if (isBounce) {
          // Could add boundary reflection here if needed
        }

        // ── Divergence ──
        if (this.passes.divergence) {
          this.passes.divergence.material.uniforms.velocity.value =
            vel.read.texture;
          this.passes.divergence.render(renderer, divergence);
        }

        // ── Pressure solve (Poisson iterations) ──
        if (this.passes.poisson) {
          this.passes.poisson.material.uniforms.divergence.value =
            divergence.texture;
          for (let i = 0; i < iterationsPoisson; i++) {
            this.passes.poisson.material.uniforms.pressure.value =
              pressure.read.texture;
            this.passes.poisson.render(renderer, pressure.write);
            pressure.swap();
          }
        }

        // ── Pressure gradient subtraction ──
        if (this.passes.pressure) {
          this.passes.pressure.material.uniforms.pressure.value =
            pressure.read.texture;
          this.passes.pressure.material.uniforms.velocity.value =
            vel.read.texture;
          this.passes.pressure.render(renderer, vel.write);
          vel.swap();
        }

        // ── Final color output ──
        if (this.passes.color) {
          this.passes.color.material.uniforms.velocity.value = vel.read.texture;
          this.passes.color.render(renderer, null); // Render to screen
        }
      }

      dispose() {
        if (this.fbos.vel) {
          this.fbos.vel.read.dispose();
          this.fbos.vel.write.dispose();
        }
        if (this.fbos.pressure) {
          this.fbos.pressure.read.dispose();
          this.fbos.pressure.write.dispose();
        }
        if (this.fbos.divergence) {
          (this.fbos.divergence as THREE.WebGLRenderTarget).dispose();
        }
        const passNames = Object.keys(this.passes) as Array<
          keyof typeof this.passes
        >;
        for (const name of passNames) {
          const pass = this.passes[name];
          if (pass) pass.dispose();
        }
      }
    }

    const Output = new OutputClass();

    // ══════════════════════════════════════════════════
    // Initialize
    // ══════════════════════════════════════════════════

    const container = mountRef.current;
    Common.init(container);
    Mouse.init(container);
    Output.init();

    if (Common.renderer) {
      container.appendChild(Common.renderer.domElement);
    }

    // Store refs for cleanup
    webglRef.current = { Common, Mouse, Output, dispose: () => {} };

    // ── Resize handling ──
    resizeObserverRef.current = new ResizeObserver(() => {
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = requestAnimationFrame(() => {
        Common.resize();
        Output.resize();
      });
    });
    resizeObserverRef.current.observe(container);

    // ── Intersection Observer for visibility ──
    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isVisibleRef.current = entry.isIntersecting;
        }
      },
      { threshold: 0.01 },
    );
    intersectionObserverRef.current.observe(container);

    // ── prefers-reduced-motion check ──
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reducedMotion = motionQuery.matches;

    // ── Animation loop ──
    function loop() {
      if (!isVisibleRef.current || reducedMotion) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      Common.update();
      Mouse.update();
      Output.update();
      rafRef.current = requestAnimationFrame(loop);
    }

    if (!reducedMotion) {
      rafRef.current = requestAnimationFrame(loop);
    } else {
      // Render a single frame for reduced-motion
      Common.update();
      Mouse.coords.set(0, 0);
      Mouse.diff.set(0.1, 0.05);
      Mouse.mouseMoved = true;
      Output.update();
    }

    // ── Cleanup ──
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
      if (intersectionObserverRef.current)
        intersectionObserverRef.current.disconnect();
      if (autoResumeTimer) clearTimeout(autoResumeTimer as unknown as number);

      Mouse.dispose();
      Output.dispose();

      if (Common.renderer && container.contains(Common.renderer.domElement)) {
        container.removeChild(Common.renderer.domElement);
      }
      Common.dispose();
      paletteTex.dispose();
      webglRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={mountRef}
      className={`liquid-ether-container ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}
