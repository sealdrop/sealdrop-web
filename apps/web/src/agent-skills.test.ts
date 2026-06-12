import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const distDir = resolve(__dirname, "../dist");

interface SkillEntry {
  name: string;
  type: string;
  description: string;
  url: string;
  digest: string;
}

describe("Agent Skills discovery", () => {
  it("publishes a v0.2.0 skills index with verifiable artifacts", () => {
    const indexPath = resolve(distDir, ".well-known/agent-skills/index.json");

    expect(existsSync(indexPath)).toBe(true);

    const index = JSON.parse(readFileSync(indexPath, "utf-8")) as {
      $schema: string;
      skills: SkillEntry[];
    };

    expect(index.$schema).toBe("https://schemas.agentskills.io/discovery/0.2.0/schema.json");
    expect(index.skills).toHaveLength(1);

    const skill = index.skills[0];
    expect(skill).toBeDefined();
    if (!skill) throw new Error("Expected one published skill");

    expect(skill).toMatchObject({
      name: "sealdrop-secure-file-exchange",
      type: "skill-md",
      url: "/.well-known/agent-skills/sealdrop-secure-file-exchange/SKILL.md",
    });
    expect(skill.description.length).toBeGreaterThan(0);
    expect(skill.digest).toMatch(/^sha256:[a-f0-9]{64}$/);

    const artifactPath = resolve(distDir, skill.url.replace(/^\//, ""));
    expect(existsSync(artifactPath)).toBe(true);
    const artifact = readFileSync(artifactPath);
    const digest = `sha256:${createHash("sha256").update(artifact).digest("hex")}`;

    expect(digest).toBe(skill.digest);
    expect(artifact.toString("utf-8")).toContain("name: sealdrop-secure-file-exchange");
  });
});
