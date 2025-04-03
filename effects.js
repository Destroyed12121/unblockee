console.log("Effects.js starting...");

const container = document.createElement("div");
container.className = "effects-container";
container.style.position = "fixed";
container.style.top = "0";
container.style.left = "0";
container.style.width = "100%";
container.style.height = "100%";
container.style.zIndex = "-1";
container.style.overflow = "hidden";

// Add dot styling
const style = document.createElement('style');
style.textContent = `
    .dot {
        position: absolute;
        width: 2px;
        height: 2px;
        background: white;
        animation: moveDot 5s linear infinite;
    }
    @keyframes moveDot {
        0% { transform: translate(50vw, 50vh) scale(1); }
        100% { transform: translate(-50vw, -50vh) scale(0); }
    }
`;
document.head.appendChild(style);

let currentTheme = 'default';
let currentDotSpeed = 'normal';
let dots = [];

const themes = {
    default: "radial-gradient(ellipse at center, #000000, #0a0a0a, #111111, #1a1a1a, #222222)",
    night: "black"
};

function updateBackground() {
    container.style.background = themes[currentTheme];
    console.log(`Background updated to ${currentTheme} theme`);
}

function updateDots() {
    dots.forEach(dot => dot.remove());
    dots = [];

    for (let i = 0; i < 100; i++) {
        const dot = document.createElement("div");
        dot.className = "dot";
        dot.style.left = Math.random() * 100 + "vw";
        dot.style.top = Math.random() * 100 + "vh";
        dot.style.animationDuration = 2 + Math.random() * 5 + "s"; // 2-7 seconds
        container.appendChild(dot);
        dots.push(dot);
    }
    console.log(`Dots updated to ${currentDotSpeed} style`);
}

function setTheme(theme) {
    currentTheme = theme;
    updateBackground();
    localStorage.setItem('selectedTheme', theme);
}

function setDotSpeed(speed) {
    currentDotSpeed = speed;
    updateDots();
    localStorage.setItem('selectedDotSpeed', speed);
}

updateBackground();
document.body.appendChild(container);
console.log("Effects container added");

if (window.location.pathname.includes("movies")) {
    document.body.style.overflow = "hidden";
    console.log("Overflow set to hidden for movies page");
} else {
    document.body.style.overflow = "auto";
    console.log("Overflow set to auto");
}

updateDots();

function createShootingStar() {
    const star = document.createElement("div");
    star.className = "shooting-star";
    
    const edge = Math.floor(Math.random() * 4);
    let startX, startY;
    
    switch(edge) {
        case 0: startX = Math.random() * 100; startY = 0; break;
        case 1: startX = 100; startY = Math.random() * 100; break;
        case 2: startX = Math.random() * 100; startY = 100; break;
        case 3: startX = 0; startY = Math.random() * 100; break;
    }

    star.style.left = startX + "vw";
    star.style.top = startY + "vh";
    
    const angleRange = 90;
    let baseAngle;
    switch(edge) {
        case 0: baseAngle = 90; break;
        case 1: baseAngle = 180; break;
        case 2: baseAngle = 270; break;
        case 3: baseAngle = 0; break;
    }
    
    const angle = baseAngle + (Math.random() * angleRange - angleRange/2);
    const distance = 50 + Math.random() * 50;
    const endX = startX + Math.cos(angle * Math.PI / 180) * distance;
    const endY = startY + Math.sin(angle * Math.PI / 180) * distance;
    
    star.style.animationDuration = "2.5s";
    star.style.setProperty("--start-x", `${startX}vw`);
    star.style.setProperty("--start-y", `${startY}vh`);
    star.style.setProperty("--end-x", `${endX}vw`);
    star.style.setProperty("--end-y", `${endY}vh`);
    container.appendChild(star);
    console.log(`Shooting star created: edge ${edge}, start (${startX}vw, ${startY}vh), end (${endX}vw, ${endY}vh)`);
    setTimeout(() => star.remove(), 2500);
}

setInterval(createShootingStar, 1000);
console.log("Effects initialized from effects.js");

window.setTheme = setTheme;
window.setDotSpeed = setDotSpeed;

// Load saved settings
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('selectedTheme') || 'default';
    const savedDotSpeed = localStorage.getItem('selectedDotSpeed') || 'normal';
    setTheme(savedTheme);
    setDotSpeed(savedDotSpeed);
});