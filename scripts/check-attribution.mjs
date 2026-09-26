// Fails the build when the license's required footer credit is missing (see LICENSE and AGENTS.md).
import { readFileSync } from "node:fs";

const file = new URL("../src/components/github-link.tsx", import.meta.url);
const source = readFileSync(file, "utf8");
const required = ["Open source on GitHub", "Developed with", "Sanaullah Rais", "github.com/ssanaullahrais/"];
const missing = required.filter((text) => !source.includes(text));

const homePage = readFileSync(new URL("../src/components/home-page.tsx", import.meta.url), "utf8");
if (!homePage.includes("<GithubFooter />")) missing.push("<GithubFooter /> on the home page");

if (missing.length) {
  console.error(`\nBuild stopped: the footer credit required by LICENSE is missing (${missing.join(", ")}).\nSee AGENTS.md. Ask the author for written permission before changing it.\n`);
  process.exit(1);
}
