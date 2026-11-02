import { fireEvent, render } from "@testing-library/react-native";
import React from "react";
import { Modal } from "react-native";

import ConfirmModal from "@/components/common/ConfirmModal";
it("blocks confirm, cancel and Android Back dismissal while a gallery operation is pending", () => {
    const close = jest.fn(), confirm = jest.fn();
    const view = render(<ConfirmModal isOpen isConfirming onClose={close} onConfirm={confirm} title="Delete gallery" message="Delete?" />);
    fireEvent.press(view.getByText("No"));
    fireEvent.press(view.getByLabelText("Yes"));
    expect(view.getByLabelText("Yes").props.accessibilityState).toEqual({busy:true,disabled:true});
    view.UNSAFE_getByType(Modal).props.onRequestClose();
    expect(close).not.toHaveBeenCalled(); expect(confirm).not.toHaveBeenCalled();
    view.rerender(<ConfirmModal isOpen onClose={close} onConfirm={confirm} title="Delete gallery" message="Delete?" />);
    view.UNSAFE_getByType(Modal).props.onRequestClose();
    expect(close).toHaveBeenCalledTimes(1);
});
