import Lenis from '@studio-freight/lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'
import { initHero3D } from './hero3d.js'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize Lenis
  const lenis = new Lenis({
    lerp: 0.08,
    smoothWheel: true,
  })

  lenis.on('scroll', ScrollTrigger.update)

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000)
  })
  gsap.ticker.lagSmoothing(0)

  // 2. Custom HUD Cursors
  const redCursor = document.getElementById('red-cursor')
  const cursorRing = document.getElementById('cursor-ring')
  const cursorCoords = document.getElementById('cursor-coords')
  const cursorVideoFloat = document.querySelector('.cursor-video-float')
  const floatPlaceholder = document.getElementById('float-placeholder')

  // Add center dot to crosshair
  const cursorDot = document.createElement('div')
  cursorDot.className = 'cursor-dot'
  redCursor.appendChild(cursorDot)

  let mouseX = window.innerWidth / 2
  let mouseY = window.innerHeight / 2
  let ringX = mouseX, ringY = mouseY
  let floatX = mouseX, floatY = mouseY

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX
    mouseY = e.clientY

    // Crosshair snaps instantly
    gsap.set(redCursor, { x: mouseX, y: mouseY })
    if (cursorCoords) {
      gsap.set(cursorCoords, { x: mouseX + 20, y: mouseY + 14 })
      cursorCoords.innerText = `X: ${mouseX} Y: ${mouseY}`
    }
  })

  // Initialize Three.js interactive background
  initHero3D()

  // Smooth follow for ring and video floater
  gsap.ticker.add(() => {
    // Ring lags behind cursor
    ringX += (mouseX - ringX) * 0.12
    ringY += (mouseY - ringY) * 0.12
    gsap.set(cursorRing, { x: ringX, y: ringY })

    // lerp for floating project preview
    floatX += (mouseX - floatX) * 0.1
    floatY += (mouseY - floatY) * 0.1
    gsap.set(cursorVideoFloat, { x: floatX, y: floatY })
  })


  // Handle data-cursor attribute hover — scale ring on interactive elements
  const cursorElements = document.querySelectorAll('[data-cursor], .scramble')
  cursorElements.forEach(el => {
    el.addEventListener('mouseenter', () => {
      gsap.to(cursorRing, { width: 52, height: 52, borderColor: 'rgba(255,42,42,0.9)', duration: 0.25 })
    })
    el.addEventListener('mouseleave', () => {
      gsap.to(cursorRing, { width: 34, height: 34, borderColor: 'rgba(255,42,42,0.5)', duration: 0.25 })
    })
  })

  // 2.5 Timecode Update Loop
  const timecodeEl = document.getElementById('timecode')
  if (timecodeEl) {
    setInterval(() => {
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      const ss = String(now.getSeconds()).padStart(2, '0')
      const ms = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0')
      timecodeEl.innerText = `${hh}:${mm}:${ss}:${ms}`
    }, 40) // Roughly 24/25fps equivalent
  }

  // 3.5 Scramble Text Effect on hover
  const scrambleCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
  const scrambleElements = document.querySelectorAll('.scramble');

  scrambleElements.forEach(el => {
    // Store original text
    el.dataset.original = el.innerText;

    el.addEventListener('mouseenter', () => {
      let iterations = 0;
      clearInterval(el.interval);

      el.interval = setInterval(() => {
        el.innerText = el.dataset.original.split('').map((letter, index) => {
          if (index < iterations) {
            return el.dataset.original[index]; // return original validated char
          }
          // return random scrambled char
          return scrambleCharacters[Math.floor(Math.random() * scrambleCharacters.length)];
        }).join('');

        if (iterations >= el.dataset.original.length) {
          clearInterval(el.interval);
        }

        iterations += 1 / 2; // decryption speed step
      }, 30);
    });
  });

  // Handle Project Float
  const projectCards = document.querySelectorAll('.project-card[data-video-placeholder]')
  projectCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      floatPlaceholder.innerText = card.getAttribute('data-video-placeholder')
      cursorVideoFloat.classList.add('show')
    })
    card.addEventListener('mouseleave', () => {
      cursorVideoFloat.classList.remove('show')
    })
  })

  // 3. Preloader & Hero Opening
  // Custom split text while preserving name spans for responsive wrapping
  const hName = document.querySelector('.h-name');
  const kName = document.querySelector('.k-name');

  const splitInPlace = (el) => {
    if (!el) return;
    const text = el.innerText;
    el.innerHTML = '';
    text.split('').forEach(char => {
      const charSpan = document.createElement('span');
      charSpan.className = 'char';
      charSpan.innerText = char === ' ' ? '\u00A0' : char;
      el.appendChild(charSpan);
    });
  };

  splitInPlace(hName);
  splitInPlace(kName);

  // If spans don't exist (fallback), split the whole wrapper
  if (!hName && !kName) {
    const heroTitleWrapper = document.getElementById('hero-title');
    if (heroTitleWrapper) {
      const text = heroTitleWrapper.innerText;
      heroTitleWrapper.innerHTML = '';
      text.split('').forEach(char => {
        const span = document.createElement('span');
        span.className = 'char';
        span.innerText = char === ' ' ? '\u00A0' : char;
        heroTitleWrapper.appendChild(span);
      });
    }
  }

  const counterObj = { val: 0 }
  const counterEl = document.getElementById('preloader-counter')
  const enterPrompt = document.getElementById('preloader-enter')

  gsap.set('#console-lines li', { autoAlpha: 0 })

  // Step 1: count 0→100, then pause and wait for Enter
  const tlCount = gsap.timeline({ defaults: { ease: 'power4.inOut' } })

  tlCount
    .to('#console-lines li', {
      autoAlpha: 1,
      stagger: 0.3,
      duration: 0.1,
      ease: 'steps(1)'
    }, 0)
    .to(counterObj, {
      val: 100,
      duration: 2.5,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (counterEl) counterEl.innerText = Math.floor(counterObj.val) + '%'
      },
      onComplete: () => {
        // Show the Enter prompt when we hit 100%
        if (enterPrompt) enterPrompt.classList.add('visible')
        // Listen for Enter key or click anywhere
        const onInteraction = (e) => {
          if (e.type === 'click' || (e.type === 'keydown' && e.key === 'Enter')) {
            document.removeEventListener('keydown', onInteraction)
            document.removeEventListener('click', onInteraction)
            if (enterPrompt) enterPrompt.classList.remove('visible')
            launchHero()
          }
        }
        document.addEventListener('keydown', onInteraction)
        document.addEventListener('click', onInteraction)
      }
    }, 0)

  function launchHero() {
    const tl = gsap.timeline({ defaults: { ease: 'power4.inOut' } })
    tl
      .to('.hud-container', { autoAlpha: 0, duration: 0.3 })
      .to('#hello-wrapper', { autoAlpha: 1, visibility: 'visible', duration: 0.1 })
      // Character-based "HELLO" stagger - Now Much Faster
      .to('#hello-text span', { 
        opacity: 1, 
        filter: 'blur(0px)', 
        scale: 1, 
        stagger: 0.04, 
        duration: 0.5, 
        ease: 'power2.out' 
      })
      .to('#hello-text', { letterSpacing: '0.15em', duration: 0.8, ease: 'power1.inOut' }, '-=0.3')
      .to('#hello-wrapper', { autoAlpha: 0, duration: 0.5 }, '+=0.1')
      
      .to('.preloader-overlay', { scaleY: 0, duration: 1.0, ease: 'power4.inOut' }, '-=0.2')
      .to('.preloader', { autoAlpha: 0, duration: 0.1 }, '-=0.3')
      .from('.site-nav-header', { y: -50, autoAlpha: 0, duration: 0.8, ease: 'power3.out' }, '-=0.8')
      .from('.mobile-top-bar', { y: -30, autoAlpha: 0, duration: 0.6, ease: 'power3.out' }, '-=0.8')
      .from('.hero-bg-initial', { autoAlpha: 0, scale: 1.1, duration: 1.5, ease: 'power2.out' }, '-=1.0')
      .from('.theme-toggle-hero', { x: -30, autoAlpha: 0, duration: 0.6, ease: 'power3.out' }, '-=0.7')
      .from('.scanner-line', { autoAlpha: 0, duration: 0.8 }, '-=0.4')
      .from('.char', { y: 100, autoAlpha: 0, stagger: 0.03, duration: 1.0, ease: 'expo.out' }, '-=0.8')
      .from('.hero-subtitle', { autoAlpha: 0, y: 30, duration: 0.8, ease: 'power3.out' }, '-=0.7')
  }

  // 3.9 Quote Ticker Logic (Vertical Slide Animation)
  const quotes = [
    "FIRST, SOLVE THE PROBLEM. THEN, WRITE THE CODE.",
    "CODE IS LIKE HUMOR. WHEN YOU HAVE TO EXPLAIN IT, IT’S BAD.",
    "FIX THE CAUSE, NOT THE SYMPTOM. STAY ARCHIVAL.",
    "EXPERIENCE IS THE NAME EVERYONE GIVES TO THEIR MISTAKES.",
    "SIMPLICITY IS THE SOUL OF EFFICIENCY.",
    "CLEAN CODE ALWAYS LOOKS LIKE IT WAS WRITTEN BY SOMEONE WHO CARES."
  ];
  let quoteIndex = 0;
  const quoteEl = document.getElementById('quote-ticker');
  const quoteWrap = document.querySelector('.quote-ticker-wrap');
  
  if (quoteEl && quoteWrap) {
    quoteEl.innerText = quotes[0]; 
    
    // Initial entrance after a short delay
    gsap.to(quoteWrap, { opacity: 1, duration: 1, delay: 2 });

    setInterval(() => {
      const qTl = gsap.timeline();
      qTl.to(quoteEl, {
        y: -10,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.in',
        onComplete: () => {
          quoteIndex = (quoteIndex + 1) % quotes.length;
          quoteEl.innerText = quotes[quoteIndex];
          gsap.set(quoteEl, { y: 10 });
        }
      })
      .to(quoteEl, {
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: 'power2.out'
      });
    }, 7000); 
  }

  // 4. Full-Site Horizontal Scroll System (Desktop Only)
  const mm = gsap.matchMedia()
  
  mm.add("(min-width: 769px)", () => {
    const hScrollMain = document.getElementById('h-scroll-main')
    const hScrollTrack = document.getElementById('h-scroll-track')
    const progressBar = document.getElementById('scroll-progress')

    let hScrollTween = null

    if (hScrollMain && hScrollTrack) {
      const getScrollDistance = () => -(hScrollTrack.scrollWidth - window.innerWidth)

      hScrollTween = gsap.to(hScrollTrack, {
        x: getScrollDistance,
        ease: "none",
        scrollTrigger: {
          trigger: hScrollMain,
          start: "top top",
          end: () => `+=${hScrollTrack.scrollWidth - window.innerWidth}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            // Update progress bar
            if (progressBar) {
              progressBar.style.width = (self.progress * 100) + '%'
            }
          }
        }
      })

      // 4.0 Horizontal Navigation Jump Logic (Pixel-Perfect)
      const navLinks = document.querySelectorAll('.h-link');
      navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetId = link.getAttribute('href');

          if (hScrollTween && hScrollTween.scrollTrigger) {
            const st = hScrollTween.scrollTrigger;
            const targetElem = document.querySelector(targetId);

            if (targetElem) {
              // Get the panel's left offset within the scroll track
              const trackRect = hScrollTrack.getBoundingClientRect();
              const targetRect = targetElem.getBoundingClientRect();

              // offsetLeft = distance from track start to this panel's start
              const panelOffsetLeft = targetRect.left - trackRect.left;
              const totalTrackWidth = hScrollTrack.scrollWidth - window.innerWidth;

              // Map panel offset to a scroll progress (0 to 1)
              const progress = panelOffsetLeft / totalTrackWidth;

              // Calculate exact window scroll position
              const totalScrollDist = st.end - st.start;
              const targetScroll = st.start + progress * totalScrollDist;

              gsap.to(window, {
                scrollTo: Math.max(st.start, Math.min(targetScroll, st.end)),
                duration: 1.2,
                ease: "expo.inOut"
              });
            }
          }
        });
      });

      // Conditional Quote Visibility (Desktop Horizontal)
      if (document.querySelector('.quote-ticker-wrap')) {
        ScrollTrigger.create({
          trigger: "#hero",
          containerAnimation: hScrollTween,
          start: "left left",
          end: "right left",
          onLeave: () => gsap.to(".quote-ticker-wrap", { opacity: 0, duration: 0.5, pointerEvents: 'none' }),
          onEnterBack: () => gsap.to(".quote-ticker-wrap", { opacity: 1, duration: 0.5, pointerEvents: 'auto' })
        });
      }

      // 4.1 Vertical Stacking for Projects (Synced with Horizontal Track)
      const projectStackTL = gsap.timeline({
        scrollTrigger: {
          trigger: "#projects",
          containerAnimation: hScrollTween,
          start: "left left",
          end: "right right",
          scrub: true
        }
      });

      // Reveal animations for horizontal sections
      gsap.utils.toArray('.reveal-up').forEach(elem => {
        gsap.to(elem, {
          scrollTrigger: {
            trigger: elem,
            containerAnimation: hScrollTween,
            start: 'left 85%',
            onEnter: () => {
              gsap.to(elem, { y: 0, autoAlpha: 1, duration: 1.2, ease: 'expo.out' });
            }
          }
        });
      });

      // Un-translate the wrapper to keep it pinned in the viewport (including header)
      projectStackTL.to(".projects-pinned-wrap", {
        x: "200vw",
        ease: "none",
        duration: 2
      }, 0);

      // Slide up the other projects
      projectStackTL
        .to(".project-2", { y: "0%", ease: "none", duration: 1 }, 0)
        .to(".project-3", { y: "0%", ease: "none", duration: 1 }, 1);
    }
  }); // End matchMedia


  // 4.1 Mobile Vertical Scroll Transitions (Global reveal system)
  mm.add("(max-width: 768px)", () => {
    // Mobile Nav: vertical smooth scroll for header links
    const mobileNavLinks = document.querySelectorAll('.h-link');
    mobileNavLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetElem = document.querySelector(targetId);
        if (targetElem) {
          gsap.to(window, {
            scrollTo: { y: targetElem, offsetY: 65 }, // 65px = mobile bar height + a bit of breathing room
            duration: 1.0,
            ease: "expo.inOut"
          });
        }
      });
    });

    // Conditional Quote Visibility (Mobile Vertical)
    if (document.querySelector('.quote-ticker-wrap')) {
      ScrollTrigger.create({
        trigger: "#hero",
        start: "top top",
        end: "bottom top",
        onLeave: () => gsap.to(".quote-ticker-wrap", { opacity: 0, duration: 0.5 }),
        onEnterBack: () => gsap.to(".quote-ticker-wrap", { opacity: 1, duration: 0.5 })
      });
    }

    gsap.utils.toArray('.reveal-up').forEach(elem => {
      gsap.to(elem, {
        scrollTrigger: {
          trigger: elem,
          start: 'top 85%',
          onEnter: () => {
            gsap.to(elem, { y: 0, autoAlpha: 1, duration: 1.2, ease: 'expo.out' });
          }
        }
      });
    });
  });

  // 4.1 Scroll-Triggered Text Scramble
  const scrollScrambleEls = document.querySelectorAll('.scroll-scramble')
  scrollScrambleEls.forEach(el => {
    el.dataset.original = el.innerText
    el.dataset.scrambled = 'false'

    ScrollTrigger.create({
      trigger: el,
      start: "left 85%",
      onEnter: () => {
        if (el.dataset.scrambled === 'true') return
        el.dataset.scrambled = 'true'
        let iterations = 0
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*'
        const interval = setInterval(() => {
          el.innerText = el.dataset.original.split('').map((letter, index) => {
            if (index < iterations) return el.dataset.original[index]
            return chars[Math.floor(Math.random() * chars.length)]
          }).join('')
          if (iterations >= el.dataset.original.length) clearInterval(interval)
          iterations += 0.5
        }, 30)
      }
    })
  })


  // 4.3 Magnetic Cursor Effect
  const magneticEls = document.querySelectorAll('.magnetic')
  magneticEls.forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2
      gsap.to(el, {
        x: x * 0.3,
        y: y * 0.3,
        duration: 0.3,
        ease: "power2.out"
      })
    })
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" })
    })
  })

  // 4.4 Glitch Sound on Hover (Web Audio API)

  function playGlitch() {
    const ctx = getAudioCtx(); // Use deferred context
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const duration = 0.05
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(200 + Math.random() * 400, ctx.currentTime)
    gain.gain.setValueAtTime(0.03, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + duration)
  }

  // Attach glitch sound to nav links and scramble elements
  document.querySelectorAll('.nav-links a, .theme-toggle').forEach(el => {
    el.addEventListener('mouseenter', () => {
      if (audioCtx.state === 'suspended') audioCtx.resume()
      playGlitch()
    })
  })

  // Fade Up Elements
  const fadeUps = gsap.utils.toArray('.fade-up')
  fadeUps.forEach(elem => {
    gsap.fromTo(elem,
      { autoAlpha: 0, y: 40 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: elem,
          start: "top 85%",
        }
      }
    )
  })

  // 5. Hero Name Multi-Language — Smooth Crossfade
  const heroNameEl = document.getElementById('hero-title');
  if (heroNameEl) {
    const originalText = "HARSHIL KOLHE";
    const foreignNames = [
      "हर्षिल कोल्हे",
      "Harshil Kolhé",
      "Járshil Colje",
      "ハルシル・コルヘ",
      "Харшил Колхе",
      "Χάρσιλ Κόλχε"
    ];

    // Add CSS transition to the title element
    heroNameEl.style.transition = "opacity 0.35s ease, transform 0.35s ease, letter-spacing 0.35s ease";

    let hoverInterval;
    let isHovering = false;

    function smoothSwap(newText) {
      // Fade out + slide up
      heroNameEl.style.opacity = "0";
      heroNameEl.style.transform = "translateY(-8px)";
      setTimeout(() => {
        heroNameEl.textContent = newText;
        // Fade in + slide down
        heroNameEl.style.opacity = "1";
        heroNameEl.style.transform = "translateY(0)";
      }, 300);
    }

    heroNameEl.addEventListener('mouseenter', () => {
      isHovering = true;
      heroNameEl.style.letterSpacing = "0.05em";
      let index = 0;
      const shuffled = [...foreignNames].sort(() => 0.5 - Math.random());

      // Immediate first swap
      smoothSwap(shuffled[0]);
      index = 1;

      hoverInterval = setInterval(() => {
        if (!isHovering) return;
        smoothSwap(shuffled[index % shuffled.length]);
        index++;
      }, 800);
    });

    heroNameEl.addEventListener('mouseleave', () => {
      isHovering = false;
      clearInterval(hoverInterval);
      heroNameEl.style.letterSpacing = "";
      smoothSwap(originalText);
    });
  }

  // 6. Water Drop Sound on Hover (deferred to first user interaction)
  let audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        // AudioContext not supported — silently skip
        return null;
      }
    }
    return audioCtx;
  }

  function playWaterDrop() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  }

  // Attach to all interactive hover elements
  const hoverSoundTargets = document.querySelectorAll(
    '.inventory-item, .pipeline-item, .edu-card, .bar-3d-group, .initiate-btn, .resume-btn, .resume-close'
  );
  hoverSoundTargets.forEach(el => {
    el.addEventListener('mouseenter', () => {
      playWaterDrop();
    });
  });

  // 7. Resume Modal Logic
  const resumeModal = document.getElementById('resume-modal');
  const openResumeBtn = document.getElementById('open-resume');
  const closeResumeBtn = document.getElementById('close-resume-btn');
  const closeResumeOverlay = document.getElementById('close-resume-overlay');

  if (resumeModal && openResumeBtn) {
    openResumeBtn.addEventListener('click', () => {
      resumeModal.classList.add('active');
      lenis.stop(); // Lock scroll
    });

    const closeModal = () => {
      resumeModal.classList.remove('active');
      lenis.start(); // Unlock scroll
    };

    if (closeResumeBtn) closeResumeBtn.addEventListener('click', closeModal);
    if (closeResumeOverlay) closeResumeOverlay.addEventListener('click', closeModal);
  }

  // 8. Contact Modal & EmailJS Logic
  const contactModal = document.getElementById('contact-modal');
  const openContactBtn = document.getElementById('open-contact');
  const closeContactBtn = document.getElementById('close-contact-btn');
  const closeContactOverlay = document.getElementById('close-contact-overlay');
  const contactForm = document.getElementById('contact-form');
  const formStatus = document.getElementById('form-status');

  // Initialize EmailJS (Replace 'YOUR_PUBLIC_KEY' with your actual key)
  if (window.emailjs) {
    window.emailjs.init("LvqrV2WCHjD91DIF8");
  }

  if (contactModal && openContactBtn) {
    openContactBtn.addEventListener('click', () => {
      contactModal.classList.add('active');
      lenis.stop();
    });

    const closeContact = () => {
      contactModal.classList.remove('active');
      lenis.start();
      formStatus.innerText = '';
      formStatus.className = 'form-status-msg';
    };

    if (closeContactBtn) closeContactBtn.addEventListener('click', closeContact);
    if (closeContactOverlay) closeContactOverlay.addEventListener('click', closeContact);
  }

  if (contactForm) {
    contactForm.addEventListener('submit', function (event) {
      event.preventDefault();

      const serviceID = 'service_pvhnieg';
      const templateID = 'template_ocwro3j'; // Added placeholder for common template ID naming

      formStatus.innerText = '>> INITIATING_TRANSMISSION...';
      formStatus.className = 'form-status-msg sending';

      // emailjs.sendForm(serviceID, templateID, this)
      window.emailjs.sendForm(serviceID, templateID, this)
        .then(() => {
          formStatus.innerText = '>> TRANSMISSION_SUCCESSFUL // LOG_SAVED';
          formStatus.className = 'form-status-msg success';
          contactForm.reset();
          // Auto-close after 2 seconds
          setTimeout(() => {
            if (contactModal.classList.contains('active')) {
              contactModal.classList.remove('active');
              lenis.start();
            }
          }, 2500);
        }, (err) => {
          formStatus.innerText = `>> ERROR: ${JSON.stringify(err)}`;
          formStatus.className = 'form-status-msg error';
        });
    });
  }

  // 9. Mobile Hamburger Menu
  const hamburger = document.getElementById('nav-hamburger');
  const headerLinks = document.getElementById('header-links');

  if (hamburger && headerLinks) {
    // Create dark backdrop overlay for closing the drawer
    const menuBackdrop = document.createElement('div');
    menuBackdrop.style.cssText = `
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.5); z-index: 9997;
      backdrop-filter: blur(4px);
    `;
    document.body.appendChild(menuBackdrop);

    const openMenu = () => {
      hamburger.classList.add('open');
      headerLinks.classList.add('open');
      menuBackdrop.style.display = 'block';
    };
    const closeMenu = () => {
      hamburger.classList.remove('open');
      headerLinks.classList.remove('open');
      menuBackdrop.style.display = 'none';
    };

    hamburger.addEventListener('click', () => {
      hamburger.classList.contains('open') ? closeMenu() : openMenu();
    });
    menuBackdrop.addEventListener('click', closeMenu);

    // Close menu when any nav link is tapped
    headerLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMenu);
    });
  }

});
