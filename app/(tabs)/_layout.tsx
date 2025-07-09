import Colors from "@/constants/colors";
import { AntDesign } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors.lightBlue,
                tabBarInactiveTintColor: Colors.black,
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: styles.tabBar,
                tabBarItemStyle: styles.tabBarItem,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ focused }) => (
                        <AntDesign
                            name="home"
                            size={24}
                            color={focused ? Colors.white : Colors.gray}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="(gallery)"
                options={{
                    title: "Gallery",
                    tabBarIcon: ({ focused }) => (
                        <AntDesign
                            name="picture"
                            size={24}
                            color={focused ? Colors.white : Colors.gray}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="(lists)"
                options={{
                    title: "Lists",
                    tabBarIcon: ({ focused }) => (
                        <AntDesign
                            name="folderopen"
                            size={24}
                            color={focused ? Colors.white : Colors.gray}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="wheel"
                options={{
                    title: "Wheel",
                    tabBarIcon: ({ focused }) => (
                        <AntDesign
                            name="questioncircleo"
                            size={24}
                            color={focused ? Colors.white : Colors.gray}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: "absolute",
        backgroundColor: Colors.green,
        shadowColor: "#000",
        borderTopLeftRadius: 60,
        borderTopRightRadius: 60,
        borderBottomLeftRadius: 60,
        borderBottomRightRadius: 60,
        bottom: 35,
        height: 51,
        alignSelf: "center",
        marginHorizontal: 30,
    },
    tabBarItem: {
        marginTop: 5,
    },
});
