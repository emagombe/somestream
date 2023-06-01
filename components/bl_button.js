import React, { forwardRef } from "react";
import type { Node } from "react";
import { Provider, useSelector, useDispatch } from "react-redux";
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

const BLButton = forwardRef((props, ref) => {
	const {
		size = 100,
		onPress = () => {},
		onLongPress = () => {},
		style = {},
		color = theme.button.main,
		view_style = {},
	} = props;

	return (
		<View
			ref={ref}
			style={{
				backgroundColor: color,
				alignSelf: "flex-start",
				elevation: 5,
				borderRadius: 5,
				margin: 3,
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "center",
				...style,
			}}
		>
			<TouchableNativeFeedback
				onPress={onPress}
				onLongPress={onLongPress}
				background={TouchableNativeFeedback.Ripple(
					theme.ripple.main,
					true,
					300
				)}
			>
				<View
					style={{
						minWidth: size,
						padding: 10,
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "center",
						...view_style,
					}}
				>
					{props.children}
				</View>
			</TouchableNativeFeedback>
		</View>
	);
});

export default BLButton;
