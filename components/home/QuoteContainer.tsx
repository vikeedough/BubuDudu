import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Quote } from "@/api/endpoints/types";
import { Colors } from "@/constants/colors";
import { randomNumber } from "@/utils/home";

import CustomText from "../CustomText";

interface QuoteContainerProps {
    quotes: Quote[];
}

const QuoteContainer: React.FC<QuoteContainerProps> = ({ quotes }) => {
    const [rng, setRng] = useState<number>(0);

    useEffect(() => {
        setRng(randomNumber(0, quotes.length - 1));
    }, [quotes]);

    return (
        <View style={styles.container}>
            <CustomText weight="semibold" style={styles.quote}>
                "{quotes[rng]?.quote}"
            </CustomText>
            <View style={styles.tail} />
        </View>
    );
};

export default QuoteContainer;

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
        marginBottom: 70,
        backgroundColor: Colors.yellow,
        padding: 20,
        width: 190,
        borderRadius: 15,
        borderTopLeftRadius: 0,
        alignItems: "center",
        zIndex: 100,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        justifyContent: "center",
    },
    quote: {
        fontSize: 15,
        textAlign: "center",
        color: Colors.brownText,
    },
    tail: {
        position: "absolute",
        left: -10,
        top: 0,
        width: 0,
        height: 0,
        borderTopWidth: 15,
        borderTopColor: Colors.yellow,
        borderLeftWidth: 15,
        borderLeftColor: "transparent",
        borderRightWidth: 0,
        borderRightColor: "transparent",
    },
});
