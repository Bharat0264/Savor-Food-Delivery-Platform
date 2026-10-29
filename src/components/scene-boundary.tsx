"use client";
import { Component, ReactNode } from "react";
export class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <img
        className="scene-fallback"
        src="/images/food.jpg"
        alt="A fresh bowl of vegetables"
      />
    ) : (
      this.props.children
    );
  }
}
