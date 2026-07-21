export function initWorks() {
  function setupWorksPreview() {
    const worksItems = Array.from(document.querySelectorAll(".works-item[data-preview]"));
    const worksList = document.querySelector(".works-list");
    const frontPreview = document.querySelector('[data-preview-slot="primary"]');
    const middlePreview = document.querySelector('[data-preview-slot="secondary"]');
    const previewSlots = Array.from(document.querySelectorAll("[data-preview-slot]"));
    const worksSection = document.querySelector(".works-section");
    const worksStage = document.querySelector(".works-stage");
    const initialItem = worksItems.find((item) => item.classList.contains("is-featured")) || worksItems[0];
    const initialPreview = initialItem ? initialItem.getAttribute("data-preview") : "";
    let activeWorksItem = null;
    let syncedWorksIndex = -1;

    if (!worksItems.length || !frontPreview) {
      return;
    }

    function activateWorksItem(item, itemIndex, syncScene = true) {
      if (activeWorksItem === item) {
        const repeatedPreviewSource = item.getAttribute("data-preview");
        if (syncScene && syncedWorksIndex !== itemIndex && window.worksSceneState && repeatedPreviewSource) {
          syncedWorksIndex = itemIndex;
          window.worksSceneState.setPreview(repeatedPreviewSource, itemIndex);
        }
        return;
      }

      activeWorksItem = item;
      worksItems.forEach((currentItem) => currentItem.classList.remove("is-hovered"));
      item.classList.add("is-hovered");

      const previewSource = item.getAttribute("data-preview");
      if (previewSource) {
        previewSlots.forEach((slot) => {
          slot.src = previewSource;
        });
      }

      worksSection?.style.setProperty("--works-hover-index", String(itemIndex));
      worksStage?.classList.remove("is-preview-pulse");
      window.requestAnimationFrame(() => worksStage?.classList.add("is-preview-pulse"));

      if (syncScene && window.worksSceneState && previewSource) {
        syncedWorksIndex = itemIndex;
        window.worksSceneState.setPreview(previewSource, itemIndex);
      }
    }

    worksItems.forEach((item, itemIndex) => {
      item.setAttribute("tabindex", "0");
      item.setAttribute("role", "button");
      item.addEventListener("pointerenter", () => activateWorksItem(item, itemIndex));
      item.addEventListener("focus", () => activateWorksItem(item, itemIndex));
      item.addEventListener("click", () => activateWorksItem(item, itemIndex));
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activateWorksItem(item, itemIndex);
        }
      });
    });

    document.addEventListener(
      "pointermove",
      (event) => {
        const matchingIndex = worksItems.findIndex((item) => {
          const rect = item.getBoundingClientRect();
          return (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
          );
        });

        if (matchingIndex >= 0) {
          activateWorksItem(worksItems[matchingIndex], matchingIndex);
        }
      },
      { passive: true }
    );

    if (initialItem && initialPreview) {
      activateWorksItem(initialItem, worksItems.indexOf(initialItem), false);
    }

    if (worksList && initialItem) {
      worksList.addEventListener("pointerleave", () => {
        const hoveredItem = activeWorksItem || initialItem;
        hoveredItem.classList.add("is-hovered");
      });
    }
  }

  function setupWorksSectionMotion() {
    const worksSection = document.querySelector(".works-section");

    if (!worksSection) {
      return;
    }

    function updateWorksVisibility() {
      const rect = worksSection.getBoundingClientRect();
      const viewportHeight = Math.max(window.innerHeight, 1);
      const entryProgress = Math.min(1, Math.max(0, (viewportHeight - rect.top) / (viewportHeight * 0.82)));
      const listShift = 86 - (1 - Math.pow(1 - entryProgress, 3)) * 86;

      worksSection.classList.toggle("is-visible", rect.top < viewportHeight * 0.92 && rect.bottom > viewportHeight * 0.08);
      worksSection.style.setProperty("--works-entry", entryProgress.toFixed(3));
      worksSection.style.setProperty("--works-list-shift", listShift.toFixed(1) + "px");
    }

    updateWorksVisibility();
    window.addEventListener("scroll", updateWorksVisibility, { passive: true });
    window.addEventListener("resize", updateWorksVisibility);
  }
  function setupWorksScene() {
    const worksSection = document.querySelector(".works-section");
    const worksCanvas = document.getElementById("works-canvas");

    if (document.querySelector(".works-orbit")) {
      return;
    }

    if (!worksSection || !worksCanvas || !window.THREE) {
      return;
    }

    let worksRenderer;

    try {
      worksRenderer = new THREE.WebGLRenderer({
        canvas: worksCanvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch (error) {
      return;
    }

    worksRenderer.setClearColor(0x000000, 0);
    worksRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    worksRenderer.outputEncoding = THREE.sRGBEncoding;
    worksRenderer.sortObjects = true;

    const worksScene = new THREE.Scene();
    const worksCamera = new THREE.PerspectiveCamera(32, 1, 0.1, 70);
    worksCamera.position.set(0, 0.04, 8.45);

    const worksRoot = new THREE.Group();
    worksRoot.position.set(0, 0.12, 0);
    worksScene.add(worksRoot);

    const textureLoader = new THREE.TextureLoader();
    const panelWidth = 2.42;
    const panelHeight = panelWidth * (298 / 430);
    const widePanelGeometry = new THREE.PlaneGeometry(panelWidth, panelHeight);
    const tallPanelGeometry = widePanelGeometry;
    const slimPanelGeometry = widePanelGeometry;
    const wideEdgeGeometry = new THREE.EdgesGeometry(widePanelGeometry);
    const tallEdgeGeometry = new THREE.EdgesGeometry(tallPanelGeometry);
    const slimEdgeGeometry = new THREE.EdgesGeometry(slimPanelGeometry);
    const createdPanels = [];
    const workPanelByIndex = new Map();
    const textureCache = new Map();

    const panelConfigs = [
      {
        source: "./images/project_images/wayer/banner.webp",
        workIndex: 6,
        x: -1.82,
        y: 0.32,
        z: -0.38,
        rotationY: 1.08,
        opacity: 0.62,
        scale: 0.9,
        kind: "wide",
      },
      {
        x: -2.22,
        y: -0.1,
        z: -0.52,
        rotationY: 1.22,
        opacity: 0.18,
        scale: 0.86,
        kind: "wide",
        glassOnly: true,
      },
      {
        source: "./images/project_images/daydream/banner.webp",
        workIndex: 5,
        x: -1.34,
        y: -0.36,
        z: 0.26,
        rotationY: 0.78,
        opacity: 0.84,
        scale: 0.92,
        kind: "wide",
        secondary: true,
      },
      {
        source: "./images/project_images/aughtsspective/banner.webp",
        workIndex: 0,
        x: -0.86,
        y: 0.42,
        z: 0.18,
        rotationY: 0.44,
        opacity: 0.58,
        scale: 0.86,
        kind: "wide",
      },
      {
        source: "./images/project_images/loben/thumb.webp",
        workIndex: 2,
        x: -0.48,
        y: -0.14,
        z: 0.5,
        rotationY: 0.18,
        opacity: 0.7,
        scale: 0.88,
        kind: "wide",
      },
      {
        source: "./images/project_images/36daysoftype/banner.webp",
        workIndex: 4,
        x: -0.12,
        y: -0.18,
        z: 0.62,
        rotationY: 0.02,
        opacity: 0.78,
        scale: 0.86,
        kind: "wide",
        featured: true,
      },
      {
        x: 0.06,
        y: 0.02,
        z: 0.68,
        rotationY: -0.04,
        opacity: 0.24,
        scale: 0.92,
        kind: "wide",
        glassOnly: true,
      },
      {
        source: "./images/project_images/36daysoftype/banner.webp",
        workIndex: 4,
        x: 0.76,
        y: -0.12,
        z: 0.5,
        rotationY: -0.58,
        opacity: 0.88,
        scale: 0.94,
        kind: "wide",
        primary: true,
        featured: true,
      },
      {
        source: "./images/project_images/orith/banner.webp",
        workIndex: 3,
        x: 1.16,
        y: 0.28,
        z: 0.18,
        rotationY: -0.82,
        opacity: 0.62,
        scale: 0.88,
        kind: "wide",
      },
      {
        source: "./images/project_images/pneuma/banner.webp",
        workIndex: 9,
        x: 1.46,
        y: -0.22,
        z: 0,
        rotationY: -1,
        opacity: 0.58,
        scale: 0.84,
        kind: "wide",
      },
      {
        source: "./images/project_images/posterfolio/banner.webp",
        workIndex: 1,
        x: 1.74,
        y: 0.22,
        z: -0.24,
        rotationY: -1.14,
        opacity: 0.52,
        scale: 0.86,
        kind: "wide",
      },
      {
        source: "./images/project_images/amca/banner.webp",
        workIndex: 8,
        x: 2.08,
        y: 0.02,
        z: -0.5,
        rotationY: -1.26,
        opacity: 0.42,
        scale: 0.9,
        kind: "wide",
      },
      {
        x: 2.28,
        y: -0.02,
        z: -0.52,
        rotationY: -1.3,
        opacity: 0.18,
        scale: 0.84,
        kind: "wide",
        glassOnly: true,
      },
      {
        source: "./images/project_images/daydream_web/banner.webp",
        workIndex: 10,
        x: 0.22,
        y: 0.28,
        z: -0.38,
        rotationY: -0.1,
        opacity: 0.3,
        scale: 0.78,
        kind: "wide",
      },
      {
        source: "./images/project_images/ikon_web/banner.webp",
        workIndex: 11,
        x: 0.36,
        y: -0.06,
        z: -0.54,
        rotationY: -0.02,
        opacity: 0.28,
        scale: 0.74,
        kind: "wide",
      },
      {
        x: 0,
        y: 0,
        z: 0.74,
        rotationY: 0,
        opacity: 0.22,
        scale: 1.16,
        kind: "slim",
        glassOnly: true,
      },
    ];

    for (const config of panelConfigs) {
      const panelGroup = new THREE.Group();
      const isTall = config.kind === "tall";
      const isSlim = config.kind === "slim";
      const geometry = isSlim ? slimPanelGeometry : isTall ? tallPanelGeometry : widePanelGeometry;
      const outlineGeometry = isSlim ? slimEdgeGeometry : isTall ? tallEdgeGeometry : wideEdgeGeometry;
      const panelMaterials = [];

      const glassMaterial = new THREE.MeshBasicMaterial({
        color: config.glassOnly ? 0xf5f6f1 : 0xeff4f6,
        transparent: true,
        opacity: config.glassOnly ? config.opacity : 0.13,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      glassMaterial.userData.baseOpacity = config.glassOnly ? config.opacity : 0.13;
      const glassMesh = new THREE.Mesh(geometry, glassMaterial);
      glassMesh.position.z = -0.012;
      panelGroup.add(glassMesh);
      panelMaterials.push(glassMaterial);

      if (config.source) {
        const texture = textureLoader.load(config.source, (loadedTexture) => {
          loadedTexture.encoding = THREE.sRGBEncoding;
          loadedTexture.needsUpdate = true;
        });
        texture.encoding = THREE.sRGBEncoding;

        const panelMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          color: config.primary ? 0xf4f4f1 : 0xffffff,
          transparent: true,
          opacity: config.opacity,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        panelMaterial.userData.baseOpacity = config.opacity;

        const panelMesh = new THREE.Mesh(geometry, panelMaterial);
        panelMesh.position.z = 0.004;
        panelGroup.add(panelMesh);
        panelMaterials.push(panelMaterial);
      }

      const shineMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: config.primary || config.featured ? 0.13 : 0.055,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      shineMaterial.userData.baseOpacity = config.primary || config.featured ? 0.13 : 0.055;
      const shineMesh = new THREE.Mesh(geometry, shineMaterial);
      shineMesh.position.z = 0.011;
      panelGroup.add(shineMesh);
      panelMaterials.push(shineMaterial);

      const panelOutline = new THREE.LineSegments(
        outlineGeometry,
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: config.primary || config.featured ? 0.46 : 0.18,
          depthWrite: false,
        })
      );
      panelOutline.material.userData.baseOpacity = config.primary || config.featured ? 0.46 : 0.18;

      panelGroup.add(panelOutline);
      panelGroup.position.set(config.x || 0, config.y || 0, config.z || 0);
      panelGroup.rotation.set(0.02, config.rotationY || 0, config.rotationZ || 0);
      const uniformPanelScale = 0.92;
      panelGroup.scale.setScalar(uniformPanelScale);
      panelGroup.userData.baseX = config.x || 0;
      panelGroup.userData.baseY = config.y || 0;
      panelGroup.userData.baseZ = config.z || 0;
      panelGroup.userData.xOffset = config.xOffset || 0;
      panelGroup.userData.baseOpacity = config.opacity;
      panelGroup.userData.baseScale = uniformPanelScale;
      panelGroup.userData.baseRotationY = config.rotationY || 0;
      panelGroup.userData.baseRotationZ = config.rotationZ || (createdPanels.length % 2 ? -0.012 : 0.012);
      panelGroup.userData.phase = createdPanels.length * 0.56;
      panelGroup.userData.workIndex = Number.isInteger(config.workIndex) ? config.workIndex : -1;
      panelGroup.userData.spinFactor = config.spinFactor || 0.1;
      panelGroup.userData.primary = !!config.primary;
      panelGroup.userData.secondary = !!config.secondary;
      panelGroup.userData.featured = !!config.featured;
      panelGroup.userData.previewSlot = !!config.previewSlot;
      panelGroup.userData.slotOpacity = config.slotOpacity || config.opacity || 0.72;
      panelGroup.userData.materials = panelMaterials;
      panelGroup.userData.imageMaterial = panelMaterials.find((material) => material.map);
      panelGroup.userData.outlineMaterial = panelOutline.material;
      worksRoot.add(panelGroup);
      createdPanels.push(panelGroup);

      if (Number.isInteger(config.workIndex) && !workPanelByIndex.has(config.workIndex)) {
        workPanelByIndex.set(config.workIndex, panelGroup);
      }
    }

    const centerLineMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
    });
    const centerLine = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 3.24), centerLineMaterial);
    centerLine.position.set(0.12, -0.02, 0.38);
    worksRoot.add(centerLine);

    const pointerTarget = { x: 0, y: 0 };
    const pointerValue = { x: 0, y: 0 };
    const scrollSpin = { current: 0, target: 0 };
    let wheelSpin = 0;
    let previewSpinOffset = 0;
    let previewPulse = 0;
    let activePreviewIndex = 5;
    let debugState = {};
    const worksClock = new THREE.Clock();

    function loadWorkTexture(source, onTexture) {
      if (!source) {
        return;
      }

      const cachedTexture = textureCache.get(source);
      if (cachedTexture) {
        onTexture(cachedTexture);
        return;
      }

      textureLoader.load(source, (texture) => {
        texture.encoding = THREE.sRGBEncoding;
        texture.needsUpdate = true;
        textureCache.set(source, texture);
        onTexture(texture);
      });
    }

    window.worksSceneState = {
      setPreview(source, itemIndex = 0) {
        activePreviewIndex = Math.max(0, itemIndex);
        const previewPanels = createdPanels.filter((panelGroup) => panelGroup.userData.imageMaterial && panelGroup.userData.primary);

        previewSpinOffset = (activePreviewIndex - 5) * 0.028;
        previewPulse = 1;
        wheelSpin += 0.02;

        if (previewPanels.length) {
          loadWorkTexture(source, (texture) => {
            previewPanels.forEach((panelGroup) => {
              const imageMaterial = panelGroup.userData.imageMaterial;
              const baseOpacity = panelGroup.userData.primary ? 0.96 : 0.76;
              imageMaterial.map = texture;
              imageMaterial.userData.baseOpacity = baseOpacity;
              imageMaterial.opacity = baseOpacity;
              imageMaterial.needsUpdate = true;
            });
          });
        }
      },
      debug() {
        return debugState;
      },
    };

    const selectedItem = document.querySelector(".works-item.is-hovered[data-preview], .works-item.is-featured[data-preview]");
    if (selectedItem) {
      const selectedItems = Array.from(document.querySelectorAll(".works-item[data-preview]"));
      activePreviewIndex = Math.max(0, selectedItems.indexOf(selectedItem));
    }

    function resizeWorksScene() {
      const rect = worksCanvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      worksCamera.aspect = width / height;
      worksCamera.updateProjectionMatrix();
      worksRenderer.setSize(width, height, false);

      const viewportWidth = window.innerWidth;
      const scale = viewportWidth < 900 ? 0.78 : viewportWidth < 1200 ? 0.9 : 1;
      worksRoot.scale.setScalar(scale);
    }

    worksSection.addEventListener("pointermove", (event) => {
      const rect = worksSection.getBoundingClientRect();
      pointerTarget.x = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
      pointerTarget.y = ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
    });
    worksSection.addEventListener("pointerleave", () => {
      pointerTarget.x = 0;
      pointerTarget.y = 0;
    });
    window.addEventListener(
      "wheel",
      (event) => {
        const sectionRect = worksSection.getBoundingClientRect();
        const inView = sectionRect.top < window.innerHeight && sectionRect.bottom > 0;
        if (inView) {
          wheelSpin += event.deltaY * 0.00008;
        }
      },
      { passive: true }
    );

    window.addEventListener("resize", resizeWorksScene);
    resizeWorksScene();
    document.documentElement.classList.add("works-webgl-ready");

    function renderWorksScene() {
      const elapsed = worksClock.elapsedTime;
      pointerValue.x += (pointerTarget.x - pointerValue.x) * 0.045;
      pointerValue.y += (pointerTarget.y - pointerValue.y) * 0.045;

      const sectionRect = worksSection.getBoundingClientRect();
      const viewportHeight = Math.max(window.innerHeight, 1);
      const sectionProgress = Math.min(1, Math.max(0, (viewportHeight - sectionRect.top) / viewportHeight));
      const entryProgress = Math.min(1, Math.max(0, (viewportHeight - sectionRect.top) / (viewportHeight * 0.82)));
      const entryEase = 1 - Math.pow(1 - entryProgress, 3);
      const listShift = 86 - entryEase * 86;

      worksSection.classList.toggle("is-visible", entryProgress > 0.08);
      worksSection.style.setProperty("--works-entry", entryProgress.toFixed(3));
      worksSection.style.setProperty("--works-progress", sectionProgress.toFixed(3));
      worksSection.style.setProperty("--works-list-shift", listShift.toFixed(1) + "px");

      previewPulse *= 0.9;
      scrollSpin.target = wheelSpin + previewSpinOffset + entryEase * 0.025 + elapsed * 0.022;
      scrollSpin.current += (scrollSpin.target - scrollSpin.current) * 0.045;

      worksRoot.rotation.y = -0.02 + scrollSpin.current + pointerValue.x * 0.035;
      worksRoot.rotation.x = -0.08 + entryEase * 0.045 + pointerValue.y * 0.022;
      worksRoot.position.y = -0.1 + entryEase * 0.2 + Math.sin(elapsed * 0.42) * 0.026;
      worksRoot.position.z = -0.92 + entryEase * 0.88;

      for (const [panelIndex, panelGroup] of createdPanels.entries()) {
        const phase = panelGroup.userData.phase;
        const localTurn = scrollSpin.current * (0.025 + (panelIndex % 4) * 0.006);
        const facing = Math.abs(Math.cos(panelGroup.userData.baseRotationY + localTurn + worksRoot.rotation.y));
        const frontness = 0.28 + facing * 0.72;
        const sideFade = 0.44 + frontness * 0.62;
        const entryScale = 0.74 + entryEase * 0.26;
        const isActivePanel =
          panelGroup.userData.workIndex === activePreviewIndex || panelGroup.userData.primary || panelGroup.userData.secondary;
        const activeLift = isActivePanel ? previewPulse * 0.12 : 0;
        const centerPull = panelGroup.userData.primary || panelGroup.userData.secondary ? 0.02 : 0;

        panelGroup.position.set(
          panelGroup.userData.baseX + Math.sin(scrollSpin.current * 0.42 + phase) * 0.035 + pointerValue.x * panelGroup.userData.baseX * 0.018,
          panelGroup.userData.baseY + Math.sin(elapsed * 0.52 + phase) * 0.024 + (1 - entryEase) * 0.16,
          panelGroup.userData.baseZ + Math.cos(scrollSpin.current * 0.36 + phase) * 0.04 + activeLift + centerPull
        );
        panelGroup.rotation.set(
          0.02 + Math.sin(elapsed * 0.26 + phase) * 0.008,
          panelGroup.userData.baseRotationY + localTurn + pointerValue.x * 0.028,
          panelGroup.userData.baseRotationZ + Math.sin(elapsed * 0.22 + phase) * 0.007
        );
        panelGroup.scale.setScalar(panelGroup.userData.baseScale * entryScale * (1 + activeLift * 0.04));
        panelGroup.renderOrder = Math.round((panelGroup.userData.baseZ + frontness + activeLift + panelIndex * 0.002) * 100);

        for (const material of panelGroup.userData.materials) {
          const baseOpacity = material.userData.baseOpacity || 0.1;
          const activeOpacity = isActivePanel ? 0.08 * entryEase : 0;
          material.opacity = Math.min(0.98, baseOpacity * sideFade * entryEase + activeOpacity);
        }

        panelGroup.userData.outlineMaterial.opacity = Math.min(
          0.62,
          (panelGroup.userData.outlineMaterial.userData.baseOpacity || 0.2) *
            (0.45 + frontness * 0.82 + (isActivePanel ? 0.38 : 0)) *
            entryEase
        );
      }

      centerLine.position.y = -0.02 + Math.sin(elapsed * 0.5) * 0.018;
      centerLine.rotation.y = -worksRoot.rotation.y * 0.35;
      centerLineMaterial.opacity = 0.42 * entryEase;
      debugState = {
        entry: Number(entryProgress.toFixed(3)),
        progress: Number(sectionProgress.toFixed(3)),
        spin: Number(scrollSpin.current.toFixed(3)),
        target: Number(scrollSpin.target.toFixed(3)),
        wheelSpin: Number(wheelSpin.toFixed(3)),
        activePreviewIndex,
      };

      worksRenderer.render(worksScene, worksCamera);
      requestAnimationFrame(renderWorksScene);
    }

    renderWorksScene();
  }
  setupWorksPreview();
  setupWorksSectionMotion();
  setupWorksScene();
}
