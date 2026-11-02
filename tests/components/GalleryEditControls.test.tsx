import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import GalleryEditControls from "@/components/gallery/GalleryEditControls";

describe("gallery selection action visibility", () => {
  it("renders no buttons or empty action-bar container at zero selections", () => {
    const props = { isDownloading: false, onDownload: jest.fn(), onDelete: jest.fn() };
    const screen = render(<GalleryEditControls {...props} selectedCount={0} />);
    expect(screen.toJSON()).toBeNull();
    screen.rerender(<GalleryEditControls {...props} selectedCount={1} />);
    fireEvent.press(screen.getByText("Download 1"));
    fireEvent.press(screen.getByText("Delete 1"));
    expect(props.onDownload).toHaveBeenCalledTimes(1);
    expect(props.onDelete).toHaveBeenCalledTimes(1);
    screen.rerender(<GalleryEditControls {...props} selectedCount={0} />);
    expect(screen.toJSON()).toBeNull();
  });

  it("shows the current multi-selection count and hides after clear/completion", () => {
    const props = { isDownloading: false, onDownload: jest.fn(), onDelete: jest.fn() };
    const screen = render(<GalleryEditControls {...props} selectedCount={3} />);
    expect(screen.getByText("Download 3")).toBeTruthy();
    expect(screen.getByText("Delete 3")).toBeTruthy();
    screen.rerender(<GalleryEditControls {...props} selectedCount={0} />);
    expect(screen.toJSON()).toBeNull();
  });

  it("prevents actions while an existing selection is downloading", () => {
    const props = { onDownload: jest.fn(), onDelete: jest.fn() };
    const screen = render(<GalleryEditControls {...props} isDownloading selectedCount={2} />);
    fireEvent.press(screen.getByText("Delete 2"));
    expect(props.onDelete).not.toHaveBeenCalled();
  });
});
