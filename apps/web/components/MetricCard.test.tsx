// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { MetricCard } from "./MetricCard";

describe("MetricCard", () => {
  it("renders the calculated API value when the sample is sufficient", () => {
    render(<MetricCard label="Alinhamento com o campo" valor={88.1} n={159} />);

    expect(screen.getByText("88.1%")).toBeInTheDocument();
    expect(screen.getByText("em 159 votações comparáveis")).toBeInTheDocument();
  });

  it("keeps the insufficient-data state for a small sample", () => {
    render(<MetricCard label="Presença nominal" valor={100} n={4} />);

    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText(/4 de 10 votações comparáveis/)).toBeInTheDocument();
  });
});
