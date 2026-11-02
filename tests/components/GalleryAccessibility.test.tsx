import { act, fireEvent, render } from "@testing-library/react-native";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet } from "react-native";

import AddNewGalleryModal from "@/components/gallery/AddNewGalleryModal";
import GalleryControls from "@/components/gallery/GalleryControls";
import GalleryEditControls from "@/components/gallery/GalleryEditControls";
import GalleryHeader from "@/components/gallery/GalleryHeader";
import GalleryImageGrid from "@/components/gallery/GalleryImageGrid";
import GalleryImageItem from "@/components/gallery/GalleryImageItem";
import GalleryItem from "@/components/gallery/GalleryItem";
import GalleryListHeader from "@/components/gallery/GalleryListHeader";
import GalleryLocationBar from "@/components/gallery/GalleryLocationBar";
import { pickMultipleImages } from "@/utils/gallery";
jest.mock("expo-image", () => ({ Image: (props: any) => require("react").createElement(require("react-native").View, props) }));
jest.mock("@/hooks/useGalleryImageRefresh", () => ({ useGalleryImageRefresh: () => jest.fn() }));
jest.mock("@/components/InlineWheelDatePicker", () => () => null);
jest.mock("react-native-gesture-handler", () => ({ ScrollView: require("react-native").ScrollView }));
let mockListProps: any;
jest.mock("@shopify/flash-list", () => ({ FlashList: (props: any) => { mockListProps = props; return null; } }));
jest.mock("@/utils/gallery", () => ({ pickMultipleImages: jest.fn() }));
jest.mock("@/assets/svgs/back.svg", () => () => null);
jest.mock("@/assets/svgs/pencil.svg", () => () => null);
jest.mock("@/assets/svgs/plus.svg", () => () => null);
jest.mock("@/assets/svgs/trash-bin.svg", () => () => null);
jest.mock("@/assets/svgs/sort-ascending.svg", () => () => null);
jest.mock("@/assets/svgs/sort-descending.svg", () => () => null);
const image = { id: "i", gallery_id: "g", created_at: "2026-01-01", url_orig: "o", url_thumb: "t" };
const gallery = { id: "g", space_id: "space", title: "Our gallery", location: "Home", date: "2026-01-01", color: "#FFD167", cover_thumb_url: "signed", cover_image_thumb_path: "thumb", cover_image_blur_hash: "L9TSUA~qfQ~q~qoffQoffQfQfQfQ" };
it("cover uses explicit validated BlurHash source while preserving its signed URL", () => {
    const view = render(<GalleryItem gallery={gallery} onPress={jest.fn()} />);
    const img = view.UNSAFE_getByType(Image);
    expect(img.props.placeholder).toEqual({ blurhash: gallery.cover_image_blur_hash });
    expect(img.props.source.uri).toBe("signed");
    view.rerender(<GalleryItem gallery={{...gallery,cover_image_blur_hash:"bad"}} onPress={jest.fn()} />);
    expect(view.UNSAFE_getByType(Image).props.placeholder).toBeUndefined();
    view.rerender(<GalleryItem gallery={{...gallery,cover_image_blur_hash:null}} onPress={jest.fn()} />);
    expect(view.UNSAFE_getByType(Image).props.placeholder).toBeUndefined();
});
it("selection is discoverable before long press and exposes checked state", () => {
    const select = jest.fn();
    const props = { image, onPress: jest.fn(), onLongPress: jest.fn(), onSelect: select };
    const view = render(<GalleryImageItem {...props} editMode={false} isSelected={false} />);
    fireEvent.press(view.getByRole("checkbox",{name: "Select photo 2026-01-01"})); expect(select).toHaveBeenCalledWith(image);
    view.rerender(<GalleryImageItem {...props} editMode isSelected />);
    expect(view.getByRole("checkbox",{name: "Select photo 2026-01-01"}).props.accessibilityState.checked).toBe(true);
});
it("actions retain accessible labels and busy states with original fixed typography", () => {
    const props = { onDownload: jest.fn(), onDelete: jest.fn(), selectedCount: 2 };
    const view = render(<GalleryEditControls {...props} isDownloading={false} />);
    expect(view.getByLabelText("Download 2 selected photos")).toBeTruthy();
    expect(view.getByLabelText("Delete 2 selected photos")).toBeTruthy();
    expect(view.getByText("Download 2").props.allowFontScaling).toBe(false);
    expect(StyleSheet.flatten(view.getByText("Download 2").props.style).fontSize).toBe(16);
    view.rerender(<GalleryEditControls {...props} isDownloading progress={{saved:1,total:2}} />);
    const busy = view.getByLabelText("Saving photos: 1 of 2 saved");
    expect(busy.props.accessibilityState).toEqual({busy:true, disabled:true});
    fireEvent.press(busy); expect(props.onDownload).not.toHaveBeenCalled();
});
it("virtualized content reserves measured action-bar space", () => {
    render(<GalleryImageGrid images={[image]} bottomInset={112} isLoadingInitial={false} isLoadingMore={false} hasMore={false} onEndReached={jest.fn()} editMode selectedImageIds={new Set(["i"])} onImagePress={jest.fn()} onImageLongPress={jest.fn()} onImageSelect={jest.fn()} />);
    expect(StyleSheet.flatten(mockListProps.contentContainerStyle).paddingBottom).toBe(112);
});
it("new-gallery picker rejects/cancels without a stuck or overlapping operation", async () => {
    let reject!: (error: Error) => void;
    (pickMultipleImages as jest.Mock).mockImplementationOnce(() => new Promise((_r,r) => {reject=r;})).mockResolvedValue(undefined);
    const view = render(<AddNewGalleryModal isOpen onClose={jest.fn()} />);
    const picker = view.getByLabelText("Choose gallery photos");
    await act(async () => { fireEvent.press(picker); fireEvent.press(picker); });
    expect(pickMultipleImages).toHaveBeenCalledTimes(1);
    expect(view.getByLabelText("Choose gallery photos").props.accessibilityState.busy).toBe(true);
    await act(async () => reject(new Error("picker unavailable")));
    expect(view.getByLabelText("Choose gallery photos").props.accessibilityState.busy).toBe(false);
    await act(async () => fireEvent.press(view.getByLabelText("Choose gallery photos")));
    expect(pickMultipleImages).toHaveBeenCalledTimes(2);
    expect(view.getByLabelText("Choose gallery photos").props.accessibilityState.busy).toBe(false);
});

it("Download/Delete retain the recovered original colours, padding and compact sizing", () => {
    const view = render(<GalleryEditControls isDownloading={false} selectedCount={1} onDownload={jest.fn()} onDelete={jest.fn()} />);
    for (const label of ["Download 1", "Delete 1"]) {
        expect(StyleSheet.flatten(view.getByText(label).props.style)).toMatchObject({color:"#9D6100",fontSize:16,fontFamily:"Raleway-SemiBold"});
    }
    const download = StyleSheet.flatten(view.getByLabelText("Download 1 selected photos").props.style);
    const deletion = StyleSheet.flatten(view.getByLabelText("Delete 1 selected photos").props.style);
    expect(download).toMatchObject({backgroundColor:"#FFCC7D",padding:10,paddingHorizontal:20,borderRadius:15});
    expect(deletion).toMatchObject({backgroundColor:"#BF7B7B",padding:10,paddingHorizontal:20,borderRadius:15});
    expect(download.flex).toBeUndefined(); expect(download.minHeight).toBeUndefined();
});

it("photo selection keeps its original small white-bordered circle, fill and invisible hit area", () => {
    const props = {image,editMode:true,onPress:jest.fn(),onLongPress:jest.fn(),onSelect:jest.fn()};
    const view = render(<GalleryImageItem {...props} isSelected={false} />);
    let circle = view.getByRole("checkbox", {name:"Select photo 2026-01-01"});
    expect(StyleSheet.flatten(circle.props.style)).toMatchObject({top:5,right:5,borderWidth:1.5,borderColor:"#fff",padding:10,borderRadius:999,backgroundColor:"transparent"});
    expect(StyleSheet.flatten(circle.props.style).width).toBeUndefined();
    expect(StyleSheet.flatten(circle.props.style).height).toBeUndefined();
    expect(circle.props.hitSlop).toBe(11);
    view.rerender(<GalleryImageItem {...props} isSelected />);
    circle = view.getByRole("checkbox", {name:"Select photo 2026-01-01"});
    expect(StyleSheet.flatten(circle.props.style).backgroundColor).toBe("rgba(255,255,255,0.7)");
    expect(circle.props.accessibilityState.checked).toBe(true);
});

it("failed thumbnail loading exposes a manual retry and clears feedback after a successful load", () => {
    const view = render(<GalleryImageItem image={image} editMode={false} isSelected={false} onPress={jest.fn()} onSelect={jest.fn()} onLongPress={jest.fn()} />);
    fireEvent(view.UNSAFE_getByType(Image), "error");
    expect(view.getByLabelText("Retry photo thumbnail")).toBeTruthy();
    fireEvent.press(view.getByLabelText("Retry photo thumbnail"));
    fireEvent(view.UNSAFE_getByType(Image), "load");
    expect(view.queryByLabelText("Retry photo thumbnail")).toBeNull();
});

it("list/detail headers retain original Raleway typography and a 28px Back circle", () => {
    const list = render(<GalleryListHeader currentDate="Today" />);
    expect(StyleSheet.flatten(list.getByText("Gallery").props.style)).toMatchObject({fontSize:24,fontFamily:"Raleway-ExtraBold"});
    expect(StyleSheet.flatten(list.getByText("Today").props.style)).toMatchObject({fontSize:12,fontFamily:"Raleway-Medium"});
    expect(list.getByText("Gallery").props.allowFontScaling).toBe(false);
    list.unmount();
    const detail = render(<GalleryHeader currentDate="Today" onBack={jest.fn()} />);
    expect(StyleSheet.flatten(detail.getByLabelText("Back to galleries").props.style)).toMatchObject({width:28,height:28,borderRadius:999});
    expect(detail.getByLabelText("Back to galleries").props.hitSlop).toBe(8);
    expect(detail.getByText("Today").props.allowFontScaling).toBe(false);
});
it("40px detail actions and 32px sort keep labels, disabled state and original text sizes", () => {
    const props = {galleryTitle:"Our trip",galleryDate:"Today",isDeleting:false,onDeleteGallery:jest.fn(),onEditGallery:jest.fn(),onAddImages:jest.fn()};
    const controls = render(<GalleryControls {...props} actionsDisabled />);
    expect(StyleSheet.flatten(controls.getByText("Our trip").props.style)).toMatchObject({fontSize:20,fontFamily:"Raleway-Bold"});
    expect(StyleSheet.flatten(controls.getByText("Today").props.style)).toMatchObject({fontSize:10,fontFamily:"Raleway-Medium"});
    for(const label of ["Delete gallery","Edit gallery details","Add photos"]) {
        const button=controls.getByLabelText(label);
        expect(StyleSheet.flatten(button.props.style)).toMatchObject({width:40,height:40,padding:10,borderRadius:999});
        expect(button.props.accessibilityState.disabled).toBe(true);
        fireEvent.press(button);
    }
    expect(props.onAddImages).not.toHaveBeenCalled();
    controls.unmount();
    const location=render(<GalleryLocationBar location="Home" showClearButton sortingByAscending={false} onToggleSort={jest.fn()} onClear={jest.fn()} />);
    expect(StyleSheet.flatten(location.getByLabelText("Toggle photo sort direction").props.style)).toMatchObject({width:32,height:32});
    expect(StyleSheet.flatten(location.getByLabelText("Clear photo selection").props.style)).toMatchObject({padding:5,paddingHorizontal:10,alignSelf:"flex-end"});
    expect(StyleSheet.flatten(location.getByText("Home").props.style).fontSize).toBe(10);
    expect(StyleSheet.flatten(location.getByText("Clear").props.style).fontSize).toBe(10);
});
it("gallery cards and new-gallery form retain compact text, 20px colour swatches and 120px Save", () => {
    const card=render(<GalleryItem gallery={gallery} onPress={jest.fn()} />);
    expect(StyleSheet.flatten(card.getByText("Our gallery").props.style)).toMatchObject({fontSize:14,lineHeight:18,fontFamily:"Raleway-Bold"});
    expect(StyleSheet.flatten(card.getByText("Home").props.style)).toMatchObject({fontSize:10,fontFamily:"Raleway-SemiBold"});
    card.unmount();
    const form=render(<AddNewGalleryModal isOpen onClose={jest.fn()} />);
    const swatch=form.getAllByRole("radio")[0];
    expect(StyleSheet.flatten(swatch.props.style)).toMatchObject({width:20,height:20,borderRadius:999,opacity:1});
    expect(StyleSheet.flatten(form.getByLabelText("Save gallery").props.style).width).toBe(120);
    expect(StyleSheet.flatten(form.getByPlaceholderText("Enter date name").props.style)).toMatchObject({fontSize:12,fontFamily:"Raleway-Regular"});
    expect(form.getByPlaceholderText("Enter date name").props.allowFontScaling).toBe(false);
});
