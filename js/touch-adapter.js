/**
 * Touch Adapter
 * Automatically maps touch events to mouse events for legacy canvas compatibility.
 * Import this module in any file that relies on 'mousemove' or 'mousedown' but needs touch support.
 */

function initTouchAdapter() {
    // Map Touch Start -> Mouse Down
    document.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY,
            bubbles: true
        });
        touch.target.dispatchEvent(mouseEvent);
    }, { passive: false });

    // Map Touch Move -> Mouse Move
    document.addEventListener('touchmove', (e) => {
        // Prevent scrolling on canvas apps to allow for interaction
        if (e.target.tagName === 'CANVAS') {
            e.preventDefault();
        }

        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY,
            bubbles: true
        });
        touch.target.dispatchEvent(mouseEvent);
    }, { passive: false });

    // Map Touch End -> Mouse Up
    document.addEventListener('touchend', (e) => {
        const mouseEvent = new MouseEvent('mouseup', {
            bubbles: true
        });
        e.target.dispatchEvent(mouseEvent);
    });

    console.log("Touch Adapter Initialized");
}

initTouchAdapter();
