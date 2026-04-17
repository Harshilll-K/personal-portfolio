import * as THREE from 'three';

export function initHero3D() {
  const container = document.getElementById('hero-3d-canvas');
  if (!container) return;

  // Clear any existing content if re-initialized
  container.innerHTML = '';

  const scene = new THREE.Scene();
  
  // Camera setup
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.z = 40;

  // Renderer setup
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Group for everything
  const masterGroup = new THREE.Group();
  scene.add(masterGroup);

  // --- PARTICLE SPHERE (The 3D Model) ---
  const sphereGroup = new THREE.Group();
  masterGroup.add(sphereGroup);

  // Inner Solid Sphere (dark silhouette)
  const innerGeometry = new THREE.IcosahedronGeometry(7, 3);
  const innerMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x050505, 
    transparent: true,
    opacity: 0.8
  });
  const innerSphere = new THREE.Mesh(innerGeometry, innerMaterial);
  sphereGroup.add(innerSphere);

  // Outer Wireframe/Particle Sphere
  const outerGeometry = new THREE.IcosahedronGeometry(7.2, 5);
  const particleMaterial = new THREE.PointsMaterial({
    color: 0xff2a2a,
    size: 0.08,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });
  const particles = new THREE.Points(outerGeometry, particleMaterial);
  sphereGroup.add(particles);

  // Store reference to initial positions for sphere breathing
  const spherePositions = outerGeometry.attributes.position;
  const initialSpherePositions = [];
  for(let i = 0; i < spherePositions.count; i++) {
    initialSpherePositions.push(new THREE.Vector3().fromBufferAttribute(spherePositions, i));
  }

  // --- TOPOGRAPHY LINES ---
  const linesGroup = new THREE.Group();
  masterGroup.add(linesGroup);
  linesGroup.position.z = -5; // Move slightly behind the sphere

  const numLines = 70;
  const numPointsPerLine = 120;
  
  // Calculate frustum dimensions at Z=0 for the lines
  const vFov = camera.fov * Math.PI / 180;
  const height = 2 * Math.tan(vFov / 2) * camera.position.z + 20;
  const width = height * camera.aspect + 20;

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xff2a2a,
    transparent: true,
    opacity: 0.2, // More subtle for background lines
    linewidth: 1
  });

  const lines = [];
  for (let i = 0; i < numLines; i++) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(numPointsPerLine * 3);
    const xBase = (i / (numLines - 1)) * width - width / 2;

    for (let j = 0; j < numPointsPerLine; j++) {
      const yPos = -(j / (numPointsPerLine - 1)) * height + height / 2;
      positions[j * 3] = xBase;
      positions[j * 3 + 1] = yPos;
      positions[j * 3 + 2] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const line = new THREE.Line(geometry, lineMaterial);
    linesGroup.add(line);
    lines.push({ mesh: line, xBase: xBase });
  }

  // --- MOUSE & INTERACTION ---
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(-9999, -9999);
  
  const planeGeo = new THREE.PlaneGeometry(width * 2, height * 2);
  const invisiblePlane = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({visible: false}));
  scene.add(invisiblePlane);
  
  let intersectionPoint = new THREE.Vector3(0, 0, 0);
  let targetIntersection = new THREE.Vector3(0, 0, 0);

  document.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    mouseX = mouse.x;
    mouseY = mouse.y;
  });

  // Handle window resize
  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  // Animation Loop
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // 1. Interactive Topography Logic
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(invisiblePlane);
    if(intersects.length > 0) {
      targetIntersection.copy(intersects[0].point);
    } else {
      targetIntersection.set(999, 999, 0); 
    }
    intersectionPoint.lerp(targetIntersection, 0.1);

    lines.forEach((lineObj) => {
      const positions = lineObj.mesh.geometry.attributes.position.array;
      const xBase = lineObj.xBase;

      for (let j = 0; j < numPointsPerLine; j++) {
        const yPos = -(j / (numPointsPerLine - 1)) * height + height / 2;
        let noiseX = Math.sin(yPos * 0.2 + time * 0.4) * 2.0;
        noiseX += Math.cos(yPos * 0.1 - time * 0.2 + xBase * 0.05) * 1.5;
        
        const dx = xBase + noiseX - intersectionPoint.x;
        const dy = yPos - intersectionPoint.y;
        const distSq = dx * dx + dy * dy;
        const maxDist = 15;
        
        let mouseDisplacementX = 0;
        if (distSq < maxDist * maxDist) {
           const dist = Math.sqrt(distSq);
           const force = Math.pow(1 - (dist / maxDist), 2);
           mouseDisplacementX = (dx / (dist || 1)) * force * 5;
        }
        positions[j * 3] = xBase + noiseX + mouseDisplacementX;
      }
      lineObj.mesh.geometry.attributes.position.needsUpdate = true;
    });

    // 2. Sphere Breathing & Rotation
    sphereGroup.rotation.y += 0.002;
    sphereGroup.rotation.x += 0.001;

    const sphereAttr = outerGeometry.attributes.position;
    for (let i = 0; i < sphereAttr.count; i++) {
        const v = initialSpherePositions[i];
        const noise = Math.sin(v.x * 2 + time * 1.5) * 0.1 + 
                      Math.cos(v.y * 2 + time * 1.5) * 0.1;
        sphereAttr.setXYZ(i, v.x + v.x * noise, v.y + v.y * noise, v.z + v.z * noise);
    }
    sphereAttr.needsUpdate = true;

    // 3. Overall Parallax
    targetX = mouseX * 2;
    targetY = mouseY * 2;
    masterGroup.position.x += (targetX - masterGroup.position.x) * 0.05;
    masterGroup.position.y += (targetY - masterGroup.position.y) * 0.05;
    masterGroup.rotation.y = mouseX * 0.1;
    masterGroup.rotation.x = -mouseY * 0.1;

    renderer.render(scene, camera);
  }

  animate();
}
