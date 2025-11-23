(function() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

    // Current page
    const path = window.location.pathname;
    const page = path.split("/").pop();

    if (isMobile && (page === 'editor.html' || page === '')) {
        // Redirect to mobile editor
        window.location.href = 'editor-mobile.html';
    } else if (!isMobile && page === 'editor-mobile.html') {
        // Redirect back to desktop
        window.location.href = 'editor.html';
    }
})();
