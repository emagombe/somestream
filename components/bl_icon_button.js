import React, { forwardRef } from "react";
import type { Node } from "react";
import {
	SafeAreaView,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	useColorScheme,
	View,
	TouchableNativeFeedback,
} from "react-native";

import theme from "../../theme/theme";

const BLIconButton = forwardRef((props, ref) => {
	const {
		size = 100,
		onPress = () => {},
		style = {},
		color = theme.button.main,
		view_style = {},
		disabled = false,
		disabled_color = "rgba(40,40,40,1)",
	} = props;

	return (
		<View
			ref={ref}
			style={{
				backgroundColor: disabled ? disabled_color : color,
				elevation: 5,
				borderRadius: 50,
				margin: 3,
				...style,
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "center",
			}}
			disabled={disabled}
		>
			<TouchableNativeFeedback
				onPress={!disabled ? onPress : e => {}}
				background={
					!disabled
						? TouchableNativeFeedback.Ripple(
								theme.ripple.main,
								true,
								300
						  )
						: null
				}
			>
				<View
					style={{
						minWidth: size,
						minHeight: size,
						...view_style,
						padding: 5,
					}}
				>
					{props.children}
				</View>
			</TouchableNativeFeedback>
		</View>
	);
});

export default BLIconButton;
