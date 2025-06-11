import { useAppStore } from "@/stores/AppStore";
import { getToday, randomNumber } from "@/utils/home";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

const QuoteContainer = () => {
    const today = getToday();
    const [rng, setRng] = useState<number>(0);
    const quotes = useAppStore((state) => state.quotes);

    useEffect(() => {
        setRng(randomNumber(0, quotes.length - 1));
    }, [quotes]);

    return (
        <View style={styles.container}>
            <Text style={styles.date}>{today}</Text>
            <Text style={styles.quote}>"{quotes[rng]?.quote}"</Text>
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
        fontWeight: 700,
    },
    quote: {
        marginTop: 10,
        fontSize: 17,
        fontWeight: 500,
    },
});
