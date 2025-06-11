import { useAppStore } from "@/stores/AppStore";
import { getToday, randomNumber } from "@/utils/home";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import CustomText from "../CustomText";

const QuoteContainer = () => {
    const today = getToday();
    const [rng, setRng] = useState<number>(0);
    const quotes = useAppStore((state) => state.quotes);

    useEffect(() => {
        setRng(randomNumber(0, quotes.length - 1));
    }, [quotes]);

    return (
        <View style={styles.container}>
            <CustomText weight="bold" style={styles.date}>
                {today}
            </CustomText>
            <CustomText weight="regular" style={styles.quote}>
                "{quotes[rng]?.quote}"
            </CustomText>
        </View>
    );
};

export default QuoteContainer;

const styles = StyleSheet.create({
    container: {
        marginTop: 40,
        marginBottom: 40,
        backgroundColor: "#B2FFFB",
        padding: 20,
        paddingHorizontal: 35,
        borderWidth: 1,
        borderRadius: 15,
        alignItems: "center",
    },
    date: {
        fontSize: 17,
    },
    quote: {
        marginTop: 10,
        fontSize: 17,
    },
});
