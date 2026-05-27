/**
 * NEXORA AI - Main Entry Point
 * A futuristic cinematic AI SaaS experience
 */

import './styles/main.css';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  particles: {
    count: window.innerWidth < 768 ? 1500 : 6000,
    size: 0.015,
    speed: 0.0003
  },
  sphere: {
    radius: 2.4,
    segments: 18,
    pulseSpeed: 0.001,
    rotationSpeed: 0.0003
  },
  colors: {
    electric: 0x4F8EFF,
    neon: 0x8B5CF6,
    cyan: 0x06EAD8,
    bg: 0x050507
  }
};

// ============================================
// GLOBAL STATE
// ============================================
let scene, camera, renderer, composer;
let particles, sphere, sphereWireframe, sphereGlow;
let mouseX = 0, mouseY = 0;
let targetMouseX = 0, targetMouseY = 0;
let scrollProgress = 0;
let lenis;
let isLoaded = false;
let isMobile = window.innerWidth < 768;
let isTouch = 'ontouchstart' in window;

// ============================================
// PRELOADER
// ============================================
class Preloader {
  constructor() {
    this.el = document.getElementById('preloader');
    this.progressBar = this.el.querySelector('.preloader__progress-bar');
    this.percent = this.el.querySelector('.preloader__percent');
    this.logs = this.el.querySelectorAll('.preloader__log');
    this.progress = 0;
    this.targetProgress = 0;
  }

  async init() {
    // Animate logs sequentially
    const logDelays = [0, 400, 800, 1200];
    this.logs.forEach((log, i) => {
      setTimeout(() => log.classList.add('visible'), logDelays[i]);
    });

    // Simulate loading progress
    await this.simulateLoading();
    
    // Hide preloader
    await this.hide();
  }

  simulateLoading() {
    return new Promise(resolve => {
      const interval = setInterval(() => {
        this.targetProgress += Math.random() * 15;
        if (this.targetProgress >= 100) {
          this.targetProgress = 100;
          clearInterval(interval);
          setTimeout(resolve, 300);
        }
      }, 100);

      // Smooth progress animation
      const updateProgress = () => {
        this.progress += (this.targetProgress - this.progress) * 0.1;
        this.progressBar.style.width = `${this.progress}%`;
        this.percent.textContent = `${Math.round(this.progress)}%`;
        
        if (this.progress < 99.9) {
          requestAnimationFrame(updateProgress);
        }
      };
      updateProgress();
    });
  }

  hide() {
    return new Promise(resolve => {
      // Glitch effect
      this.el.style.animation = 'glitch 0.3s ease-in-out';
      
      setTimeout(() => {
        this.el.classList.add('hidden');
        isLoaded = true;
        document.body.style.overflow = '';
        resolve();
      }, 500);
    });
  }
}

// ============================================
// LENIS SMOOTH SCROLL
// ============================================
function initLenis() {
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    smoothTouch: false,
    touchMultiplier: 2
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);
}

// ============================================
// THREE.JS SCENE
// ============================================
function initThree() {
  const canvas = document.getElementById('webgl-canvas');
  
  // Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(CONFIG.colors.bg, 0.08);

  // Camera
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 5;

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(CONFIG.colors.bg, 1);

  // Create scene elements
  createParticles();
  createSphere();
  createLights();

  // Start animation loop
  animate();
}

// ============================================
// PARTICLES
// ============================================
function createParticles() {
  const count = CONFIG.particles.count;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  const colorElectric = new THREE.Color(CONFIG.colors.electric);
  const colorNeon = new THREE.Color(CONFIG.colors.neon);
  const colorCyan = new THREE.Color(CONFIG.colors.cyan);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    
    // Spherical distribution
    const radius = 3 + Math.random() * 7;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi);

    // Random color from palette
    const colorChoice = Math.random();
    let color;
    if (colorChoice < 0.33) color = colorElectric;
    else if (colorChoice < 0.66) color = colorNeon;
    else color = colorCyan;

    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;

    sizes[i] = Math.random() * 2 + 0.5;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  // Custom shader material
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uScrollProgress: { value: 0 }
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uScrollProgress;
      
      void main() {
        vColor = color;
        
        vec3 pos = position;
        
        // Animate based on scroll
        float scrollEffect = uScrollProgress * 2.0;
        pos.x += sin(uTime * 0.5 + position.y * 0.1) * 0.1 * (1.0 - scrollEffect);
        pos.y += cos(uTime * 0.3 + position.x * 0.1) * 0.1 * (1.0 - scrollEffect);
        
        // Converge towards center on scroll
        pos *= 1.0 - scrollEffect * 0.3;
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = size * uPixelRatio * (1.0 / -mvPosition.z) * 20.0;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        alpha *= 0.8;
        
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);
}

// ============================================
// NEURAL SPHERE
// ============================================
function createSphere() {
  // Main sphere with custom shader
  const sphereGeo = new THREE.IcosahedronGeometry(
    CONFIG.sphere.radius,
    CONFIG.sphere.segments
  );

  const sphereMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor1: { value: new THREE.Color(CONFIG.colors.electric) },
      uColor2: { value: new THREE.Color(CONFIG.colors.neon) },
      uColor3: { value: new THREE.Color(CONFIG.colors.cyan) }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;
      uniform float uTime;
      
      // Simplex noise function
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      
      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        
        i = mod289(i);
        vec4 p = permute(permute(permute(
          i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vUv = uv;
        
        vec3 pos = position;
        
        // Perlin noise deformation
        float noise = snoise(pos * 0.5 + uTime * 0.2) * 0.15;
        pos += normal * noise;
        
        // Breathing motion
        float breath = sin(uTime * 0.5) * 0.02;
        pos *= 1.0 + breath;
        
        vPosition = pos;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      
      void main() {
        // Fresnel effect
        vec3 viewDirection = normalize(cameraPosition - vPosition);
        float fresnel = pow(1.0 - dot(viewDirection, vNormal), 3.0);
        
        // Gradient based on position and time
        float gradient = sin(vPosition.y * 2.0 + uTime) * 0.5 + 0.5;
        vec3 color = mix(uColor1, uColor2, gradient);
        color = mix(color, uColor3, fresnel);
        
        // Add glow
        float glow = fresnel * 0.8;
        
        gl_FragColor = vec4(color, 0.3 + glow * 0.5);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  sphere = new THREE.Mesh(sphereGeo, sphereMat);
  scene.add(sphere);

  // Wireframe
  const wireframeMat = new THREE.MeshBasicMaterial({
    color: CONFIG.colors.cyan,
    wireframe: true,
    transparent: true,
    opacity: 0.15
  });
  sphereWireframe = new THREE.Mesh(
    new THREE.IcosahedronGeometry(CONFIG.sphere.radius * 1.02, CONFIG.sphere.segments),
    wireframeMat
  );
  scene.add(sphereWireframe);

  // Outer glow shell
  const glowMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(CONFIG.colors.cyan) }
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      uniform float uTime;
      uniform vec3 uColor;
      
      void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        float pulse = sin(uTime * 2.0) * 0.1 + 0.9;
        gl_FragColor = vec4(uColor, intensity * 0.3 * pulse);
      }
    `,
    transparent: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  sphereGlow = new THREE.Mesh(
    new THREE.IcosahedronGeometry(CONFIG.sphere.radius * 1.5, 16),
    glowMat
  );
  scene.add(sphereGlow);
}

// ============================================
// LIGHTS
// ============================================
function createLights() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambientLight);

  const pointLight1 = new THREE.PointLight(CONFIG.colors.cyan, 1, 20);
  pointLight1.position.set(5, 5, 5);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(CONFIG.colors.neon, 1, 20);
  pointLight2.position.set(-5, -5, 5);
  scene.add(pointLight2);
}

// ============================================
// ANIMATION LOOP
// ============================================
function animate() {
  requestAnimationFrame(animate);

  const time = performance.now() * 0.001;

  // Update mouse position with lerp
  mouseX += (targetMouseX - mouseX) * 0.05;
  mouseY += (targetMouseY - mouseY) * 0.05;

  // Update particles
  if (particles) {
    particles.rotation.y = time * CONFIG.particles.speed * 10;
    particles.rotation.x = time * CONFIG.particles.speed * 5;
    particles.material.uniforms.uTime.value = time;
    particles.material.uniforms.uScrollProgress.value = scrollProgress;
  }

  // Update sphere
  if (sphere) {
    sphere.rotation.y = time * CONFIG.sphere.rotationSpeed * 10;
    sphere.rotation.x = time * CONFIG.sphere.rotationSpeed * 5;
    sphere.material.uniforms.uTime.value = time;
    
    // Mouse parallax
    sphere.position.x = mouseX * 0.3;
    sphere.position.y = mouseY * 0.3;
  }

  if (sphereWireframe) {
    sphereWireframe.rotation.y = time * CONFIG.sphere.rotationSpeed * 12;
    sphereWireframe.rotation.x = time * CONFIG.sphere.rotationSpeed * 6;
    sphereWireframe.position.x = mouseX * 0.3;
    sphereWireframe.position.y = mouseY * 0.3;
  }

  if (sphereGlow) {
    sphereGlow.material.uniforms.uTime.value = time;
    sphereGlow.position.x = mouseX * 0.3;
    sphereGlow.position.y = mouseY * 0.3;
  }

  // Camera position based on scroll
  if (camera) {
    camera.position.z = 5 + scrollProgress * 2;
    camera.position.y = -scrollProgress * 0.5;
  }

  renderer.render(scene, camera);
}

// ============================================
// CURSOR
// ============================================
function initCursor() {
  if (isTouch) return;

  const cursor = document.getElementById('cursor');
  const cursorDot = cursor.querySelector('.cursor__dot');
  const cursorTrail = cursor.querySelector('.cursor__trail');
  
  let cursorX = 0, cursorY = 0;
  let trailX = 0, trailY = 0;

  document.addEventListener('mousemove', (e) => {
    targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
    targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    
    cursorX = e.clientX;
    cursorY = e.clientY;
  });

  // Magnetic effect for buttons and links
  const magneticElements = document.querySelectorAll('[data-magnetic]');
  
  magneticElements.forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
  });

  // Update cursor position
  function updateCursor() {
    cursorDot.style.transform = `translate(${cursorX}px, ${cursorY}px) translate(-50%, -50%)`;
    
    trailX += (cursorX - trailX) * 0.15;
    trailY += (cursorY - trailY) * 0.15;
    cursorTrail.style.transform = `translate(${trailX}px, ${trailY}px) translate(-50%, -50%)`;
    
    requestAnimationFrame(updateCursor);
  }
  updateCursor();
}

// ============================================
// TOUCH RIPPLE
// ============================================
function initTouchRipple() {
  if (!isTouch) return;

  const container = document.getElementById('touch-ripple-container');

  document.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const ripple = document.createElement('div');
    ripple.className = 'touch-ripple';
    ripple.style.left = `${touch.clientX - 50}px`;
    ripple.style.top = `${touch.clientY - 50}px`;
    ripple.style.width = '100px';
    ripple.style.height = '100px';
    container.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  });
}

// ============================================
// NAVBAR
// ============================================
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const toggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  // Scroll behavior
  ScrollTrigger.create({
    start: 'top -100',
    onUpdate: (self) => {
      if (self.scroll() > 100) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }
  });

  // Mobile menu toggle
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    mobileMenu.classList.toggle('active');
    document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
  });

  // Close mobile menu on link click
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('active');
      mobileMenu.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
}

// ============================================
// GSAP ANIMATIONS
// ============================================
function initAnimations() {
  // Hero animations
  const heroTl = gsap.timeline({ delay: 0.5 });
  
  heroTl
    .to('.hero__title-line', {
      opacity: 1,
      y: 0,
      duration: 1,
      stagger: 0.2,
      ease: 'power4.out'
    })
    .to('.hero__subtitle', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power3.out'
    }, '-=0.5')
    .to('.hero__actions', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power3.out'
    }, '-=0.4')
    .to('.hero__panel', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power3.out'
    }, '-=0.6');

  // Features section
  gsap.to('.feature-card', {
    scrollTrigger: {
      trigger: '.features',
      start: 'top 70%'
    },
    opacity: 1,
    y: 0,
    duration: 0.8,
    stagger: 0.1,
    ease: 'power3.out'
  });

  // Dashboard section
  gsap.to('.dashboard__interface', {
    scrollTrigger: {
      trigger: '.dashboard',
      start: 'top 70%'
    },
    opacity: 1,
    y: 0,
    duration: 1,
    ease: 'power3.out'
  });

  // Solutions section
  gsap.to('.solutions__window', {
    scrollTrigger: {
      trigger: '.solutions',
      start: 'top 70%'
    },
    opacity: 1,
    y: 0,
    duration: 1,
    stagger: 0.2,
    ease: 'power3.out'
  });

  // Story section
  gsap.to('.story__content .story__label', {
    scrollTrigger: {
      trigger: '.story',
      start: 'top 70%'
    },
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: 'power3.out'
  });

  gsap.to('.story__content .story__title', {
    scrollTrigger: {
      trigger: '.story',
      start: 'top 70%'
    },
    opacity: 1,
    y: 0,
    duration: 0.8,
    delay: 0.1,
    ease: 'power3.out'
  });

  gsap.to('.story__content .story__text', {
    scrollTrigger: {
      trigger: '.story',
      start: 'top 70%'
    },
    opacity: 1,
    y: 0,
    duration: 0.8,
    delay: 0.2,
    ease: 'power3.out'
  });

  gsap.to('.story__stat', {
    scrollTrigger: {
      trigger: '.story__stats',
      start: 'top 80%'
    },
    opacity: 1,
    y: 0,
    duration: 0.8,
    stagger: 0.15,
    ease: 'power3.out'
  });

  // Pricing section
  gsap.to('.pricing__card', {
    scrollTrigger: {
      trigger: '.pricing',
      start: 'top 70%'
    },
    opacity: 1,
    y: 0,
    duration: 0.8,
    stagger: 0.15,
    ease: 'power3.out'
  });

  // CTA section
  gsap.to('.cta__title', {
    scrollTrigger: {
      trigger: '.cta',
      start: 'top 70%'
    },
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: 'power3.out'
  });

  gsap.to('.cta__subtitle', {
    scrollTrigger: {
      trigger: '.cta',
      start: 'top 70%'
    },
    opacity: 1,
    y: 0,
    duration: 0.8,
    delay: 0.1,
    ease: 'power3.out'
  });

  gsap.to('.cta__btn', {
    scrollTrigger: {
      trigger: '.cta',
      start: 'top 70%'
    },
    opacity: 1,
    y: 0,
    duration: 0.8,
    delay: 0.2,
    ease: 'power3.out'
  });

  // Contact section
  gsap.to('.contact__form', {
    scrollTrigger: {
      trigger: '.contact',
      start: 'top 70%'
    },
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: 'power3.out'
  });

  gsap.to('.contact__info-item', {
    scrollTrigger: {
      trigger: '.contact',
      start: 'top 70%'
    },
    opacity: 1,
    y: 0,
    duration: 0.8,
    stagger: 0.1,
    ease: 'power3.out'
  });

  // Scroll progress tracking
  ScrollTrigger.create({
    trigger: 'body',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      scrollProgress = self.progress;
    }
  });
}

// ============================================
// COUNTER ANIMATION
// ============================================
function initCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  
  counters.forEach(counter => {
    const target = parseFloat(counter.dataset.counter);
    const isDecimal = target % 1 !== 0;
    
    ScrollTrigger.create({
      trigger: counter,
      start: 'top 80%',
      onEnter: () => {
        gsap.to(counter, {
          innerHTML: target,
          duration: 2,
          ease: 'power2.out',
          snap: { innerHTML: isDecimal ? 0.1 : 1 },
          onUpdate: function() {
            if (isDecimal) {
              counter.innerHTML = parseFloat(counter.innerHTML).toFixed(1);
            }
          }
        });
      },
      once: true
    });
  });
}

// ============================================
// FEATURE CARD TILT
// ============================================
function initCardTilt() {
  const cards = document.querySelectorAll('[data-tilt]');
  
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
      
      // Update glow position
      const glow = card.querySelector('.feature-card__glow');
      if (glow) {
        glow.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
        glow.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
      }
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// ============================================
// DASHBOARD LIVE UPDATE
// ============================================
function initDashboard() {
  const graphLine = document.querySelector('.dashboard__graph-line');
  
  if (!graphLine) return;

  // Animate graph periodically
  setInterval(() => {
    const points = [];
    let y = 120;
    
    for (let i = 0; i <= 400; i += 50) {
      y = 40 + Math.random() * 80;
      points.push(`${i},${y}`);
    }
    
    const newPath = `M${points.join(' Q25,${30 + Math.random() * 40} ')} T400,${40 + Math.random() * 30}`;
    
    gsap.to(graphLine, {
      attr: { d: newPath },
      duration: 0.8,
      ease: 'power2.out'
    });
  }, 800);
}

// ============================================
// FORM HANDLING
// ============================================
function initForm() {
  const form = document.getElementById('contact-form');
  
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = form.querySelector('.contact__submit');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = '<span>Sending...</span>';
    submitBtn.disabled = true;

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    submitBtn.innerHTML = '<span>Message Sent!</span> ✓';
    
    setTimeout(() => {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      form.reset();
    }, 2000);
  });
}

// ============================================
// RESIZE HANDLER
// ============================================
function onResize() {
  if (camera) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  
  if (renderer) {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  isMobile = window.innerWidth < 768;
}

// ============================================
// INITIALIZATION
// ============================================
async function init() {
  // Prevent scroll during preloader
  document.body.style.overflow = 'hidden';

  // Initialize systems
  initLenis();
  initThree();
  initCursor();
  initTouchRipple();
  initNavbar();
  initAnimations();
  initCounters();
  initCardTilt();
  initDashboard();
  initForm();

  // Handle resize
  window.addEventListener('resize', onResize);

  // Run preloader
  const preloader = new Preloader();
  await preloader.init();

  // Trigger hero animations after preloader
  ScrollTrigger.refresh();
}

// Start the app
init();

// Add glitch keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes glitch {
    0% { transform: translate(0); filter: hue-rotate(0deg); }
    20% { transform: translate(-2px, 2px); filter: hue-rotate(90deg); }
    40% { transform: translate(2px, -2px); filter: hue-rotate(180deg); }
    60% { transform: translate(-2px, -2px); filter: hue-rotate(270deg); }
    80% { transform: translate(2px, 2px); filter: hue-rotate(360deg); }
    100% { transform: translate(0); filter: hue-rotate(0deg); }
  }
`;
document.head.appendChild(style);
