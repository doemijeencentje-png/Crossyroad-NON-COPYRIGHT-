// ============================================
// HOP ROAD - Utility Functions
// ============================================

// Easing functions for smooth animations
export const Easing = {
    // Smooth start and end
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    },

    // Quick start, smooth end
    easeOutQuad(t) {
        return 1 - (1 - t) * (1 - t);
    },

    // Smooth start, quick end
    easeInQuad(t) {
        return t * t;
    },

    // Bouncy end
    easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },

    // Elastic bounce
    easeOutElastic(t) {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 :
            Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },

    // Jump arc (parabola)
    jumpArc(t) {
        return Math.sin(t * Math.PI);
    }
};

// Linear interpolation
export function lerp(start, end, t) {
    return start + (end - start) * t;
}

// Clamp value between min and max
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Map value from one range to another
export function mapRange(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

// Distance between two points
export function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Check AABB collision
export function aabbCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

// Shade/lighten a hex color
export function shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = clamp((num >> 16) + amt, 0, 255);
    const G = clamp((num >> 8 & 0x00FF) + amt, 0, 255);
    const B = clamp((num & 0x0000FF) + amt, 0, 255);
    return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
}

// Mix two colors
export function mixColors(color1, color2, ratio) {
    const c1 = parseInt(color1.replace('#', ''), 16);
    const c2 = parseInt(color2.replace('#', ''), 16);

    const r1 = (c1 >> 16) & 255;
    const g1 = (c1 >> 8) & 255;
    const b1 = c1 & 255;

    const r2 = (c2 >> 16) & 255;
    const g2 = (c2 >> 8) & 255;
    const b2 = c2 & 255;

    const r = Math.round(lerp(r1, r2, ratio));
    const g = Math.round(lerp(g1, g2, ratio));
    const b = Math.round(lerp(b1, b2, ratio));

    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Format number with commas
export function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Debounce function
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Deep clone object
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
