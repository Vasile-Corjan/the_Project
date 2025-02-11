export async function Viewer() {
  try {
    const response = await fetch("/src/pages/viewer/index.html");
    const html = await response.text();
    
    // Return the HTML content and initialize the viewer after rendering
    setTimeout(() => {
      const viewerScript = document.createElement('script');
      viewerScript.type = 'module';
      viewerScript.src = '/src/pages/viewer/viewer.js';
      document.body.appendChild(viewerScript);
    }, 100);
    
    return html;
  } catch (error) {
    console.error("Error loading viewer:", error);
    return "<h1>Error loading Viewer</h1>";
  }
}

export default Viewer;