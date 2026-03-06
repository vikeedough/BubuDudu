import React from "react";
import { StyleProp, TextStyle } from "react-native";

import AuthField from "@/components/auth/AuthField";

import { authScreenStyles } from "./authScreenStyles";

interface AuthCredentialsFieldsProps {
    email: string;
    password: string;
    onEmailChange: (text: string) => void;
    onPasswordChange: (text: string) => void;
    emailLabelStyle?: StyleProp<TextStyle>;
    passwordLabelStyle?: StyleProp<TextStyle>;
    includeConfirmPassword?: boolean;
    confirmPassword?: string;
    onConfirmPasswordChange?: (text: string) => void;
    confirmPasswordLabelStyle?: StyleProp<TextStyle>;
}

const AuthCredentialsFields: React.FC<AuthCredentialsFieldsProps> = ({
    email,
    password,
    onEmailChange,
    onPasswordChange,
    emailLabelStyle,
    passwordLabelStyle = authScreenStyles.fieldSpacing,
    includeConfirmPassword = false,
    confirmPassword = "",
    onConfirmPasswordChange,
    confirmPasswordLabelStyle = authScreenStyles.fieldSpacing,
}) => {
    return (
        <>
            <AuthField
                label="Email"
                labelStyle={emailLabelStyle}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={onEmailChange}
            />

            <AuthField
                label="Password"
                labelStyle={passwordLabelStyle}
                placeholder="Enter your password"
                secureTextEntry
                value={password}
                onChangeText={onPasswordChange}
            />

            {includeConfirmPassword && (
                <AuthField
                    label="Confirm Password"
                    labelStyle={confirmPasswordLabelStyle}
                    placeholder="Confirm your password"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={onConfirmPasswordChange}
                />
            )}
        </>
    );
};

export default AuthCredentialsFields;
