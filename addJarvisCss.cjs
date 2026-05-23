const fs = require('fs');

const cssOptions = `
@keyframes jarvis-radar-sweep {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.jarvis-radar-cone {
  background: conic-gradient(from 0deg, transparent 70%, rgba(6, 182, 212, 0.6) 100%);
  animation: jarvis-radar-sweep 3s linear infinite;
  border-radius: 50%;
}
@keyframes jarvis-data-scrolling {
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}
.jarvis-glitch-text {
  text-shadow: 0 0 5px rgba(6,182,212,0.8), 0 0 2px rgba(6,182,212,0.5);
}
.jarvis-grid-bg {
  background-size: 20px 20px;
  background-image:
    linear-gradient(to right, rgba(6, 182, 212, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(6, 182, 212, 0.05) 1px, transparent 1px);
}
`;

let css = fs.readFileSync('src/index.css', 'utf8');
if(!css.includes('jarvis-radar-sweep')) {
    css += cssOptions;
    fs.writeFileSync('src/index.css', css);
}
console.log("CSS Updated!");
