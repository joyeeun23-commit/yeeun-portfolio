export function initHero() {
  document.documentElement.classList.add("model-loading");

  const hero = document.querySelector(".hero");
  const canvas = document.getElementById("marionette-canvas");
  const status = document.getElementById("model-status");
  window.heroCloneState = {
    modelReady: false,
    loadError: null,
    frameCount: 0,
    modelChildren: 0,
  };

  if (location.protocol === "file:") {
    document.documentElement.classList.add("file-open", "model-error");
    status.textContent = "Open through local server";
    window.heroCloneState.loadError = "File URL blocks GLB loading";
    return;
  }

  if (!window.THREE || !THREE.GLTFLoader) {
    status.textContent = "3D library unavailable";
    window.heroCloneState.loadError = "3D library unavailable";
    document.documentElement.classList.add("model-error");
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch (error) {
    status.textContent = "3D renderer unavailable";
    window.heroCloneState.loadError = "WebGL unavailable";
    document.documentElement.classList.add("model-error");
    return;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.46;

  camera.position.set(0, 0.15, 7.4);

  const marionette = new THREE.Group();
  const modelPivot = new THREE.Group();
  const chainExtension = new THREE.Group();
  const modelInner = new THREE.Group();
  modelInner.add(chainExtension);
  modelPivot.add(modelInner);
  marionette.add(modelPivot);
  scene.add(marionette);

  const ambient = new THREE.HemisphereLight(0x9deeff, 0x020408, 1.58);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xe9fbff, 3.1);
  key.position.set(3.2, 4.8, 4);
  scene.add(key);

  const blueRim = new THREE.PointLight(0x2388ff, 18, 17);
  blueRim.position.set(-2.9, 0.68, 3.1);
  scene.add(blueRim);

  const cyanWash = new THREE.PointLight(0x59f3ff, 13, 15);
  cyanWash.position.set(-0.9, 2.2, 3.8);
  scene.add(cyanWash);

  const violetBounce = new THREE.PointLight(0x7e5cff, 5.5, 11);
  violetBounce.position.set(2.8, -1.25, 2.6);
  scene.add(violetBounce);

  const whiteRim = new THREE.PointLight(0xffffff, 4.8, 12);
  whiteRim.position.set(3, 1.4, 2.8);
  scene.add(whiteRim);

  if (THREE.RoomEnvironment && THREE.PMREMGenerator) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  }

  const pointer = { x: 0, y: 0 };
  const targetPointer = { x: 0, y: 0 };
  const basePosition = new THREE.Vector3();
  const chainAnchor = new THREE.Vector3();
  const chainLinks = [];
  const fixedChainCutY = 0.305;
  let hoverTimer = 0;
  let modelReady = false;

  const loader = new THREE.GLTFLoader();
  loader.load(
    "./images/marionette.glb",
    (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const maxAxis = Math.max(size.x, size.y, size.z) || 1;
      const scale = 3.1 / maxAxis;

      model.position.set(-center.x, -box.max.y - 0.88, -center.z);
      model.scale.setScalar(scale);
      model.rotation.set(0.04, -0.22, -0.02);

      model.traverse((child) => {
        if (!child.isMesh) {
          return;
        }

        child.castShadow = true;
        child.frustumCulled = false;

        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];

          for (const material of materials) {
            if (!material) {
              continue;
            }

            if (material.color) {
              material.color.lerp(new THREE.Color(0xcaf4ff), 0.16);
            }

            if ("emissive" in material && material.emissive) {
              material.emissive.setHex(0x062b66);
              material.emissiveIntensity = 0.075;
            }

            if ("metalness" in material) {
              material.metalness = Math.max(material.metalness || 0, 0.58);
            }

            if ("roughness" in material) {
              material.roughness = Math.min(material.roughness || 0.36, 0.28);
            }

            material.envMapIntensity = 1.85;
            material.needsUpdate = true;
          }
        }
      });

      modelInner.add(model);
      modelInner.updateWorldMatrix(true, true);
      buildChainExtension(findTopAnchor(model));
      modelReady = true;
      window.heroCloneState.modelReady = true;
      window.heroCloneState.modelChildren = modelInner.children.length;
      status.textContent = "Model loaded";
      status.classList.add("is-hidden");
      document.documentElement.classList.remove("model-loading", "model-error");
      document.documentElement.classList.add("model-ready");
      placeModel();

      if (gltf.animations && gltf.animations.length) {
        const mixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
        animate.mixers.push(mixer);
      }
    },
    (event) => {
      if (!event.total) {
        return;
      }
      const progress = Math.round((event.loaded / event.total) * 100);
      status.textContent = "Loading model " + progress + "%";
    },
    () => {
      status.textContent = "Model failed to load";
      window.heroCloneState.loadError = "Model failed to load";
      document.documentElement.classList.add("model-error");
    }
  );

  function placeModel() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / Math.max(height, 1);
    const isMobile = width < 760;

    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);

    if (isMobile) {
      marionette.position.set(0.2, 2.92, 0);
      marionette.scale.setScalar(0.82);
    } else if (aspect < 1.1) {
      marionette.position.set(0.25, 3.03, 0);
      marionette.scale.setScalar(1.16);
    } else if (aspect > 1.55) {
      marionette.position.set(0.32, 2.66, 0);
      marionette.scale.setScalar(1.36);
    } else {
      marionette.position.set(0.22, 2.56, 0);
      marionette.scale.setScalar(1.2);
    }

    basePosition.copy(marionette.position);

    if (!modelReady) {
      renderer.render(scene, camera);
    }
  }

  window.addEventListener("resize", placeModel);
  window.addEventListener("pointermove", (event) => {
    const x = event.clientX / Math.max(window.innerWidth, 1);
    const y = event.clientY / Math.max(window.innerHeight, 1);
    targetPointer.x = (x - 0.5) * 2;
    targetPointer.y = (y - 0.5) * 2;

    if (hero) {
      hero.style.setProperty("--mx", Math.round(x * 100) + "%");
      hero.style.setProperty("--my", Math.round(y * 100) + "%");
      hero.classList.add("is-hovering");
      window.clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => hero.classList.remove("is-hovering"), 1300);
    }
  });

  const clock = new THREE.Clock();
  animate.mixers = [];
  placeModel();
  animate();

  function animate() {
    const delta = clock.getDelta();
    const elapsed = clock.elapsedTime;

    for (const mixer of animate.mixers) {
      mixer.update(delta);
    }

    pointer.x += (targetPointer.x - pointer.x) * 0.045;
    pointer.y += (targetPointer.y - pointer.y) * 0.045;

    const swing = Math.sin(elapsed * 1.34);
    const counterSwing = Math.sin(elapsed * 0.82 + 0.8);
    const depthSwing = Math.sin(elapsed * 1.05 + 1.4);

    marionette.rotation.z = swing * 0.22 + pointer.x * 0.075;
    marionette.rotation.y = -0.12 + counterSwing * 0.38 + pointer.x * 0.46;
    marionette.rotation.x = depthSwing * 0.17 - pointer.y * 0.24;
    marionette.position.x = basePosition.x + swing * 0.1 + pointer.x * 0.08;
    marionette.position.y = basePosition.y + Math.cos(elapsed * 1.2) * 0.05 - Math.abs(swing) * 0.035;
    marionette.position.z = depthSwing * 0.22;
    modelPivot.rotation.z = Math.sin(elapsed * 2.05) * 0.055;
    modelPivot.rotation.y = Math.sin(elapsed * 0.92 + 0.5) * 0.055;
    modelInner.rotation.y = Math.sin(elapsed * 1.65) * 0.16 + pointer.x * 0.18;
    modelInner.rotation.x = Math.sin(elapsed * 1.9) * 0.045 - pointer.y * 0.08;
    animateChain(elapsed, swing, depthSwing);

    blueRim.intensity = 14.5 + Math.sin(elapsed * 3.4) * 3.3;
    blueRim.position.x = -2.85 + pointer.x * 0.7 + Math.sin(elapsed * 0.8) * 0.18;
    blueRim.position.y = 0.68 + Math.cos(elapsed * 1.1) * 0.16;
    cyanWash.intensity = 10.5 + Math.sin(elapsed * 2.1 + 0.7) * 2.4;
    violetBounce.intensity = 4.2 + Math.cos(elapsed * 2.8) * 1.3;
    renderer.render(scene, camera);
    window.heroCloneState.frameCount += 1;
    requestAnimationFrame(animate);
  }

  function buildChainExtension(anchor) {
    chainExtension.clear();
    chainLinks.length = 0;
    chainAnchor.copy(anchor);

    const linkMaterial = new THREE.MeshStandardMaterial({
      color: 0xf1f6ff,
      metalness: 0.64,
      roughness: 0.23,
      transparent: true,
      opacity: 1,
      envMapIntensity: 1.18,
    });
    const linkGeometry = new THREE.TorusGeometry(0.062, 0.016, 14, 28);
    const linkCount = 14;

    for (let index = 0; index < linkCount; index += 1) {
      const material = linkMaterial.clone();
      const topFade = index > linkCount - 5 ? Math.max(0, (linkCount - index - 1) / 4) : 1;
      material.opacity = Math.min(0.78, topFade);
      material.depthWrite = topFade > 0.65;

      const link = new THREE.Mesh(linkGeometry, material);
      link.userData.index = index;
      link.userData.count = linkCount;
      link.userData.fade = topFade;
      link.scale.set(0.72, 1.18, 1);
      link.castShadow = true;
      chainExtension.add(link);
      chainLinks.push(link);
    }

    animateChain(0, 0, 0);
  }

  function animateChain(elapsed, swing, depthSwing) {
    if (!chainLinks.length) {
      return;
    }

    chainExtension.rotation.x = Math.sin(elapsed * 0.74 + 1.1) * 0.035 - pointer.y * 0.018;
    chainExtension.rotation.y = Math.sin(elapsed * 0.62 + 0.4) * 0.075 + pointer.x * 0.035;
    chainExtension.rotation.z = -modelPivot.rotation.z * 0.12;

    for (const link of chainLinks) {
      const index = link.userData.index;
      const count = link.userData.count;
      const t = index / Math.max(count - 1, 1);
      const curve = Math.sin(t * Math.PI);
      const drift = Math.sin(elapsed * 0.78 + t * 2.8);
      const counterDrift = Math.cos(elapsed * 0.64 + t * 3.4);
      const sideBend = curve * (0.035 + Math.abs(swing) * 0.014) + drift * 0.006 * t;
      const depthBend = curve * Math.sin(depthSwing + t * 1.7) * 0.028 + counterDrift * 0.008 * t;

      link.position.set(
        chainAnchor.x + sideBend,
        chainAnchor.y + 0.082 + index * 0.112 - curve * 0.008,
        chainAnchor.z + depthBend
      );

      link.rotation.set(
        Math.PI / 2 + depthBend * 0.8 + Math.sin(elapsed * 0.9 + t * 3) * 0.025,
        (index % 2 ? Math.PI / 2 : 0) + sideBend * 1.1 + Math.sin(elapsed * 1.05 + index) * 0.02,
        swing * 0.055 * (1 - t * 0.25) + curve * 0.04 + pointer.x * 0.015
      );

      link.visible = link.userData.fade > 0.03;
      link.material.opacity = Math.min(0.92, link.userData.fade);
    }
  }

  function removeFixedChain(root) {
    root.traverse((child) => {
      if (!child.isMesh || !child.geometry || !child.geometry.attributes.position) {
        return;
      }

      const geometry = child.geometry;
      const position = geometry.attributes.position;
      const sourceIndex = geometry.index;

      if (sourceIndex) {
        const keptIndices = [];

        for (let triangleStart = 0; triangleStart < sourceIndex.count; triangleStart += 3) {
          const firstIndex = sourceIndex.getX(triangleStart);
          const secondIndex = sourceIndex.getX(triangleStart + 1);
          const thirdIndex = sourceIndex.getX(triangleStart + 2);

          if (
            position.getY(firstIndex) < fixedChainCutY &&
            position.getY(secondIndex) < fixedChainCutY &&
            position.getY(thirdIndex) < fixedChainCutY
          ) {
            keptIndices.push(firstIndex, secondIndex, thirdIndex);
          }
        }

        geometry.setIndex(keptIndices);
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
      }
    });
  }

  function findChainSocket(root) {
    const rawPoint = new THREE.Vector3();
    const localPoint = new THREE.Vector3();
    const inverseModelInner = new THREE.Matrix4().copy(modelInner.matrixWorld).invert();
    const socketSamples = [];

    root.updateWorldMatrix(true, true);

    root.traverse((child) => {
      if (!child.isMesh || !child.geometry || !child.geometry.attributes.position) {
        return;
      }

      const positions = child.geometry.attributes.position;

      for (let index = 0; index < positions.count; index += 1) {
        rawPoint.fromBufferAttribute(positions, index);

        if (
          rawPoint.y > fixedChainCutY - 0.045 &&
          rawPoint.y < fixedChainCutY + 0.015 &&
          rawPoint.x < -0.02 &&
          rawPoint.z < -0.1
        ) {
          socketSamples.push(rawPoint.clone().applyMatrix4(child.matrixWorld).applyMatrix4(inverseModelInner));
        }
      }
    });

    if (!socketSamples.length) {
      return new THREE.Vector3(0, -0.86, 0);
    }

    for (const point of socketSamples) {
      localPoint.x += point.x;
      localPoint.y += point.y;
      localPoint.z += point.z;
    }

    localPoint.x /= socketSamples.length;
    localPoint.y /= socketSamples.length;
    localPoint.z /= socketSamples.length;
    return localPoint;
  }

  function findTopAnchor(root) {
    const sample = new THREE.Vector3();
    const localPoint = new THREE.Vector3();
    const inverseModelInner = new THREE.Matrix4().copy(modelInner.matrixWorld).invert();
    const topSamples = [];
    let highestY = -Infinity;

    root.updateWorldMatrix(true, true);

    root.traverse((child) => {
      if (!child.isMesh || !child.geometry || !child.geometry.attributes.position) {
        return;
      }

      const positions = child.geometry.attributes.position;

      for (let index = 0; index < positions.count; index += 1) {
        sample.fromBufferAttribute(positions, index).applyMatrix4(child.matrixWorld).applyMatrix4(inverseModelInner);

        if (sample.y > highestY + 0.025) {
          highestY = sample.y;
          topSamples.length = 0;
        }

        if (sample.y >= highestY - 0.025) {
          topSamples.push(sample.clone());
        }
      }
    });

    if (!topSamples.length) {
      return new THREE.Vector3(0, -0.86, 0);
    }

    localPoint.set(0, highestY, 0);
    for (const point of topSamples) {
      localPoint.x += point.x;
      localPoint.z += point.z;
    }

    localPoint.x /= topSamples.length;
    localPoint.z /= topSamples.length;
    return localPoint;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHero);
} else {
  initHero();
}
