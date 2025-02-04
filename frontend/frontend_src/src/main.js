import Home from "./pages/home";
import Register from "./pages/register";
import SignIn from "./pages/signin";

const routes = {
  "/": Home,
  "/signin": SignIn,
  "/signup": Register
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

  if (pageFunction) {
    document.getElementById("app").innerHTML = await fetchPage(path, pageFunction);
  } else {
    document.getElementById("app").innerHTML = "<h1>404 Page Not Found</h1>";
  }
}

window.onpopstate = renderPage;

document.addEventListener("DOMContentLoaded", async () => {
  document.body.addEventListener("click", (event) => {
      if (event.target.tagName === "a" && event.target.dataset.route) {
          navigateTo(event, event.target.getAttribute("href"));
      }
  });

  await renderPage();
});