import Home from "./pages/home";
import Register from "./pages/register";
import SignIn from "./pages/signin";
import Viewer from "./pages/viewer/index";
import Profile from "./pages/profile";
import Project from "./pages/project";

const routes = {
  "/": Home,
  "/signin": SignIn,
  "/signup": Register,
  "/profile": Profile,
  "/project": Project, // URL structure .../username/project name
  "/viewer": Viewer,
}

const cache = {};

async function fetchPage(path, pageFunction) {
  if(!cache[path]) {
    cache[path] = await pageFunction();
  }
  return cache[path];
}

async function preloadPages(){
  for (let path in routes) {
    fetchPage(path, routes[path]);
  }
}


async function navigateTo(event, path) {
  if (event) event.preventDefault();
  window.history.pushState({}, "", path);
  await renderPage()
}

async function renderPage() {
  const path = window.location.pathname;
  const pageFunction = routes[path];

  const appElement = document.getElementById("app");
  if (!appElement) {
    console.error("Element with id 'app' not found in the DOM.");
    return;
  }

  if (pageFunction) {
    const page = await fetchPage(path, pageFunction);

    if (typeof page === 'object' && page.html) {
      appElement.innerHTML = page.html;

      if (page.afterRender && typeof page.afterRender === 'function') {
        page.afterRender();
      }
    } else {
      appElement.innerHTML = page;
    }
  } else {
    appElement.innerHTML = "<h1>404 Page Not Found</h1>";
  }
}

window.onpopstate = renderPage;

document.addEventListener("DOMContentLoaded", async () => {
  document.body.addEventListener("click", (event) => {
      if (event.target.tagName === "A" && event.target.dataset.route) {
          navigateTo(event, event.target.getAttribute("href"));
      }
  });

  await renderPage();
});
