/* ============================================================================
 * 1. PROCEDURAL TEXTURES, AUDIO & INPUT
 * ==========================================================================*/
class TextureFactory {
  static makeCanvas(size, drawFn) {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    drawFn(c.getContext("2d"), size);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }
  static wetSlateFloor() {
    const map = this.makeCanvas(512, (ctx, s) => {
      ctx.fillStyle = "#1c2029";
      ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 64) {
        for (let x = 0; x < s; x += 64) {
          const v = 22 + Math.floor(Math.random() * 14);
          ctx.fillStyle = `rgb(${v},${v + 3},${v + 9})`;
          ctx.fillRect(x + 2, y + 2, 60, 60);
        }
      }
    });
    map.repeat.set(6, 4);
    const roughMap = this.makeCanvas(512, (ctx, s) => {
      ctx.fillStyle = "#cfcfcf";
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 16; i++) {
        const px = Math.random() * s,
          py = Math.random() * s,
          r = 28 + Math.random() * 60;
        const g = ctx.createRadialGradient(px, py, r * 0.1, px, py, r);
        g.addColorStop(0, "#121212");
        g.addColorStop(1, "rgba(207,207,207,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    roughMap.repeat.set(6, 4);
    return { map, roughMap };
  }
  static skyscraperWindows() {
    return this.makeCanvas(256, (ctx, s) => {
      ctx.fillStyle = "#080b12";
      ctx.fillRect(0, 0, s, s);
      for (let y = 8; y < s; y += 14) {
        for (let x = 8; x < s; x += 12) {
          const r = Math.random();
          ctx.fillStyle =
            r < 0.24 ? "#fde68a" : r < 0.34 ? "#38bdf8" : "#111827";
          ctx.fillRect(x, y, 7, 8);
        }
      }
    });
  }
}

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }
  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }
  tone(f1, f2, dur, type = "sawtooth", vol = 0.14) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, now);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), now + dur);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(now);
    o.stop(now + dur);
  }
  noise(dur, vol = 0.2, lp = 900) {
    if (!this.enabled || !this.ctx) return;
    const len = Math.floor(this.ctx.sampleRate * dur),
      buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const flt = this.ctx.createBiquadFilter();
    flt.type = "lowpass";
    flt.frequency.value = lp;
    const g = this.ctx.createGain();
    const now = this.ctx.currentTime;
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(this.ctx.destination);
    src.start(now);
  }
  whiff() {
    this.noise(0.08, 0.08, 1200);
  }
  hitLight() {
    this.tone(160, 42, 0.12, "triangle", 0.25);
    this.noise(0.09, 0.2, 1600);
  }
  hitHeavy() {
    this.tone(125, 28, 0.24, "sawtooth", 0.34);
    this.noise(0.2, 0.3, 950);
  }
  electric() {
    this.tone(560, 110, 0.25, "sawtooth", 0.22);
    this.noise(0.22, 0.24, 2800);
  }
  block() {
    this.tone(390, 175, 0.09, "square", 0.14);
  }
  heal() {
    this.tone(330, 660, 0.26, "sine", 0.16);
  }
  ko() {
    this.tone(145, 26, 0.6, "sawtooth", 0.35);
    this.noise(0.5, 0.35, 650);
  }
  round() {
    this.tone(440, 587, 0.25, "triangle", 0.16);
  }
}

class InputHandler {
  constructor() {
    this.keys = new Set();
    this.justPressed = new Set();
    this.lastTap = {};
    this.doubleTap = new Set();
    window.addEventListener("keydown", (e) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
          e.code,
        )
      )
        e.preventDefault();
      if (!this.keys.has(e.code)) {
        this.justPressed.add(e.code);
        const now = performance.now();
        if (this.lastTap[e.code] && now - this.lastTap[e.code] < 240)
          this.doubleTap.add(e.code);
        this.lastTap[e.code] = now;
      }
      this.keys.add(e.code);
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
  }
  isDown(c) {
    return this.keys.has(c);
  }
  wasPressed(c) {
    return this.justPressed.has(c);
  }
  wasDoubleTapped(c) {
    return this.doubleTap.has(c);
  }
  endFrame() {
    this.justPressed.clear();
    this.doubleTap.clear();
  }
}

/* ============================================================================
 * 2. REALISTIC 3D ROOFTOP ARENA & SPARK EFFECTS
 * ==========================================================================*/
class Arena3D {
  constructor(scene) {
    const slate = TextureFactory.wetSlateFloor();
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 18),
      new THREE.MeshStandardMaterial({
        map: slate.map,
        roughnessMap: slate.roughMap,
        bumpMap: slate.map,
        bumpScale: 0.03,
        roughness: 0.9,
        metalness: 0.12,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x242934,
      roughness: 0.85,
    });
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(24, 0.85, 0.5),
      wallMat,
    );
    backWall.position.set(0, 0.42, -3.6);
    backWall.receiveShadow = true;
    backWall.castShadow = true;
    scene.add(backWall);

    const railMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.8,
      roughness: 0.3,
    });
    for (let x = -9; x <= 9; x += 3) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.75, 10),
        railMat,
      );
      post.position.set(x, 1.18, -3.6);
      scene.add(post);
      if (Math.abs(x) === 6) {
        const pillar = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 5.2, 0.9),
          wallMat,
        );
        pillar.position.set(x, 2.6, -4.1);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        scene.add(pillar);
        const beacon = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.18, 0.1),
          new THREE.MeshStandardMaterial({
            color: 0xf97316,
            emissive: 0xf97316,
            emissiveIntensity: 2.2,
          }),
        );
        beacon.position.set(x, 4.4, -3.62);
        scene.add(beacon);
      }
    }
    const topRail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 22, 12),
      railMat,
    );
    topRail.rotation.z = Math.PI / 2;
    topRail.position.set(0, 1.52, -3.6);
    scene.add(topRail);

    const winTex = TextureFactory.skyscraperWindows();
    for (let i = -14; i <= 14; i++) {
      if (Math.abs(i) < 1) continue;
      const h = 8 + Math.random() * 18,
        w = 2.2 + Math.random() * 1.8,
        z = -12 - Math.random() * 18;
      const bTex = winTex.clone();
      bTex.needsUpdate = true;
      bTex.repeat.set(1, Math.ceil(h / 5));
      const bldg = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, w),
        new THREE.MeshStandardMaterial({
          map: bTex,
          emissiveMap: bTex,
          emissive: 0xffffff,
          emissiveIntensity: 0.55,
          roughness: 0.7,
        }),
      );
      bldg.position.set(i * 2.5 + (Math.random() - 0.5), h / 2 - 4, z);
      scene.add(bldg);
    }

    scene.add(new THREE.HemisphereLight(0x64748b, 0x090b10, 1.05));
    const key = new THREE.DirectionalLight(0xe0f2fe, 2.1);
    key.position.set(4, 9, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -10;
    key.shadow.camera.right = 10;
    key.shadow.camera.top = 7;
    key.shadow.camera.bottom = -3;
    scene.add(key);

    const rimL = new THREE.SpotLight(0x38bdf8, 3.4, 22, 0.7, 0.5);
    rimL.position.set(-7, 5.2, -3.2);
    scene.add(rimL);
    const rimR = new THREE.SpotLight(0xf97316, 3.4, 22, 0.7, 0.5);
    rimR.position.set(7, 5.2, -3.2);
    scene.add(rimR);

    const rainCount = 650,
      rainGeo = new THREE.BufferGeometry(),
      rainPos = new Float32Array(rainCount * 6);
    for (let i = 0; i < rainCount; i++) {
      const rx = (Math.random() - 0.5) * 24,
        ry = Math.random() * 10,
        rz = (Math.random() - 0.5) * 10;
      rainPos[i * 6] = rx;
      rainPos[i * 6 + 1] = ry;
      rainPos[i * 6 + 2] = rz;
      rainPos[i * 6 + 3] = rx - 0.04;
      rainPos[i * 6 + 4] = ry - 0.35;
      rainPos[i * 6 + 5] = rz;
    }
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
    this.rain = new THREE.LineSegments(
      rainGeo,
      new THREE.LineBasicMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.3,
      }),
    );
    scene.add(this.rain);
  }
  updateRain() {
    const p = this.rain.geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 6) {
      p[i] -= 0.02;
      p[i + 1] -= 0.36;
      p[i + 3] -= 0.02;
      p[i + 4] -= 0.36;
      if (p[i + 1] < 0) {
        const nx = (Math.random() - 0.5) * 24,
          ny = 9.5 + Math.random() * 2,
          nz = (Math.random() - 0.5) * 10;
        p[i] = nx;
        p[i + 1] = ny;
        p[i + 2] = nz;
        p[i + 3] = nx - 0.04;
        p[i + 4] = ny - 0.35;
        p[i + 5] = nz;
      }
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
  }
}

class SparkManager {
  constructor(scene) {
    this.scene = scene;
    this.sparks = [];
    this.flash = new THREE.PointLight(0xffffff, 0, 8);
    scene.add(this.flash);
    this.flashFrames = 0;
  }
  spawn(x, y, z, colorHex, count = 18) {
    this.flash.color.setHex(colorHex);
    this.flash.position.set(x, y, z + 0.6);
    this.flash.intensity = 6.5;
    this.flashFrames = 6;
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    const geo = new THREE.SphereGeometry(0.035, 6, 6);
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      this.scene.add(m);
      this.sparks.push({
        mesh: m,
        vx: (Math.random() - 0.5) * 0.24,
        vy: Math.random() * 0.18 + 0.02,
        vz: (Math.random() - 0.5) * 0.2,
        life: 18 + Math.floor(Math.random() * 10),
      });
    }
  }
  update() {
    if (this.flashFrames > 0) {
      this.flashFrames--;
      this.flash.intensity *= 0.72;
    } else this.flash.intensity = 0;
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.mesh.position.x += s.vx;
      s.mesh.position.y += s.vy;
      s.mesh.position.z += s.vz;
      s.vy -= 0.012;
      s.life--;
      s.mesh.scale.setScalar(Math.max(0.1, s.life / 24));
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        this.sparks.splice(i, 1);
      }
    }
  }
}

/* ============================================================================
 * 3. AUTO-RIGGER & BONE POSE DRIVER (Gives Real Arm/Leg Motion to Static & Unanimated .GLBs!)
 * ==========================================================================*/
class SkeletalCombatRig {
  static buildFromStaticModel(modelPivot) {
    // 1. Create an 11-Bone Humanoid Skeleton in (+X forward, +Y up, +Z right) space
    const hips = new THREE.Bone();
    hips.name = "auto_hips";
    hips.position.set(0, 0.92, 0);
    const spine = new THREE.Bone();
    spine.name = "auto_spine";
    spine.position.set(0, 0.16, 0);
    const head = new THREE.Bone();
    head.name = "auto_head";
    head.position.set(0, 0.44, 0);
    const armL = new THREE.Bone();
    armL.name = "auto_arm_l";
    armL.position.set(0, 0.36, -0.19);
    const forearmL = new THREE.Bone();
    forearmL.name = "auto_forearm_l";
    forearmL.position.set(0, -0.27, 0);
    const armR = new THREE.Bone();
    armR.name = "auto_arm_r";
    armR.position.set(0, 0.36, 0.19);
    const forearmR = new THREE.Bone();
    forearmR.name = "auto_forearm_r";
    forearmR.position.set(0, -0.27, 0);
    const thighL = new THREE.Bone();
    thighL.name = "auto_thigh_l";
    thighL.position.set(0, -0.02, -0.1);
    const shinL = new THREE.Bone();
    shinL.name = "auto_shin_l";
    shinL.position.set(0, -0.42, 0);
    const thighR = new THREE.Bone();
    thighR.name = "auto_thigh_r";
    thighR.position.set(0, -0.02, 0.1);
    const shinR = new THREE.Bone();
    shinR.name = "auto_shin_r";
    shinR.position.set(0, -0.42, 0);

    hips.add(spine, thighL, thighR);
    spine.add(head, armL, armR);
    armL.add(forearmL);
    armR.add(forearmR);
    thighL.add(shinL);
    thighR.add(shinR);

    const bones = [
      hips,
      spine,
      head,
      armL,
      forearmL,
      armR,
      forearmR,
      thighL,
      shinL,
      thighR,
      shinR,
    ];
    const skeleton = new THREE.Skeleton(bones);

    // Collect original meshes & bake their world transforms into local rigRoot space
    const rigRoot = new THREE.Group();
    modelPivot.updateMatrixWorld(true);
    const invPivot = modelPivot.matrixWorld.clone().invert();
    const meshes = [];
    modelPivot.traverse((c) => {
      if (c.isMesh) meshes.push(c);
    });

    const mat4 = new THREE.Matrix4();
    const smoothstep = (e0, e1, x) => {
      const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
      return t * t * (3 - 2 * t);
    };

    for (const m of meshes) {
      const geom = m.geometry.clone();
      mat4.multiplyMatrices(invPivot, m.matrixWorld);
      // Also apply modelPivot's initial facing rotation (PI/2) so +X is forward
      const rotMat = new THREE.Matrix4().makeRotationY(modelPivot.rotation.y);
      mat4.premultiply(rotMat);
      geom.applyMatrix4(mat4);

      const pos = geom.attributes.position;
      const count = pos.count;
      const skinIndices = new Uint16Array(count * 4);
      const skinWeights = new Float32Array(count * 4);

      for (let i = 0; i < count; i++) {
        const vx = pos.getX(i),
          vy = pos.getY(i),
          vz = pos.getZ(i);
        const az = Math.abs(vz);
        let b0 = 0,
          w0 = 1,
          b1 = 0,
          w1 = 0;

        if (vy >= 1.5 && az < 0.17) {
          // Head
          const t = smoothstep(1.48, 1.57, vy);
          b0 = 2;
          w0 = t;
          b1 = 1;
          w1 = 1 - t;
        } else if (vy >= 0.7 && vy <= 1.55 && az >= 0.145) {
          // Left (-Z) or Right (+Z) Arm
          const isLeft = vz < 0;
          const bArm = isLeft ? 3 : 5;
          const bFore = isLeft ? 4 : 6;
          const armBlend = smoothstep(0.14, 0.2, az);
          const foreBlend = 1 - smoothstep(1.1, 1.24, vy);
          if (armBlend < 0.99) {
            b0 = bArm;
            w0 = armBlend;
            b1 = 1;
            w1 = 1 - armBlend;
          } else {
            b0 = bFore;
            w0 = foreBlend;
            b1 = bArm;
            w1 = 1 - foreBlend;
          }
        } else if (vy < 0.94) {
          // Left (-Z) or Right (+Z) Leg
          const isLeft = vz < 0;
          const bThigh = isLeft ? 7 : 9;
          const bShin = isLeft ? 8 : 10;
          if (vy > 0.8) {
            const hipBlend = 1 - smoothstep(0.8, 0.94, vy);
            b0 = bThigh;
            w0 = hipBlend;
            b1 = 0;
            w1 = 1 - hipBlend;
          } else {
            const kneeBlend = 1 - smoothstep(0.42, 0.54, vy);
            b0 = bShin;
            w0 = kneeBlend;
            b1 = bThigh;
            w1 = 1 - kneeBlend;
          }
        } else {
          // Pelvis -> Spine
          const sp = smoothstep(0.95, 1.12, vy);
          b0 = 1;
          w0 = sp;
          b1 = 0;
          w1 = 1 - sp;
        }

        const sum = w0 + w1 || 1;
        skinIndices[i * 4] = b0;
        skinWeights[i * 4] = w0 / sum;
        skinIndices[i * 4 + 1] = b1;
        skinWeights[i * 4 + 1] = w1 / sum;
      }

      geom.setAttribute(
        "skinIndex",
        new THREE.Uint16BufferAttribute(skinIndices, 4),
      );
      geom.setAttribute(
        "skinWeight",
        new THREE.Float32BufferAttribute(skinWeights, 4),
      );

      const skinned = new THREE.SkinnedMesh(geom, m.material);
      skinned.castShadow = true;
      skinned.receiveShadow = true;
      rigRoot.add(skinned);
    }

    rigRoot.add(hips);
    rigRoot.updateMatrixWorld(true);
    skeleton.calculateInverses();
    rigRoot.traverse((c) => {
      if (c.isSkinnedMesh) c.bind(skeleton);
    });

    return {
      rigRoot,
      bones: {
        hips,
        spine,
        head,
        armL,
        forearmL,
        armR,
        forearmR,
        thighL,
        shinL,
        thighR,
        shinR,
      },
      isAutoRig: true,
    };
  }

  static mapExistingBones(model) {
    const found = {
      hips: null,
      spine: null,
      head: null,
      armL: null,
      forearmL: null,
      armR: null,
      forearmR: null,
      thighL: null,
      shinL: null,
      thighR: null,
      shinR: null,
    };
    model.traverse((b) => {
      if (!b.isBone) return;
      b.userData.restQuat = b.quaternion.clone();
      const n = b.name.toLowerCase();
      const isL = /(left|_l\b|\.l\b|\bl_|\bl\b)/i.test(n) && !/right/i.test(n);
      const isR = /(right|_r\b|\.r\b|\br_|\br\b)/i.test(n) && !/left/i.test(n);

      if (!found.hips && /hips|pelvis|root/.test(n)) found.hips = b;
      else if (!found.spine && /spine1|spine2|chest|spine/.test(n))
        found.spine = b;
      else if (!found.head && /\bhead\b/.test(n)) found.head = b;
      else if (/forearm|lower_?arm|low_?arm|elbow/.test(n)) {
        if (isL && !found.forearmL) found.forearmL = b;
        if (isR && !found.forearmR) found.forearmR = b;
      } else if (
        /upper_?arm|up_?arm|shoulder|\barm\b/.test(n) &&
        !/hand|finger|fore/.test(n)
      ) {
        if (isL && !found.armL) found.armL = b;
        if (isR && !found.armR) found.armR = b;
      } else if (/thigh|up_?leg|upper_?leg/.test(n)) {
        if (isL && !found.thighL) found.thighL = b;
        if (isR && !found.thighR) found.thighR = b;
      } else if (
        /calf|shin|low_?leg|lower_?leg|\bleg\b/.test(n) &&
        !/thigh|up|foot|toe/.test(n)
      ) {
        if (isL && !found.shinL) found.shinL = b;
        if (isR && !found.shinR) found.shinR = b;
      }
    });
    return found;
  }
}

/* ============================================================================
 * 4. GLB FIGHTER CLASS (Full Limb & Body Combat Animation)
 * ==========================================================================*/
const ARENA_LIMIT = 6.8;

class GLBFighter3D {
  constructor({ name, modelPath, x, facing, controls, scene, auraColor }) {
    this.name = name;
    this.modelPath = modelPath;
    this.x = x;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.controls = controls;
    this.auraColor = auraColor;

    this.maxHp = 180;
    this.hp = this.maxHp;
    this.maxPower = 100;
    this.power = 35;
    this.walkSpeed = 0.075;
    this.jumpForce = 0.235;
    this.gravity = 0.012;

    this.state = "idle";
    this.stateFrame = 0;
    this.hitstun = 0;
    this.blockstun = 0;
    this.comboReceived = 0;
    this.crouching = false;
    this.isBlocking = false;
    this.currentAttack = null;
    this.hitConnected = false;

    this.moves = {
      jab: {
        name: "Quick Strike",
        startup: 6,
        active: 5,
        recovery: 10,
        damage: 12,
        chip: 2,
        range: 1.5,
        height: 0.75,
        yMin: 0.85,
        knockX: 0.09,
        knockY: 0,
        hitstun: 14,
        powerGain: 10,
        powerCost: 0,
        type: "high",
        electric: false,
      },
      kick: {
        name: "Roundhouse Kick",
        startup: 10,
        active: 6,
        recovery: 15,
        damage: 20,
        chip: 4,
        range: 1.78,
        height: 0.85,
        yMin: 0.65,
        knockX: 0.14,
        knockY: 0.11,
        hitstun: 22,
        powerGain: 15,
        powerCost: 0,
        type: "mid",
        electric: false,
      },
      special: {
        name: "Electric Launcher",
        startup: 11,
        active: 7,
        recovery: 18,
        damage: 30,
        chip: 7,
        range: 1.92,
        height: 1.15,
        yMin: 0.55,
        knockX: 0.12,
        knockY: 0.21,
        hitstun: 34,
        powerGain: 0,
        powerCost: 30,
        type: "mid",
        electric: true,
      },
      rageArt: {
        name: "DEVIL RAGE ART",
        startup: 14,
        active: 10,
        recovery: 24,
        damage: 55,
        chip: 14,
        range: 2.15,
        height: 1.35,
        yMin: 0.45,
        knockX: 0.24,
        knockY: 0.18,
        hitstun: 42,
        powerGain: 0,
        powerCost: 0,
        type: "unblockable",
        electric: true,
      },
    };

    this.root = new THREE.Group();
    this.modelPivot = new THREE.Group();
    this.modelPivot.rotation.y = Math.PI / 2;
    this.root.add(this.modelPivot);

    this.slashMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.65, 0.04, 8, 24, Math.PI * 0.85),
      new THREE.MeshBasicMaterial({
        color: this.auraColor,
        transparent: true,
        opacity: 0,
      }),
    );
    this.slashMesh.position.set(0.75, 1.05, 0);
    this.root.add(this.slashMesh);

    this.rageRing = new THREE.Mesh(
      new THREE.RingGeometry(0.45, 0.68, 32),
      new THREE.MeshBasicMaterial({
        color: 0xef4444,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      }),
    );
    this.rageRing.rotation.x = -Math.PI / 2;
    this.rageRing.position.y = 0.03;
    this.root.add(this.rageRing);

    this.mixer = null;
    this.hasClips = false;
    this.rigBones = null;
    this.isAutoRig = false;
    this.poseAngles = {
      spine: 0,
      head: 0,
      armL: 0,
      foreL: 0,
      armR: 0,
      foreR: 0,
      thighL: 0,
      shinL: 0,
      thighR: 0,
      shinR: 0,
      hipY: 0,
      koZ: 0,
    };

    this.root.position.set(this.x, 0, 0);
    this.root.rotation.y = this.facing === 1 ? -0.22 : Math.PI + 0.22;
    scene.add(this.root);
  }

  loadModel(loader) {
    return new Promise((resolve) => {
      loader.load(
        this.modelPath,
        (gltf) => {
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3(),
            center = new THREE.Vector3();
          box.getSize(size);
          model.scale.setScalar(1.82 / (size.y || 1));

          box.setFromObject(model);
          box.getCenter(center);
          model.position.x -= center.x;
          model.position.z -= center.z;
          model.position.y -= box.min.y;

          let boneCount = 0;
          model.traverse((c) => {
            if (c.isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
            }
            if (c.isBone) boneCount++;
          });

          this.modelPivot.add(model);

          if (gltf.animations && gltf.animations.length > 0) {
            this.hasClips = true;
            this.mixer = new THREE.AnimationMixer(model);
            this.mixer.clipAction(gltf.animations[0]).play();
            resolve({
              ok: true,
              mode: `${gltf.animations.length} anims`,
            });
          } else if (boneCount >= 6) {
            this.rigBones = SkeletalCombatRig.mapExistingBones(model);
            this.isAutoRig = false;
            resolve({ ok: true, mode: `${boneCount} bones rigged` });
          } else {
            // Static mesh -> Auto-Rig into 11-Bone SkinnedMesh!
            const auto = SkeletalCombatRig.buildFromStaticModel(
              this.modelPivot,
            );
            this.modelPivot.clear();
            this.modelPivot.rotation.y = 0; // Baked into geometry
            this.modelPivot.add(auto.rigRoot);
            this.rigBones = auto.bones;
            this.isAutoRig = true;
            resolve({ ok: true, mode: "Auto-Rigged 11-Bone Skeleton" });
          }
        },
        undefined,
        (err) => {
          console.warn(`Load error for ${this.modelPath}:`, err);
          resolve({ ok: false, mode: "CORS blocked" });
        },
      );
    });
  }

  flipFacing() {
    this.modelPivot.rotation.y += Math.PI / 2;
  }

  get isEnraged() {
    return this.hp > 0 && this.hp <= this.maxHp * 0.3;
  }
  get grounded() {
    return this.y <= 0.001;
  }

  resetForRound(x, facing) {
    this.x = x;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.hp = this.maxHp;
    this.power = 35;
    this.state = "idle";
    this.stateFrame = 0;
    this.hitstun = 0;
    this.blockstun = 0;
    this.comboReceived = 0;
    this.currentAttack = null;
    this.hitConnected = false;
    this.crouching = false;
    this.isBlocking = false;
  }

  getHurtbox() {
    const h = this.crouching ? 1.25 : 1.82;
    return { x: this.x - 0.44, y: this.y, w: 0.88, h };
  }

  getActiveHitbox() {
    if (this.state !== "attack" || !this.currentAttack) return null;
    const m = this.currentAttack;
    if (
      this.stateFrame >= m.startup &&
      this.stateFrame < m.startup + m.active
    ) {
      const boxX = this.facing === 1 ? this.x + 0.15 : this.x - 0.15 - m.range;
      return { x: boxX, y: this.y + m.yMin, w: m.range, h: m.height };
    }
    return null;
  }

  startAttack(key, game) {
    const m = this.moves[key];
    if (!m) return false;
    if (m.powerCost > 0 && this.power < m.powerCost) {
      game.setCallout(this, "LOW POWER", "#94a3b8");
      return false;
    }
    this.power = Math.max(0, this.power - m.powerCost);
    this.state = "attack";
    this.stateFrame = 0;
    this.currentAttack = m;
    this.hitConnected = false;
    if (key === "special" || key === "rageArt") {
      this.vx = this.facing * (key === "rageArt" ? 0.19 : 0.12);
      game.sfx.electric();
    } else {
      this.vx = this.facing * 0.04;
      game.sfx.whiff();
    }
    return true;
  }

  handleActionOrHeal(game) {
    if (this.isEnraged) {
      this.startAttack("rageArt", game);
      game.setCallout(this, `${this.moves.rageArt.name}!`, "#ef4444");
    } else if (this.power >= 40 && this.hp < this.maxHp) {
      this.power -= 40;
      const amt = 26;
      this.hp = Math.min(this.maxHp, this.hp + amt);
      game.sfx.heal();
      game.sparks.spawn(this.x, this.y + 1.1, 0.2, 0x4ade80, 18);
      game.setCallout(this, `+${amt} HP KI HEAL`, "#4ade80");
    } else if (this.hp < this.maxHp) {
      game.setCallout(this, "NEED 40 POWER", "#94a3b8");
    }
  }

  handleInput(input, opponent, game) {
    if (this.state === "ko" || this.state === "win") return;
    if (this.hitstun > 0 || this.blockstun > 0) return;
    if (this.state === "attack" || this.state === "dash") return;

    const c = this.controls;
    const left = input.isDown(c.left),
      right = input.isDown(c.right);
    const up = input.isDown(c.up),
      down = input.isDown(c.down);

    if (input.wasPressed(c.jab)) return void this.startAttack("jab", game);
    if (input.wasPressed(c.kick)) return void this.startAttack("kick", game);
    if (input.wasPressed(c.special))
      return void this.startAttack("special", game);
    if (input.wasPressed(c.rage)) return void this.handleActionOrHeal(game);

    if (this.grounded) {
      if (input.wasDoubleTapped(c.left) || (input.wasPressed(c.dash) && left)) {
        this.state = "dash";
        this.stateFrame = 0;
        this.vx = -0.21;
        return;
      }
      if (
        input.wasDoubleTapped(c.right) ||
        (input.wasPressed(c.dash) && (right || !left))
      ) {
        this.state = "dash";
        this.stateFrame = 0;
        this.vx = right ? 0.21 : this.facing * 0.21;
        return;
      }
    }

    this.crouching = this.grounded && down;
    const holdingBack =
      (this.facing === 1 && left) || (this.facing === -1 && right);
    this.isBlocking =
      holdingBack &&
      this.grounded &&
      (opponent.state === "attack" || Math.abs(this.x - opponent.x) < 3.4);

    if (up && this.grounded && !this.crouching) {
      this.vy = this.jumpForce;
      this.vx = left ? -this.walkSpeed : right ? this.walkSpeed : 0;
      this.state = "jump";
      this.stateFrame = 0;
      return;
    }

    if (this.grounded) {
      if (this.crouching) {
        this.vx *= 0.6;
        this.state = "crouch";
      } else if (left && !right) {
        this.vx = holdingBack ? -this.walkSpeed * 0.78 : -this.walkSpeed;
        this.state = "walk";
      } else if (right && !left) {
        this.vx = holdingBack ? this.walkSpeed * 0.78 : this.walkSpeed;
        this.state = "walk";
      } else {
        this.vx *= 0.65;
        this.state = "idle";
      }
    }
  }

  receiveHit(attacker, move, game) {
    const blocked =
      this.isBlocking && this.hitstun === 0 && move.type !== "unblockable";
    if (blocked) {
      this.hp = Math.max(1, this.hp - move.chip);
      this.blockstun = 12;
      this.state = "block";
      this.vx = attacker.facing * move.knockX * 0.55;
      this.power = Math.min(this.maxPower, this.power + 6);
      game.sfx.block();
      game.hitStop = 3;
      game.sparks.spawn(
        this.x - this.facing * 0.3,
        this.y + 1.2,
        0.2,
        0x38bdf8,
        12,
      );
      game.setCallout(this, "GUARD", "#38bdf8");
      return;
    }

    const isCrit = Math.random() < 0.1;
    const dmg = Math.round(
      move.damage * (attacker.isEnraged ? 1.3 : 1.0) * (isCrit ? 2.0 : 1.0),
    );
    this.hp = Math.max(0, this.hp - dmg);
    this.comboReceived++;
    attacker.power = Math.min(
      attacker.maxPower,
      attacker.power + move.powerGain,
    );
    this.power = Math.min(this.maxPower, this.power + 8);

    this.state = this.hp <= 0 ? "ko" : "hit";
    this.currentAttack = null;
    this.stateFrame = 0;
    this.hitstun = move.hitstun + (isCrit ? 8 : 0);
    this.vx = attacker.facing * move.knockX * (isCrit ? 1.3 : 1);
    this.vy = move.knockY > 0 ? move.knockY : !this.grounded ? 0.11 : 0;

    game.hitStop = isCrit || move.electric ? 7 : 4;
    game.camShake = isCrit || move.electric ? 0.24 : 0.1;
    if (this.hp <= 0) {
      game.sfx.ko();
      game.hitStop = 16;
      game.camShake = 0.38;
    } else if (move.electric || isCrit) game.sfx.hitHeavy();
    else game.sfx.hitLight();

    const col = move.electric
      ? attacker.auraColor
      : isCrit
        ? 0xfbbf24
        : 0xff3b3b;
    game.sparks.spawn(
      this.x,
      this.y + 1.15,
      0.15,
      col,
      isCrit || move.electric ? 24 : 14,
    );
    game.setCallout(
      this,
      isCrit ? `COUNTER HIT! -${dmg}` : `-${dmg}`,
      isCrit ? "#fbbf24" : "#f87171",
    );
    if (this.comboReceived >= 2)
      game.setCallout(attacker, `${this.comboReceived} HIT COMBO!`, "#38bdf8");
  }

  updatePhysics(opponent, game) {
    this.stateFrame++;
    if (this.hp > 0 && game.roundPhase === "FIGHT")
      this.power = Math.min(this.maxPower, this.power + 0.045);

    if (this.hitstun > 0) {
      this.hitstun--;
      if (this.hitstun === 0 && this.hp > 0 && this.grounded) {
        this.state = "idle";
        this.comboReceived = 0;
      }
    } else if (this.blockstun > 0) {
      this.blockstun--;
      this.state = "block";
      if (this.blockstun === 0) this.state = "idle";
    } else if (this.state === "dash") {
      if (this.stateFrame > 11) {
        this.state = "idle";
        this.vx *= 0.4;
      }
    } else if (this.state === "attack" && this.currentAttack) {
      const tot =
        this.currentAttack.startup +
        this.currentAttack.active +
        this.currentAttack.recovery;
      if (this.stateFrame >= tot) {
        this.state = this.grounded ? "idle" : "jump";
        this.currentAttack = null;
        this.stateFrame = 0;
      }
    }

    this.x += this.vx;
    this.y += this.vy;
    if (!this.grounded) this.vy -= this.gravity;
    else {
      this.y = 0;
      if (this.vy < 0) this.vy = 0;
      if (this.state === "jump") this.state = "idle";
      if (this.state !== "dash" && this.state !== "walk") this.vx *= 0.82;
    }

    this.x = Math.max(-ARENA_LIMIT, Math.min(ARENA_LIMIT, this.x));

    if (this.hp > 0 && opponent.hp > 0) {
      const minD = 1.05,
        dx = this.x - opponent.x;
      if (Math.abs(dx) < minD && Math.abs(this.y - opponent.y) < 1.35) {
        const push = (minD - Math.abs(dx)) * 0.5,
          dir = dx >= 0 ? 1 : -1;
        this.x = Math.max(
          -ARENA_LIMIT,
          Math.min(ARENA_LIMIT, this.x + dir * push),
        );
        opponent.x = Math.max(
          -ARENA_LIMIT,
          Math.min(ARENA_LIMIT, opponent.x - dir * push),
        );
      }
    }

    if (
      this.grounded &&
      ["idle", "walk", "crouch", "block"].includes(this.state)
    ) {
      if (opponent.x > this.x + 0.08) this.facing = 1;
      else if (opponent.x < this.x - 0.08) this.facing = -1;
    }

    this.updateSkeletalAnimation();
  }

  applyWorldAxisRotation(bone, worldAxis, angle) {
    if (!bone || !bone.parent) return;
    const pWorldQ = new THREE.Quaternion();
    bone.parent.getWorldQuaternion(pWorldQ);
    const localAxis = worldAxis
      .clone()
      .applyQuaternion(pWorldQ.invert())
      .normalize();
    const deltaQ = new THREE.Quaternion().setFromAxisAngle(localAxis, angle);
    bone.quaternion.copy(bone.userData.restQuat).premultiply(deltaQ);
  }

  updateSkeletalAnimation() {
    this.root.position.set(this.x, this.y, 0);
    const targetRotY = this.facing === 1 ? -0.22 : Math.PI + 0.22;
    this.root.rotation.y = THREE.MathUtils.lerp(
      this.root.rotation.y,
      targetRotY,
      0.25,
    );

    if (this.mixer) this.mixer.update(1 / 60);

    const t = this.stateFrame;
    const br = Math.sin(t * 0.1) * 0.06;

    // Target joint angles (Tekken Fighting Guard Stance by default!)
    let tgt = {
      spine: -0.1,
      head: 0.08,
      armL: 0.72 + br,
      foreL: 1.35,
      armR: 0.45 - br,
      foreR: 1.45,
      thighL: 0.24,
      shinL: -0.38,
      thighR: -0.22,
      shinR: -0.24,
      hipY: 0,
      koZ: 0,
    };

    let slashOp = 0;

    if (this.state === "walk") {
      const s = Math.sin(t * 0.28);
      tgt.hipY = Math.abs(s) * 0.04;
      tgt.thighL = 0.55 * s;
      tgt.shinL = -0.35 - Math.max(0, s) * 0.45;
      tgt.thighR = -0.55 * s;
      tgt.shinR = -0.35 - Math.max(0, -s) * 0.45;
      tgt.armL = 0.7 - s * 0.25;
      tgt.armR = 0.5 + s * 0.25;
    } else if (this.state === "crouch") {
      tgt.hipY = -0.26;
      tgt.spine = -0.22;
      tgt.thighL = 0.95;
      tgt.shinL = -1.55;
      tgt.thighR = 0.8;
      tgt.shinR = -1.45;
      tgt.armL = 0.9;
      tgt.foreL = 1.5;
      tgt.armR = 0.75;
      tgt.foreR = 1.55;
    } else if (this.state === "jump") {
      tgt.thighL = 0.75;
      tgt.shinL = -1.25;
      tgt.thighR = -0.15;
      tgt.shinR = -0.75;
      tgt.armL = 1.1;
      tgt.armR = -0.35;
    } else if (this.state === "block") {
      tgt.spine = 0.08;
      tgt.hipY = -0.05;
      tgt.armL = 1.25;
      tgt.foreL = 1.65;
      tgt.armR = 1.15;
      tgt.foreR = 1.7;
    } else if (this.state === "dash") {
      tgt.spine = -0.32;
      tgt.hipY = -0.06;
      tgt.armL = -0.55;
      tgt.armR = 0.85;
      tgt.thighL = 0.55;
      tgt.thighR = -0.65;
    } else if (this.state === "hit") {
      tgt.spine = 0.34;
      tgt.head = 0.25;
      tgt.armL = 0.2;
      tgt.foreL = 0.4;
      tgt.armR = -0.35;
      tgt.foreR = 0.5;
    } else if (this.state === "ko") {
      tgt.koZ = 1.48;
      tgt.hipY = -0.72;
      tgt.armL = -0.3;
      tgt.foreL = 0.2;
      tgt.armR = 0.4;
      tgt.foreR = 0.3;
      tgt.thighL = 0.1;
      tgt.shinL = -0.15;
    } else if (this.state === "attack" && this.currentAttack) {
      const m = this.currentAttack;
      const isAct = t >= m.startup && t < m.startup + m.active;
      const ext = isAct ? 1 : t < m.startup ? 0.35 : 0.45;
      if (isAct) {
        slashOp = 0.9;
        this.slashMesh.rotation.z = t * 0.45;
        this.slashMesh.scale.setScalar(m.electric ? 1.35 : 0.95);
      }
      if (m === this.moves.jab) {
        tgt.spine = -0.22 * ext;
        tgt.armL = 1.65 * ext;
        tgt.foreL = 0.15;
        tgt.armR = 0.35;
        tgt.foreR = 1.65;
      } else if (m === this.moves.kick) {
        tgt.spine = 0.3 * ext;
        tgt.hipY = 0.05;
        tgt.thighR = 1.72 * ext;
        tgt.shinR = -0.1;
        tgt.thighL = -0.18;
        tgt.shinL = -0.18;
      } else {
        // Rising Electric Launcher / Rage Art Uppercut!
        tgt.hipY = 0.15 * ext;
        tgt.spine = -0.22 * ext;
        tgt.armR = 2.55 * ext;
        tgt.foreR = 0.2;
        tgt.thighR = 0.85 * ext;
        tgt.shinR = -1.05 * ext;
      }
    }

    const spd = this.state === "attack" ? 0.48 : 0.26;
    for (const k in this.poseAngles) {
      this.poseAngles[k] = THREE.MathUtils.lerp(
        this.poseAngles[k],
        tgt[k],
        spd,
      );
    }

    this.slashMesh.material.opacity = slashOp;
    this.rageRing.material.opacity = this.isEnraged
      ? 0.45 + Math.sin(t * 0.2) * 0.25
      : 0;

    if (!this.rigBones) return;
    const b = this.rigBones;
    const a = this.poseAngles;

    if (this.isAutoRig) {
      // Auto-rigged skeleton is already in (+X forward, +Y up, +Z right) space!
      b.hips.position.y = 0.92 + a.hipY;
      b.hips.rotation.z = a.koZ;
      b.spine.rotation.z = a.spine;
      b.head.rotation.z = a.head;
      b.armL.rotation.z = a.armL;
      b.forearmL.rotation.z = a.foreL;
      b.armR.rotation.z = a.armR;
      b.forearmR.rotation.z = a.foreR;
      b.thighL.rotation.z = a.thighL;
      b.shinL.rotation.z = a.shinL;
      b.thighR.rotation.z = a.thighR;
      b.shinR.rotation.z = a.shinR;
    } else {
      // Existing .glb skeleton: apply rotations around root's lateral world Z-axis!
      this.root.updateMatrixWorld(true);
      const latAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(
        this.root.quaternion,
      );
      this.root.rotation.z = a.koZ;
      this.applyWorldAxisRotation(b.spine, latAxis, a.spine);
      this.applyWorldAxisRotation(b.head, latAxis, a.head);
      this.applyWorldAxisRotation(b.armL, latAxis, a.armL);
      this.applyWorldAxisRotation(b.forearmL, latAxis, a.foreL);
      this.applyWorldAxisRotation(b.armR, latAxis, a.armR);
      this.applyWorldAxisRotation(b.forearmR, latAxis, a.foreR);
      this.applyWorldAxisRotation(b.thighL, latAxis, a.thighL);
      this.applyWorldAxisRotation(b.shinL, latAxis, a.shinL);
      this.applyWorldAxisRotation(b.thighR, latAxis, a.thighR);
      this.applyWorldAxisRotation(b.shinR, latAxis, a.shinR);
    }
  }
}

/* ============================================================================
 * 5. AI CONTROLLER & GAME ENGINE
 * ==========================================================================*/
class AIController {
  constructor() {
    this.timer = 0;
    this.intent = "approach";
  }
  update(ai, target, game) {
    if (
      ai.state === "ko" ||
      ai.state === "win" ||
      ai.hitstun > 0 ||
      ai.blockstun > 0 ||
      ai.state === "attack" ||
      ai.state === "dash"
    )
      return;
    const dist = Math.abs(ai.x - target.x);
    this.timer--;
    if (target.state === "attack" && dist < 2.1 && Math.random() < 0.55) {
      ai.isBlocking = true;
      ai.state = "block";
      ai.vx = 0;
      return;
    }
    ai.isBlocking = false;
    if (this.timer <= 0) {
      this.timer = 10 + Math.floor(Math.random() * 14);
      const r = Math.random();
      if (ai.isEnraged && dist < 2.1 && r < 0.45) {
        ai.handleActionOrHeal(game);
        return;
      }
      if (ai.hp < ai.maxHp * 0.6 && ai.power >= 45 && dist > 3.2 && r < 0.35) {
        ai.handleActionOrHeal(game);
        return;
      }
      if (dist > 2.2) this.intent = r < 0.25 ? "dash" : "approach";
      else if (dist < 1.85) {
        if (r < 0.35) this.intent = "jab";
        else if (r < 0.65) this.intent = "kick";
        else if (r < 0.85 && ai.power >= 30) this.intent = "special";
        else this.intent = "retreat";
      } else this.intent = r < 0.55 ? "approach" : "kick";
    }
    if (this.intent === "dash" && ai.grounded) {
      ai.state = "dash";
      ai.stateFrame = 0;
      ai.vx = ai.facing * 0.19;
      this.intent = "approach";
    } else if (["jab", "kick", "special"].includes(this.intent)) {
      if (dist < 1.95) {
        ai.startAttack(this.intent, game);
        this.intent = "approach";
      } else {
        ai.vx = ai.facing * ai.walkSpeed;
        ai.state = "walk";
      }
    } else if (this.intent === "retreat") {
      ai.vx = -ai.facing * ai.walkSpeed * 0.85;
      ai.state = "walk";
    } else {
      ai.vx = ai.facing * ai.walkSpeed;
      ai.state = "walk";
    }
  }
}

class GameEngine3D {
  constructor() {
    this.canvas = document.getElementById("webglCanvas");
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913);
    this.scene.fog = new THREE.FogExp2(0x080c18, 0.036);

    this.camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 80);
    this.camera.position.set(0, 1.85, 6.4);

    this.arena = new Arena3D(this.scene);
    this.sparks = new SparkManager(this.scene);
    this.input = new InputHandler();
    this.sfx = new SoundEngine();
    this.ai = new AIController();

    this.p1Controls = {
      left: "KeyA",
      right: "KeyD",
      up: "KeyW",
      down: "KeyS",
      jab: "KeyF",
      kick: "KeyG",
      special: "KeyH",
      rage: "KeyR",
      dash: "ShiftLeft",
    };
    this.p2Controls = {
      left: "ArrowLeft",
      right: "ArrowRight",
      up: "ArrowUp",
      down: "ArrowDown",
      jab: "KeyJ",
      kick: "KeyK",
      special: "KeyL",
      rage: "KeyU",
      dash: "ShiftRight",
    };

    this.mode = "AI";
    this.hitStop = 0;
    this.camShake = 0;
    this.calloutTimers = { p1: 0, p2: 0 };
    this.ready = false;

    this.resize();
    window.addEventListener("resize", () => this.resize());

    this.p1 = new GLBFighter3D({
      name: "FANTASY FIGHTER",
      modelPath: "./models/model.glb",
      x: -2.2,
      facing: 1,
      controls: this.p1Controls,
      scene: this.scene,
      auraColor: 0xa855f7,
    });
    this.p2 = new GLBFighter3D({
      name: "MARTIAL ARTIST",
      modelPath: "./models/waifu043.glb",
      x: 2.2,
      facing: -1,
      controls: this.p2Controls,
      scene: this.scene,
      auraColor: 0xf97316,
    });

    this.loadFighters();
    this.lastTime = performance.now();
    this.acc = 0;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  async loadFighters() {
    const loader = new THREE.GLTFLoader();
    if (THREE.DRACOLoader) {
      const draco = new THREE.DRACOLoader();
      draco.setDecoderPath(
        "https://www.gstatic.com/draco/versioned/decoders/1.5.5/",
      );
      loader.setDRACOLoader(draco);
    }
    const [r1, r2] = await Promise.all([
      this.p1.loadModel(loader),
      this.p2.loadModel(loader),
    ]);
    const status = document.getElementById("modelStatus");

    if (!r1.ok || !r2.ok) {
      status.style.color = "#fca5a5";
      status.innerHTML = `<b>Warning:</b> Could not fetch <code>./models/*.glb</code>. Run via VS Code Live Server, <code>python -m http.server 8000</code>, or GitHub Pages.`;
    } else {
      status.style.color = "#86efac";
      status.textContent = `Rigged & Ready! P1 model.glb (${r1.mode}) | P2 waifu043.glb (${r2.mode})`;
    }
    this.ready = true;
    this.initMatch();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.renderer.setSize(rect.width, rect.height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
  }

  initMatch() {
    this.round = 1;
    this.p1Wins = 0;
    this.p2Wins = 0;
    this.startRound();
  }

  startRound() {
    this.p1.resetForRound(-2.2, 1);
    this.p2.resetForRound(2.2, -1);
    this.timerFrames = 60 * 60;
    this.roundPhase = "INTRO";
    this.phaseTimer = 95;
    this.setBanner(`ROUND ${this.round}`, "", false);
    this.sfx.round();
  }

  setBanner(main, sub = "", isKO = false) {
    const el = document.getElementById("bannerText");
    el.textContent = main;
    el.className = isKO ? "banner ko" : "banner";
    document.getElementById("subBanner").textContent = sub;
  }

  setCallout(fighter, msg, color) {
    const isP1 = fighter === this.p1;
    const el = document.getElementById(isP1 ? "p1Callout" : "p2Callout");
    el.textContent = msg;
    el.style.color = color;
    this.calloutTimers[isP1 ? "p1" : "p2"] = 65;
  }

  rectsOverlap(a, b) {
    return (
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
    );
  }

  step() {
    this.arena.updateRain();
    this.sparks.update();
    if (!this.ready) return;

    if (this.calloutTimers.p1 > 0 && --this.calloutTimers.p1 === 0)
      document.getElementById("p1Callout").textContent = "";
    if (this.calloutTimers.p2 > 0 && --this.calloutTimers.p2 === 0)
      document.getElementById("p2Callout").textContent = "";

    if (this.hitStop > 0) {
      this.hitStop--;
      this.camShake = Math.max(0, this.camShake - 0.02);
      return;
    }
    this.camShake = Math.max(0, this.camShake - 0.02);

    if (this.roundPhase === "INTRO") {
      this.phaseTimer--;
      if (this.phaseTimer === 35) {
        this.setBanner("FIGHT!");
        this.sfx.round();
      }
      if (this.phaseTimer <= 0) {
        this.roundPhase = "FIGHT";
        this.setBanner("");
      }
    } else if (this.roundPhase === "FIGHT") {
      this.p1.handleInput(this.input, this.p2, this);
      if (this.mode === "P2") this.p2.handleInput(this.input, this.p1, this);
      else this.ai.update(this.p2, this.p1, this);
      if (this.timerFrames > 0) this.timerFrames--;

      if (this.p1.hp <= 0 || this.p2.hp <= 0 || this.timerFrames === 0) {
        this.roundPhase = "KO";
        this.phaseTimer = 135;
        if (this.p1.hp <= 0 && this.p2.hp <= 0)
          this.setBanner("DOUBLE K.O.!", "", true);
        else if (
          this.p2.hp <= 0 ||
          (this.timerFrames === 0 && this.p1.hp > this.p2.hp)
        ) {
          this.p1Wins++;
          this.p1.state = "win";
          if (this.p2.hp <= 0) this.p2.state = "ko";
          this.setBanner(this.p2.hp <= 0 ? "K.O.!" : "TIME OVER", "", true);
        } else {
          this.p2Wins++;
          this.p2.state = "win";
          if (this.p1.hp <= 0) this.p1.state = "ko";
          this.setBanner(this.p1.hp <= 0 ? "K.O.!" : "TIME OVER", "", true);
        }
      }
    } else if (this.roundPhase === "KO") {
      if (--this.phaseTimer <= 0) {
        if (this.p1Wins >= 2 || this.p2Wins >= 2) {
          this.roundPhase = "MATCH_OVER";
          this.setBanner(
            `${this.p1Wins >= 2 ? this.p1.name : this.p2.name} WINS!`,
            'Click "New Match" to Play Again',
          );
        } else {
          this.round++;
          this.startRound();
        }
      }
    }

    this.p1.updatePhysics(this.p2, this);
    this.p2.updatePhysics(this.p1, this);

    if (this.roundPhase === "FIGHT") {
      const h1 = this.p1.getActiveHitbox();
      if (
        h1 &&
        !this.p1.hitConnected &&
        this.rectsOverlap(h1, this.p2.getHurtbox())
      ) {
        this.p1.hitConnected = true;
        this.p2.receiveHit(this.p1, this.p1.currentAttack, this);
      }
      const h2 = this.p2.getActiveHitbox();
      if (
        h2 &&
        !this.p2.hitConnected &&
        this.rectsOverlap(h2, this.p1.getHurtbox())
      ) {
        this.p2.hitConnected = true;
        this.p1.receiveHit(this.p2, this.p2.currentAttack, this);
      }
    }

    const midX = (this.p1.x + this.p2.x) * 0.5,
      dist = Math.abs(this.p1.x - this.p2.x);
    const targetZ =
      this.roundPhase === "KO"
        ? 4.4
        : THREE.MathUtils.clamp(3.9 + dist * 0.52, 4.7, 7.8);
    const targetY =
      this.roundPhase === "KO" ? 1.45 : 1.72 + (this.p1.y + this.p2.y) * 0.25;
    this.camera.position.x =
      THREE.MathUtils.lerp(this.camera.position.x, midX, 0.1) +
      (Math.random() - 0.5) * this.camShake;
    this.camera.position.y =
      THREE.MathUtils.lerp(this.camera.position.y, targetY, 0.1) +
      (Math.random() - 0.5) * this.camShake;
    this.camera.position.z = THREE.MathUtils.lerp(
      this.camera.position.z,
      targetZ,
      0.08,
    );
    this.camera.lookAt(midX, 1.08 + (this.p1.y + this.p2.y) * 0.2, 0);

    this.syncHUD();
    this.input.endFrame();
  }

  syncHUD() {
    const p1Pct = `${(this.p1.hp / this.p1.maxHp) * 100}%`,
      p2Pct = `${(this.p2.hp / this.p2.maxHp) * 100}%`;
    const f1 = document.getElementById("p1HpFill"),
      f2 = document.getElementById("p2HpFill");
    f1.style.width = p1Pct;
    document.getElementById("p1HpLag").style.width = p1Pct;
    f2.style.width = p2Pct;
    document.getElementById("p2HpLag").style.width = p2Pct;
    f1.className = this.p1.isEnraged ? "hp-fill raged" : "hp-fill";
    f2.className = this.p2.isEnraged ? "hp-fill raged" : "hp-fill";
    document.getElementById("p1Pwr").style.width =
      `${(this.p1.power / this.p1.maxPower) * 100}%`;
    document.getElementById("p2Pwr").style.width =
      `${(this.p2.power / this.p2.maxPower) * 100}%`;
    document.getElementById("p1Name").innerHTML =
      this.p1.name +
      (this.p1.isEnraged ? '<span class="rage-badge">DEVIL RAGE</span>' : "");
    document.getElementById("p2Name").innerHTML =
      (this.p2.isEnraged ? '<span class="rage-badge">DEVIL RAGE </span>' : "") +
      this.p2.name +
      (this.mode === "AI" ? " (CPU)" : "");
    document.getElementById("p1Orb0").className =
      this.p1Wins >= 1 ? "orb won" : "orb";
    document.getElementById("p1Orb1").className =
      this.p1Wins >= 2 ? "orb won" : "orb";
    document.getElementById("p2Orb0").className =
      this.p2Wins >= 1 ? "orb won" : "orb";
    document.getElementById("p2Orb1").className =
      this.p2Wins >= 2 ? "orb won" : "orb";
    document.getElementById("timerVal").textContent = String(
      Math.ceil(this.timerFrames / 60),
    ).padStart(2, "0");
    document.getElementById("roundLbl").textContent = `ROUND ${this.round}`;
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.acc += dt;
    while (this.acc >= 1 / 60) {
      this.step();
      this.acc -= 1 / 60;
    }
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  }
}

const game = new GameEngine3D();
const unlock = () => game.sfx.init();
window.addEventListener("keydown", unlock, { once: true });
window.addEventListener("mousedown", unlock, { once: true });

const btnVsAi = document.getElementById("btnVsAi"),
  btnVsP2 = document.getElementById("btnVsP2");
btnVsAi.onclick = () => {
  game.mode = "AI";
  btnVsAi.classList.add("active");
  btnVsP2.classList.remove("active");
  game.initMatch();
};
btnVsP2.onclick = () => {
  game.mode = "P2";
  btnVsP2.classList.add("active");
  btnVsAi.classList.remove("active");
  game.initMatch();
};
document.getElementById("btnFlip1").onclick = () => game.p1.flipFacing();
document.getElementById("btnFlip2").onclick = () => game.p2.flipFacing();
document.getElementById("btnSound").onclick = (e) => {
  game.sfx.init();
  game.sfx.enabled = !game.sfx.enabled;
  e.target.textContent = `Sound: ${game.sfx.enabled ? "ON" : "OFF"}`;
};
document.getElementById("btnRestart").onclick = () => {
  game.sfx.init();
  game.initMatch();
};
