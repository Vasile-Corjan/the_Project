export async function Home() {
  try {
      const response = await fetch("/home.html"); // Load the HTML file
      const html = await response.text();
      return html; // Return the HTML content
  } catch (error) {
      console.error("Error loading home.html:", error);
      return "<h1>Error loading Home Page</h1>";
  }
}
export default Home