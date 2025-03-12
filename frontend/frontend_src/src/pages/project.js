export async function Project() {
  const response = await fetch("/project.html");
  const html = response.text();

  return html

}

export default Project