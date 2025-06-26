import Colors from "@/constants/colors";
import { AntDesign } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: Colors.lightBlue,
                tabBarInactiveTintColor: Colors.black,
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: Colors.white,
                    borderTopWidth: 0,
                    shadowColor: "#000",
                    shadowOffset: {
                        width: 0,
                        height: 0,
                    },
                    shadowOpacity: 0.25,
                    shadowRadius: 15,
                    elevation: 5,
                    height: 100,
                    paddingTop: 10,
                },
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
                            color={focused ? Colors.lightBlue : Colors.gray}
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
                            color={focused ? Colors.lightBlue : Colors.gray}
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
                            color={focused ? Colors.lightBlue : Colors.gray}
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
                            color={focused ? Colors.lightBlue : Colors.gray}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
