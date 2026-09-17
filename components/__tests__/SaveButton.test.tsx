import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SaveButton } from "@/components/SaveButton";
import { loadSaved } from "@/lib/saved";

const props = {
  url: "https://example.test/article",
  day: "monday" as const,
  source: "Example",
  detail: "Article · lead",
  excerpt: "An excerpt.",
  image: "https://example.test/a.jpg",
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("SaveButton", () => {
  it("starts unsaved, outline icon, aria-pressed false", async () => {
    render(<SaveButton {...props} />);
    const button = await screen.findByRole("button", { name: "Save card" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button.querySelector("svg")).toHaveClass("fill-none");
  });

  it("fills and updates aria state on click, persisting the save", async () => {
    const user = userEvent.setup();
    render(<SaveButton {...props} />);
    const button = await screen.findByRole("button", { name: "Save card" });

    await user.click(button);

    expect(await screen.findByRole("button", { name: "Saved" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button").querySelector("svg")).toHaveClass("fill-current");
    expect(loadSaved()).toHaveLength(1);
  });

  it("toggles back off on a second click", async () => {
    const user = userEvent.setup();
    render(<SaveButton {...props} />);
    const button = await screen.findByRole("button", { name: "Save card" });

    await user.click(button);
    await user.click(screen.getByRole("button", { name: "Saved" }));

    expect(await screen.findByRole("button", { name: "Save card" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(loadSaved()).toHaveLength(0);
  });

  it("reflects prior saved state read after mount", async () => {
    const first = render(<SaveButton {...props} />);
    const button = await screen.findByRole("button", { name: "Save card" });
    const user = userEvent.setup();
    await user.click(button);
    first.unmount();

    render(<SaveButton {...props} />);
    expect(await screen.findByRole("button", { name: "Saved" })).toBeInTheDocument();
  });

  it("keeps two cards from the same article independent", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <SaveButton {...props} detail="Article · lead" />
        <SaveButton {...props} detail="Article · quote" />
      </div>,
    );
    const [first] = await screen.findAllByRole("button", { name: "Save card" });
    await user.click(first);

    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[1]).toHaveAttribute("aria-pressed", "false");
  });
});
