/* ============================================================
 * Robot Hero — 1:1 port of rerun.io's landing-page robot arm.
 *
 * A 6-DOF procedural robot arm (three.js r185) that idly runs
 * randomized pick & place / drag / examine / poke / survey routines,
 * notices your mouse cursor when it comes within arm reach, stares at
 * it, and after a few seconds strikes: it "grabs" your cursor — the
 * real cursor is hidden and the cursor condenses into a small physical
 * ball that the gripper actually holds — carries it for a moment, then
 * drops it off the bottom of the screen and gives it back a second later.
 * (rerun draws a flat arrow sprite there; this site uses a circular
 * custom cursor, so the stolen cursor is physicalized as a 3D ball
 * instead — the only intentional deviation from the original.)
 *
 * Ported detail-for-detail from rerun.io's hero component:
 *   - scene, camera (fov 30), ACES tone mapping, PMREM RoomEnvironment
 *   - rainbow cable-fan backdrop w/ custom GLSL (energy pulses driven
 *     by joint speed) + separable DoF-style blur pass + film grain
 *   - analytic 2-bone IK strike toward the cursor ray
 *   - task state machine + cursor grab/carry/falling/restore gag
 *   - optional telemetry stream (?stream=<port>) in the exact
 *     "rerun-homepage-robot/v1" schema, readable by a local viewer
 * ============================================================ */

import * as o from './three.module.min.js';
import { RoomEnvironment } from './RoomEnvironment.js';
import { RoundedBoxGeometry } from './RoundedBoxGeometry.js';

/* ---------- telemetry stream (verbatim port of rerun's startStream) ---------- */

const STREAM_SCHEMA_VERSION = 1;
const STREAM_SCHEMA_NAME = 'rerun-homepage-robot/v1';

function startStream(port, sample, meta) {
  const url = `ws://localhost:${port}`;
  let ws = null;
  let stopped = false;
  let timer = null;
  let backoff = 1e3;
  const backoffMax = 8e3;
  let warned = false;

  const sendHello = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const hello = {
      type: 'hello',
      v: STREAM_SCHEMA_VERSION,
      schema: STREAM_SCHEMA_NAME,
      page_url: typeof location < 'u' ? location.origin + location.pathname : '',
      joint_axes: meta.joint_axes,
    };
    try { ws.send(JSON.stringify(hello)); } catch {}
  };

  const scheduleReconnect = () => {
    if (stopped || timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      backoff = Math.min(backoffMax, backoff * 2);
      connect();
    }, backoff);
  };

  const connect = () => {
    if (stopped) return;
    try { ws = new WebSocket(url); } catch (err) {
      if (!warned) { console.warn('[rerun] robot stream: WebSocket construction failed', err); warned = true; }
      scheduleReconnect();
      return;
    }
    ws.addEventListener('open', () => { backoff = 1e3; sendHello(); });
    ws.addEventListener('close', () => { ws = null; scheduleReconnect(); });
    ws.addEventListener('error', () => {
      if (!warned) {
        console.warn(`[rerun] robot stream: could not reach ${url}. Is your local WebSocket listener running?`);
        warned = true;
      }
    });
  };

  connect();

  return {
    tickSend: () => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      let sample_;
      try { sample_ = sample(); } catch (err) {
        if (!warned) { console.warn('[rerun] robot stream: sample() threw', err); warned = true; }
        return;
      }
      try { ws.send(JSON.stringify(sample_)); } catch {}
    },
    stop: () => {
      stopped = true;
      if (timer !== null) { clearTimeout(timer); timer = null; }
      if (ws) { try { ws.close(); } catch {} ws = null; }
    },
  };
}

/* ---------- main component ---------- */

/**
 * Mount the robot hero into `container`.
 * opts.onCursorGrab / opts.onCursorRestore let the host page hide/show its
 * own custom cursor while the robot is "holding" it.
 * Returns a destroy() function.
 */
export function initRobotHero(container, opts = {}) {
  let destroyed = false;
  let cleanup = null;

  try {
    cleanup = setup(container, opts);
  } catch (err) {
    console.warn('[robot-hero] WebGL init failed', err);
  }

  return () => {
    destroyed = true;
    cleanup && cleanup();
  };

  function setup(x, options) {
    const se = .2;

    /* ----- scene / camera / renderer ----- */
    const scene = new o.Scene();
    const camera = new o.PerspectiveCamera(30, 1, .1, 200);
    camera.position.set(12, 7.5, 12);
    camera.lookAt(0, 4.45, 0);
    scene.add(camera);

    const renderer = new o.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = o.SRGBColorSpace;
    renderer.toneMapping = o.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = o.PCFSoftShadowMap;
    x.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, {
      width: '100%',
      height: '100%',
      display: 'block',
    });

    const pmrem = new o.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), .04).texture;
    scene.environment = envTexture;

    /* ----- lights ----- */
    const hemi = new o.HemisphereLight(16777215, 8227481, .08);
    scene.add(hemi);
    const keyLight = new o.DirectionalLight(16775406, .6);
    keyLight.position.set(6, 10, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = .5;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -3.5;
    keyLight.shadow.camera.right = 3.5;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -1;
    keyLight.shadow.bias = -2e-4;
    keyLight.shadow.normalBias = .02;
    keyLight.shadow.radius = 4;
    scene.add(keyLight);
    const fillLight = new o.DirectionalLight(10404095, .55);
    fillLight.position.set(-6, 4, -7);
    scene.add(fillLight);
    const rimLight = new o.DirectionalLight(16777215, .18);
    rimLight.position.set(2, 3, 8);
    scene.add(rimLight);

    /* ----- rainbow cable fan (backdrop) ----- */
    const fanUniforms = {
      uTime: { value: 0 },
      uPulseIntensity: { value: 0 },
    };
    const fanMaterial = new o.ShaderMaterial({
      uniforms: fanUniforms,
      side: o.DoubleSide,
      transparent: true,
      depthWrite: false,
      vertexShader: `
          attribute float aBladeIdx;
          varying vec3 vWorldNormal;
          varying vec3 vLocalPos;
          varying vec2 vUv;
          varying float vBladeIdx;
          void main() {
            vWorldNormal = normalize(mat3(modelMatrix) * normal);
            vLocalPos = position;
            vUv = uv;
            vBladeIdx = aBladeIdx;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
      fragmentShader: `
          precision highp float;
          uniform float uTime;
          uniform float uPulseIntensity;
          varying vec3 vWorldNormal;
          varying vec3 vLocalPos;
          varying vec2 vUv;
          varying float vBladeIdx;

          // Warm to cool rainbow palette — sky-blue, teal, soft yellow,
          // peach, warm red. No purple/magenta zone, matching the brand
          // video. t in [0, 1].
          vec3 rainbow(float t) {
            t = clamp(t, 0.0, 1.0);
            vec3 c0 = vec3(0.40, 0.62, 0.94);
            vec3 c1 = vec3(0.50, 0.85, 0.78);
            vec3 c2 = vec3(0.97, 0.93, 0.55);
            vec3 c3 = vec3(0.99, 0.65, 0.36);
            vec3 c4 = vec3(0.97, 0.36, 0.42);
            float s = t * 4.0;
            if (s < 1.0) return mix(c0, c1, s);
            if (s < 2.0) return mix(c1, c2, s - 1.0);
            if (s < 3.0) return mix(c2, c3, s - 2.0);
            return mix(c3, c4, s - 3.0);
          }

          void main() {
            // Rotating "rainbow light" — a unit vector that spins around
            // the fan over time. Every surface point of every blade is
            // sampled relative to this direction. The base 0.30 rad/sec
            // sweep is modulated by a low-amplitude sine so the rotation
            // breathes — speeding up and slowing down slightly — and the
            // color shifts read as wave-like pulses rather than a
            // perfectly steady spin.
            float lightAngle =
              uTime * 0.30 +
              sin(uTime * 1.3) * 0.10 +
              sin(uTime * 0.55 + 1.7) * 0.06;
            vec3 lightDir = normalize(vec3(
              cos(lightAngle),
              sin(lightAngle * 0.7) * 0.55,
              sin(lightAngle)
            ));

            // The blade's curved surface gives every pixel its own normal.
            // dot(normal, lightDir) projects that normal onto the rotating
            // light: the brightest part of the gradient travels across
            // each blade as the light spins.
            vec3 n = normalize(vWorldNormal);
            float align = dot(n, lightDir);

            // Per-blade phase — adjacent ribbons are kicked along the
            // palette by 0.55 radians, so even when they hold similar
            // normals the colors they carry are different.
            float bladePhase = vBladeIdx * 0.55;

            // Sampling parameter through the palette. sin keeps us
            // strictly inside the warm→cool palette (no purple wrap-
            // around). The 1.6 multiplier on align makes the per-blade
            // gradient cycle through several palette stops as the surface
            // normal sweeps from one edge of the blade to the other.
            float t = 0.5 + 0.5 * sin(align * 1.6 + bladePhase + uTime * 0.55);

            vec3 col = rainbow(t);

            // Lightness dome across each blade — brighter middle, darker
            // edges. Reinforces the curved-ribbon feel beyond hue alone.
            float u = (vUv.y - 0.5) * 2.0;
            float dome = 1.0 - 0.18 * (u * u);
            col *= dome;

            // (Film grain is added in the post-blur pass so the blur
            // doesn't smear it. See the blur shader below.)

            // Forward fade — small ramp at the focal end and a softening
            // at the tips so the cables don't end on a hard edge.
            float tipFadeProgress = smoothstep(0.75, 1.0, vUv.x);
            float lengthFade =
              smoothstep(0.0, 0.06, vUv.x) *
              (1.0 - tipFadeProgress);

            // Saturation compensation. As the tip fades to alpha 0, the
            // rendered color mixes with the white card background and
            // looks washed out. Boost saturation along the same fade
            // ramp so the cable tips read as strongly colored even
            // while losing opacity. Non-faded portions keep their
            // original saturation (boost = 1).
            float satBoost = 1.0 + tipFadeProgress * 10.4;
            float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
            col = clamp(lum + (col - lum) * satBoost, 0.0, 1.0);

            // Energy flowing through each cable. Rather than rendering
            // discrete particles on top of the cable, we modulate the
            // cable's own brightness with a smooth wave that travels
            // from the robot end (vUv.x = 0) outward along its length.
            // Each cable becomes the energy carrier itself — there is
            // no separate "pulse element" being layered over the
            // surface, so nothing fights with the cable's 3D shape or
            // the screen-space DoF blur. A continuous sine is naturally
            // soft, and raising (1+sin)/2 to a power sharpens the
            // peaks into something that reads as "pulses" without
            // ever being a hard-edged particle.
            //
            // Per-blade phase keeps the cables flowing in parallel
            // without locking together. uPulseIntensity (driven by
            // robot motion) scales the wave amplitude so a still arm
            // shows just a faint shimmer and a moving arm pushes
            // bright peaks of light along every cable.
            float flowFreq = 7.0;
            float flowSpeed = 0.55;
            // Golden-angle stride between blade phases. Multiplying
            // an integer by an irrational number gives a sequence
            // that's maximally spread around the unit circle, so no
            // two cables ever share a phase — that's what stops the
            // visible "synchronized flash" moment that happens when
            // several cables peak at the same time.
            float flowPhase = vBladeIdx * 2.39996;
            float flowWave = sin(
              vUv.x * flowFreq - uTime * flowSpeed * flowFreq + flowPhase
            );
            float pulse = pow(0.5 + 0.5 * flowWave, 3.0);

            // Falloff toward the tip — the energy is densest where
            // it leaves the robot and gradually settles along the
            // cable's length.
            float flowFalloff = pow(1.0 - vUv.x, 0.6);

            // Motion-driven amplitude. A small floor keeps a faint
            // baseline shimmer visible even when the arm is still.
            float flowAmp = 0.12 + 0.88 * uPulseIntensity;
            float energy = pulse * flowFalloff * flowAmp;

            // Brighten the cable's existing rainbow color where the
            // wave is at a peak, and push toward white at the
            // brightest crests so the peaks read as energy rather
            // than just color shifts. Nothing is drawn on top —
            // the cable itself glows.
            col *= 1.0 + energy * 0.7;
            col = mix(col, vec3(1.0), clamp(energy * 0.45, 0.0, 1.0));

            gl_FragColor = vec4(col, lengthFade);
          }
        `,
    });

    const BLADES = 7;          // Ie
    const FAN_LEN = 8.5;       // Y
    const WIDTH_A = 1.5;       // mt — width at root
    const WIDTH_B = 5.5;       // Fe — width at tip
    const EASE_IN = .32;       // I  — width/curl ease start (u param)
    const EASE_OUT = .96;      // $  — width/curl ease end
    const CURL_AMP2 = .55;     // Xe — curl dome amplitude
    const fanGroup = new o.Group();
    const SEG_T = 100;         // Le — segments along the blade
    const SEG_S = 14;          // ye — segments across the blade
    const widthAt = (e) => {   // Dt
      const t = e <= EASE_IN ? 0 : e >= EASE_OUT ? 1 : (e - EASE_IN) / (EASE_OUT - EASE_IN);
      const a = t * t * (3 - 2 * t);
      return WIDTH_A + (WIDTH_B - WIDTH_A) * a;
    };
    const widthDer = (e) => {  // lo
      if (e <= EASE_IN || e >= EASE_OUT) return 0;
      const t = EASE_OUT - EASE_IN;
      const a = (e - EASE_IN) / t;
      return (WIDTH_B - WIDTH_A) * 6 * a * (1 - a) / t;
    };
    const CURL_SCALE = 1;      // Be
    const curlAt = (e) => {    // zt
      if (e <= EASE_IN) return 0;
      const t = EASE_OUT - EASE_IN;
      const a = Math.min(1, (e - EASE_IN) / t);
      const r = a * a * a - .5 * a * a * a * a;
      let l = FAN_LEN * CURL_SCALE * t * r;
      return e > EASE_OUT && (l += (e - EASE_OUT) * FAN_LEN * CURL_SCALE), l;
    };
    const curlDer = (e) => {   // Nt
      if (e <= EASE_IN) return 0;
      if (e >= EASE_OUT) return FAN_LEN * CURL_SCALE;
      const t = EASE_OUT - EASE_IN;
      const a = (e - EASE_IN) / t;
      const r = 3 * a * a - 2 * a * a * a;
      return FAN_LEN * CURL_SCALE * r;
    };

    const positions = [];
    const normals = [];
    const uvs = [];
    const bladeIndices = [];
    const indices = [];
    const STRIP_W = 2 / BLADES;  // Me
    const WIDEN = 2.5;           // Wt
    const widenAt = (e) => 1 + (1 - e) * .5 * (WIDEN - 1);  // Ve
    const bladeTilt = () => -1.5 * .5;                       // co

    for (let e = 0; e < BLADES; e++) {
      const baseVertex = positions.length / 3;
      const s0 = -1 + e * STRIP_W;
      const s1 = s0 + STRIP_W;
      const sMid = s0 + STRIP_W * .5;
      const widen0 = widenAt(s0);
      const widen1 = widenAt(s1);
      const widenMid = widenAt(sMid);
      const domeLift = Math.max(widen0, widen1) - widenMid;
      for (let ti = 0; ti <= SEG_T; ti++) {
        const f = ti / SEG_T;
        const halfW = widthAt(f) / 2;
        const halfWD = widthDer(f) / 2;
        const curl = curlAt(f);
        const curlD = curlDer(f);
        const widthNorm = halfW / (WIDTH_B / 2);
        const domeV = CURL_AMP2 * widthNorm + domeLift * curl;
        const domeVD = CURL_AMP2 * (halfWD / (WIDTH_B / 2)) + domeLift * curlD;
        for (let si = 0; si <= SEG_S; si++) {
          const sv = si / SEG_S;
          const sNorm = (sv - .5) * 2;
          const sPos = s0 + sv * STRIP_W;
          const widen = widenAt(sPos);
          const tilt = bladeTilt();
          const px = f * FAN_LEN * widen;
          const py = sPos * halfW;
          const dome = domeV * (1 - sNorm * sNorm);
          const pz = curl * widen + dome;
          positions.push(px, py, pz);
          // partial derivatives → normal = tTangent × sTangent
          const dT = STRIP_W;
          const tx = FAN_LEN * widen;
          const ty = sPos * halfWD;
          const tz = curlD * widen + domeVD * (1 - sNorm * sNorm);
          const sx = f * FAN_LEN * tilt * dT;
          const sy = halfW * dT;
          const sz = curl * tilt * dT - 4 * domeV * sNorm;
          let nx = ty * sz - tz * sy;
          let ny = tz * sx - tx * sz;
          let nz = tx * sy - ty * sx;
          const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          nx /= len; ny /= len; nz /= len;
          normals.push(nx, ny, nz);
          uvs.push(f, sv);
          bladeIndices.push(e - (BLADES - 1) / 2);
        }
      }
      for (let ti = 0; ti < SEG_T; ti++) {
        for (let si = 0; si < SEG_S; si++) {
          const b = baseVertex + ti * (SEG_S + 1) + si;
          const b1 = b + 1;
          const b2 = b + (SEG_S + 1);
          const b3 = b2 + 1;
          indices.push(b, b1, b2, b1, b3, b2);
        }
      }
    }

    const fanGeo = new o.BufferGeometry();
    fanGeo.setAttribute('position', new o.Float32BufferAttribute(positions, 3));
    fanGeo.setAttribute('normal', new o.Float32BufferAttribute(normals, 3));
    fanGeo.setAttribute('uv', new o.Float32BufferAttribute(uvs, 2));
    fanGeo.setAttribute('aBladeIdx', new o.Float32BufferAttribute(bladeIndices, 1));
    fanGeo.setIndex(indices);
    const fanMesh = new o.Mesh(fanGeo, fanMaterial);
    fanMesh.renderOrder = -1;
    const FAN_LAYER = 1;
    fanMesh.layers.set(FAN_LAYER);
    fanGroup.add(fanMesh);
    scene.add(fanGroup);

    // Orient the fan halfway between the camera's right axis and its
    // forward axis (flattened onto the ground plane).
    const ORIENT_BLEND = .5;
    const orientFan = () => {
      camera.updateMatrixWorld(true);
      const right = new o.Vector3();
      camera.matrixWorld.extractBasis(right, new o.Vector3(), new o.Vector3());
      right.y = 0;
      right.lengthSq() < 1e-6 && right.set(1, 0, 0);
      right.normalize();
      const fwd = new o.Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.lengthSq() < 1e-6 && fwd.set(0, 0, -1);
      fwd.normalize();
      const dir = right.clone().lerp(fwd, ORIENT_BLEND).normalize();
      const up = new o.Vector3(0, 1, 0);
      const side = new o.Vector3().crossVectors(up, dir).normalize();
      const m = new o.Matrix4().makeBasis(dir, side, up);
      fanGroup.quaternion.setFromRotationMatrix(m);
    };
    fanGroup.position.set(0, .2, 0);
    orientFan();

    /* ----- DoF-style blur pass for the fan ----- */
    const fanTarget = new o.WebGLRenderTarget(1, 1, {
      format: o.RGBAFormat,
      type: o.UnsignedByteType,
      minFilter: o.LinearFilter,
      magFilter: o.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });
    const blurUniforms = {
      uColor: { value: fanTarget.texture },
      uTexSize: { value: new o.Vector2(1, 1) },
      uFocalUV: { value: new o.Vector2(.3, .5) },
      uMinRadius: { value: 0 },
      uMaxRadius: { value: 1 },
    };
    const blurMaterial = new o.ShaderMaterial({
      uniforms: blurUniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }
        `,
      fragmentShader: `
          precision highp float;
          uniform sampler2D uColor;
          uniform vec2 uTexSize;
          uniform vec2 uFocalUV;
          uniform float uMinRadius;
          uniform float uMaxRadius;
          varying vec2 vUv;

          void main() {
            // Blur radius scales with distance from the focal point in
            // screen space — the fan ramps from sharp (at the robot) to
            // soft (at the far end of the streak).
            float d = distance(vUv, uFocalUV);
            float radius = mix(
              uMinRadius,
              uMaxRadius,
              smoothstep(0.05, 0.65, d)
            );

            vec2 texel = 1.0 / uTexSize;
            vec4 sum = vec4(0.0);
            float total = 0.0;
            // 7×7 Gaussian — wide enough at full radius to read as blur,
            // small enough to stay within a single quad pass.
            const int K = 3;
            for (int x = -K; x <= K; x++) {
              for (int y = -K; y <= K; y++) {
                float fx = float(x);
                float fy = float(y);
                float w = exp(-(fx * fx + fy * fy) / 6.0);
                vec2 sUv =
                  vUv + vec2(fx, fy) * texel * radius;
                sum += texture2D(uColor, sUv) * w;
                total += w;
              }
            }
            vec4 colOut = sum / total;

            // Film grain added AFTER the blur so each grain stays a
            // crisp single framebuffer pixel (small) instead of being
            // smeared. Higher amplitude than before for noticeable
            // texture without overwhelming the color.
            float grain = fract(
              sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453
            );
            colOut.rgb += (grain - 0.5) * 0.10 * colOut.a;

            gl_FragColor = colOut;
          }
        `,
    });
    const quadScene = new o.Scene();
    const quad = new o.Mesh(new o.PlaneGeometry(2, 2), blurMaterial);
    quadScene.add(quad);
    const quadCam = new o.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const setTargetSize = (w, h) => {
      const pr = renderer.getPixelRatio();
      const rw = Math.max(1, Math.round(w * pr));
      const rh = Math.max(1, Math.round(h * pr));
      fanTarget.setSize(rw, rh);
      blurUniforms.uTexSize.value.set(rw, rh);
    };
    const focalTmpA = new o.Vector3();
    const focalTmpB = new o.Vector3();
    const updateFocal = () => {
      focalTmpA.setFromMatrixPosition(fanGroup.matrixWorld);
      focalTmpB.copy(focalTmpA).project(camera);
      blurUniforms.uFocalUV.value.set(focalTmpB.x * .5 + .5, focalTmpB.y * .5 + .5);
    };

    /* ----- materials ----- */
    const matWhite = new o.MeshPhysicalMaterial({
      color: 16777215,
      roughness: 0,
      metalness: 0,
      clearcoat: 31,
      clearcoatRoughness: 0,
      sheen: 0,
      sheenRoughness: 0,
    });
    const matDark = new o.MeshPhysicalMaterial({
      color: 1118481,
      roughness: .145,
      metalness: 0,
      clearcoat: 31,
      clearcoatRoughness: 0,
      sheen: 0,
    });
    const matBase = new o.MeshPhysicalMaterial({
      color: 1118481,
      roughness: .85,
      metalness: 0,
      clearcoat: 0,
      envMapIntensity: .25,
    });

    // Lathe profile with rounded ends → capsule-ish joint housings.
    const latheProfile = (e, t, a, r, l = 48, M = 6) => {
      const h = [];
      const A = a / 2;
      const P = Math.min(r, Math.min(e, t), A);
      h.push(new o.Vector2(0, -A));
      if (P > 1e-4) {
        for (let i = 0; i <= M; i++) {
          const f = i / M;
          const b = -Math.PI / 2 + Math.PI / 2 * f;
          h.push(new o.Vector2(t - P + P * Math.cos(b), -A + P + P * Math.sin(b)));
        }
        for (let i = 0; i <= M; i++) {
          const f = i / M;
          const b = Math.PI / 2 * f;
          h.push(new o.Vector2(e - P + P * Math.cos(b), A - P + P * Math.sin(b)));
        }
      } else h.push(new o.Vector2(t, -A)), h.push(new o.Vector2(e, A));
      return h.push(new o.Vector2(0, A)), new o.LatheGeometry(h, l);
    };
    const jointRadius = (e, t) => Math.min(e * .45, t * .45) * se * 2;
    const jointGeo = latheProfile(.55, .55, .7, jointRadius(.55, .7));

    /* ----- robot build (6-DOF arm + gripper) ----- */
    const robot = new o.Group();

    const baseMesh = new o.Mesh(latheProfile(.95, 1.05, .35, jointRadius(.95, .35)), matBase);
    baseMesh.position.y = .175;
    robot.add(baseMesh);
    const ringMesh = new o.Mesh(latheProfile(.7, .78, .55, jointRadius(.7, .55)), matWhite);
    ringMesh.position.y = .625;
    robot.add(ringMesh);

    const j1 = new o.Group();            // Ze — base yaw (rotation.y)
    j1.position.y = .95;
    robot.add(j1);
    const j1Housing = new o.Mesh(jointGeo, matWhite);
    j1Housing.rotation.x = Math.PI / 2;
    j1Housing.position.y = .05;
    j1.add(j1Housing);

    const j2 = new o.Group();            // me — shoulder pitch (rotation.x)
    j2.position.y = .45;
    j1.add(j2);
    const j2Housing = new o.Mesh(jointGeo, matWhite);
    j2Housing.rotation.z = Math.PI / 2;
    j2.add(j2Housing);
    const upperArm = new o.Mesh(new o.CapsuleGeometry(.42, 1.9, 8, 16), matWhite);
    upperArm.position.y = 1.15;
    j2.add(upperArm);

    const j3 = new o.Group();            // ze — elbow pitch (rotation.x)
    j3.position.y = 2.1;
    j2.add(j3);
    const j3Housing = new o.Mesh(latheProfile(.45, .45, .6, jointRadius(.45, .6)), matWhite);
    j3Housing.rotation.z = Math.PI / 2;
    j3.add(j3Housing);
    const foreArm = new o.Mesh(new o.CapsuleGeometry(.34, 1.55, 8, 16), matWhite);
    foreArm.position.y = .95;
    j3.add(foreArm);

    const j4 = new o.Group();            // et — wrist roll (rotation.y)
    j4.position.y = 1.8;
    j3.add(j4);
    const j4Housing = new o.Mesh(latheProfile(.34, .34, .5, jointRadius(.34, .5)), matDark);
    j4.add(j4Housing);

    const j5 = new o.Group();            // tt — wrist pitch (rotation.x)
    j5.position.y = .4;
    j4.add(j5);
    const j5Housing = new o.Mesh(latheProfile(.3, .3, .42, jointRadius(.3, .42)), matWhite);
    j5Housing.rotation.z = Math.PI / 2;
    j5.add(j5Housing);

    const j6 = new o.Group();            // O  — flange yaw (rotation.y)
    j6.position.y = .32;
    j5.add(j6);
    const j6Cap = new o.Mesh(latheProfile(.28, .32, .18, jointRadius(.28, .18)), matDark);
    j6.add(j6Cap);

    const palmRadius = Math.min(.34, .42) * .45 * se * 2;
    const palm = new o.Mesh(new RoundedBoxGeometry(.62, .34, .42, 4, palmRadius), matWhite);
    palm.position.y = .26;
    j6.add(palm);

    const jawRadius = .1 * .45 * se * 2;
    const jawGeo = new RoundedBoxGeometry(.1, .55, .32, 3, jawRadius);
    const JAW_Y = .43;
    const JAW_H = .275;
    const jawL = new o.Group();
    jawL.position.set(-.2, JAW_Y, 0);
    const jawLMesh = new o.Mesh(jawGeo, matDark);
    jawLMesh.position.y = JAW_H;
    jawL.add(jawLMesh);
    j6.add(jawL);
    const jawR = new o.Group();
    jawR.position.set(.2, JAW_Y, 0);
    const jawRMesh = new o.Mesh(jawGeo, matDark);
    jawRMesh.position.y = JAW_H;
    jawR.add(jawRMesh);
    j6.add(jawR);

    robot.scale.setScalar(.9);
    scene.add(robot);

    /* ----- pose helpers / keyframe routines ----- */
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeInOutCubic = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    // Preset pick/hover poses for five base-yaw stations.
    const POSES = [{
      j1: .85, hoverJ2: -.4, hoverJ3: -2.05, hoverJ5: .05,
      graspJ2: -.5, graspJ3: -2.2, graspJ5: .2,
    }, {
      j1: .4, hoverJ2: -.42, hoverJ3: -2.05, hoverJ5: .08,
      graspJ2: -.52, graspJ3: -2.2, graspJ5: .18,
    }, {
      j1: 0, hoverJ2: -.45, hoverJ3: -2, hoverJ5: .05,
      graspJ2: -.55, graspJ3: -2.15, graspJ5: .15,
    }, {
      j1: -.4, hoverJ2: -.42, hoverJ3: -2.05, hoverJ5: .08,
      graspJ2: -.52, graspJ3: -2.2, graspJ5: .18,
    }, {
      j1: -.85, hoverJ2: -.4, hoverJ3: -2.05, hoverJ5: .05,
      graspJ2: -.5, graspJ3: -2.2, graspJ5: .2,
    }];
    const LIFT_J3 = -2;
    const LIFT_J5 = 0;

    // pick_place: hover → descend → close → lift → travel → (flourish) → place → open → retract
    const makePickPlace = () => {
      let from = POSES[Math.floor(Math.random() * POSES.length)];
      let dest = POSES[Math.floor(Math.random() * POSES.length)];
      for (; dest === from;) dest = POSES[Math.floor(Math.random() * POSES.length)];
      const wristSpin = (Math.random() - .5) * 1.6;
      const liftPitch = -.35 + (Math.random() - .5) * .15;
      const speed = .85 + Math.random() * .4;
      const flourish = Math.random() < .35;
      const h = (v) => v * speed;
      const seq = [{
        j1: from.j1, j2: from.hoverJ2, j3: from.hoverJ3, j4: 0, j5: from.hoverJ5, j6: 0,
        grip: 1, dwell: h(.18), ease: h(.55),
      }, {
        j1: from.j1, j2: from.graspJ2, j3: from.graspJ3, j4: 0, j5: from.graspJ5, j6: 0,
        grip: 1, dwell: h(.08), ease: h(.35),
      }, {
        j1: from.j1, j2: from.graspJ2, j3: from.graspJ3, j4: 0, j5: from.graspJ5, j6: 0,
        grip: 0, dwell: h(.18), ease: h(.18),
      }, {
        j1: from.j1, j2: liftPitch, j3: LIFT_J3, j4: 0, j5: LIFT_J5, j6: wristSpin * .3,
        grip: 0, dwell: h(.05), ease: h(.45),
      }, {
        j1: dest.j1, j2: liftPitch, j3: LIFT_J3, j4: 0, j5: LIFT_J5, j6: wristSpin,
        grip: 0, dwell: h(.1), ease: h(.7),
      }];
      flourish && seq.push({
        j1: dest.j1, j2: liftPitch - .05, j3: LIFT_J3 + .6, j4: 0, j5: LIFT_J5 - .3, j6: wristSpin + .6,
        grip: 0, dwell: h(.6), ease: h(.6),
      });
      seq.push({
        j1: dest.j1, j2: dest.graspJ2, j3: dest.graspJ3, j4: 0, j5: dest.graspJ5, j6: wristSpin,
        grip: 0, dwell: h(.1), ease: h(.4),
      }, {
        j1: dest.j1, j2: dest.graspJ2, j3: dest.graspJ3, j4: 0, j5: dest.graspJ5, j6: wristSpin,
        grip: 1, dwell: h(.18), ease: h(.18),
      }, {
        j1: dest.j1, j2: dest.hoverJ2, j3: dest.hoverJ3, j4: 0, j5: dest.hoverJ5, j6: wristSpin * .3,
        grip: 1, dwell: h(.2), ease: h(.45),
      });
      return seq;
    };

    // survey: drift between three random hover poses, gripper open
    const makeSurvey = () => {
      const rnd = () => POSES[Math.floor(Math.random() * POSES.length)];
      return [rnd(), rnd(), rnd()].map((p) => ({
        j1: p.j1, j2: p.hoverJ2, j3: p.hoverJ3, j4: 0, j5: p.hoverJ5, j6: (Math.random() - .5) * .6,
        grip: 1, dwell: .45, ease: .7,
      }));
    };

    // drag: grasp → travel low → release (no lift)
    const makeDrag = () => {
      let from = POSES[Math.floor(Math.random() * POSES.length)];
      let dest = POSES[Math.floor(Math.random() * POSES.length)];
      for (; dest === from;) dest = POSES[Math.floor(Math.random() * POSES.length)];
      const speed = .85 + Math.random() * .4;
      const r = (l) => l * speed;
      return [{
        j1: from.j1, j2: from.hoverJ2, j3: from.hoverJ3, j4: 0, j5: from.hoverJ5, j6: 0,
        grip: 1, dwell: r(.18), ease: r(.55),
      }, {
        j1: from.j1, j2: from.graspJ2, j3: from.graspJ3, j4: 0, j5: from.graspJ5, j6: 0,
        grip: 1, dwell: r(.08), ease: r(.35),
      }, {
        j1: from.j1, j2: from.graspJ2, j3: from.graspJ3, j4: 0, j5: from.graspJ5, j6: 0,
        grip: 0, dwell: r(.15), ease: r(.18),
      }, {
        j1: dest.j1, j2: dest.graspJ2, j3: dest.graspJ3, j4: 0, j5: dest.graspJ5, j6: 0,
        grip: 0, dwell: r(.15), ease: r(.85),
      }, {
        j1: dest.j1, j2: dest.graspJ2, j3: dest.graspJ3, j4: 0, j5: dest.graspJ5, j6: 0,
        grip: 1, dwell: r(.18), ease: r(.18),
      }, {
        j1: dest.j1, j2: dest.hoverJ2, j3: dest.hoverJ3, j4: 0, j5: dest.hoverJ5, j6: 0,
        grip: 1, dwell: r(.2), ease: r(.45),
      }];
    };

    // examine: pick, hold up and rotate the wrist both ways, put back
    const makeExamine = () => {
      const from = POSES[Math.floor(Math.random() * POSES.length)];
      const speed = .85 + Math.random() * .4;
      const spinA = (Math.random() < .5 ? -1 : 1) * (.7 + Math.random() * .5);
      const spinB = -spinA * (.7 + Math.random() * .4);
      const l = (M) => M * speed;
      return [{
        j1: from.j1, j2: from.hoverJ2, j3: from.hoverJ3, j4: 0, j5: from.hoverJ5, j6: 0,
        grip: 1, dwell: l(.15), ease: l(.5),
      }, {
        j1: from.j1, j2: from.graspJ2, j3: from.graspJ3, j4: 0, j5: from.graspJ5, j6: 0,
        grip: 1, dwell: l(.08), ease: l(.3),
      }, {
        j1: from.j1, j2: from.graspJ2, j3: from.graspJ3, j4: 0, j5: from.graspJ5, j6: 0,
        grip: 0, dwell: l(.15), ease: l(.18),
      }, {
        j1: from.j1 * .35, j2: -.35, j3: -1.7, j4: 0, j5: .55, j6: 0,
        grip: 0, dwell: l(.3), ease: l(.65),
      }, {
        j1: from.j1 * .35, j2: -.35, j3: -1.7, j4: 0, j5: .5, j6: spinA,
        grip: 0, dwell: l(.4), ease: l(.55),
      }, {
        j1: from.j1 * .35, j2: -.35, j3: -1.65, j4: .25, j5: .35, j6: spinB,
        grip: 0, dwell: l(.4), ease: l(.55),
      }, {
        j1: from.j1, j2: from.graspJ2, j3: from.graspJ3, j4: 0, j5: from.graspJ5, j6: 0,
        grip: 0, dwell: l(.1), ease: l(.5),
      }, {
        j1: from.j1, j2: from.graspJ2, j3: from.graspJ3, j4: 0, j5: from.graspJ5, j6: 0,
        grip: 1, dwell: l(.18), ease: l(.18),
      }, {
        j1: from.j1, j2: from.hoverJ2, j3: from.hoverJ3, j4: 0, j5: from.hoverJ5, j6: 0,
        grip: 1, dwell: l(.2), ease: l(.4),
      }];
    };

    // poke: half-hearted grip taps at the grasp point
    const makePoke = () => {
      const from = POSES[Math.floor(Math.random() * POSES.length)];
      const speed = .85 + Math.random() * .4;
      const a = (r) => r * speed;
      return [{
        j1: from.j1, j2: from.hoverJ2, j3: from.hoverJ3, j4: 0, j5: from.hoverJ5, j6: 0,
        grip: .5, dwell: a(.1), ease: a(.5),
      }, {
        j1: from.j1, j2: from.graspJ2, j3: from.graspJ3, j4: 0, j5: from.graspJ5 + .1, j6: 0,
        grip: .3, dwell: a(.18), ease: a(.35),
      }, {
        j1: from.j1, j2: from.graspJ2 - .05, j3: from.graspJ3 - .08, j4: 0, j5: from.graspJ5 + .05, j6: 0,
        grip: .3, dwell: a(.08), ease: a(.15),
      }, {
        j1: from.j1, j2: from.hoverJ2, j3: from.hoverJ3, j4: 0, j5: from.hoverJ5, j6: 0,
        grip: .5, dwell: a(.18), ease: a(.4),
      }];
    };

    let taskName = null;
    const sampleTask = () => {
      const e = Math.random();
      return e < .4 ? (taskName = 'pick_place', makePickPlace())
        : e < .65 ? (taskName = 'drag', makeDrag())
        : e < .85 ? (taskName = 'examine', makeExamine())
        : e < .95 ? (taskName = 'poke', makePoke())
        : (taskName = 'survey', makeSurvey());
    };

    let queue = sampleTask();
    let phase = 0;
    let fromKf = queue.shift();
    let toKf = queue.shift() ?? fromKf;

    const GRIP_OPEN = -.35;
    const GRIP_CLOSED = .55;
    let gripVal = .5;
    const applyPose = (p) => {
      j1.rotation.y = p.j1;
      j2.rotation.x = p.j2;
      j3.rotation.x = p.j3;
      j4.rotation.y = p.j4;
      j5.rotation.x = p.j5;
      j6.rotation.y = p.j6;
      const t = lerp(GRIP_OPEN, GRIP_CLOSED, p.grip);
      jawR.rotation.z = -t;
      jawL.rotation.z = t;
      gripVal = p.grip;
    };
    const REST_POSE = { j1: 0, j2: -.3, j3: -1, j4: 0, j5: .15, j6: 0, grip: .5 };
    applyPose(REST_POSE);

    /* ----- sizing (view offset pushes the composition down 120px) ----- */
    const VIEW_INSET = 120;
    const resizeObs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w <= 0 || h <= 0) continue;
        renderer.setSize(w, h, false);
        const fullH = Math.max(1, h - VIEW_INSET);
        camera.setViewOffset(w, fullH, 0, 0, w, h);
        setTargetSize(w, h);
      }
    });
    resizeObs.observe(x);

    let heroVisible = true;
    const intersectObs = new IntersectionObserver((entries) => {
      for (const entry of entries) heroVisible = entry.isIntersecting;
    }, { threshold: 0 });
    intersectObs.observe(x);

    /* ----- cursor state ----- */
    let rawCX = 0, rawCY = 0;          // mo, vo — raw pointer NDC (y down)
    let curX = 0, curY = 0;            // Ne, Se — smoothed
    let prevX = 0, prevY = 0;          // ma, va
    let velX = 0, velY = 0;            // go, fo
    let calm = 1;                      // Ht — 1 = relaxed, 0 = fully alert
    let breathT = 0;                   // ga
    const STRIKE_DUR = 1;              // wo
    let strikeLeft = 0;                // ge — seconds left in the strike envelope
    let grabTimer = 1.2 + Math.random() * 2.5;  // bt — patience before striking
    let cursorSeen = false;            // qt
    let pageActive = typeof document < 'u' && document.hasFocus() && document.visibilityState !== 'hidden';

    const onFocus = () => { pageActive = document.visibilityState !== 'hidden'; };
    const onBlur = () => { pageActive = false; };
    const onVisibility = () => {
      pageActive = document.visibilityState !== 'hidden' && document.hasFocus();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);

    const COOLDOWN = 1e4;              // sr — ms between successful grabs
    let lastGrab = -1 / 0;             // xa
    let restBlend = pageActive ? 0 : 1;  // Q
    let prevEnvelope = 0;              // ba
    let fakeState = 'free';            // H — free / carrying / falling / waitingToRestore
    const fallVel = new o.Vector3();   // yt
    let restoreAt = 0;                 // ya
    let stream = null;                 // jo

    /* ----- telemetry observation (rerun-homepage-robot/v1) ----- */
    const obsStart = performance.now() / 1e3;
    const makeObs = () => ({
      type: 'obs',
      v: 1,
      t: performance.now() / 1e3 - obsStart,
      joints: {
        j1: j1.rotation.y,
        j2: j2.rotation.x,
        j3: j3.rotation.x,
        j4: j4.rotation.y,
        j5: j5.rotation.x,
        j6: j6.rotation.y,
      },
      gripper: {
        grip: gripVal,
        jaw_angle: -jawR.rotation.z,
      },
      cursor: {
        x: curX,
        y: curY,
        vx: velX,
        vy: velY,
        seen: cursorSeen,
      },
      controller: {
        task: taskName,
        phase,
        fake_cursor: fakeState,
        alert: 1 - calm,
        rest_blend: restBlend,
        page_active: pageActive,
      },
    });

    /* ----- the stolen cursor, physicalized: the site's cursor is a
           circle, so when grabbed it condenses into a small dark ball
           (same material as the jaws) that the gripper really holds ----- */
    const cursorMesh = new o.Mesh(new o.SphereGeometry(.15, 32, 16), matDark);
    cursorMesh.visible = false;
    scene.add(cursorMesh);

    const TIP_LOCAL = new o.Vector3(0, .85, 0);  // ball seat between the jaws, in j6 space
    const tmpV = new o.Vector3();

    /* ----- pointer tracking (window level; canvas itself is pointer-events:none) ----- */
    const onPointerMove = (e) => {
      const rect = x.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = (e.clientX - rect.left) / rect.width * 2 - 1;
      const ny = (e.clientY - rect.top) / rect.height * 2 - 1;
      const cx = Math.max(-1.5, Math.min(1.5, nx));
      const cy = Math.max(-1.5, Math.min(1.5, ny));
      rawCX = cx;
      rawCY = cy;
      cursorSeen = true;
    };
    window.addEventListener('pointermove', onPointerMove);

    /* ----- drag-to-orbit (wired like the original; the host page keeps
           the container pointer-events:none, so this stays dormant) ----- */
    const ORBIT_TARGET = new o.Vector3(0, 4.7, 0);
    const orbitOffset = camera.position.clone().sub(ORBIT_TARGET);
    const orbitRadius = orbitOffset.length();
    let orbTheta = Math.atan2(orbitOffset.x, orbitOffset.z);
    let orbPhi = Math.asin(orbitOffset.y / orbitRadius);
    const PHI_MIN = -1;
    const PHI_MAX = 1.35;
    const ORBIT_SPEED = .0055;
    const applyOrbit = () => {
      const cosPhi = Math.cos(orbPhi);
      camera.position.set(
        ORBIT_TARGET.x + orbitRadius * cosPhi * Math.sin(orbTheta),
        ORBIT_TARGET.y + orbitRadius * Math.sin(orbPhi),
        ORBIT_TARGET.z + orbitRadius * cosPhi * Math.cos(orbTheta),
      );
      camera.lookAt(ORBIT_TARGET);
    };
    let dragging = false;
    let dragX = 0;
    let dragY = 0;
    let dragPointerId = null;
    const canvasEl = renderer.domElement;
    canvasEl.style.cursor = 'grab';
    canvasEl.style.touchAction = 'none';
    canvasEl.style.userSelect = 'none';
    const onDragStart = (e) => {
      (e.pointerType === 'mouse' && e.button !== 0) || (dragging = true,
        dragPointerId = e.pointerId,
        dragX = e.clientX,
        dragY = e.clientY,
        canvasEl.setPointerCapture(e.pointerId),
        canvasEl.style.cursor = 'grabbing');
    };
    const onDragMove = (e) => {
      if (!dragging || e.pointerId !== dragPointerId) return;
      const dx = e.clientX - dragX;
      const dy = e.clientY - dragY;
      dragX = e.clientX;
      dragY = e.clientY;
      orbTheta -= dx * ORBIT_SPEED;
      orbPhi = Math.max(PHI_MIN, Math.min(PHI_MAX, orbPhi + dy * ORBIT_SPEED));
      applyOrbit();
    };
    const onDragEnd = (e) => {
      if (e.pointerId === dragPointerId) {
        dragging = false;
        dragPointerId = null;
        try { canvasEl.releasePointerCapture(e.pointerId); } catch {}
        canvasEl.style.cursor = 'grab';
      }
    };
    canvasEl.addEventListener('pointerdown', onDragStart);
    canvasEl.addEventListener('pointermove', onDragMove);
    canvasEl.addEventListener('pointerup', onDragEnd);
    canvasEl.addEventListener('pointercancel', onDragEnd);

    /* ----- main loop ----- */
    let rafId = 0;
    let lastT = performance.now();
    let prevPose = null;
    let jointSpeed = 0;
    let pulse = 0;

    const tick = () => {
      const nowMs = performance.now();
      const dt = Math.min(.05, (nowMs - lastT) / 1e3);
      lastT = nowMs;

      if (heroVisible) {
        let targetX = rawCX;
        let targetY = rawCY;
        // while the robot holds the cursor, it tracks the fake one
        if (fakeState !== 'free') {
          tmpV.copy(cursorMesh.position).project(camera);
          targetX = Math.max(-1.5, Math.min(1.5, tmpV.x));
          targetY = Math.max(-1.5, Math.min(1.5, -tmpV.y));
        }
        const kPos = 1 - Math.exp(-dt * 10);
        curX += (targetX - curX) * kPos;
        curY += (targetY - curY) * kPos;
        const dtSafe = Math.max(dt, 1 / 240);
        const instVX = (curX - prevX) / dtSafe;
        const instVY = (curY - prevY) / dtSafe;
        prevX = curX;
        prevY = curY;
        const kVel = 1 - Math.exp(-dt * 6);
        velX += (instVX - velX) * kVel;
        velY += (instVY - velY) * kVel;

        // reach geometry: sphere around the shoulder
        const robotScale = .9;
        const linkA = 2.1 * robotScale;
        const linkB = (1.8 + .4 + .32 + .7) * robotScale;
        const reach = linkA + linkB - .1;
        const reachRamp = 2;
        const rayDir = new o.Vector3(curX, -curY, 1).unproject(camera).clone().sub(camera.position).normalize();
        robot.updateMatrixWorld(true);
        const shoulder = new o.Vector3();
        j2.getWorldPosition(shoulder);
        const tClosest = -camera.position.clone().sub(shoulder).dot(rayDir);
        const closest = camera.position.clone().addScaledVector(rayDir, tClosest);
        const closestDist = closest.distanceTo(shoulder);
        const inReach = closestDist <= reach;

        tmpV.set(0, 0, 0).project(camera);
        const baseScreenY = -tmpV.y;
        const cursorAboveBase = curY < baseScreenY;
        const rect = x.getBoundingClientRect();
        const visTop = Math.max(0, rect.top);
        const visBottom = Math.min(window.innerHeight, rect.bottom);
        const visHeight = Math.max(0, visBottom - visTop);
        const mostlyVisible = rect.height > 0 && visHeight / rect.height > .5;

        let calmTarget = Math.max(0, Math.min(1, (closestDist - reach) / reachRamp));
        (!cursorAboveBase || !mostlyVisible || !cursorSeen || !pageActive) && (calmTarget = 1);
        calm += (calmTarget - calm) * (1 - Math.exp(-dt * 1.8));
        const calmNow = calm;
        const alertNow = 1 - calmNow;

        const cooldownOver = nowMs - lastGrab >= COOLDOWN;
        const canStrike = inReach && cursorAboveBase && mostlyVisible && cursorSeen && pageActive && cooldownOver;
        if (strikeLeft > 0) {
          strikeLeft = Math.max(0, strikeLeft - dt);
        } else if (alertNow > .3 && canStrike) {
          grabTimer -= dt * alertNow;
          if (grabTimer <= 0) {
            strikeLeft = STRIKE_DUR;
            grabTimer = 1.2 + Math.random() * 2.5;
            lastGrab = nowMs;
          }
        } else {
          grabTimer = Math.min(grabTimer, .6 + Math.random() * .8);
        }

        // strike envelope: fast sine attack, slow cosine release
        const ENVELOPE_ATTACK = .22;
        let envelope = 0;
        if (strikeLeft > 0) {
          const k = 1 - strikeLeft / STRIKE_DUR;
          k < ENVELOPE_ATTACK
            ? envelope = Math.sin(k / ENVELOPE_ATTACK * (Math.PI / 2))
            : envelope = Math.cos((k - ENVELOPE_ATTACK) / (1 - ENVELOPE_ATTACK) * (Math.PI / 2));
        }

        // grab success at the strike apex → steal the cursor
        if (fakeState === 'free' && prevEnvelope < .92 && envelope >= .92 && inReach) {
          j6.updateMatrixWorld(true);
          tmpV.copy(TIP_LOCAL).applyMatrix4(j6.matrixWorld);
          cursorMesh.position.copy(tmpV);
          cursorMesh.visible = true;
          document.body.style.cursor = 'none';
          options.onCursorGrab && options.onCursorGrab();
          fakeState = 'carrying';
        }
        prevEnvelope = envelope;

        if (fakeState === 'carrying') {
          j6.updateMatrixWorld(true);
          tmpV.copy(TIP_LOCAL).applyMatrix4(j6.matrixWorld);
          cursorMesh.position.copy(tmpV);
          if (strikeLeft <= 0) {
            fakeState = 'falling';
            fallVel.set(0, -.5, 0);
          }
        } else if (fakeState === 'falling') {
          fallVel.y -= 9.8 * dt;
          cursorMesh.position.x += fallVel.x * dt;
          cursorMesh.position.y += fallVel.y * dt;
          cursorMesh.position.z += fallVel.z * dt;
          tmpV.copy(cursorMesh.position).project(camera);
          if (tmpV.y < -1.25) {
            cursorMesh.visible = false;
            fakeState = 'waitingToRestore';
            restoreAt = nowMs + 1e3;
          }
        } else if (fakeState === 'waitingToRestore' && nowMs >= restoreAt) {
          document.body.style.cursor = '';
          options.onCursorRestore && options.onCursorRestore();
          fakeState = 'free';
        }
        breathT += dt;

        // idle sway (breathing + slow sines), damped during the strike
        const breath = Math.sin(breathT * 2.5) * calmNow;
        const Z = nowMs / 1e3;
        const swayA = Math.sin(Z * .21 + 1.3);
        const swayB = Math.sin(Z * .55 + 2.7);
        const swayC = Math.sin(Z * .32);
        const swayScale = 1 - envelope * .7;
        const swayJ2 = swayA * .14 * swayScale;
        const swayJ3 = swayB * .21 * swayScale;
        const swayJ6 = swayC * .55 * swayScale;

        // cursor-following targets (alert pose)
        let tgtJ1 = curX * .85;
        let tgtJ2 = -.3 + swayJ2;
        let tgtJ3 = -1 + swayJ3;
        let tgtJ5 = 0 - curY * 1.2 - swayJ2 - swayJ3 + breath * .05;

        // analytic IK strike pose, blended in by the envelope
        if (envelope > .01) {
          const toCam = camera.position.clone().sub(shoulder);
          const G = 2 * toCam.dot(rayDir);
          const kDisc = toCam.lengthSq() - reach * reach;
          const disc = G * G - 4 * kDisc;
          const strikePoint = new o.Vector3();
          if (disc > 0) {
            const tNear = (-G - Math.sqrt(disc)) / 2;
            if (tNear > .5) strikePoint.copy(camera.position).addScaledVector(rayDir, tNear);
            else {
              const tFar = (-G + Math.sqrt(disc)) / 2;
              strikePoint.copy(camera.position).addScaledVector(rayDir, tFar);
            }
          } else {
            const outDir = closest.clone().sub(shoulder).normalize();
            strikePoint.copy(shoulder).addScaledVector(outDir, reach);
          }
          const MIN_HEIGHT = 2.5;
          if (strikePoint.y < MIN_HEIGHT) {
            strikePoint.y = MIN_HEIGHT;
            const off = strikePoint.clone().sub(shoulder);
            const offLen = off.length();
            if (offLen > reach) {
              off.multiplyScalar(reach / offLen);
              strikePoint.copy(shoulder).add(off);
              strikePoint.y = Math.max(strikePoint.y, MIN_HEIGHT);
            }
          }
          const dx = strikePoint.x - shoulder.x;
          const dz = strikePoint.z - shoulder.z;
          let yaw = Math.atan2(dx, dz) - robot.rotation.y;
          for (; yaw > Math.PI;) yaw -= 2 * Math.PI;
          for (; yaw < -Math.PI;) yaw += 2 * Math.PI;
          let yawAlt = yaw + Math.PI;
          for (; yawAlt > Math.PI;) yawAlt -= 2 * Math.PI;
          for (; yawAlt < -Math.PI;) yawAlt += 2 * Math.PI;
          tgtJ1 = Math.abs(yaw - tgtJ1) <= Math.abs(yawAlt - tgtJ1) ? yaw : yawAlt;

          const worldYaw = robot.rotation.y + tgtJ1;
          const toTarget = strikePoint.sub(shoulder);
          const cosY = Math.cos(worldYaw);
          const sinY = Math.sin(worldYaw);
          const up = toTarget.y;
          const fwd = toTarget.x * sinY + toTarget.z * cosY;
          const dist = Math.max(.1, Math.min(linkA + linkB - .05, Math.sqrt(up * up + fwd * fwd)));
          const cosShoulder = (linkA * linkA + dist * dist - linkB * linkB) / (2 * linkA * dist);
          const shoulderAng = Math.acos(Math.max(-1, Math.min(1, cosShoulder)));
          const cosElbow = (linkA * linkA + linkB * linkB - dist * dist) / (2 * linkA * linkB);
          const elbowAng = Math.acos(Math.max(-1, Math.min(1, cosElbow)));
          tgtJ2 = Math.atan2(fwd, up) + shoulderAng;
          tgtJ3 = elbowAng - Math.PI;
          tgtJ5 = breath * .05;
        }

        const mixJ1 = lerp(curX * .85, tgtJ1, envelope);
        const mixJ2 = lerp(-.3 + swayJ2, tgtJ2, envelope);
        const mixJ3 = lerp(-1 + swayJ3, tgtJ3, envelope);
        const mixJ4 = 0;
        const mixJ5 = lerp(0 - curY * 1.2 - swayJ2 - swayJ3 + breath * .05, tgtJ5, envelope);
        const mixJ6 = swayJ6;

        // gripper closes through the strike
        let gripStrike = 0;
        if (strikeLeft > 0) {
          const k = 1 - strikeLeft / STRIKE_DUR;
          k < .22 ? gripStrike = Math.sin(k / .22 * (Math.PI / 2))
            : k < .92 ? gripStrike = 1
            : gripStrike = 1 - (k - .92) / .08;
        }
        const gripAlert = .55 - gripStrike * .55;

        // scripted keyframes
        for (phase += dt; phase >= toKf.ease + toKf.dwell;) {
          phase -= toKf.ease + toKf.dwell;
          fromKf = toKf;
          queue.length === 0 && (queue = sampleTask());
          toKf = queue.shift();
        }
        let kfJ1, kfJ2, kfJ3, kfJ4, kfJ5, kfJ6, kfGrip;
        if (phase < toKf.ease) {
          const k = phase / toKf.ease;
          const G = easeInOutCubic(k);
          kfJ1 = lerp(fromKf.j1, toKf.j1, G);
          kfJ2 = lerp(fromKf.j2, toKf.j2, G);
          kfJ3 = lerp(fromKf.j3, toKf.j3, G);
          kfJ4 = lerp(fromKf.j4, toKf.j4, G);
          kfJ5 = lerp(fromKf.j5, toKf.j5, G);
          kfJ6 = lerp(fromKf.j6, toKf.j6, G);
          kfGrip = lerp(fromKf.grip, toKf.grip, G);
        } else {
          kfJ1 = toKf.j1; kfJ2 = toKf.j2; kfJ3 = toKf.j3; kfJ4 = toKf.j4;
          kfJ5 = toKf.j5; kfJ6 = toKf.j6; kfGrip = toKf.grip;
        }

        // calm blends scripted routine in over cursor tracking
        const blendScript = calmNow;
        const pose = {
          j1: lerp(mixJ1, kfJ1, blendScript),
          j2: lerp(mixJ2, kfJ2, blendScript),
          j3: lerp(mixJ3, kfJ3, blendScript),
          j4: lerp(mixJ4, kfJ4, blendScript),
          j5: lerp(mixJ5, kfJ5, blendScript),
          j6: lerp(mixJ6, kfJ6, blendScript),
          grip: lerp(gripAlert, kfGrip, blendScript),
          dwell: 0,
          ease: 0,
        };

        // page hidden/blurred → blend to rest pose
        restBlend += ((pageActive ? 0 : 1) - restBlend) * (1 - Math.exp(-dt * 4));
        if (restBlend > .001) {
          pose.j1 = lerp(pose.j1, REST_POSE.j1, restBlend);
          pose.j2 = lerp(pose.j2, REST_POSE.j2, restBlend);
          pose.j3 = lerp(pose.j3, REST_POSE.j3, restBlend);
          pose.j4 = lerp(pose.j4, REST_POSE.j4, restBlend);
          pose.j5 = lerp(pose.j5, REST_POSE.j5, restBlend);
          pose.j6 = lerp(pose.j6, REST_POSE.j6, restBlend);
          pose.grip = lerp(pose.grip, REST_POSE.grip, restBlend);
        }
        applyPose(pose);

        // joint speed → fan energy pulses
        if (prevPose) {
          const dtClamped = Math.max(dt, .004166666666666667);
          const speed = (Math.abs(pose.j1 - prevPose.j1) + Math.abs(pose.j2 - prevPose.j2)
            + Math.abs(pose.j3 - prevPose.j3) + Math.abs(pose.j4 - prevPose.j4)
            + Math.abs(pose.j5 - prevPose.j5) + Math.abs(pose.j6 - prevPose.j6)) / dtClamped;
          const kSpeed = 1 - Math.exp(-dt * 4);
          jointSpeed += (speed - jointSpeed) * kSpeed;
          const intensity = 1 - Math.exp(-jointSpeed / 4);
          const kPulse = 1 - Math.exp(-dt * 3);
          pulse += (intensity - pulse) * kPulse;
        }
        prevPose = pose;

        // servo micro-noise
        j2.rotation.x += Math.sin(Z * .7) * .01;
        j6.rotation.y += Math.sin(Z * .9 + .4) * .012;
        // whole robot yaws to face the camera
        robot.rotation.y = Math.atan2(-camera.position.x, -camera.position.z);

        fanUniforms.uTime.value = Z;
        fanUniforms.uPulseIntensity.value = pulse;
        updateFocal();

        // pass 1: fan → offscreen target
        camera.layers.set(FAN_LAYER);
        renderer.setRenderTarget(fanTarget);
        renderer.setClearColor(0, 0);
        renderer.clear();
        renderer.render(scene, camera);
        // pass 2: blur quad (+ film grain) → screen
        renderer.setRenderTarget(null);
        renderer.setClearColor(0, 0);
        renderer.clear();
        renderer.render(quadScene, quadCam);
        // pass 3: robot sharp on top
        camera.layers.set(0);
        const prevAutoClear = renderer.autoClear;
        renderer.autoClear = false;
        renderer.render(scene, camera);
        renderer.autoClear = prevAutoClear;

        if (!x.classList.contains('robot-hero-ready')) x.classList.add('robot-hero-ready');
        stream && stream.tickSend();
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    /* ----- optional telemetry: ?stream=<port> ----- */
    const streamParam = new URLSearchParams(location.search).get('stream');
    if (streamParam && /^\d{2,5}$/.test(streamParam)) {
      try {
        if (!destroyed) {
          stream = startStream(Number(streamParam), makeObs, {
            joint_axes: { j1: 'y', j2: 'x', j3: 'x', j4: 'y', j5: 'x', j6: 'y' },
          });
        }
      } catch (err) {
        console.warn('[rerun] robot stream failed to start', err);
      }
    }

    /* ----- teardown ----- */
    return () => {
      cancelAnimationFrame(rafId);
      stream && stream.stop();
      resizeObs.disconnect();
      intersectObs.disconnect();
      canvasEl.removeEventListener('pointerdown', onDragStart);
      canvasEl.removeEventListener('pointermove', onDragMove);
      canvasEl.removeEventListener('pointerup', onDragEnd);
      canvasEl.removeEventListener('pointercancel', onDragEnd);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      if (fakeState !== 'free') {
        document.body.style.cursor = '';
        options.onCursorRestore && options.onCursorRestore();
        fakeState = 'free';
      }
      scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry && obj.geometry.dispose();
          const m = obj.material;
          Array.isArray(m) ? m.forEach((mm) => mm && mm.dispose()) : m && m.dispose();
        }
      });
      envTexture.dispose();
      pmrem.dispose();
      fanTarget.dispose();
      blurMaterial.dispose();
      quad.geometry.dispose();
      renderer.dispose();
      renderer.domElement.parentNode === x && x.removeChild(renderer.domElement);
    };
  }
}
