// Subtle animated dot grid with Antigravity-style colorful particles
(function () {
    const canvas = document.getElementById('grid-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width, height, dots;
    const SPACING = 40;
    const DOT_RADIUS = 0.8;
    const MOUSE_RADIUS = 120;
    let mouseX = -1000, mouseY = -1000;

    // Antigravity-style particle colors (blue, green, gold, soft pink)
    const COLORS = [
        [66, 133, 244],   // blue
        [52, 168, 83],    // green
        [251, 188, 4],    // gold
        [234, 67, 53],    // coral
        [168, 180, 200],  // neutral
    ];

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.scale(dpr, dpr);
        initDots();
    }

    function initDots() {
        dots = [];
        const cols = Math.ceil(width / SPACING) + 1;
        const rows = Math.ceil(height / SPACING) + 1;
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                dots.push({
                    x: i * SPACING,
                    y: j * SPACING,
                    baseOpacity: 0.08 + Math.random() * 0.06,
                    phase: Math.random() * Math.PI * 2,
                    color: COLORS[Math.floor(Math.random() * COLORS.length)],
                });
            }
        }
    }

    function draw(time) {
        ctx.clearRect(0, 0, width, height);

        for (const dot of dots) {
            const dx = mouseX - dot.x;
            const dy = mouseY - dot.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const influence = Math.max(0, 1 - dist / MOUSE_RADIUS);

            const breathe = Math.sin(time * 0.001 + dot.phase) * 0.03;
            const opacity = dot.baseOpacity + breathe + influence * 0.55;
            const radius = DOT_RADIUS + influence * 2.5;

            const [r, g, b] = dot.color;

            ctx.beginPath();
            ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(opacity, 0.8)})`;
            ctx.fill();
        }

        requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    window.addEventListener('mouseleave', () => {
        mouseX = -1000;
        mouseY = -1000;
    });

    // Touch support
    window.addEventListener('touchmove', (e) => {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
    });
    window.addEventListener('touchend', () => {
        mouseX = -1000;
        mouseY = -1000;
    });

    resize();
    requestAnimationFrame(draw);
})();
